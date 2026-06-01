import { useState, useMemo } from 'react'
import { useFacturesStore } from '../../store/useFacturesStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useClientsStore } from '../../store/useClientsStore'
import { formatDate, formatFCFA } from '../../utils/format'
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table'
import * as XLSX from 'xlsx'
import { createSikaPDF, finalizeSikaPDF, sikaTable, formatMontant, formatDate as formatDatePDF } from '../../utils/printUtils'

const MOYENS_REGLEMENT = ['ESPECES', 'CHEQUE', 'VIREMENT', 'CARTE', 'TRAITE', 'AUTRE']
const TAUX_TVA = 18

export default function SuiviFactures() {
  const { factures, addFacture, updateFacture, deleteFacture } = useFacturesStore()
  const { addLog } = useAuditStore()
  const { clients } = useClientsStore()

  const [recherche, setRecherche] = useState('')
  const [filtreClient, setFiltreClient] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreDateDebut, setFiltreDateDebut] = useState('')
  const [filtreDateFin, setFiltreDateFin] = useState('')
  const [filtreMontantMin, setFiltreMontantMin] = useState('')
  const [filtreMontantMax, setFiltreMontantMax] = useState('')
  const [sorting, setSorting] = useState([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  const [showModal, setShowModal] = useState(false)
  const [showReglementModal, setShowReglementModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [currentFacture, setCurrentFacture] = useState(null)
  const [formData, setFormData] = useState({
    clientId: '',
    montantHT: '',
    tva: '',
    montantTTC: '',
    dateDepot: '',
    delaiReglement: 30,
    dateReglement: '',
    moyenReglement: '',
    reference: '',
    observation: ''
  })

  const calculerStatut = (facture) => {
    if (facture.dateReglement) {
      return { label: 'Payée', color: 'bg-vert text-white', icon: '✅' }
    }
    
    if (!facture.dateDepot) {
      return { label: 'Brouillon', color: 'bg-argent text-navy', icon: '📝' }
    }

    const dateEcheance = new Date(facture.dateDepot)
    dateEcheance.setDate(dateEcheance.getDate() + (facture.delaiReglement || 30))
    const aujourdhui = new Date()

    if (aujourdhui > dateEcheance) {
      return { label: 'En retard', color: 'bg-rouge text-white', icon: '🔴' }
    }

    return { label: 'En attente', color: 'bg-orange text-white', icon: '🟠' }
  }

  const facturesAvecClients = useMemo(() => {
    return factures.map(f => {
      const client = clients.find(c => c.id === f.clientId)
      const statut = calculerStatut(f)
      return {
        ...f,
        clientNom: client?.nom || 'Client inconnu',
        statut: statut
      }
    })
  }, [factures, clients])

  const facturesFiltrees = useMemo(() => {
    return facturesAvecClients.filter(f => {
      const matchRecherche = !recherche || 
        f.reference?.toLowerCase().includes(recherche.toLowerCase()) ||
        f.clientNom?.toLowerCase().includes(recherche.toLowerCase()) ||
        f.observation?.toLowerCase().includes(recherche.toLowerCase())
      
      const matchClient = !filtreClient || f.clientId === parseInt(filtreClient)
      const matchStatut = !filtreStatut || f.statut.label === filtreStatut
      
      const matchDate = (!filtreDateDebut || f.dateDepot >= filtreDateDebut) &&
                        (!filtreDateFin || f.dateDepot <= filtreDateFin)
      
      const matchMontant = (!filtreMontantMin || f.montantTTC >= parseFloat(filtreMontantMin)) &&
                           (!filtreMontantMax || f.montantTTC <= parseFloat(filtreMontantMax))
      
      return matchRecherche && matchClient && matchStatut && matchDate && matchMontant
    })
  }, [facturesAvecClients, recherche, filtreClient, filtreStatut, filtreDateDebut, filtreDateFin, filtreMontantMin, filtreMontantMax])

  const totaux = useMemo(() => {
    const totalHT = facturesFiltrees.reduce((sum, f) => sum + (f.montantHT || 0), 0)
    const totalTVA = facturesFiltrees.reduce((sum, f) => sum + (f.tva || 0), 0)
    const totalTTC = facturesFiltrees.reduce((sum, f) => sum + (f.montantTTC || 0), 0)
    const totalRegle = facturesFiltrees.filter(f => f.dateReglement).reduce((sum, f) => sum + (f.montantTTC || 0), 0)
    const resteARecouvrer = totalTTC - totalRegle

    return { totalHT, totalTVA, totalTTC, totalRegle, resteARecouvrer }
  }, [facturesFiltrees])

  const handleMontantHTChange = (value) => {
    const montantHT = parseFloat(value) || 0
    const tva = montantHT * (TAUX_TVA / 100)
    const montantTTC = montantHT + tva

    setFormData({
      ...formData,
      montantHT: value,
      tva: tva.toFixed(2),
      montantTTC: montantTTC.toFixed(2)
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const factureData = {
      ...formData,
      clientId: parseInt(formData.clientId),
      montantHT: parseFloat(formData.montantHT),
      tva: parseFloat(formData.tva),
      montantTTC: parseFloat(formData.montantTTC),
      delaiReglement: parseInt(formData.delaiReglement)
    }

    if (currentFacture) {
      updateFacture(currentFacture.id, factureData)
      addLog('UPDATE', 'FACTURE', currentFacture.id, `Facture ${formData.reference} modifiée`)
    } else {
      const newFacture = addFacture(factureData)
      addLog('CREATE', 'FACTURE', newFacture.id, `Facture ${formData.reference} créée`)
    }

    resetForm()
  }

  const handleAddReglement = (facture) => {
    setCurrentFacture(facture)
    setFormData({
      ...facture,
      dateReglement: new Date().toISOString().split('T')[0],
      moyenReglement: ''
    })
    setShowReglementModal(true)
  }

  const handleSaveReglement = () => {
    updateFacture(currentFacture.id, {
      dateReglement: formData.dateReglement,
      moyenReglement: formData.moyenReglement
    })
    addLog('UPDATE', 'FACTURE', currentFacture.id, `Règlement ajouté pour facture ${currentFacture.reference}`)
    setShowReglementModal(false)
    resetForm()
  }

  const handleDelete = (facture) => {
    if (confirm(`Supprimer la facture ${facture.reference} ?`)) {
      deleteFacture(facture.id)
      addLog('DELETE', 'FACTURE', facture.id, `Facture ${facture.reference} supprimée`)
    }
  }

  const handleEdit = (facture) => {
    setCurrentFacture(facture)
    setFormData(facture)
    setShowModal(true)
  }

  const handleView = (facture) => {
    setCurrentFacture(facture)
    setShowViewModal(true)
  }

  const handlePrint = async (facture) => {
    const client = clients.find(c => c.id === facture.clientId)
    const ctx = await createSikaPDF(`FACTURE ${facture.reference}`)
    const { doc, startY, MARGE_G, PAGE_W } = ctx
    
    let y = startY
    
    // Informations client
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(27, 42, 74)
    doc.text('CLIENT :', MARGE_G, y)
    doc.setFont('helvetica', 'normal')
    doc.text(client?.nom || 'N/A', MARGE_G + 25, y)
    y += 6
    
    doc.setFont('helvetica', 'bold')
    doc.text('DATE DE DÉPÔT :', MARGE_G, y)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(facture.dateDepot), MARGE_G + 40, y)
    y += 10
    
    // Ligne séparatrice
    doc.setDrawColor(230, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(MARGE_G, y, PAGE_W - 15, y)
    y += 8
    
    // Tableau montants
    const columns = ['Description', 'Montant (FCFA)']
    const rows = [
      ['Montant HT', formatMontant(facture.montantHT)],
      ['TVA (18%)', formatMontant(facture.tva)],
      ['MONTANT TTC', formatMontant(facture.montantTTC)]
    ]
    
    const finalY = sikaTable(doc, columns, rows, y, ctx)
    y = finalY + 10
    
    // Informations complémentaires
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(27, 42, 74)
    
    const infos = [
      ['Délai de règlement', `${facture.delaiReglement} jours`],
      ['Statut', facture.statut.label],
      ...(facture.dateReglement ? [['Date de règlement', formatDate(facture.dateReglement)]] : []),
      ...(facture.moyenReglement ? [['Moyen de règlement', facture.moyenReglement]] : []),
      ...(facture.observation ? [['Observation', facture.observation]] : [])
    ]
    
    infos.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.text(label + ' :', MARGE_G, y)
      doc.setFont('helvetica', 'normal')
      doc.text(value, MARGE_G + 50, y)
      y += 6
    })
    
    await finalizeSikaPDF(ctx, `SIKA_Facture_${facture.reference.replace(/\//g, '_')}.pdf`)
    addLog('PRINT', 'FACTURE', facture.id, `Facture ${facture.reference} imprimée`)
  }

  const resetForm = () => {
    setFormData({
      clientId: '',
      montantHT: '',
      tva: '',
      montantTTC: '',
      dateDepot: '',
      delaiReglement: 30,
      dateReglement: '',
      moyenReglement: '',
      reference: '',
      observation: ''
    })
    setCurrentFacture(null)
    setShowModal(false)
    setShowReglementModal(false)
  }

  const exportExcel = () => {
    const data = facturesFiltrees.map(f => ({
      'NOM DU CLIENT': f.clientNom,
      'MONTANT HT': f.montantHT,
      'TVA': f.tva,
      'MONTANT TTC': f.montantTTC,
      'DATE DE DEPOT': formatDate(f.dateDepot),
      'DELAI DE REGLEMENT': f.delaiReglement,
      'DATE DE REGLEMENT': f.dateReglement ? formatDate(f.dateReglement) : '',
      'MOYEN DE REGLEMENT': f.moyenReglement || '',
      'REFERENCE': f.reference,
      'OBSERVATION': f.observation || ''
    }))

    data.push({
      'NOM DU CLIENT': 'TOTAUX',
      'MONTANT HT': totaux.totalHT,
      'TVA': totaux.totalTVA,
      'MONTANT TTC': totaux.totalTTC,
      'DATE DE DEPOT': '',
      'DELAI DE REGLEMENT': '',
      'DATE DE REGLEMENT': '',
      'MOYEN DE REGLEMENT': '',
      'REFERENCE': '',
      'OBSERVATION': `Total réglé: ${totaux.totalRegle} | Reste: ${totaux.resteARecouvrer}`
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Factures')
    XLSX.writeFile(wb, `factures_${new Date().toISOString().split('T')[0]}.xlsx`)
    addLog('EXPORT', 'FACTURE', null, 'Export Excel des factures')
  }

  const exportPDF = async () => {
    const ctx = await createSikaPDF('SUIVI DES FACTURES CLIENTS')
    const { doc, startY, MARGE_G, PAGE_W } = ctx
    
    let y = startY
    
    // Période
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    const periode = `Période : ${filtreDateDebut ? formatDate(filtreDateDebut) : 'début'} au ${filtreDateFin ? formatDate(filtreDateFin) : "aujourd'hui"}`
    doc.text(periode, MARGE_G, y)
    y += 8
    
    // Tableau factures
    const columns = ['Client', 'HT (FCFA)', 'TVA (FCFA)', 'TTC (FCFA)', 'Référence', 'Statut']
    const rows = facturesFiltrees.map(f => [
      f.clientNom,
      formatMontant(f.montantHT),
      formatMontant(f.tva),
      formatMontant(f.montantTTC),
      f.reference,
      f.statut.label
    ])
    
    const finalY = sikaTable(doc, columns, rows, y, ctx)
    let ty = finalY + 10
    
    // Totaux
    const totauxX = PAGE_W - 80
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(27, 42, 74)
    
    [
      ['Total HT', formatMontant(totaux.totalHT) + ' FCFA'],
      ['Total TVA', formatMontant(totaux.totalTVA) + ' FCFA'],
      ['Total TTC', formatMontant(totaux.totalTTC) + ' FCFA'],
      ['Total réglé', formatMontant(totaux.totalRegle) + ' FCFA'],
      ['Reste à recouvrer', formatMontant(totaux.resteARecouvrer) + ' FCFA']
    ].forEach(([label, val], idx) => {
      const isReste = idx === 4
      if (isReste) {
        doc.setFillColor(230, 0, 0)
        doc.rect(totauxX - 2, ty - 4, 82, 8, 'F')
        doc.setTextColor(255, 255, 255)
      } else if (idx === 3) {
        doc.setTextColor(26, 122, 74)
      } else {
        doc.setTextColor(27, 42, 74)
      }
      doc.text(label, totauxX, ty)
      doc.text(val, PAGE_W - 15, ty, { align: 'right' })
      ty += 6
    })
    
    await finalizeSikaPDF(ctx, `SIKA_Factures_${new Date().toISOString().split('T')[0]}.pdf`)
    addLog('EXPORT', 'FACTURE', null, 'Export PDF des factures')
  }

  const columns = useMemo(() => [
    {
      accessorKey: 'clientNom',
      header: 'NOM DU CLIENT',
      cell: info => <span className="font-semibold text-navy">{info.getValue()}</span>
    },
    {
      accessorKey: 'montantHT',
      header: 'MONTANT HT',
      cell: info => <span className="text-navy">{formatFCFA(info.getValue())}</span>
    },
    {
      accessorKey: 'tva',
      header: 'TVA',
      cell: info => <span className="text-bleu">{formatFCFA(info.getValue())}</span>
    },
    {
      accessorKey: 'montantTTC',
      header: 'MONTANT TTC',
      cell: info => <span className="font-bold text-orange">{formatFCFA(info.getValue())}</span>
    },
    {
      accessorKey: 'dateDepot',
      header: 'DATE DE DEPOT',
      cell: info => <span className="text-navy">{formatDate(info.getValue())}</span>
    },
    {
      accessorKey: 'delaiReglement',
      header: 'DELAI DE REGLEMENT',
      cell: info => <span className="text-navy">{info.getValue()} jours</span>
    },
    {
      accessorKey: 'dateReglement',
      header: 'DATE DE REGLEMENT',
      cell: info => <span className="text-vert">{info.getValue() ? formatDate(info.getValue()) : '-'}</span>
    },
    {
      accessorKey: 'moyenReglement',
      header: 'MOYEN DE REGLEMENT',
      cell: info => <span className="text-navy">{info.getValue() || '-'}</span>
    },
    {
      accessorKey: 'reference',
      header: 'REFERENCE',
      cell: info => <span className="font-bold text-navy">{info.getValue()}</span>
    },
    {
      accessorKey: 'observation',
      header: 'OBSERVATION',
      cell: info => <span className="text-navy text-sm">{info.getValue() || '-'}</span>
    },
    {
      id: 'statut',
      header: 'STATUT',
      cell: ({ row }) => {
        const statut = row.original.statut
        return (
          <span className={`px-2 py-1 rounded text-xs font-semibold ${statut.color}`}>
            {statut.icon} {statut.label}
          </span>
        )
      }
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
          {!row.original.dateReglement && (
            <button onClick={() => handleAddReglement(row.original)} className="p-1 hover:bg-vert rounded text-white bg-vert" title="Ajouter règlement">
              💳
            </button>
          )}
          <button onClick={() => handleDelete(row.original)} className="p-1 hover:bg-rouge rounded text-white" title="Supprimer">
            🗑
          </button>
        </div>
      )
    }
  ], [clients])

  const table = useReactTable({
    data: facturesFiltrees,
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
          <h1 className="text-3xl font-bold text-navy">📊 SUIVI DES FACTURES CLIENTS</h1>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => { setCurrentFacture(null); setShowModal(true); }}
            className="px-4 py-2 bg-orange text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
          >
            ➕ Nouvelle Facture
          </button>
          <button
            onClick={exportExcel}
            className="px-4 py-2 bg-vert text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
          >
            📊 Export Excel
          </button>
          <button
            onClick={exportPDF}
            className="px-4 py-2 bg-bleu text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
          >
            📄 Export PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <input
            type="text"
            placeholder="🔍 Recherche..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
          />
          
          <select
            value={filtreClient}
            onChange={(e) => setFiltreClient(e.target.value)}
            className="px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
          >
            <option value="">Tous les clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>

          <select
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
            className="px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
          >
            <option value="">Tous les statuts</option>
            <option value="Payée">✅ Payée</option>
            <option value="En attente">🟠 En attente</option>
            <option value="En retard">🔴 En retard</option>
            <option value="Brouillon">📝 Brouillon</option>
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={filtreDateDebut}
              onChange={(e) => setFiltreDateDebut(e.target.value)}
              className="px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none flex-1"
              placeholder="Date début"
            />
            <input
              type="date"
              value={filtreDateFin}
              onChange={(e) => setFiltreDateFin(e.target.value)}
              className="px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none flex-1"
              placeholder="Date fin"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Montant min"
              value={filtreMontantMin}
              onChange={(e) => setFiltreMontantMin(e.target.value)}
              className="px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none flex-1"
            />
            <input
              type="number"
              placeholder="Montant max"
              value={filtreMontantMax}
              onChange={(e) => setFiltreMontantMax(e.target.value)}
              className="px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none flex-1"
            />
          </div>
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

        <div className="mt-6 bg-orangeClair border-2 border-orange rounded-lg p-4">
          <h3 className="text-lg font-bold text-navy mb-3">📊 TOTAUX</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-3 rounded-lg border-2 border-argent">
              <div className="text-xs text-bleu font-semibold">Total HT</div>
              <div className="text-xl font-bold text-navy">{formatFCFA(totaux.totalHT)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border-2 border-argent">
              <div className="text-xs text-bleu font-semibold">Total TVA</div>
              <div className="text-xl font-bold text-navy">{formatFCFA(totaux.totalTVA)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border-2 border-argent">
              <div className="text-xs text-bleu font-semibold">Total TTC</div>
              <div className="text-xl font-bold text-orange">{formatFCFA(totaux.totalTTC)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border-2 border-argent">
              <div className="text-xs text-bleu font-semibold">Total réglé</div>
              <div className="text-xl font-bold text-vert">{formatFCFA(totaux.totalRegle)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border-2 border-argent">
              <div className="text-xs text-bleu font-semibold">Reste à recouvrer</div>
              <div className="text-xl font-bold text-rouge">{formatFCFA(totaux.resteARecouvrer)}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-navy">
            Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()} | 
            Total: {facturesFiltrees.length} facture(s)
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
                {currentFacture ? '📝 Modifier la facture' : '➕ Nouvelle facture'}
              </h2>
              <button onClick={resetForm} className="text-2xl hover:text-orange">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Client *</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                    required
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Référence *</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Montant HT *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.montantHT}
                    onChange={(e) => handleMontantHTChange(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">TVA (18%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tva}
                    readOnly
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg bg-navyClair"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Montant TTC</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.montantTTC}
                    readOnly
                    className="w-full px-4 py-2 border-2 border-orange rounded-lg bg-orangeClair font-bold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Date de dépôt</label>
                  <input
                    type="date"
                    value={formData.dateDepot}
                    onChange={(e) => setFormData({ ...formData, dateDepot: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Délai de règlement (jours)</label>
                  <input
                    type="number"
                    value={formData.delaiReglement}
                    onChange={(e) => setFormData({ ...formData, delaiReglement: e.target.value })}
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
                  {currentFacture ? '💾 Enregistrer' : '➕ Créer'}
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

      {showReglementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="bg-vert text-white p-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold">💳 Ajouter un règlement</h2>
              <button onClick={() => setShowReglementModal(false)} className="text-2xl hover:text-orange">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-navyClair p-3 rounded-lg">
                <div className="text-sm text-bleu">Facture</div>
                <div className="font-bold text-navy">{currentFacture?.reference}</div>
                <div className="text-sm text-navy">Montant: {formatFCFA(currentFacture?.montantTTC)}</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1">Date de règlement *</label>
                <input
                  type="date"
                  value={formData.dateReglement}
                  onChange={(e) => setFormData({ ...formData, dateReglement: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-1">Moyen de règlement *</label>
                <select
                  value={formData.moyenReglement}
                  onChange={(e) => setFormData({ ...formData, moyenReglement: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                  required
                >
                  <option value="">Sélectionner</option>
                  {MOYENS_REGLEMENT.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
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

      {showViewModal && currentFacture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
            <div className="bg-bleu text-white p-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold">👁 Détails de la facture</h2>
              <button onClick={() => setShowViewModal(false)} className="text-2xl hover:text-orange">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-navyClair p-3 rounded-lg">
                  <div className="text-xs text-bleu font-semibold">Client</div>
                  <div className="font-bold text-navy">{currentFacture.clientNom}</div>
                </div>
                <div className="bg-navyClair p-3 rounded-lg">
                  <div className="text-xs text-bleu font-semibold">Référence</div>
                  <div className="font-bold text-navy">{currentFacture.reference}</div>
                </div>
                <div className="bg-navyClair p-3 rounded-lg">
                  <div className="text-xs text-bleu font-semibold">Montant HT</div>
                  <div className="font-bold text-navy">{formatFCFA(currentFacture.montantHT)}</div>
                </div>
                <div className="bg-navyClair p-3 rounded-lg">
                  <div className="text-xs text-bleu font-semibold">TVA (18%)</div>
                  <div className="font-bold text-navy">{formatFCFA(currentFacture.tva)}</div>
                </div>
                <div className="bg-orangeClair p-3 rounded-lg border-2 border-orange">
                  <div className="text-xs text-orange font-semibold">Montant TTC</div>
                  <div className="font-bold text-orange text-xl">{formatFCFA(currentFacture.montantTTC)}</div>
                </div>
                <div className="bg-navyClair p-3 rounded-lg">
                  <div className="text-xs text-bleu font-semibold">Statut</div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${currentFacture.statut.color}`}>
                    {currentFacture.statut.icon} {currentFacture.statut.label}
                  </span>
                </div>
                <div className="bg-navyClair p-3 rounded-lg">
                  <div className="text-xs text-bleu font-semibold">Date de dépôt</div>
                  <div className="font-bold text-navy">{formatDate(currentFacture.dateDepot)}</div>
                </div>
                <div className="bg-navyClair p-3 rounded-lg">
                  <div className="text-xs text-bleu font-semibold">Délai de règlement</div>
                  <div className="font-bold text-navy">{currentFacture.delaiReglement} jours</div>
                </div>
                {currentFacture.dateReglement && (
                  <>
                    <div className="bg-vert bg-opacity-10 p-3 rounded-lg border-2 border-vert">
                      <div className="text-xs text-vert font-semibold">Date de règlement</div>
                      <div className="font-bold text-vert">{formatDate(currentFacture.dateReglement)}</div>
                    </div>
                    <div className="bg-vert bg-opacity-10 p-3 rounded-lg border-2 border-vert">
                      <div className="text-xs text-vert font-semibold">Moyen de règlement</div>
                      <div className="font-bold text-vert">{currentFacture.moyenReglement}</div>
                    </div>
                  </>
                )}
                {currentFacture.observation && (
                  <div className="col-span-2 bg-navyClair p-3 rounded-lg">
                    <div className="text-xs text-bleu font-semibold">Observation</div>
                    <div className="text-navy">{currentFacture.observation}</div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowViewModal(false); handleEdit(currentFacture); }}
                  className="flex-1 px-6 py-3 bg-orange text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
                >
                  📝 Modifier
                </button>
                <button
                  onClick={() => { setShowViewModal(false); handlePrint(currentFacture); }}
                  className="flex-1 px-6 py-3 bg-bleu text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
                >
                  🖨 Imprimer
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-6 py-3 bg-argent text-navy rounded-lg font-semibold hover:bg-opacity-90 transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
