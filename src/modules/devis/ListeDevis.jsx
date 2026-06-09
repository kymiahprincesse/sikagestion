import { useState, useMemo, useCallback } from 'react'
import { useNotifications } from '../../components/NotificationProvider'
import { useDevisStore } from '../../store/useDevisStore'
import { useFacturesStore } from '../../store/useFacturesStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useClientsStore } from '../../store/useClientsStore'
import { useNotificationsStore } from '../../store/useNotificationsStore'
import { formatDate, formatFCFA } from '../../utils/format'
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table'
import * as XLSX from 'xlsx'
import { createSikaPDF, finalizeSikaPDF, openPDFForPrint, sikaTable, formatMontant, formatDate as formatDatePDF } from '../../utils/printUtils'
import { useNavigate } from 'react-router-dom'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import GestionDoublons from '../../components/GestionDoublons'

const STATUTS = ['BROUILLON', 'VALIDE', 'FACTURE', 'ANNULE']
const TYPES = ['CALORIFUGE', 'PLIAGE', 'RESERVOIR', 'SOUDURE', 'CHARPENTE', 'TUYAUTERIE', 'CHAUDRONNERIE']

export default function ListeDevis() {
  const navigate = useNavigate()
  const { devis, deleteDevis, addDevis, updateDevis, transformerEnFacture } = useDevisStore()
  const { addFacture } = useFacturesStore()
  const { addLog } = useAuditStore()
  const { clients } = useClientsStore()
  const { ajouterNotification } = useNotificationsStore()
  const { confirm, confirmDelete } = useNotifications()

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
  const [showGestionDoublons, setShowGestionDoublons] = useState(false)

  // Fermer la modale avec la touche Escape
  useEscapeKey(showModalVoir, () => setShowModalVoir(false))

  // Défini avant les colonnes pour éviter les dépendances circulaires
  const handleChangerStatut = useCallback(async (devis, nouveauStatut) => {
    const ok = await confirm({
      title: 'Changer le statut',
      message: `Changer le statut du devis ${devis.numero} en "${nouveauStatut}" ?`,
      type: 'warning',
      confirmText: 'Confirmer',
      cancelText: 'Annuler'
    })
    if (!ok) return

    updateDevis(devis.id, { statut: nouveauStatut })

    addLog({
      module: 'LISTE_DEVIS',
      action: 'CHANGER_STATUT',
      utilisateur: 'Utilisateur',
      avant: { numero: devis.numero, statut: devis.statut },
      apres: { numero: devis.numero, statut: nouveauStatut }
    })

    // Notification
    import('../../store/useNotificationsStore').then(({ useNotificationsStore }) => {
      useNotificationsStore.getState().ajouterNotification({
        type: 'INFO',
        icone: nouveauStatut === 'VALIDE' ? '✅' : nouveauStatut === 'ANNULE' ? '❌' : '📋',
        titre: 'STATUT MODIFIÉ',
        message: `Devis ${devis.numero} passé en ${nouveauStatut}`,
        lien: '/devis/liste'
      })
    })
  }, [updateDevis, addLog, confirm])

  const devisAvecClients = useMemo(() => {
    return devis.map(d => {
      const client = clients.find(c => c.id === d.clientId)
      // Assurer la compatibilité type/typeDevis - garder la valeur originale si elle existe
      const typeDevis = d.typeDevis || d.type || null
      // Normaliser les montants (certains devis utilisent ttc, d'autres montantTTC)
      const ttc = d.ttc || d.montantTTC || d.montantTotal || 0
      const montantHT = d.montantHT || d.montantHt || 0
      const montantTVA = d.montantTVA || d.montantTva || d.tva || 0
      // Assurer qu'on a toujours un ID valide
      const id = d.id || d.id_devis || d.devis_id || `temp-${Date.now()}-${Math.random()}`
      return {
        ...d,
        id,
        typeDevis,
        ttc,
        montantHT,
        montantTVA,
        montantTTC: ttc,
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
      
      const matchType = !filtreType || d.typeDevis === filtreType
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
      accessorKey: 'typeDevis',
      header: 'Type',
      cell: info => {
        const value = info.getValue()
        return (
          <span className={`px-2 py-1 rounded text-xs font-semibold ${value ? 'bg-bleu text-white' : 'bg-gray-300 text-gray-600'}`}>
            {value || 'Non défini'}
          </span>
        )
      }
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: info => <span className="text-navy">{formatDate(info.getValue())}</span>
    },
    {
      accessorKey: 'ttc',
      header: 'Montant TTC',
      cell: info => {
        const montant = info.getValue()
        return <span className="font-bold text-orange">{formatFCFA(montant || 0)}</span>
      }
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      cell: info => {
        const statut = info.getValue()
        const row = info.row.original
        const configs = {
          'BROUILLON': { bg: 'bg-bleu', text: 'text-white', label: 'Brouillon' },
          'VALIDE': { bg: 'bg-vert', text: 'text-white', label: 'Validé' },
          'FACTURE': { bg: 'bg-orange', text: 'text-white', label: 'Facturé' },
          'ANNULE': { bg: 'bg-rouge', text: 'text-white', label: 'Annulé' }
        }
        const config = configs[statut] || { bg: 'bg-argent', text: 'text-gray-700', label: statut }

        return (
          <div className="flex flex-col gap-1">
            <span className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-xs font-bold text-center`}>
              {config.label}
            </span>
            {statut !== 'FACTURE' && (
              <select
                value={statut}
                onChange={(e) => handleChangerStatut(row, e.target.value)}
                className="text-xs px-2 py-1 border border-argent rounded focus:outline-none focus:border-orange bg-white"
              >
                <option value="BROUILLON">📝 Brouillon</option>
                <option value="VALIDE">✅ Valider</option>
                <option value="ANNULE">❌ Annuler</option>
              </select>
            )}
          </div>
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
        <div className="flex gap-2">
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
            onClick={() => handleExportPDF(row.original)}
            className="px-2 py-1 bg-vert text-white rounded hover:bg-opacity-90 text-xs"
            title="PDF"
          >
            📄
          </button>
          <button
            onClick={() => handlePrintDevis(row.original)}
            className="px-2 py-1 bg-navy text-white rounded hover:bg-opacity-90 text-xs"
            title="Imprimer"
          >
            🖨️
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
          {row.original.statut === 'BROUILLON' && (
            <button
              onClick={() => handleChangerStatut(row.original, 'VALIDE')}
              className="px-2 py-1 bg-vert text-white rounded hover:bg-opacity-90 text-xs"
              title="Valider le devis"
            >
              ✓
            </button>
          )}
          {row.original.statut === 'BROUILLON' && (
            <button
              onClick={() => handleChangerStatut(row.original, 'ANNULE')}
              className="px-2 py-1 bg-rouge text-white rounded hover:bg-opacity-90 text-xs"
              title="Annuler le devis"
            >
              ✕
            </button>
          )}
          <button
            onClick={() => handleSupprimer(row.original)}
            className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-opacity-90 text-xs"
            title="Supprimer"
          >
            🗑️
          </button>
        </div>
      )
    }
  ], [handleChangerStatut])

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
    // Vérifier que le devis a un ID
    if (!devis || !devis.id) {
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR',
        message: 'Ce devis n\'a pas d\'identifiant. Impossible de le modifier.'
      })
      console.error('Devis sans ID:', devis)
      return
    }

    // Utiliser typeDevis déjà normalisé, ou chercher dans type si non défini
    const typeDevis = devis.typeDevis || devis.type || null

    // Si toujours pas de type, on ne peut pas modifier
    if (!typeDevis || typeDevis === 'INCONNU') {
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR',
        message: `Ce devis n'a pas de type défini (type: ${typeDevis || 'null'}). Impossible de l'ouvrir.`
      })
      console.error('Devis sans type valide:', devis)
      return
    }


    const routeMap = {
      'PLIAGE': '/devis/pliage',
      'CALORIFUGE': '/devis/calorifuge',
      'TUYAUTERIE': '/devis/tuyauterie',
      'SOUDURE': '/devis/soudure',
      'MECANO-SOUDURE': '/devis/soudure',
      'CHAUDRONNERIE': '/devis/chaudronnerie',
      'RESERVOIR': '/devis/reservoir',
      'CHARPENTE': '/devis/charpente'
    }

    const route = routeMap[typeDevis]

    if (!route) {
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR',
        message: `Type de devis non reconnu: "${typeDevis}". Routes: ${Object.keys(routeMap).join(', ')}`
      })
      console.error('Type devis inconnu:', devis)
      return
    }

    navigate(route, { state: { devisId: devis.id } })
    addLog({ module: 'LISTE_DEVIS', action: 'MODIFIER', utilisateur: 'Utilisateur', apres: { numero: devis.numero, type: typeDevis, id: devis.id } })
  }

  const handleSupprimer = async (devis) => {
    const ok = await confirmDelete(`le devis ${devis.numero}`)
    if (!ok) return

    deleteDevis(devis.id)

    addLog({
      module: 'LISTE_DEVIS',
      action: 'SUPPRIMER',
      utilisateur: 'Utilisateur',
      avant: { numero: devis.numero, montantTTC: devis.ttc }
    })

    // Notification de suppression
    import('../../store/useNotificationsStore').then(({ useNotificationsStore }) => {
      useNotificationsStore.getState().ajouterNotification({
        type: 'INFO',
        icone: '🗑️',
        titre: 'DEVIS SUPPRIMÉ',
        message: `Le devis ${devis.numero} a été supprimé avec succès`,
        lien: '/devis/liste'
      })
    })
  }

  const handleExportPDF = async (devis) => {
    const client = clients.find(c => c.id === devis.clientId)
    const ctx = await createSikaPDF(`DEVIS ${devis.typeDevis || devis.type} - ${devis.numero}`)
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

  const handleConvertirEnFacture = async (devis) => {
    const ok = await confirm({
      title: 'Convertir en facture',
      message: `Convertir le devis ${devis.numero} en facture ? Cette action créera une nouvelle facture.`,
      type: 'info',
      confirmText: 'Convertir',
      cancelText: 'Annuler'
    })
    if (!ok) return

    const client = clients.find(c => c.id === devis.clientId)

    const nouvelleFacture = {
      clientId: devis.clientId,
      clientNom: client?.nom || 'Client inconnu',
      montantHT: devis.montantHT || 0,
      montantTVA: devis.montantTVA || devis.tva || 0,
      montantTTC: devis.ttc || 0,
      numeroDevis: devis.numero,
      type: devis.typeDevis || devis.type,
      objet: devis.objet,
      lignes: devis.lignes || [],
      statut: 'EMISE',
      dateDepot: new Date().toISOString().split('T')[0]
    }

    try {
      const facture = await addFacture(nouvelleFacture)
      transformerEnFacture(devis.id)

      addLog({
        module: 'LISTE_DEVIS',
        action: 'CONVERT_TO_FACTURE',
        utilisateur: 'Utilisateur',
        apres: { devis: devis.numero, facture: facture?.numero }
      })

      ajouterNotification({
        type: 'INFO',
        icone: '✅',
        titre: 'SUCCÈS',
        message: `Devis ${devis.numero} converti en facture ${facture?.numero} avec succès !`,
        lien: '/factures'
      })
    } catch (error) {
      console.error('Erreur conversion devis en facture:', error)
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR',
        message: 'Erreur lors de la conversion du devis en facture'
      })
    }
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
    const titre = filtreType ? `LISTE DES DEVIS - ${filtreType}` : 'LISTE DES DEVIS';
    const ctx = await createSikaPDF(titre);
    const { doc, startY, MARGE_G, PAGE_W } = ctx;

    let y = startY;

    // En-tête avec filtres
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date d'édition : ${formatDatePDF(new Date())}`, MARGE_G, y);
    doc.text(`Total : ${devisFiltres.length} devis`, MARGE_G + 60, y);
    if (filtreType) doc.text(`Catégorie : ${filtreType}`, MARGE_G + 110, y);
    if (filtreStatut) doc.text(`Statut : ${filtreStatut}`, MARGE_G + 160, y);
    y += 10;

    // Tableau avec Établi par
    const columns = ['N° Devis', 'Client', 'Type', 'Date', 'Montant TTC', 'Statut', 'Établi par'];
    const rows = devisFiltres.map(d => [
      d.numero,
      d.clientNom,
      d.typeDevis || d.type,
      formatDatePDF(d.date),
      formatMontant(d.ttc),
      d.statut,
      d.etabliPar || 'Utilisateur'
    ]);

    const finalY = sikaTable(doc, columns, rows, y, ctx);
    y = finalY + 10;

    // Récapitulatif des statuts
    const stats = {
      BROUILLON: devisFiltres.filter(d => d.statut === 'BROUILLON').length,
      VALIDE: devisFiltres.filter(d => d.statut === 'VALIDE').length,
      FACTURE: devisFiltres.filter(d => d.statut === 'FACTURE').length,
      ANNULE: devisFiltres.filter(d => d.statut === 'ANNULE').length
    };

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    doc.text('RÉCAPITULATIF PAR STATUT :', MARGE_G, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.text(`Brouillon: ${stats.BROUILLON} | Validé: ${stats.VALIDE} | Facturé: ${stats.FACTURE} | Annulé: ${stats.ANNULE}`, MARGE_G, y);
    y += 10;

    // Total général
    const totalTTC = devisFiltres.reduce((sum, d) => sum + (d.ttc || 0), 0);
    doc.setFillColor(27, 42, 74);
    doc.rect(MARGE_G, y - 4, PAGE_W - MARGE_G * 2, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL GÉNÉRAL TTC :', MARGE_G + 5, y + 4);
    doc.text(formatMontant(totalTTC) + ' FCFA', PAGE_W - MARGE_G - 5, y + 4, { align: 'right' });

    await finalizeSikaPDF(ctx, `SIKA_Liste_Devis_${new Date().toISOString().split('T')[0]}.pdf`);
    addLog({ module: 'LISTE_DEVIS', action: 'EXPORT_PDF_LISTE', utilisateur: 'Utilisateur' });
  }

  const handlePrintListe = async () => {
    const titre = filtreType ? `LISTE DES DEVIS - ${filtreType}` : 'LISTE DES DEVIS';
    const ctx = await createSikaPDF(titre);
    const { doc, startY, MARGE_G, PAGE_W } = ctx;

    let y = startY;

    // En-tête avec filtre appliqué
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date d'édition : ${formatDatePDF(new Date())}`, MARGE_G, y);
    doc.text(`Total : ${devisFiltres.length} devis`, MARGE_G + 60, y);
    if (filtreType) doc.text(`Catégorie : ${filtreType}`, MARGE_G + 110, y);
    if (filtreStatut) doc.text(`Statut : ${filtreStatut}`, MARGE_G + 160, y);
    y += 10;

    // Tableau avec colonne Établi par ajoutée
    const columns = ['N° Devis', 'Client', 'Type', 'Date', 'Montant TTC', 'Statut', 'Établi par'];
    const rows = devisFiltres.map(d => [
      d.numero,
      d.clientNom,
      d.typeDevis || d.type,
      formatDatePDF(d.date),
      formatMontant(d.ttc),
      d.statut,
      d.etabliPar || 'Utilisateur'
    ]);

    const finalY = sikaTable(doc, columns, rows, y, ctx);
    y = finalY + 10;

    // Récapitulatif des statuts
    const stats = {
      BROUILLON: devisFiltres.filter(d => d.statut === 'BROUILLON').length,
      VALIDE: devisFiltres.filter(d => d.statut === 'VALIDE').length,
      FACTURE: devisFiltres.filter(d => d.statut === 'FACTURE').length,
      ANNULE: devisFiltres.filter(d => d.statut === 'ANNULE').length
    };

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    doc.text('RÉCAPITULATIF PAR STATUT :', MARGE_G, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.text(`Brouillon: ${stats.BROUILLON} | Validé: ${stats.VALIDE} | Facturé: ${stats.FACTURE} | Annulé: ${stats.ANNULE}`, MARGE_G, y);
    y += 10;

    // Total général
    const totalTTC = devisFiltres.reduce((sum, d) => sum + (d.ttc || 0), 0);
    doc.setFillColor(27, 42, 74);
    doc.rect(MARGE_G, y - 4, PAGE_W - MARGE_G * 2, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL GÉNÉRAL TTC :', MARGE_G + 5, y + 4);
    doc.text(formatMontant(totalTTC) + ' FCFA', PAGE_W - MARGE_G - 5, y + 4, { align: 'right' });

    await openPDFForPrint(ctx);
    addLog({ module: 'LISTE_DEVIS', action: 'IMPRESSION_LISTE', utilisateur: 'Utilisateur' });
  }

  const handlePrintDevis = async (devis) => {
    const client = clients.find(c => c.id === devis.clientId);
    const ctx = await createSikaPDF(`DEVIS ${devis.typeDevis || devis.type} - ${devis.numero}`);
    const { doc, startY, MARGE_G, PAGE_W } = ctx;

    let y = startY;

    // En-tête avec informations clés
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    doc.text('DEVIS', MARGE_G, y);
    
    doc.setFontSize(14);
    doc.setTextColor(230, 0, 0);
    doc.text(devis.numero, MARGE_G + 25, y);
    y += 10;

    // Ligne de séparation
    doc.setDrawColor(230, 0, 0);
    doc.setLineWidth(1);
    doc.line(MARGE_G, y, PAGE_W - MARGE_G, y);
    y += 8;

    // Bloc informations générales en deux colonnes
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);

    const col1X = MARGE_G;
    const col2X = PAGE_W / 2 + 10;
    const startYInfo = y;

    // Colonne 1
    const infosCol1 = [
      ['Client', client?.nom || 'N/A'],
      ['Date', formatDatePDF(devis.date)],
      ['Établi par', devis.etabliPar || 'Utilisateur'],
    ];

    infosCol1.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ' :', col1X, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, 60);
      doc.text(lines, col1X + 35, y);
      y += lines.length * 5;
    });

    // Colonne 2
    y = startYInfo;
    const infosCol2 = [
      ['Type', devis.typeDevis || devis.type || 'N/A'],
      ['Statut', devis.statut || 'BROUILLON'],
      ['Objet', devis.objet || 'N/A'],
    ];

    infosCol2.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ' :', col2X, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, 70);
      doc.text(lines, col2X + 30, y);
      y += lines.length * 5;
    });

    y = Math.max(y, startYInfo + 20) + 8;

    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(MARGE_G, y, PAGE_W - MARGE_G, y);
    y += 8;

    // Tableau des lignes
    if (devis.lignes && devis.lignes.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(27, 42, 74);
      doc.text('DÉTAIL DU DEVIS', MARGE_G, y);
      y += 6;

      const colsLignes = ['Désignation', 'Qté', 'PU (FCFA)', 'Total (FCFA)'];
      const rowsLignes = devis.lignes.map(l => [
        l.designation || '—',
        l.quantite || l.qte || l.longueur || 0,
        formatMontant(l.prixUnitaire || l.pu || 0),
        formatMontant((l.quantite || l.qte || l.longueur || 0) * (l.prixUnitaire || l.pu || 0))
      ]);

      y = sikaTable(doc, colsLignes, rowsLignes, y, ctx) + 8;
    }

    // Totaux
    const totauxX = PAGE_W - 85;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    doc.text('RÉCAPITULATIF', MARGE_G, y);
    y += 8;

    doc.setFontSize(9);
    const rowsTotaux = [
      ['Total HT', formatMontant(devis.montantHT || 0) + ' FCFA'],
      ['TVA (18%)', formatMontant(devis.montantTVA || devis.tva || 0) + ' FCFA'],
    ];

    rowsTotaux.forEach(([label, val]) => {
      doc.setTextColor(27, 42, 74);
      doc.setFont('helvetica', 'bold');
      doc.text(label, totauxX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, PAGE_W - MARGE_G, y, { align: 'right' });
      y += 6;
    });

    // TTC en surbrillance
    doc.setFillColor(27, 42, 74);
    doc.rect(totauxX - 2, y - 4, PAGE_W - MARGE_G - totauxX + 2, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('MONTANT TTC', totauxX, y + 2);
    doc.text(formatMontant(devis.ttc || 0) + ' FCFA', PAGE_W - MARGE_G, y + 2, { align: 'right' });
    y += 15;

    // Pied de page avec date d'impression
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Document imprimé le ${formatDatePDF(new Date())} - SIKA INDUSTRIE`, MARGE_G, PAGE_W - 10);

    await openPDFForPrint(ctx);
    addLog({ module: 'LISTE_DEVIS', action: 'IMPRESSION_DEVIS', utilisateur: 'Utilisateur', apres: { numero: devis.numero } });
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
          <button
            onClick={handlePrintListe}
            className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg hover:bg-opacity-90 transition font-semibold"
          >
            🖨️ Imprimer
          </button>
          <button
            onClick={() => setShowGestionDoublons(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rouge text-white rounded-lg hover:bg-opacity-90 transition font-semibold"
            title="Détecter et gérer les devis en doublon"
          >
            🔍 Doublons
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
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                {devisSelectionne.statut === 'BROUILLON' && (
                  <button
                    onClick={() => {
                      handleChangerStatut(devisSelectionne, 'VALIDE')
                      setShowModalVoir(false)
                    }}
                    className="px-4 py-2 rounded font-semibold text-white"
                    style={{ backgroundColor: '#1A7A4A' }}
                  >
                    ✅ Valider
                  </button>
                )}
                {devisSelectionne.statut === 'BROUILLON' && (
                  <button
                    onClick={() => {
                      handleChangerStatut(devisSelectionne, 'ANNULE')
                      setShowModalVoir(false)
                    }}
                    className="px-4 py-2 rounded font-semibold text-white"
                    style={{ backgroundColor: '#DC2626' }}
                  >
                    ❌ Annuler
                  </button>
                )}
                {devisSelectionne.statut !== 'FACTURE' && devisSelectionne.statut !== 'ANNULE' && (
                  <button
                    onClick={() => {
                      setShowModalVoir(false)
                      handleConvertirEnFacture(devisSelectionne)
                    }}
                    className="px-4 py-2 rounded font-semibold text-white"
                    style={{ backgroundColor: '#E60000' }}
                  >
                    🔄 Convertir en Facture
                  </button>
                )}
                <button
                  onClick={() => {
                    handlePrintDevis(devisSelectionne)
                  }}
                  className="px-4 py-2 rounded font-semibold text-white"
                  style={{ backgroundColor: '#1B2A4A' }}
                >
                  🖨️ Imprimer
                </button>
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

      {/* Modal de gestion des doublons */}
      {showGestionDoublons && (
        <GestionDoublons 
          onClose={() => setShowGestionDoublons(false)} 
          type="devis"
        />
      )}
    </div>
  )
}
