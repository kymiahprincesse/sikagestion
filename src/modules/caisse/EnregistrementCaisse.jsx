import { useState, useMemo, useEffect } from 'react'
import { useNotifications } from '../../components/NotificationProvider'
import { useCaisseStore } from '../../store/useCaisseStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useNotificationsStore } from '../../store/useNotificationsStore'
import { formatDate, formatFCFA } from '../../utils/format'
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table'
import * as XLSX from 'xlsx'
import { createSikaPDF, finalizeSikaPDF, sikaTable, formatMontant, formatDate as formatDatePDF } from '../../utils/printUtils'
import { supabase } from '../../lib/supabaseClient'

export default function EnregistrementCaisse() {
  const { mouvements, soldeCaisse, addMouvement, updateMouvement, deleteMouvement, setMouvements } = useCaisseStore()
  const { addLog } = useAuditStore()
  const { ajouterNotification } = useNotificationsStore()
  const { confirmDelete } = useNotifications()

  // Fonction pour vider toutes les données de caisse
  const viderDonneesCaisse = () => {
    setMouvements([])
    const caisseStore = useCaisseStore.getState()
    caisseStore.setSoldeCaisse(0)
    caisseStore.setMouvements([])
  }

  // Vider les données au chargement pour afficher une page propre
  useEffect(() => {
    viderDonneesCaisse()
  }, [])

  const [recherche, setRecherche] = useState('')
  const [filtreType, setFiltreType] = useState('')
  const [filtreDateDebut, setFiltreDateDebut] = useState('')
  const [filtreDateFin, setFiltreDateFin] = useState('')
  const [filtreMontantMin, setFiltreMontantMin] = useState('')
  const [filtreMontantMax, setFiltreMontantMax] = useState('')
  const [sorting, setSorting] = useState([{ id: 'date', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [currentMouvement, setCurrentMouvement] = useState(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reference: '',
    libelles: '',
    description: '',
    entree: '',
    sortir: '',
    type: 'ENTREE',
    categorie: '',
    beneficiaire: '',
    modePaiement: ''
  })

  const mouvementsAvecSolde = useMemo(() => {
    const mouvementsTries = [...mouvements].sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB
      }
      return a.id - b.id
    })

    let soldeAccumule = 0
    return mouvementsTries.map(m => {
      const entree = m.type === 'ENTREE' ? m.montant : 0
      const sortir = m.type === 'SORTIE' ? m.montant : 0
      soldeAccumule = soldeAccumule + entree - sortir
      
      return {
        ...m,
        entree,
        sortir,
        solde: soldeAccumule
      }
    })
  }, [mouvements])

  const mouvementsFiltres = useMemo(() => {
    return mouvementsAvecSolde.filter(m => {
      const matchRecherche = !recherche || 
        m.reference?.toLowerCase().includes(recherche.toLowerCase()) ||
        m.libelles?.toLowerCase().includes(recherche.toLowerCase())
      
      const matchType = !filtreType || m.type === filtreType
      
      const matchDate = (!filtreDateDebut || m.date >= filtreDateDebut) &&
                        (!filtreDateFin || m.date <= filtreDateFin)
      
      const matchMontant = (!filtreMontantMin || m.montant >= parseFloat(filtreMontantMin)) &&
                           (!filtreMontantMax || m.montant <= parseFloat(filtreMontantMax))
      
      return matchRecherche && matchType && matchDate && matchMontant
    })
  }, [mouvementsAvecSolde, recherche, filtreType, filtreDateDebut, filtreDateFin, filtreMontantMin, filtreMontantMax])

  const totaux = useMemo(() => {
    const totalEntree = mouvementsFiltres.reduce((sum, m) => sum + (m.entree || 0), 0)
    const totalSortir = mouvementsFiltres.reduce((sum, m) => sum + (m.sortir || 0), 0)
    const soldeFinal = totalEntree - totalSortir

    return { totalEntree, totalSortir, soldeFinal }
  }, [mouvementsFiltres])

  const validateForm = () => {
    const entree = parseFloat(formData.entree) || 0
    const sortir = parseFloat(formData.sortir) || 0

    if (entree > 0 && sortir > 0) {
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR',
        message: 'ENTREE et SORTIR ne peuvent pas être simultanés sur la même ligne !'
      })
      return false
    }

    if (entree === 0 && sortir === 0) {
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR',
        message: 'Vous devez saisir soit une ENTREE soit une SORTIE !'
      })
      return false
    }

    if (sortir > 0) {
      const dernierSolde = mouvementsAvecSolde.length > 0 
        ? mouvementsAvecSolde[mouvementsAvecSolde.length - 1].solde 
        : 0
      
      if (currentMouvement) {
        const mouvementActuel = mouvementsAvecSolde.find(m => m.id === currentMouvement.id)
        const soldeAvantModif = mouvementActuel ? mouvementActuel.solde - mouvementActuel.entree + mouvementActuel.sortir : dernierSolde
        
        if (soldeAvantModif - sortir < 0) {
          ajouterNotification({
            type: 'URGENT',
            icone: '🔴',
            titre: 'ALERTE BLOQUANTE',
            message: 'Le SOLDE ne peut pas être négatif ! Solde disponible : ' + formatFCFA(soldeAvantModif)
          })
          return false
        }
      } else {
        if (dernierSolde - sortir < 0) {
          ajouterNotification({
            type: 'URGENT',
            icone: '🔴',
            titre: 'ALERTE BLOQUANTE',
            message: 'Le SOLDE ne peut pas être négatif ! Solde disponible : ' + formatFCFA(dernierSolde)
          })
          return false
        }
      }
    }

    return true
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const entree = parseFloat(formData.entree) || 0
    const sortir = parseFloat(formData.sortir) || 0
    const type = entree > 0 ? 'ENTREE' : 'SORTIE'
    const montant = entree > 0 ? entree : sortir

    const mouvementData = {
      date: formData.date,
      reference: formData.reference,
      libelles: formData.libelles,
      description: formData.description || formData.libelles,
      type: type,
      montant: montant,
      categorie: formData.categorie,
      beneficiaire: formData.beneficiaire,
      modePaiement: formData.mode_paiement,
      caisse_nom: 'Caisse Principale',
      utilisateur: 'Gérant'
    }

    if (currentMouvement) {
      updateMouvement(currentMouvement.id, mouvementData)
      addLog({
        module: 'CAISSE',
        action: 'UPDATE',
        utilisateur: 'Gérant',
        avant: currentMouvement,
        apres: mouvementData,
        impactFinancier: type === 'ENTREE' ? montant : -montant
      })
    } else {
      const newMouvement = addMouvement(mouvementData)
      addLog({
        module: 'CAISSE',
        action: 'CREATE',
        utilisateur: 'Gérant',
        apres: newMouvement,
        impactFinancier: type === 'ENTREE' ? montant : -montant
      })
    }

    resetForm()
  }

  const handleDelete = async (mouvement) => {
    const ok = await confirmDelete(`le mouvement "${mouvement.libelles}" de ${formatFCFA(mouvement.montant)}`)
    if (!ok) return
    deleteMouvement(mouvement.id)
    addLog({
      module: 'CAISSE',
      action: 'DELETE',
      utilisateur: 'Gérant',
      avant: mouvement,
      impactFinancier: mouvement.type === 'ENTREE' ? -mouvement.montant : mouvement.montant
    })
  }

  const handleEdit = (mouvement) => {
    setCurrentMouvement(mouvement)
    setFormData({
      date: mouvement.date,
      reference: mouvement.reference || '',
      libelles: mouvement.libelles || mouvement.description || '',
      description: mouvement.description || mouvement.libelles || '',
      entree: mouvement.type === 'ENTREE' ? mouvement.montant : '',
      sortir: mouvement.type === 'SORTIE' ? mouvement.montant : '',
      type: mouvement.type,
      categorie: mouvement.categorie || '',
      beneficiaire: mouvement.beneficiaire || '',
      modePaiement: mouvement.modePaiement || ''
    })
    setShowModal(true)
  }

  const handleView = (mouvement) => {
    setCurrentMouvement(mouvement)
    setShowViewModal(true)
  }

  const handlePrint = async (mouvement) => {
    const ctx = await createSikaPDF(`MOUVEMENT DE CAISSE - ${mouvement.reference || mouvement.id}`);
    const { doc, startY, MARGE_G, PAGE_W } = ctx;
    
    let y = startY;
    
    // Informations mouvement
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    
    const infos = [
      ['Date', formatDate(mouvement.date)],
      ['Référence', mouvement.reference || 'N/A'],
      ['Type', mouvement.type]
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
    const rows = [[
      mouvement.libelles,
      formatMontant(mouvement.montant)
    ]];
    
    const finalY = sikaTable(doc, columns, rows, y, ctx);
    y = finalY + 20;
    
    // Signature
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(27, 42, 74);
    doc.text('_______________________', PAGE_W - 60, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Signature du Gérant', PAGE_W - 60, y);
    
    await finalizeSikaPDF(ctx, `SIKA_Mouvement_Caisse_${mouvement.reference || mouvement.id}.pdf`);
    
    addLog({
      module: 'CAISSE',
      action: 'PRINT',
      utilisateur: 'Gérant'
    });
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      reference: '',
      libelles: '',
      description: '',
      entree: '',
      sortir: '',
      type: 'ENTREE',
      categorie: '',
      beneficiaire: '',
      modePaiement: ''
    })
    setCurrentMouvement(null)
    setShowModal(false)
  }

  const exportExcel = () => {
    const data = mouvementsFiltres.map(m => ({
      'DATE': formatDate(m.date),
      'REFERENCE': m.reference || '',
      'LIBELLES': m.libelles || '',
      'ENTREE': m.entree || 0,
      'SORTIR': m.sortir || 0,
      'SOLDE': m.solde
    }))

    data.push({
      'DATE': '',
      'REFERENCE': '',
      'LIBELLES': 'TOTAUX',
      'ENTREE': totaux.totalEntree,
      'SORTIR': totaux.totalSortir,
      'SOLDE': totaux.soldeFinal
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Caisse')
    XLSX.writeFile(wb, `caisse_${new Date().toISOString().split('T')[0]}.xlsx`)
    addLog({
      module: 'CAISSE',
      action: 'EXPORT',
      utilisateur: 'Gérant'
    })
  }

  const exportPDF = async () => {
    const ctx = await createSikaPDF('ENREGISTREMENT CAISSE');
    const { doc, startY, MARGE_G, PAGE_W } = ctx;
    
    let y = startY;
    
    // Période
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const periode = `Période : ${filtreDateDebut ? formatDate(filtreDateDebut) : 'début'} au ${filtreDateFin ? formatDate(filtreDateFin) : "aujourd'hui"}`;
    doc.text(periode, MARGE_G, y);
    y += 8;
    
    // Tableau mouvements
    const columns = ['Date', 'Référence', 'Libellés', 'Entrée (FCFA)', 'Sortie (FCFA)', 'Solde (FCFA)'];
    const rows = mouvementsFiltres.map(m => [
      formatDate(m.date),
      m.reference || '—',
      m.libelles || '—',
      m.entree ? formatMontant(m.entree) : '—',
      m.sortir ? formatMontant(m.sortir) : '—',
      formatMontant(m.solde)
    ]);
    
    const finalY = sikaTable(doc, columns, rows, y, ctx);
    let ty = finalY + 10;
    
    // Totaux
    const totauxX = PAGE_W - 80;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    [
      ['Total ENTRÉE', formatMontant(totaux.totalEntree) + ' FCFA', 26, 122, 74],
      ['Total SORTIE', formatMontant(totaux.totalSortir) + ' FCFA', 230, 0, 0],
      ['SOLDE FINAL', formatMontant(totaux.soldeFinal) + ' FCFA', 27, 42, 74]
    ].forEach(([label, val, r, g, b], idx) => {
      const isSolde = idx === 2;
      if (isSolde) {
        doc.setFillColor(230, 0, 0);
        doc.rect(totauxX - 2, ty - 4, 82, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
      } else {
        doc.setTextColor(r, g, b);
        doc.setFontSize(9);
      }
      doc.text(label, totauxX, ty);
      doc.text(val, PAGE_W - 15, ty, { align: 'right' });
      ty += isSolde ? 10 : 6;
    });
    
    // Signature
    ty += 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(27, 42, 74);
    doc.text('_______________________', PAGE_W - 60, ty);
    ty += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Signature du Gérant', PAGE_W - 60, ty);
    
    await finalizeSikaPDF(ctx, `SIKA_Caisse_${new Date().toISOString().split('T')[0]}.pdf`);
    
    addLog({
      module: 'CAISSE',
      action: 'EXPORT',
      utilisateur: 'Gérant'
    });
  }

  const generateReference = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const count = mouvements.length + 1
    const sequence = String(count).padStart(3, '0')
    return `CAIS-${year}${month}${day}-${sequence}`
  }

  const handleEntreeChange = (value) => {
    setFormData({
      ...formData,
      entree: value,
      sortir: '',
      type: 'ENTREE'
    })
  }

  const handleSortirChange = (value) => {
    setFormData({
      ...formData,
      sortir: value,
      entree: '',
      type: 'SORTIE'
    })
  }

  const columns = useMemo(() => [
    {
      accessorKey: 'date',
      header: 'DATE',
      cell: info => <span className="text-navy font-semibold">{formatDate(info.getValue())}</span>
    },
    {
      accessorKey: 'reference',
      header: 'REFERENCE',
      cell: info => <span className="text-navy font-bold">{info.getValue() || '-'}</span>
    },
    {
      accessorKey: 'libelles',
      header: 'LIBELLES',
      cell: info => <span className="text-navy">{info.getValue() || '-'}</span>
    },
    {
      accessorKey: 'categorie',
      header: 'CATEGORIE',
      cell: info => {
        const value = info.getValue()
        return value ? (
          <span className="text-xs px-2 py-1 rounded-full bg-bleuClair text-bleu font-semibold">
            {value.replace('_', ' ')}
          </span>
        ) : (
          <span className="text-argent">-</span>
        )
      }
    },
    {
      accessorKey: 'entree',
      header: 'ENTREE',
      cell: info => {
        const value = info.getValue()
        return value > 0 ? (
          <span className="font-bold text-vert">{formatFCFA(value)}</span>
        ) : (
          <span className="text-argent">-</span>
        )
      }
    },
    {
      accessorKey: 'sortir',
      header: 'SORTIR',
      cell: info => {
        const value = info.getValue()
        return value > 0 ? (
          <span className="font-bold text-rouge">{formatFCFA(value)}</span>
        ) : (
          <span className="text-argent">-</span>
        )
      }
    },
    {
      accessorKey: 'solde',
      header: 'SOLDE',
      cell: info => {
        const value = info.getValue()
        return (
          <span className={`font-bold text-lg ${value < 0 ? 'text-rouge' : 'text-orange'}`}>
            {formatFCFA(value)}
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
          <button onClick={() => handleDelete(row.original)} className="p-1 hover:bg-rouge rounded text-white" title="Supprimer">
            🗑
          </button>
        </div>
      )
    }
  ], [])

  const table = useReactTable({
    data: mouvementsFiltres,
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
          <h1 className="text-3xl font-bold text-navy">💰 ENREGISTREMENT CAISSE</h1>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => { 
              setCurrentMouvement(null)
              setFormData({ 
                ...formData, 
                reference: generateReference(),
                entree: '', 
                sortir: '', 
                type: 'ENTREE' 
              })
              setShowModal(true)
            }}
            className="px-4 py-2 bg-vert text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
          >
            ➕ Entrée caisse
          </button>
          <button
            onClick={() => { 
              setCurrentMouvement(null)
              setFormData({ 
                ...formData, 
                reference: generateReference(),
                entree: '', 
                sortir: '', 
                type: 'SORTIE' 
              })
              setShowModal(true)
            }}
            className="px-4 py-2 bg-rouge text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
          >
            ➕ Sortie caisse
          </button>
          <button
            onClick={exportExcel}
            className="px-4 py-2 bg-orange text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
          >
            📊 Excel
          </button>
          <button
            onClick={exportPDF}
            className="px-4 py-2 bg-bleu text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
          >
            📄 PDF
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
            value={filtreType}
            onChange={(e) => setFiltreType(e.target.value)}
            className="px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
          >
            <option value="">Tous les types</option>
            <option value="ENTREE">✅ Entrée</option>
            <option value="SORTIE">❌ Sortie</option>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-lg border-2 border-argent">
              <div className="text-xs text-bleu font-semibold">Total ENTREE</div>
              <div className="text-xl font-bold text-vert">{formatFCFA(totaux.totalEntree)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border-2 border-argent">
              <div className="text-xs text-bleu font-semibold">Total SORTIR</div>
              <div className="text-xl font-bold text-rouge">{formatFCFA(totaux.totalSortir)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border-2 border-orange">
              <div className="text-xs text-bleu font-semibold">SOLDE FINAL</div>
              <div className={`text-2xl font-bold ${totaux.soldeFinal < 0 ? 'text-rouge' : 'text-orange'}`}>
                {formatFCFA(totaux.soldeFinal)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-navy">
            Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()} | 
            Total: {mouvementsFiltres.length} mouvement(s)
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
                {currentMouvement ? '📝 Modifier le mouvement' : '➕ Nouveau mouvement'}
              </h2>
              <button onClick={resetForm} className="text-2xl hover:text-orange">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="bg-orangeClair border-2 border-orange rounded-lg p-4 mb-4">
                <p className="text-sm font-bold text-rouge">⚠️ RÈGLES IMPORTANTES :</p>
                <ul className="text-xs text-navy mt-2 space-y-1">
                  <li>• ENTREE et SORTIR ne peuvent pas être simultanés</li>
                  <li>• Le SOLDE ne peut jamais être négatif</li>
                  <li>• Renseignez soit ENTREE soit SORTIR (pas les deux)</li>
                  <li>• Les données sont synchronisées en temps réel avec la base de données</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Référence (auto)</label>
                  <input
                    type="text"
                    value={formData.reference}
                    readOnly
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                    placeholder="Générée automatiquement"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-navy mb-1">Libellés *</label>
                  <textarea
                    value={formData.libelles}
                    onChange={(e) => setFormData({ ...formData, libelles: e.target.value, description: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                    rows="2"
                    placeholder="Description du mouvement (mentionner référence projet si applicable)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Catégorie</label>
                  <select
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    <option value="PAIEMENT_CLIENT">Paiement Client</option>
                    <option value="VENTE_MATERIEL">Vente Matériel</option>
                    <option value="LOCATION_MATERIEL">Location Matériel</option>
                    <option value="AUTRE_ENTREE">Autre Entrée</option>
                    <option value="ACHAT_MATERIEL">Achat Matériel</option>
                    <option value="LOYER">Loyer</option>
                    <option value="SALAIRE">Salaire</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="FOURNITURE_BUREAU">Fourniture Bureau</option>
                    <option value="SOUS_TRAITANCE">Sous-traitance</option>
                    <option value="AUTRE_SORTIE">Autre Sortie</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Bénéficiaire</label>
                  <input
                    type="text"
                    value={formData.beneficiaire}
                    onChange={(e) => setFormData({ ...formData, beneficiaire: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                    placeholder="Nom du bénéficiaire"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy mb-1">Mode de paiement</label>
                  <select
                    value={formData.modePaiement}
                    onChange={(e) => setFormData({ ...formData, modePaiement: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-argent rounded-lg focus:border-orange focus:outline-none"
                  >
                    <option value="">Sélectionner un mode</option>
                    <option value="ESPECES">Espèces</option>
                    <option value="CARTE_BANCAIRE">Carte Bancaire</option>
                    <option value="VIREMENT">Virement</option>
                    <option value="CHEQUE">Chèque</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-vert mb-1">ENTREE</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.entree}
                    onChange={(e) => handleEntreeChange(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-vert rounded-lg focus:border-vert focus:outline-none bg-white"
                    placeholder="Montant entrée"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-rouge mb-1">SORTIR</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sortir}
                    onChange={(e) => handleSortirChange(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-rouge rounded-lg focus:border-rouge focus:outline-none bg-white"
                    placeholder="Montant sortie"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange text-white rounded-lg font-semibold hover:bg-opacity-90 transition"
                >
                  {currentMouvement ? '💾 Enregistrer' : '➕ Créer'}
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

      {showViewModal && currentMouvement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
            <div className="bg-bleu text-white p-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold">👁 Détails du mouvement</h2>
              <button onClick={() => setShowViewModal(false)} className="text-2xl hover:text-orange">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-bleu font-semibold">Date</div>
                  <div className="text-navy font-bold">{formatDate(currentMouvement.date)}</div>
                </div>
                <div>
                  <div className="text-sm text-bleu font-semibold">Référence</div>
                  <div className="text-navy font-bold">{currentMouvement.reference || '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-bleu font-semibold">Libellés</div>
                  <div className="text-navy">{currentMouvement.libelles || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-bleu font-semibold">Type</div>
                  <div className={`font-bold ${currentMouvement.type === 'ENTREE' ? 'text-vert' : 'text-rouge'}`}>
                    {currentMouvement.type}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-bleu font-semibold">Montant</div>
                  <div className={`text-xl font-bold ${currentMouvement.type === 'ENTREE' ? 'text-vert' : 'text-rouge'}`}>
                    {formatFCFA(currentMouvement.montant)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-bleu font-semibold">ENTREE</div>
                  <div className="text-vert font-bold">{currentMouvement.entree ? formatFCFA(currentMouvement.entree) : '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-bleu font-semibold">SORTIR</div>
                  <div className="text-rouge font-bold">{currentMouvement.sortir ? formatFCFA(currentMouvement.sortir) : '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-bleu font-semibold">Solde après opération</div>
                  <div className="text-orange font-bold text-2xl">{formatFCFA(currentMouvement.solde)}</div>
                </div>
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
    </div>
  )
}
