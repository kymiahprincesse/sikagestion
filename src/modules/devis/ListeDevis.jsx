import { useState, useMemo } from 'react'
import { useDevisStore } from '../../store/useDevisStore'
import { useFacturesStore } from '../../store/useFacturesStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useClientsStore } from '../../store/useClientsStore'
import { formatDate, formatFCFA } from '../../utils/format'
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table'
import * as XLSX from 'xlsx'
import { createSikaPDF, finalizeSikaPDF, formatMontant, formatDate as formatDatePDF } from '../../utils/printUtils'
import { useNavigate } from 'react-router-dom'

const STATUTS = ['BROUILLON', 'VALIDE', 'FACTURE', 'ANNULE']
const TYPES = ['CALORIFUGE', 'PLIAGE', 'RESERVOIR', 'SOUDURE', 'CHARPENTE', 'TUYAUTERIE', 'CHAUDRONNERIE']

export default function ListeDevis() {
  const navigate = useNavigate()
  const { devis, deleteDevis, addDevis, updateDevis, transformerEnFacture } = useDevisStore()
  const { addFacture } = useFacturesStore()
  const { addLog } = useAuditStore()
  const { clients } = useClientsStore()

  const [recherche, setRecherche] = useState('')
  const [filtreType, setFiltreType] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreDateDebut, setFiltreDateDebut] = useState('')
  const [filtreDateFin, setFiltreDateFin] = useState('')
  const [filtreClient, setFiltreClient] = useState('')
  const [sorting, setSorting] = useState([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [devisSelectionne, setDevisSelectionne] = useState(null)
  const [showModalVoir, setShowModalVoir] = useState(false)

  const devisAvecClients = useMemo(() => {
    return devis.map(d => {
      const client = clients.find(c => c.id === d.clientId)
      return {
        ...d,
        clientNom: client?.nom || 'Client inconnu',
        etabliPar: d.etabliPar || 'Utilisateur'
      }
    })
  }, [devis, clients])

  const devisFiltres = useMemo(() => {
    return devisAvecClients.filter(d => {
      const matchRecherche = !recherche || 
        d.numero?.toLowerCase().includes(recherche.toLowerCase()) ||
        d.clientNom?.toLowerCase().includes(recherche.toLowerCase()) ||
        d.objet?.toLowerCase().includes(recherche.toLowerCase())
      
      const matchType = !filtreType || d.type === filtreType
      const matchStatut = !filtreStatut || d.statut === filtreStatut
      const matchClient = !filtreClient || d.clientId === parseInt(filtreClient)
      
      const matchDate = (!filtreDateDebut || d.date >= filtreDateDebut) &&
                        (!filtreDateFin || d.date <= filtreDateFin)
      
      return matchRecherche && matchType && matchStatut && matchClient && matchDate
    })
  }, [devisAvecClients, recherche, filtreType, filtreStatut, filtreClient, filtreDateDebut, filtreDateFin])

  const statistiques = useMemo(() => {
    const total = devisFiltres.length
    const montantTotal = devisFiltres.reduce((sum, d) => sum + (d.ttc || 0), 0)
    const factures = devisFiltres.filter(d => d.statut === 'FACTURE').length
    const tauxTransformation = total > 0 ? (factures / total) * 100 : 0
    const montantMoyen = total > 0 ? montantTotal / total : 0
    
    return { total, montantTotal, tauxTransformation, montantMoyen }
  }, [devisFiltres])

  const columns = useMemo(() => [
    {
      accessorKey: 'numero',
      header: 'N° Devis',
      cell: info => <span className="font-bold text-navy">{info.getValue()}</span>
    },
    {
      accessorKey: 'clientNom',
      header: 'Client',
      cell: info => <span className="text-navy">{info.getValue()}</span>
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: info => (
        <span className="px-2 py-1 bg-bleu text-white rounded text-xs font-semibold">
          {info.getValue()}
        </span>
      )
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: info => <span className="text-navy">{formatDate(info.getValue())}</span>
    },
    {
      accessorKey: 'ttc',
      header: 'Montant TTC',
      cell: info => <span className="font-bold text-orange">{formatFCFA(info.getValue())}</span>
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      cell: info => {
        const statut = info.getValue()
        const configs = {
          'BROUILLON': { bg: 'bg-bleu', text: 'text-white' },
          'VALIDE': { bg: 'bg-vert', text: 'text-white' },
          'FACTURE': { bg: 'bg-orange', text: 'text-white' },
          'ANNULE': { bg: 'bg-rouge', text: 'text-white' }
        }
        const config = configs[statut] || { bg: 'bg-argent', text: 'text-gray-700' }
        return (
          <span className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-xs font-bold`}>
            {statut}
          </span>
        )
      }
    },
    {
      accessorKey: 'etabliPar',
      header: 'Établi par',
      cell: info => <span className="text-navy text-sm">{info.getValue()}</span>
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button
            onClick={() => handleVoir(row.original)}
            className="px-2 py-1 bg-bleu text-white rounded hover:bg-opacity-90 text-xs"
            title="Voir"
          >
            👁
          </button>
          <button
            onClick={() => handleModifier(row.original)}
            className="px-2 py-1 bg-orange text-white rounded hover:bg-opacity-90 text-xs"
            title="Modifier"
          >
            📝
          </button>
          <button
            onClick={() => handleDupliquer(row.original)}
            className="px-2 py-1 bg-navy text-white rounded hover:bg-opacity-90 text-xs"
            title="Dupliquer"
          >
            📋
          </button>
          <button
            onClick={() => handleExportPDF(row.original)}
            className="px-2 py-1 bg-vert text-white rounded hover:bg-opacity-90 text-xs"
            title="PDF"
          >
            📄
          </button>
          {row.original.statut !== 'FACTURE' && (
            <button
              onClick={() => handleConvertirEnFacture(row.original)}
              className="px-2 py-1 bg-orange text-white rounded hover:bg-opacity-90 text-xs"
              title="Convertir en Facture"
            >
              🔄
            </button>
          )}
          <button
            onClick={() => handleSupprimer(row.original)}
            className="px-2 py-1 bg-rouge text-white rounded hover:bg-opacity-90 text-xs"
            title="Supprimer"
          >
            🗑
          </button>
        </div>
      )
    }
  ], [])

  const table = useReactTable({
    data: devisFiltres,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })

  const handleNouveauDevis = () => {
    navigate('/devis/tuyauterie')
  }

  const handleVoir = (devis) => {
    setDevisSelectionne(devis)
    setShowModalVoir(true)
    addLog({ module: 'LISTE_DEVIS', action: 'VOIR', utilisateur: 'Utilisateur', apres: { numero: devis.numero } })
  }

  const handleModifier = (devis) => {
    const routeMap = {
      'PLIAGE': '/devis/pliage',
      'CALORIFUGE': '/devis/calorifuge',
      'TUYAUTERIE': '/devis/tuyauterie',
      'CHAUDRONNERIE': '/devis/chaudronnerie',
      'MECANO-SOUDURE': '/devis/mecano-soudure'
    }
    const route = routeMap[devis.type] || '/devis/liste'
    navigate(route, { state: { devisId: devis.id } })
    addLog({ module: 'LISTE_DEVIS', action: 'MODIFIER', utilisateur: 'Utilisateur', apres: { numero: devis.numero } })
  }

  const handleDupliquer = (devis) => {
    if (!confirm(`Dupliquer le devis ${devis.numero} ?`)) return
    
    const { id, numero, dateCreation, ...devisData } = devis
    const nouveauDevis = addDevis({
      ...devisData,
      statut: 'BROUILLON',
      date: new Date().toISOString().split('T')[0]
    })
    
    addLog({ module: 'LISTE_DEVIS', action: 'DUPLICATION', utilisateur: 'Utilisateur', apres: { ancien: numero, nouveau: nouveauDevis.numero } })
    alert(`Devis dupliqué : ${nouveauDevis.numero}`)
  }

  const handleExportPDF = async (devis) => {
    const client = clients.find(c => c.id === devis.clientId)
    const ctx = await createSikaPDF(`DEVIS ${devis.type} - ${devis.numero}`)
    const { doc, startY, MARGE_G, PAGE_W } = ctx
    
    let y = startY
    
    // Informations devis
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(27, 42, 74)
    
    const infos = [
      ['Client', client?.nom || 'N/A'],
      ['Date', formatDate(devis.date)],
      ['Objet', devis.objet || 'N/A'],
      ['Statut', devis.statut]
    ]
    
    infos.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.text(label + ' :', MARGE_G, y)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(value, 120)
      doc.text(lines, MARGE_G + 30, y)
      y += lines.length * 6
    })
    
    y += 10
    
    // Ligne séparatrice
    doc.setDrawColor(230, 0, 0)
    doc.setLineWidth(0.8)
    doc.line(MARGE_G, y, PAGE_W - 15, y)
    y += 10
    
    // Montant total
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(27, 42, 74)
    doc.text('MONTANT TOTAL TTC', MARGE_G, y)
    y += 8
    
    doc.setFontSize(18)
    doc.setTextColor(230, 0, 0)
    doc.text(formatMontant(devis.ttc) + ' FCFA', MARGE_G, y)
    
    await finalizeSikaPDF(ctx, `SIKA_Devis_${devis.numero.replace(/\//g, '_')}.pdf`)
    addLog({ module: 'LISTE_DEVIS', action: 'EXPORT_PDF', utilisateur: 'Utilisateur', apres: { numero: devis.numero } })
  }

  const handleConvertirEnFacture = (devis) => {
    if (!confirm(`Convertir le devis ${devis.numero} en facture ?`)) return
    
    const client = clients.find(c => c.id === devis.clientId)
    
    const nouvelleFacture = {
      clientId: devis.clientId,
      clientNom: client?.nom || 'Client inconnu',
      montantHT: devis.montantHT || 0,
      montantTTC: devis.ttc || 0,
      tva: devis.tva || 0,
      numeroDevis: devis.numero,
      type: devis.type,
      objet: devis.objet,
      lignes: devis.lignes || [],
      statut: 'EMISE',
      date: new Date().toISOString().split('T')[0]
    }
    
    const facture = addFacture(nouvelleFacture)
    transformerEnFacture(devis.id)
    
    addLog({ 
      module: 'LISTE_DEVIS', 
      action: 'CONVERT_TO_FACTURE', 
      utilisateur: 'Utilisateur', 
      apres: { devis: devis.numero, facture: facture.numero } 
    })
    
    alert(`Devis ${devis.numero} converti en facture avec succès !`)
  }

  const handleSupprimer = (devis) => {
    if (!confirm(`Supprimer définitivement le devis ${devis.numero} ?`)) return
    
    deleteDevis(devis.id)
    addLog({ module: 'LISTE_DEVIS', action: 'SUPPRESSION', utilisateur: 'Utilisateur', apres: { numero: devis.numero } })
    alert('Devis supprimé')
  }

  const handleExportExcel = () => {
    const dataExport = devisFiltres.map(d => ({
      'N° Devis': d.numero,
      'Client': d.clientNom,
      'Type': d.type,
      'Date': formatDate(d.date),
      'Montant HT': d.montantHT || 0,
      'TVA': d.montantTVA || 0,
      'Montant TTC': d.montantTTC || 0,
      'Statut': d.statut,
      'Établi par': d.etabliPar
    }))
    
    const ws = XLSX.utils.json_to_sheet(dataExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Devis')
    XLSX.writeFile(wb, `Liste_Devis_${new Date().toISOString().split('T')[0]}.xlsx`)
    
    addLog({ module: 'LISTE_DEVIS', action: 'EXPORT_EXCEL', utilisateur: 'Utilisateur' })
  }

  const handleExportPDFListe = async () => {
    const ctx = await createSikaPDF('LISTE DES DEVIS');
    const { doc, startY, MARGE_G, PAGE_W } = ctx;
    
    let y = startY;
    
    // Info
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date d'édition : ${formatDate(new Date())}`, MARGE_G, y);
    doc.text(`Total : ${devisFiltres.length} devis`, MARGE_G + 60, y);
    y += 8;
    
    // Tableau
    const columns = ['N° Devis', 'Client', 'Type', 'Date', 'Montant TTC (FCFA)', 'Statut'];
    const rows = devisFiltres.map(d => [
      d.numero,
      d.clientNom,
      d.type,
      formatDate(d.date),
      formatMontant(d.ttc),
      d.statut
    ]);
    
    sikaTable(doc, columns, rows, y, ctx);
    
    await finalizeSikaPDF(ctx, `SIKA_Liste_Devis_${new Date().toISOString().split('T')[0]}.pdf`);
    addLog({ module: 'LISTE_DEVIS', action: 'EXPORT_PDF_LISTE', utilisateur: 'Utilisateur' });
  }

  return (
    <div className="min-h-screen bg-navyClair p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-3">
          <button
            onClick={handleNouveauDevis}
            className="flex items-center gap-2 px-4 py-2 bg-orange text-white rounded-lg hover:bg-opacity-90 transition font-semibold"
          >
            ➕ Nouveau devis
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-vert text-white rounded-lg hover:bg-opacity-90 transition"
          >
            📊 Export Excel
          </button>
          <button
            onClick={handleExportPDFListe}
            className="flex items-center gap-2 px-4 py-2 bg-orange text-white rounded-lg hover:bg-opacity-90 transition"
          >
            📄 Export PDF
          </button>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="🔍 Rechercher..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-navyClair rounded-lg p-4 border-l-4 border-bleu">
            <p className="text-sm text-navy font-semibold mb-1">Total devis période</p>
            <p className="text-2xl font-bold text-navy">{statistiques.total}</p>
          </div>
          <div className="bg-navyClair rounded-lg p-4 border-l-4 border-orange">
            <p className="text-sm text-navy font-semibold mb-1">Montant total TTC</p>
            <p className="text-2xl font-bold text-orange">{formatFCFA(statistiques.montantTotal)}</p>
          </div>
          <div className="bg-navyClair rounded-lg p-4 border-l-4 border-vert">
            <p className="text-sm text-navy font-semibold mb-1">Taux transformation</p>
            <p className="text-2xl font-bold text-vert">{statistiques.tauxTransformation.toFixed(1)}%</p>
          </div>
          <div className="bg-navyClair rounded-lg p-4 border-l-4 border-bleu">
            <p className="text-sm text-navy font-semibold mb-1">Montant moyen</p>
            <p className="text-2xl font-bold text-bleu">{formatFCFA(statistiques.montantMoyen)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="text-lg font-bold text-navy mb-4 border-b-2 border-orange pb-2">Filtres</h3>
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Type</label>
              <select
                value={filtreType}
                onChange={(e) => setFiltreType(e.target.value)}
                className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
              >
                <option value="">Tous</option>
                {TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Statut</label>
              <select
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
              >
                <option value="">Tous</option>
                {STATUTS.map(statut => <option key={statut} value={statut}>{statut}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Date début</label>
              <input
                type="date"
                value={filtreDateDebut}
                onChange={(e) => setFiltreDateDebut(e.target.value)}
                className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Date fin</label>
              <input
                type="date"
                value={filtreDateFin}
                onChange={(e) => setFiltreDateFin(e.target.value)}
                className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Client</label>
              <select
                value={filtreClient}
                onChange={(e) => setFiltreClient(e.target.value)}
                className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
              >
                <option value="">Tous</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.nom}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-navy text-white">
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left font-bold cursor-pointer hover:bg-opacity-90"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() && (
                            <span>{header.column.getIsSorted() === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-navyClair'}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3 border-b border-argent">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-navyClair px-4 py-3 flex items-center justify-between border-t border-argent">
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1 bg-bleu text-white rounded disabled:bg-argent disabled:cursor-not-allowed"
              >
                ← Précédent
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-3 py-1 bg-bleu text-white rounded disabled:bg-argent disabled:cursor-not-allowed"
              >
                Suivant →
              </button>
            </div>
            <div className="text-sm text-navy font-semibold">
              Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()} | 
              Total: {devisFiltres.length} devis
            </div>
          </div>
        </div>
      </div>

      {/* Modal Visualisation */}
      {showModalVoir && devisSelectionne && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold" style={{ color: '#06006E' }}>
                Détails du Devis {devisSelectionne.numero}
              </h2>
              <button
                onClick={() => setShowModalVoir(false)}
                className="text-2xl font-bold hover:opacity-70"
                style={{ color: '#E60000' }}
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#06006E' }}>Client</p>
                  <p className="text-lg">{devisSelectionne.clientNom}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#06006E' }}>Type</p>
                  <p className="text-lg">{devisSelectionne.type}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#06006E' }}>Date</p>
                  <p className="text-lg">{formatDate(devisSelectionne.date)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#06006E' }}>Statut</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    devisSelectionne.statut === 'VALIDE' ? 'bg-green-100 text-green-800' :
                    devisSelectionne.statut === 'FACTURE' ? 'bg-blue-100 text-blue-800' :
                    devisSelectionne.statut === 'ANNULE' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {devisSelectionne.statut}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-semibold" style={{ color: '#06006E' }}>Objet</p>
                  <p className="text-lg">{devisSelectionne.objet || 'Non spécifié'}</p>
                </div>
              </div>

              {/* Lignes du devis */}
              {devisSelectionne.lignes && devisSelectionne.lignes.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: '#06006E' }}>Lignes du devis</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead style={{ backgroundColor: '#E8ECF4' }}>
                        <tr>
                          <th className="px-4 py-2 text-left" style={{ color: '#06006E' }}>Désignation</th>
                          <th className="px-4 py-2 text-right" style={{ color: '#06006E' }}>Quantité</th>
                          <th className="px-4 py-2 text-right" style={{ color: '#06006E' }}>Prix Unit.</th>
                          <th className="px-4 py-2 text-right" style={{ color: '#06006E' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {devisSelectionne.lignes.map((ligne, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2">{ligne.designation}</td>
                            <td className="px-4 py-2 text-right">{ligne.quantite}</td>
                            <td className="px-4 py-2 text-right">{formatFCFA(ligne.prixUnitaire)}</td>
                            <td className="px-4 py-2 text-right font-semibold">{formatFCFA(ligne.quantite * ligne.prixUnitaire)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totaux */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold" style={{ color: '#06006E' }}>Total HT:</span>
                      <span className="font-bold text-lg">{formatFCFA(devisSelectionne.montantHT)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold" style={{ color: '#06006E' }}>TVA (18%):</span>
                      <span className="font-bold text-lg">{formatFCFA(devisSelectionne.montantTVA)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold text-xl" style={{ color: '#06006E' }}>Total TTC:</span>
                      <span className="font-bold text-xl" style={{ color: '#E60000' }}>{formatFCFA(devisSelectionne.montantTTC)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowModalVoir(false)
                    handleModifier(devisSelectionne)
                  }}
                  className="px-4 py-2 rounded font-semibold text-white"
                  style={{ backgroundColor: '#1F5C99' }}
                >
                  Modifier
                </button>
                <button
                  onClick={() => setShowModalVoir(false)}
                  className="px-4 py-2 rounded font-semibold"
                  style={{ backgroundColor: '#E8ECF4', color: '#06006E' }}
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
