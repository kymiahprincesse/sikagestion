import { useState, useMemo } from 'react'
import { useNotifications } from '../../components/NotificationProvider'
import { useEncaissementsStore } from '../../store/useEncaissementsStore'
import { useFacturesStore } from '../../store/useFacturesStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useClientsStore } from '../../store/useClientsStore'
import { useNotificationsStore } from '../../store/useNotificationsStore'
import ClientSelect from '../../components/ClientSelect'
import { formatDate, formatFCFA } from '../../utils/format'
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table'
import * as XLSX from 'xlsx'
import { createSikaPDF, finalizeSikaPDF, sikaTable, formatMontant, formatDate as formatDatePDF } from '../../utils/printUtils'

const MOYENS_REGLEMENT = ['ESPECES', 'CHEQUE', 'VIREMENT', 'CARTE', 'TRAITE', 'AUTRE']

const genererReferenceEncaissement = (encaissements) => {
  const annee = new Date().getFullYear()
  const prefix = `ENC-${annee}-`
  const numerosExistants = encaissements
    .map(e => e.reference)
    .filter(ref => ref && ref.startsWith(prefix))
    .map(ref => parseInt(ref.replace(prefix, ''), 10))
    .filter(n => !isNaN(n))
  const prochain = numerosExistants.length > 0 ? Math.max(...numerosExistants) + 1 : 1
  return `${prefix}${String(prochain).padStart(3, '0')}`
}

export default function EncaissementParClient() {
  const { encaissements, soldeInitial, addEncaissement, updateEncaissement, deleteEncaissement } = useEncaissementsStore()
  const { factures } = useFacturesStore()
  const { addLog } = useAuditStore()
  const { clients } = useClientsStore()
  const { ajouterNotification } = useNotificationsStore()
  const { confirmDelete } = useNotifications()

  const [clientSelectionne, setClientSelectionne] = useState(null)
  const [sorting, setSorting] = useState([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showReglementModal, setShowReglementModal] = useState(false)
  const [currentEncaissement, setCurrentEncaissement] = useState(null)
  const [formData, setFormData] = useState({
    factureId: '',
    montant: '',
    modePaiement: '',
    dateEncaissement: new Date().toISOString().split('T')[0],
    reference: '',
    observation: ''
  })

  const encaissementsAvecDetails = useMemo(() => {
    return encaissements.map(enc => {
      const facture = factures.find(f => f.id === enc.factureId)
      const client = clients.find(c => c.id === enc.clientId || c.id === facture?.clientId)
      
      return {
        ...enc,
        clientId: enc.clientId || facture?.clientId,
        clientNom: client?.nom || 'Client inconnu',
        factureReference: facture?.reference || 'N/A',
        factureMontantTTC: facture?.montantTTC || 0,
        factureStatut: facture?.dateReglement ? 'Payée' : 'En attente'
      }
    })
  }, [encaissements, factures, clients])

  const encaissementsFiltres = useMemo(() => {
    if (!clientSelectionne) return encaissementsAvecDetails
    return encaissementsAvecDetails.filter(enc => enc.clientId === clientSelectionne)
  }, [encaissementsAvecDetails, clientSelectionne])

  const soldesClient = useMemo(() => {
    if (!clientSelectionne) {
      return {
        soldeInitial: soldeInitial,
        montantTotalTTC: 0,
        totalRegle: 0,
        resteAPayer: 0
      }
    }

    const facturesClient = factures.filter(f => f.clientId === clientSelectionne)
    const montantTotalTTC = facturesClient.reduce((sum, f) => sum + (f.montantTTC || 0), 0)
    const totalRegle = encaissementsFiltres.reduce((sum, enc) => sum + (enc.montant || 0), 0)
    const resteAPayer = montantTotalTTC - totalRegle

    return {
      soldeInitial: soldeInitial,
      montantTotalTTC,
      totalRegle,
      resteAPayer
    }
  }, [clientSelectionne, factures, encaissementsFiltres, soldeInitial])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const encaissementData = {
      ...formData,
      factureId: parseInt(formData.factureId),
      montant: parseFloat(formData.montant),
      clientId: clientSelectionne
    }

    if (currentEncaissement) {
      updateEncaissement(currentEncaissement.id, encaissementData)
      addLog({
        module: 'ENCAISSEMENT',
        action: 'UPDATE',
        utilisateur: 'Gérant',
        apres: encaissementData,
        impactFinancier: encaissementData.montant
      })
    } else {
      const newEnc = addEncaissement(encaissementData)
      addLog({
        module: 'ENCAISSEMENT',
        action: 'CREATE',
        utilisateur: 'Gérant',
        apres: newEnc,
        impactFinancier: newEnc.montant
      })
    }

    resetForm()
  }

  const handleAddReglement = (encaissement) => {
    setCurrentEncaissement(encaissement)
    setFormData({
      ...encaissement,
      dateEncaissement: new Date().toISOString().split('T')[0]
    })
    setShowReglementModal(true)
  }

  const handleSaveReglement = () => {
    updateEncaissement(currentEncaissement.id, {
      dateEncaissement: formData.dateEncaissement,
      montant: parseFloat(formData.montant),
      modePaiement: formData.modePaiement
    })
    addLog({
      module: 'ENCAISSEMENT',
      action: 'UPDATE',
      utilisateur: 'Gérant',
      apres: formData,
      impactFinancier: parseFloat(formData.montant)
    })
    setShowReglementModal(false)
    resetForm()
  }

  const handleDelete = async (encaissement) => {
    const ok = await confirmDelete(`l'encaissement de ${formatFCFA(encaissement.montant)}`)
    if (!ok) return
    deleteEncaissement(encaissement.id)
    addLog({
      module: 'ENCAISSEMENT',
      action: 'DELETE',
      utilisateur: 'Gérant',
      avant: encaissement,
      impactFinancier: -encaissement.montant
    })
  }

  const handleEdit = (encaissement) => {
    setCurrentEncaissement(encaissement)
    setFormData(encaissement)
    setShowModal(true)
  }

  const handleView = (encaissement) => {
    setCurrentEncaissement(encaissement)
    setShowViewModal(true)
  }

  const handlePrint = async (encaissement) => {
    const client = clients.find(c => c.id === encaissement.clientId);
    const facture = factures.find(f => f.id === encaissement.factureId);
    const ctx = await createSikaPDF(`REÇU D'ENCAISSEMENT - ${encaissement.reference || encaissement.id}`);
    const { doc, startY, MARGE_G, PAGE_W } = ctx;
    
    let y = startY;
    
    // Informations
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    
    const infos = [
      ['Client', client?.nom || 'N/A'],
      ['Date', formatDate(encaissement.dateEncaissement)],
      ['Référence', encaissement.reference || 'N/A']
    ];
    
    infos.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ' :', MARGE_G, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, MARGE_G + 30, y);
      y += 6;
    });
    
    y += 10;
    
    // Tableau
    const columns = ['Description', 'Montant (FCFA)'];
    const rows = [
      [`Facture ${facture?.reference || 'N/A'}`, formatMontant(encaissement.montant)],
      ['Mode de paiement', encaissement.modePaiement]
    ];
    
    const finalY = sikaTable(doc, columns, rows, y, ctx);
    y = finalY + 10;
    
    // Observation
    if (encaissement.observation) {
      doc.setFont('helvetica', 'bold');
      doc.text('Observation :', MARGE_G, y);
      doc.setFont('helvetica', 'normal');
      const obsLines = doc.splitTextToSize(encaissement.observation, 150);
      doc.text(obsLines, MARGE_G + 30, y);
      y += obsLines.length * 6 + 10;
    }
    
    // Signature
    y += 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(27, 42, 74);
    doc.text('_______________________', PAGE_W - 60, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Signature du Gérant', PAGE_W - 60, y);
    
    await finalizeSikaPDF(ctx, `SIKA_Encaissement_${encaissement.reference || encaissement.id}.pdf`);
    
    addLog({
      module: 'ENCAISSEMENT',
      action: 'PRINT',
      utilisateur: 'Gérant'
    });
  }

  const resetForm = () => {
    setFormData({
      factureId: '',
      montant: '',
      modePaiement: '',
      dateEncaissement: new Date().toISOString().split('T')[0],
      reference: '',
      observation: ''
    })
    setCurrentEncaissement(null)
    setShowModal(false)
    setShowReglementModal(false)
  }

  const exportExcel = () => {
    const client = clients.find(c => c.id === clientSelectionne)
    const data = encaissementsFiltres.map(enc => ({
      'CLIENT': enc.clientNom,
      'FACTURE': enc.factureReference,
      'MONTANT': enc.montant,
      'MODE PAIEMENT': enc.modePaiement,
      'DATE': formatDate(enc.dateEncaissement),
      'REFERENCE': enc.reference || '',
      'OBSERVATION': enc.observation || ''
    }))

    data.push({
      'CLIENT': 'TOTAUX',
      'FACTURE': '',
      'MONTANT': soldesClient.totalRegle,
      'MODE PAIEMENT': '',
      'DATE': '',
      'REFERENCE': '',
      'OBSERVATION': `Reste à payer: ${soldesClient.resteAPayer}`
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Encaissements')
    XLSX.writeFile(wb, `encaissements_${client?.nom || 'tous'}_${new Date().toISOString().split('T')[0]}.xlsx`)
    addLog({
      module: 'ENCAISSEMENT',
      action: 'EXPORT',
      utilisateur: 'Gérant'
    })
  }

  const exportReleveCompte = async () => {
    const client = clients.find(c => c.id === clientSelectionne)
    if (!client) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'VALIDATION',
        message: 'Veuillez sélectionner un client'
      })
      return
    }
    
    const ctx = await createSikaPDF(`RELEVÉ DE COMPTE CLIENT - ${client.nom}`);
    const { doc, startY, MARGE_G, PAGE_W } = ctx;
    
    let y = startY;
    
    // Informations client
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    doc.text(client.nom, MARGE_G, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Au ${formatDate(new Date())}`, MARGE_G, y);
    y += 10;
    
    // Bloc soldes
    doc.setFillColor(255, 230, 230);
    doc.rect(MARGE_G, y, PAGE_W - 30, 25, 'F');
    doc.setDrawColor(230, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(MARGE_G, y, PAGE_W - 30, 25);
    
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    
    const soldesInfo = [
      ['Solde initial', formatMontant(soldesClient.soldeInitial) + ' FCFA', 27, 42, 74],
      ['Montant total TTC', formatMontant(soldesClient.montantTotalTTC) + ' FCFA', 230, 0, 0],
      ['Total réglé', formatMontant(soldesClient.totalRegle) + ' FCFA', 26, 122, 74],
      ['Reste à payer', formatMontant(soldesClient.resteAPayer) + ' FCFA', 230, 0, 0]
    ];
    
    const colW = (PAGE_W - 30) / 2;
    soldesInfo.forEach(([label, val, r, g, b], idx) => {
      const x = MARGE_G + (idx % 2) * colW + 2;
      const yPos = y + Math.floor(idx / 2) * 6;
      doc.setTextColor(r, g, b);
      doc.text(label + ':', x, yPos);
      doc.text(val, x + colW - 5, yPos, { align: 'right' });
    });
    
    y += 30;
    
    // Tableau encaissements
    const columns = ['Date', 'Facture', 'Montant (FCFA)', 'Mode', 'Référence'];
    const rows = encaissementsFiltres.map(enc => [
      formatDate(enc.dateEncaissement),
      enc.factureReference,
      formatMontant(enc.montant),
      enc.modePaiement,
      enc.reference || '—'
    ]);
    
    const finalY = sikaTable(doc, columns, rows, y, ctx);
    y = finalY + 10;
    
    // Totaux finaux
    const totauxX = PAGE_W - 80;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    [
      ['Total réglé', formatMontant(soldesClient.totalRegle) + ' FCFA', 26, 122, 74],
      ['Reste à payer', formatMontant(soldesClient.resteAPayer) + ' FCFA', 230, 0, 0]
    ].forEach(([label, val, r, g, b], idx) => {
      if (idx === 1) {
        doc.setFillColor(230, 0, 0);
        doc.rect(totauxX - 2, y - 4, 82, 8, 'F');
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setTextColor(r, g, b);
      }
      doc.text(label, totauxX, y);
      doc.text(val, PAGE_W - 15, y, { align: 'right' });
      y += 6;
    });
    
    // Signature
    y += 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(27, 42, 74);
    doc.text('_______________________', PAGE_W - 60, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Signature du Gérant', PAGE_W - 60, y);
    
    await finalizeSikaPDF(ctx, `SIKA_Releve_Compte_${client.nom}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    addLog({
      module: 'ENCAISSEMENT',
      action: 'EXPORT',
      utilisateur: 'Gérant'
    });
  }

  const columns = useMemo(() => [
    {
      accessorKey: 'clientNom',
      header: 'CLIENT',
      cell: info => <span className="font-semibold text-navy">{info.getValue()}</span>
    },
    {
      accessorKey: 'factureReference',
      header: 'FACTURE',
      cell: info => <span className="font-bold text-navy">{info.getValue()}</span>
    },
    {
      accessorKey: 'montant',
      header: 'MONTANT',
      cell: info => <span className="font-bold text-orange">{formatFCFA(info.getValue())}</span>
    },
    {
      accessorKey: 'modePaiement',
      header: 'MODE PAIEMENT',
      cell: info => <span className="text-navy">{info.getValue()}</span>
    },
    {
      accessorKey: 'dateEncaissement',
      header: 'DATE',
      cell: info => <span className="text-navy">{formatDate(info.getValue())}</span>
    },
    {
      accessorKey: 'reference',
      header: 'REFERENCE',
      cell: info => <span className="text-navy">{info.getValue() || '-'}</span>
    },
    {
      accessorKey: 'observation',
      header: 'OBSERVATION',
      cell: info => <span className="text-navy text-sm">{info.getValue() || '-'}</span>
    },
    {
      id: 'journal',
      header: 'JOURNAL',
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.mouvementCaisseId ? (
            <span className="text-xs text-vert font-semibold">✓ Synchronisé</span>
          ) : (
            <span className="text-xs text-orange">⏳ En attente</span>
          )}
        </div>
      )
    },
    {
      id: 'actions',
      header: 'ACTIONS',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button onClick={() => handleEdit(row.original)} className="p-1 hover:bg-navyClair rounded" title="Modifier">
            📝
          </button>
          <button onClick={() => handleView(row.original)} className="p-1 hover:bg-navyClair rounded" title="Voir">
            👁
          </button>
          <button onClick={() => handlePrint(row.original)} className="p-1 hover:bg-navyClair rounded" title="Imprimer">
            🖨
          </button>
          <button onClick={() => handleAddReglement(row.original)} className="p-1 hover:bg-vert rounded text-white bg-vert" title="Règlement">
            💳
          </button>
          <button onClick={() => handleDelete(row.original)} className="p-1 hover:bg-rouge rounded text-white" title="Supprimer">
            🗑
          </button>
        </div>
      )
    }
  ], [clients])

  const table = useReactTable({
    data: encaissementsFiltres,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })

  return (
    <div className="p-6 bg-navyClair min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-navy">💰 GESTION DES ENCAISSEMENTS</h1>
          <p className="text-sm text-bleu">Suivi des règlements clients et soldes</p>
        </div>

        <div className="bg-orangeClair border-2 border-orange rounded-lg p-4 mb-6">
          <h3 className="text-lg font-bold text-navy mb-3">🎯 SÉLECTION CLIENT</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ClientSelect 
              value={clientSelectionne} 
              onChange={setClientSelectionne}
              clients={clients}
            />
          </div>
        </div>

        {clientSelectionne && (
          <div className="bg-navyClair border-2 border-bleu rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-navy mb-3">💵 SOLDES CLIENT</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-lg border-2 border-argent">
                <div className="text-xs text-bleu font-semibold">Solde initial</div>
                <div className="text-xl font-bold text-bleu">{formatFCFA(soldesClient.soldeInitial)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border-2 border-argent">
                <div className="text-xs text-bleu font-semibold">Montant total TTC</div>
                <div className="text-xl font-bold text-orange">{formatFCFA(soldesClient.montantTotalTTC)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border-2 border-argent">
                <div className="text-xs text-bleu font-semibold">Total réglé</div>
                <div className="text-xl font-bold text-vert">{formatFCFA(soldesClient.totalRegle)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border-2 border-argent">
                <div className="text-xs text-bleu font-semibold">Reste à payer</div>
                <div className="text-xl font-bold text-rouge">{formatFCFA(soldesClient.resteAPayer)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => {
              if (!clientSelectionne) {
                ajouterNotification({
                  type: 'ATTENTION',
                  icone: '⚠️',
                  titre: 'VALIDATION',
                  message: 'Veuillez sélectionner un client avant de créer un encaissement'
                })
                return
              }
              setCurrentEncaissement(null)
              setFormData({ factureId: '', montant: '', modePaiement: '', dateEncaissement: new Date().toISOString().split('T')[0], reference: genererReferenceEncaissement(encaissements), observation: '' })
              setShowModal(true)
            }}
            className="px-4 py-2 bg-orange text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
          >
            ➕ Nouvel Encaissement
          </button>
          <button
            onClick={exportExcel}
            className="px-4 py-2 bg-vert text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
          >
            📊 Export Excel
          </button>
          <button
            onClick={() => {
              if (!clientSelectionne) {
                ajouterNotification({
                  type: 'ATTENTION',
                  icone: '⚠️',
                  titre: 'VALIDATION',
                  message: 'Veuillez sélectionner un client avant d\'exporter le relevé de compte'
                })
                return
              }
              exportReleveCompte()
            }}
            className="px-4 py-2 bg-bleu text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
          >
            📄 Relevé de Compte PDF
          </button>
        </div>

        <div className="overflow-x-auto border-2 border-argent rounded-lg">
          <table className="w-full">
            <thead className="bg-navy text-white">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-sm font-bold cursor-pointer hover:bg-opacity-90"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span className="ml-1">{header.column.getIsSorted() === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, idx) => (
                <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-navyClair'}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 text-sm border-b border-argent">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-navy">
            Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()} | 
            Total: {encaissementsFiltres.length} encaissement(s)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-4 py-2 bg-bleu text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Précédent
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-4 py-2 bg-bleu text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant →
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-navy text-white p-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {currentEncaissement ? '📝 Modifier l\'encaissement' : '➕ Nouvel encaissement'}
              </h2>
              <button onClick={resetForm} className="text-2xl hover:text-orange">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Facture *</label>
                  <select
                    value={formData.factureId}
                    onChange={(e) => setFormData({ ...formData, factureId: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                    required
                  >
                    <option value="">Sélectionner une facture</option>
                    {factures
                      .filter(f => f.clientId === clientSelectionne)
                      .map(f => (
                        <option key={f.id} value={f.id}>
                          {f.reference} - {formatFCFA(f.montantTTC)}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Montant *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.montant}
                    onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Mode de paiement *</label>
                  <select
                    value={formData.modePaiement}
                    onChange={(e) => setFormData({ ...formData, modePaiement: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                    required
                  >
                    <option value="">Sélectionner un mode</option>
                    {MOYENS_REGLEMENT.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Date d'encaissement *</label>
                  <input
                    type="date"
                    value={formData.dateEncaissement}
                    onChange={(e) => setFormData({ ...formData, dateEncaissement: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Référence</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-navy mb-1">Observation</label>
                  <textarea
                    value={formData.observation}
                    onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                    rows="3"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
                >
                  {currentEncaissement ? '💾 Enregistrer' : '➕ Créer'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-argent text-navy rounded-lg font-semibold hover:bg-opacity-90 transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && currentEncaissement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
            <div className="bg-bleu text-white p-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold">👁 Détails de l'encaissement</h2>
              <button onClick={() => setShowViewModal(false)} className="text-2xl hover:text-orange">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-bleu font-semibold">Client</div>
                  <div className="text-navy font-bold">{currentEncaissement.clientNom}</div>
                </div>
                <div>
                  <div className="text-sm text-bleu font-semibold">Facture</div>
                  <div className="text-navy font-bold">{currentEncaissement.factureReference}</div>
                </div>
                <div>
                  <div className="text-sm text-bleu font-semibold">Montant</div>
                  <div className="text-orange font-bold text-xl">{formatFCFA(currentEncaissement.montant)}</div>
                </div>
                <div>
                  <div className="text-sm text-bleu font-semibold">Mode de paiement</div>
                  <div className="text-navy font-bold">{currentEncaissement.modePaiement}</div>
                </div>
                <div>
                  <div className="text-sm text-bleu font-semibold">Date</div>
                  <div className="text-navy">{formatDate(currentEncaissement.dateEncaissement)}</div>
                </div>
                <div>
                  <div className="text-sm text-bleu font-semibold">Référence</div>
                  <div className="text-navy">{currentEncaissement.reference || '-'}</div>
                </div>
                {currentEncaissement.observation && (
                  <div className="col-span-2">
                    <div className="text-sm text-bleu font-semibold">Observation</div>
                    <div className="text-navy">{currentEncaissement.observation}</div>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setShowViewModal(false)}
                className="w-full px-6 py-3 bg-bleu text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showReglementModal && currentEncaissement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="bg-vert text-white p-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold">💳 Modifier le règlement</h2>
              <button onClick={() => setShowReglementModal(false)} className="text-2xl hover:text-orange">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-navyClair p-3 rounded-lg">
                <div className="text-sm text-bleu">Encaissement</div>
                <div className="font-bold text-navy">{currentEncaissement.factureReference}</div>
                <div className="text-sm text-navy">Montant actuel: {formatFCFA(currentEncaissement.montant)}</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1">Nouveau montant *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.montant}
                  onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1">Mode de paiement *</label>
                <select
                  value={formData.modePaiement}
                  onChange={(e) => setFormData({ ...formData, modePaiement: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                  required
                >
                  <option value="">Sélectionner un mode</option>
                  {MOYENS_REGLEMENT.map(mode => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.dateEncaissement}
                  onChange={(e) => setFormData({ ...formData, dateEncaissement: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveReglement}
                  className="flex-1 px-6 py-3 bg-vert text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
                >
                  💾 Enregistrer
                </button>
                <button
                  onClick={() => setShowReglementModal(false)}
                  className="px-6 py-3 bg-argent text-navy rounded-lg font-semibold hover:bg-opacity-90 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
