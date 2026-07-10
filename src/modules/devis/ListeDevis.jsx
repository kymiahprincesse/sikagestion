import { useState, useMemo, useCallback } from 'react'
import { useNotifications } from '../../components/NotificationProvider'
import { useDevisStore } from '../../store/useDevisStore'
import { useFacturesStore } from '../../store/useFacturesStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useClientsStore } from '../../store/useClientsStore'
import { useNotificationsStore } from '../../store/useNotificationsStore'
import { formatDate, formatFCFA } from '../../utils/format'
import { isDevisEnAttente, isDevisVisibleDansListe, normalizeDevisStatut, getDevisStatutLabel, detecterTypeDevis } from '../../utils/devisStatus'
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table'
import * as XLSX from 'xlsx'
import { createSikaPDF, finalizeSikaPDF, openPDFForPrint, sikaTable, formatMontant, formatDate as formatDatePDF } from '../../utils/printUtils'
import { generateDevisHTML, printDevisHTML } from '../../utils/devisTemplate'
import { useNavigate } from 'react-router-dom'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import GestionDoublons from '../../components/GestionDoublons'
import { useAuthStore } from '../../store/useAuthStore'

const STATUTS = ['BROUILLON', 'EN_ATTENTE', 'VALIDE', 'FACTURE', 'ANNULE']
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
  const [vueGroupee, setVueGroupee] = useState(false)
  const [heureOuverture, setHeureOuverture] = useState(null)
  const { utilisateurConnecte } = useAuthStore()

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
      utilisateur: utilisateurConnecte?.nom || 'Utilisateur',
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
      const typeDevis = d.typeDevis || d.type || detecterTypeDevis(d)
      const statutNormalise = normalizeDevisStatut(d.statut)
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
        statut: statutNormalise,
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
      if (!isDevisVisibleDansListe(d)) {
        return false;
      }

      const matchRecherche = !recherche || 
        d.numero?.toLowerCase().includes(recherche.toLowerCase()) ||
        d.clientNom?.toLowerCase().includes(recherche.toLowerCase()) ||
        d.objet?.toLowerCase().includes(recherche.toLowerCase())
      
      const matchType = !filtreType || d.typeDevis === filtreType
      const matchStatut = !filtreStatut || d.statut === filtreStatut || (filtreStatut === 'EN_ATTENTE' && isDevisEnAttente(d.statut))
      const matchClient = !filtreClient || String(d.clientId) === String(filtreClient)
      
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

  const devisGroupes = useMemo(() => {
    const groupes = {};
    devisFiltres.forEach(d => {
      const clientNom = d.clientNom || 'Client inconnu';
      const type = d.typeDevis || d.type || 'AUTRE';
      
      if (!groupes[clientNom]) {
        groupes[clientNom] = {
          clientNom,
          clientId: d.clientId,
          totalTTC: 0,
          categories: {},
          totalDevis: 0
        };
      }
      
      if (!groupes[clientNom].categories[type]) {
        groupes[clientNom].categories[type] = {
          type,
          totalTTC: 0,
          liste: []
        };
      }
      
      groupes[clientNom].categories[type].liste.push(d);
      groupes[clientNom].categories[type].totalTTC += (d.ttc || 0);
      groupes[clientNom].totalTTC += (d.ttc || 0);
      groupes[clientNom].totalDevis += 1;
    });

    return Object.values(groupes)
      .map(g => ({
        ...g,
        categories: Object.values(g.categories).sort((a, b) => a.type.localeCompare(b.type))
      }))
      .sort((a, b) => a.clientNom.localeCompare(b.clientNom));
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
          'EN_ATTENTE': { bg: 'bg-orange', text: 'text-white', label: 'En attente' },
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
                <option value="EN_ATTENTE">⏳ En attente</option>
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
    setHeureOuverture(new Date())
    setShowModalVoir(true)
    addLog({ module: 'LISTE_DEVIS', action: 'VOIR', utilisateur: utilisateurConnecte?.nom || 'Utilisateur', apres: { numero: devis.numero } })
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
    const typeDevis = devis.typeDevis || devis.type || detecterTypeDevis(devis)

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
    addLog({ module: 'LISTE_DEVIS', action: 'MODIFIER', utilisateur: utilisateurConnecte?.nom || 'Utilisateur', apres: { numero: devis.numero, type: typeDevis, id: devis.id } })
  }

  const handleSupprimer = async (devis) => {
    const ok = await confirmDelete(`le devis ${devis.numero}`)
    if (!ok) return

    try {
      await deleteDevis(devis.id)
      addLog({
        module: 'LISTE_DEVIS',
        action: 'SUPPRIMER',
        utilisateur: utilisateurConnecte?.nom || 'Utilisateur',
        avant: { numero: devis.numero, montantTTC: devis.ttc }
      })
      ajouterNotification({
        type: 'INFO',
        icone: '🗑️',
        titre: 'DEVIS SUPPRIMÉ',
        message: `Le devis ${devis.numero} a été supprimé avec succès`
      })
    } catch (error) {
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR SUPPRESSION',
        message: `Impossible de supprimer le devis ${devis.numero}. Veuillez réessayer.`
      })
    }
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
    addLog({ module: 'LISTE_DEVIS', action: 'EXPORT_PDF', utilisateur: utilisateurConnecte?.nom || 'Utilisateur', apres: { numero: devis.numero } })
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
    
    addLog({ module: 'LISTE_DEVIS', action: 'EXPORT_EXCEL', utilisateur: utilisateurConnecte?.nom || 'Utilisateur' })
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
    addLog({ module: 'LISTE_DEVIS', action: 'EXPORT_PDF_LISTE', utilisateur: utilisateurConnecte?.nom || 'Utilisateur' });
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
      EN_ATTENTE: devisFiltres.filter(d => isDevisEnAttente(d.statut)).length,
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
    doc.text(`Brouillon: ${stats.BROUILLON} | En attente: ${stats.EN_ATTENTE} | Validé: ${stats.VALIDE} | Facturé: ${stats.FACTURE} | Annulé: ${stats.ANNULE}`, MARGE_G, y);
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
    addLog({ module: 'LISTE_DEVIS', action: 'IMPRESSION_LISTE', utilisateur: utilisateurConnecte?.nom || 'Utilisateur' });
  }

  const handlePrintDevis = (devis) => {
    const client = clients.find(c => c.id === devis.clientId) || {};

    // Lignes normalisées
    const lignesBrutes = devis.lignes || devis.lignesCommerciales || [];
    const lignes = lignesBrutes.map(l => ({
      designation: l.designation || '—',
      dn: l.dn || l.unite || '—',
      qte: parseFloat(l.qte || l.quantite || l.longueur || 0),
      pu: parseFloat(l.pu || l.prixUnitaire || 0),
      montant: l.montant !== '' && l.montant !== undefined ? parseFloat(l.montant) : undefined,
      typeTravail: l.typeTravail || '',
      materiau: l.materiau || '',
      typeTole: l.typeTole || '',
      epaisseur: l.epaisseur || 0,
      typeTuyau: l.typeTuyau || '',
      pression: l.pression || '',
      longueur: l.longueur || 0,
      ml: l.ml || 0,
      pt: l.pt || 0,
      surface: l.surface || 0,
    }));

    // Totaux
    const montantBrut = parseFloat(devis.montantBrut) || lignes.reduce((s, l) => s + (l.montant !== undefined ? l.montant : l.qte * l.pu), 0);
    const tauxRemise = parseFloat(devis.tauxRemise) || 0;
    const remise = parseFloat(devis.remise) || montantBrut * (tauxRemise / 100);
    const montantHT = parseFloat(devis.montantHT) || (montantBrut - remise);
    
    const savedTva = devis.montantTVA !== undefined ? devis.montantTVA : devis.tva;
    const tva = (savedTva !== undefined && savedTva !== null && savedTva !== '' && !isNaN(savedTva))
      ? parseFloat(savedTva)
      : (devis.tvaActive !== false ? montantHT * 0.18 : 0);

    const savedTtc = devis.montantTTC !== undefined ? devis.montantTTC : devis.ttc;
    const ttc = (savedTtc !== undefined && savedTtc !== null && savedTtc !== '' && !isNaN(savedTtc))
      ? parseFloat(savedTtc)
      : (montantHT + tva);

    const templateData = {
      reference: devis.numero,
      objet: devis.objet || '',
      type: devis.typeDevis || devis.type || '',
      notes: devis.notes || '',
      statut: devis.statut || 'BROUILLON',
      client: {
        nom: client.nom || devis.clientNom || '—',
        interlocuteur: devis.demandePar || client.contactNom || '—',
        adresse: client.adresse || '—',
        telephone: client.telephone || client.contactTelephone || '',
        email: client.email || client.contactEmail || '',
        raisonSociale: client.raisonSociale || '',
        secteur: client.secteur || '',
        ville: client.ville || '',
        pays: client.pays || 'Côte d\'Ivoire',
        conditionsPaiement: client.conditionsPaiement || '',
      },
      infos: {
        date: devis.date,
        validite: '30 jours',
        etabliPar: 'SIKA INDUSTRIE',
        tel: '(225) 07 97 25 25 26',
        demandePar: devis.demandePar || '',
      },
      specifications: devis.specifications || null,
      lignes,
      montantBrut,
      remise,
      montantHT,
      tva,
      ttc,
    };

    printDevisHTML(templateData);

    addLog({ module: 'LISTE_DEVIS', action: 'IMPRESSION_DEVIS', utilisateur: utilisateurConnecte?.nom || 'Utilisateur', apres: { numero: devis.numero } });
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
          <button
            onClick={() => setVueGroupee(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-semibold ${vueGroupee ? 'bg-navy text-white border border-white' : 'bg-argent text-navy hover:bg-opacity-90'}`}
            title="Grouper les devis par client et type"
          >
            {vueGroupee ? '📋 Vue Table' : '🗂️ Grouper Client & Type'}
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
                {STATUTS.map(statut => <option key={statut} value={statut}>{statut === 'EN_ATTENTE' ? 'En attente' : statut}</option>)}
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

        {vueGroupee ? (
          <div className="space-y-6">
            {devisGroupes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500 font-semibold">
                Aucun devis ne correspond aux filtres appliqués.
              </div>
            ) : (
              devisGroupes.map((groupeClient) => (
                <div key={groupeClient.clientNom} className="bg-white rounded-lg shadow-md overflow-hidden border border-argent">
                  {/* En-tête Client */}
                  <div className="bg-navy text-white px-6 py-4 flex justify-between items-center flex-wrap gap-2">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      👤 {groupeClient.clientNom}
                      <span className="text-xs bg-orange text-white px-2 py-0.5 rounded-full font-semibold">
                        {groupeClient.totalDevis} devis
                      </span>
                    </h4>
                    <span className="font-bold text-orange-400">
                      Total cumulé : {formatFCFA(groupeClient.totalTTC)}
                    </span>
                  </div>

                  <div className="p-4 space-y-6">
                    {groupeClient.categories.map((cat) => (
                      <div key={cat.type} className="border border-argent rounded-lg overflow-hidden">
                        {/* En-tête Catégorie (Type) */}
                        <div className="bg-navyClair px-4 py-2 flex justify-between items-center border-b border-argent">
                          <span className="font-bold text-navy text-sm uppercase tracking-wider flex items-center gap-2">
                            📂 {cat.type}
                            <span className="text-xs bg-bleu text-white px-2 py-0.5 rounded-full font-semibold">
                              {cat.liste.length}
                            </span>
                          </span>
                          <span className="text-sm font-bold text-orange">
                            Sous-total : {formatFCFA(cat.totalTTC)}
                          </span>
                        </div>

                        {/* Liste des devis de cette catégorie */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-gray-100 text-navy font-bold border-b border-argent">
                                <th className="px-4 py-2 text-left">N° Devis</th>
                                <th className="px-4 py-2 text-left">Date</th>
                                <th className="px-4 py-2 text-left">Objet</th>
                                <th className="px-4 py-2 text-left">Montant TTC</th>
                                <th className="px-4 py-2 text-left">Statut</th>
                                <th className="px-4 py-2 text-left">Établi par</th>
                                <th className="px-4 py-2 text-left">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.liste.map((d, index) => {
                                const configs = {
                                  'BROUILLON': { bg: 'bg-bleu', text: 'text-white', label: 'Brouillon' },
                                  'EN_ATTENTE': { bg: 'bg-orange', text: 'text-white', label: 'En attente' },
                                  'VALIDE': { bg: 'bg-vert', text: 'text-white', label: 'Validé' },
                                  'FACTURE': { bg: 'bg-orange', text: 'text-white', label: 'Facturé' },
                                  'ANNULE': { bg: 'bg-rouge', text: 'text-white', label: 'Annulé' }
                                }
                                const config = configs[d.statut] || { bg: 'bg-argent', text: 'text-gray-700', label: d.statut }

                                return (
                                  <tr key={d.id} className={index % 2 === 0 ? 'bg-white' : 'bg-navyClair'}>
                                    <td className="px-4 py-2 font-bold text-navy border-b border-argent">{d.numero}</td>
                                    <td className="px-4 py-2 border-b border-argent whitespace-nowrap">{formatDate(d.date)}</td>
                                    <td className="px-4 py-2 border-b border-argent max-w-[200px] truncate" title={d.objet}>{d.objet || '—'}</td>
                                    <td className="px-4 py-2 font-bold text-orange border-b border-argent whitespace-nowrap">{formatFCFA(d.ttc || 0)}</td>
                                    <td className="px-4 py-2 border-b border-argent">
                                      <div className="flex flex-col gap-1 max-w-[130px]">
                                        <span className={`${config.bg} ${config.text} px-2 py-0.5 rounded-full text-xs font-bold text-center`}>
                                          {config.label}
                                        </span>
                                        {d.statut !== 'FACTURE' && (
                                          <select
                                            value={d.statut}
                                            onChange={(e) => handleChangerStatut(d, e.target.value)}
                                            className="text-xs px-1 py-0.5 border border-argent rounded focus:outline-none focus:border-orange bg-white cursor-pointer"
                                          >
                                            <option value="BROUILLON">📝 Brouillon</option>
                                            <option value="EN_ATTENTE">⏳ En attente</option>
                                            <option value="VALIDE">✅ Valider</option>
                                            <option value="ANNULE">❌ Annuler</option>
                                          </select>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 border-b border-argent text-navy">{d.etabliPar || 'Utilisateur'}</td>
                                    <td className="px-4 py-2 border-b border-argent">
                                      <div className="flex gap-2 flex-wrap">
                                        <button
                                          onClick={() => handleVoir(d)}
                                          className="px-2 py-1 bg-bleu text-white rounded hover:bg-opacity-90 text-xs"
                                          title="Voir"
                                        >
                                          👁
                                        </button>
                                        <button
                                          onClick={() => handleModifier(d)}
                                          className="px-2 py-1 bg-orange text-white rounded hover:bg-opacity-90 text-xs"
                                          title="Modifier"
                                        >
                                          📝
                                        </button>
                                        <button
                                          onClick={() => handleExportPDF(d)}
                                          className="px-2 py-1 bg-vert text-white rounded hover:bg-opacity-90 text-xs"
                                          title="PDF"
                                        >
                                          📄
                                        </button>
                                        <button
                                          onClick={() => handlePrintDevis(d)}
                                          className="px-2 py-1 bg-navy text-white rounded hover:bg-opacity-90 text-xs"
                                          title="Imprimer"
                                        >
                                          🖨️
                                        </button>
                                        {d.statut !== 'FACTURE' && (
                                          <button
                                            onClick={() => handleConvertirEnFacture(d)}
                                            className="px-2 py-1 bg-orange text-white rounded hover:bg-opacity-90 text-xs"
                                            title="Convertir en Facture"
                                          >
                                            🔄
                                          </button>
                                        )}
                                        {d.statut === 'BROUILLON' && (
                                          <button
                                            onClick={() => handleChangerStatut(d, 'VALIDE')}
                                            className="px-2 py-1 bg-vert text-white rounded hover:bg-opacity-90 text-xs"
                                            title="Valider"
                                          >
                                            ✓
                                          </button>
                                        )}
                                        {d.statut === 'BROUILLON' && (
                                          <button
                                            onClick={() => handleChangerStatut(d, 'ANNULE')}
                                            className="px-2 py-1 bg-rouge text-white rounded hover:bg-opacity-90 text-xs"
                                            title="Annuler"
                                          >
                                            ✕
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleSupprimer(d)}
                                          className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-opacity-90 text-xs"
                                          title="Supprimer"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
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
        )}
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

            <div className="p-6 space-y-4">

              {/* ══ BANDEAU ENTÊTE ══ */}
              <div className="rounded-lg text-white px-5 py-4 flex justify-between items-start" style={{ background: '#06006E' }}>
                <div>
                  <div className="text-2xl font-bold tracking-widest">DEVIS</div>
                  <div className="text-sm font-bold opacity-90 mt-1">{devisSelectionne.numero}</div>
                </div>
                <div className="text-right">
                  {devisSelectionne.typeDevis && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-1" style={{ background: '#E05A00' }}>
                      {devisSelectionne.typeDevis}
                    </span>
                  )}
                  <div className="text-sm opacity-90">{formatDate(devisSelectionne.date)}</div>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    devisSelectionne.statut === 'VALIDE' ? 'bg-green-400 text-white' :
                    devisSelectionne.statut === 'FACTURE' ? 'bg-blue-400 text-white' :
                    devisSelectionne.statut === 'ANNULE' ? 'bg-red-400 text-white' :
                    'bg-gray-300 text-gray-800'
                  }`}>{devisSelectionne.statut}</span>
                </div>
              </div>

              {/* ══ CLIENT + INFOS ══ */}
              {(() => {
                const clientComplet = clients.find(c => c.id === devisSelectionne.clientId) || {}
                return (
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white" style={{ background: '#06006E' }}>Client</div>
                  <div className="p-3 space-y-1">
                    <p className="text-base font-bold" style={{ color: '#06006E' }}>{devisSelectionne.clientNom}</p>
                    {clientComplet.raisonSociale && (
                      <p className="text-xs text-gray-500">{clientComplet.raisonSociale}</p>
                    )}
                    {clientComplet.secteur && (
                      <p className="text-xs text-gray-500">Secteur : <span className="font-semibold">{clientComplet.secteur}</span></p>
                    )}
                    {(clientComplet.adresse || clientComplet.ville) && (
                      <p className="text-xs text-gray-600">
                        📍 {[clientComplet.adresse, clientComplet.ville, clientComplet.pays].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {clientComplet.contactNom && (
                      <p className="text-xs text-gray-600">👤 <span className="font-semibold">{clientComplet.contactNom}</span></p>
                    )}
                    {devisSelectionne.demandePar && devisSelectionne.demandePar !== clientComplet.contactNom && (
                      <p className="text-xs text-gray-600">Contact devis : <span className="font-semibold">{devisSelectionne.demandePar}</span></p>
                    )}
                    {clientComplet.contactTelephone && (
                      <p className="text-xs text-gray-600">📞 {clientComplet.contactTelephone}</p>
                    )}
                    {clientComplet.contactEmail && (
                      <p className="text-xs text-gray-600">✉️ {clientComplet.contactEmail}</p>
                    )}
                    {clientComplet.conditionsPaiement && (
                      <p className="text-xs text-gray-500 mt-1">Conditions paiement : <span className="font-semibold">{clientComplet.conditionsPaiement} jours</span></p>
                    )}
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white" style={{ background: '#06006E' }}>Informations</div>
                  <div className="p-3 space-y-1">
                    <p className="text-sm"><span className="font-semibold" style={{ color: '#06006E' }}>Référence :</span> {devisSelectionne.numero}</p>
                    <p className="text-sm"><span className="font-semibold" style={{ color: '#06006E' }}>Date :</span> {formatDate(devisSelectionne.date)}</p>
                    <p className="text-sm"><span className="font-semibold" style={{ color: '#06006E' }}>Validité :</span> 30 jours</p>
                    <p className="text-sm"><span className="font-semibold" style={{ color: '#06006E' }}>Établi par :</span> SIKA INDUSTRIE</p>
                    <hr className="my-1 border-gray-200"/>
                    <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: '#E05A00' }}>Consulté par</p>
                    <p className="text-sm font-bold" style={{ color: '#06006E' }}>
                      {utilisateurConnecte?.nom || utilisateurConnecte?.login || 'Utilisateur inconnu'}
                    </p>
                    {utilisateurConnecte?.login && utilisateurConnecte?.nom && (
                      <p className="text-xs text-gray-500">Login : {utilisateurConnecte.login}</p>
                    )}
                    {utilisateurConnecte?.role && (
                      <p className="text-xs text-gray-500">Rôle : {utilisateurConnecte.role}</p>
                    )}
                    {heureOuverture && (
                      <p className="text-xs font-semibold" style={{ color: '#c53030' }}>
                        🕐 {heureOuverture.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} à {heureOuverture.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
                )
              })()}

              {/* ══ OBJET ══ */}
              {devisSelectionne.objet && (
                <div className="border-l-4 rounded-r-lg p-3" style={{ borderColor: '#06006E', background: '#f0f4ff' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#06006E' }}>Objet</p>
                  <p className="text-sm text-gray-800">{devisSelectionne.objet}</p>
                </div>
              )}

              {/* ══ SPÉCIFICATIONS TECHNIQUES ══ */}
              {devisSelectionne.specifications && Object.keys(devisSelectionne.specifications).length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white" style={{ background: '#06006E' }}>Spécifications techniques</div>
                  <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(devisSelectionne.specifications)
                      .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 0)
                      .map(([k, v]) => {
                        const labels = {
                          typeTole: 'Type de tôle', epaisseur: 'Épaisseur (mm)', nombrePlis: 'Nb plis',
                          unitePrix: 'Unité de prix', typeTuyau: 'Type tuyau', pression: 'Pression',
                          typeSoudure: 'Type soudure', materiau: 'Matériau', forme: 'Forme',
                          volume: 'Volume', typeAcier: 'Type acier', portee: 'Portée',
                          hauteur: 'Hauteur', typeCharpente: 'Type charpente'
                        }
                        return (
                          <div key={k} className="bg-navyClair rounded p-2 text-center">
                            <p className="text-xs font-bold uppercase" style={{ color: '#E05A00' }}>{labels[k] || k}</p>
                            <p className="text-sm font-bold mt-0.5" style={{ color: '#06006E' }}>{String(v)}</p>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* ══ LIGNES DU DEVIS ══ */}
              {(() => {
                const lignes = devisSelectionne.lignes || devisSelectionne.lignesCommerciales || []
                return lignes.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white" style={{ background: '#06006E' }}>I. Détail des prestations</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead style={{ background: '#1a4a9b', color: 'white' }}>
                          <tr>
                            <th className="px-3 py-2 text-center w-8">N°</th>
                            <th className="px-3 py-2 text-left">Désignation</th>
                            <th className="px-3 py-2 text-center w-10">U</th>
                            <th className="px-3 py-2 text-center w-14">Qté</th>
                            <th className="px-3 py-2 text-right w-28">P.U. (FCFA)</th>
                            <th className="px-3 py-2 text-right w-32">Montant (FCFA)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lignes.map((ligne, idx) => {
                            const qte = parseFloat(ligne.qte || ligne.quantite || 0)
                            const pu = parseFloat(ligne.pu || ligne.prixUnitaire || 0)
                            const montant = ligne.montant || (qte * pu) || 0
                            return (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-navyClair'}>
                                <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                <td className="px-3 py-2">
                                  <span className="font-medium">{ligne.designation || '—'}</span>
                                  {ligne.epaisseur ? <span className="text-xs text-blue-500 ml-1">· Ép. {ligne.epaisseur}mm</span> : null}
                                  {ligne.typeTole ? <span className="text-xs text-blue-500 ml-1">· {ligne.typeTole}</span> : null}
                                  {ligne.typeTuyau ? <span className="text-xs text-blue-500 ml-1">· {ligne.typeTuyau}</span> : null}
                                </td>
                                <td className="px-3 py-2 text-center text-gray-600">{ligne.dn || ligne.unite || '—'}</td>
                                <td className="px-3 py-2 text-center font-bold" style={{ color: '#06006E' }}>{qte}</td>
                                <td className="px-3 py-2 text-right">{formatFCFA(pu)}</td>
                                <td className="px-3 py-2 text-right font-bold" style={{ color: '#06006E' }}>{formatFCFA(montant)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null
              })()}

              {/* ══ RÉCAPITULATIF FINANCIER ══ */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white flex items-center justify-between" style={{ background: '#06006E' }}>
                  <span>Récapitulatif financier</span>
                  <span className="text-xs opacity-70 font-normal">Montants en Francs CFA (FCFA)</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {devisSelectionne.montantBrut > 0 && devisSelectionne.remise > 0 && (<>
                      <tr className="border-b border-gray-100" style={{ background: '#f8f9ff' }}>
                        <td className="px-4 py-2 text-gray-500">📋 Sous-total des prestations (avant remise)</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-700 w-44">{formatFCFA(devisSelectionne.montantBrut)}</td>
                      </tr>
                      <tr className="border-b border-red-100" style={{ background: '#fff5f5' }}>
                        <td className="px-4 py-2 text-red-600">🏷️ Remise commerciale accordée</td>
                        <td className="px-4 py-2 text-right font-semibold text-red-600 w-44">− {formatFCFA(devisSelectionne.remise)}</td>
                      </tr>
                    </>)}
                    <tr className="border-b border-blue-100" style={{ background: '#dce6f1' }}>
                      <td className="px-4 py-2 font-semibold" style={{ color: '#06006E' }}>
                        💼 Montant Hors Taxes (HT)
                        <span className="ml-2 text-xs font-normal text-gray-500">— base imposable</span>
                      </td>
                      <td className="px-4 py-2 text-right font-bold w-44" style={{ color: '#06006E' }}>{formatFCFA(devisSelectionne.montantHT)}</td>
                    </tr>
                    {devisSelectionne.montantTVA > 0 && (
                      <tr className="border-b border-orange-100" style={{ background: '#fff8f0' }}>
                        <td className="px-4 py-2 text-orange-700">
                          🧾 TVA appliquée (taux 18%)
                          <span className="ml-2 text-xs font-normal text-gray-400">— taxe sur la valeur ajoutée</span>
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-orange-700 w-44">{formatFCFA(devisSelectionne.montantTVA)}</td>
                      </tr>
                    )}
                    <tr className="text-white" style={{ background: '#06006E' }}>
                      <td className="px-4 py-3 font-bold text-base">
                        ✅ MONTANT TOTAL À PAYER (TTC)
                        <div className="text-xs font-normal opacity-75 mt-0.5">Toutes taxes comprises — net à régler</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-lg w-44">{formatFCFA(devisSelectionne.montantTTC)}</td>
                    </tr>
                  </tbody>
                </table>

              </div>

              {/* ══ NOTES / OBSERVATIONS ══ */}
              {devisSelectionne.notes && (
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#f0c060' }}>
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest" style={{ background: '#fffbf0', color: '#E05A00', borderBottom: '1px solid #f0c060' }}>Notes / Observations</div>
                  <div className="p-3 text-sm text-gray-700 leading-relaxed" style={{ background: '#fffbf0' }}>{devisSelectionne.notes}</div>
                </div>
              )}

              {/* ══ CONDITIONS ══ */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white" style={{ background: '#06006E' }}>II. Conditions &amp; Validité</div>
                <div className="p-3 text-xs text-gray-600 leading-loose" style={{ background: '#f8f9ff' }}>
                  • Ce devis est valable <strong>trente (30) jours</strong> à compter de sa date d'émission.<br/>
                  • Pour acceptation, retourner ce document <strong>signé et cacheté</strong>.
                </div>
              </div>

              {/* ══ SIGNATURES ══ */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white" style={{ background: '#06006E' }}>III. Signatures</div>
                <div className="grid grid-cols-2 gap-0">
                  <div className="p-4 text-center border-r">
                    <p className="text-xs font-bold uppercase mb-1" style={{ color: '#06006E' }}>Lu et approuvé — Le Client</p>
                    <p className="text-xs text-gray-500 mb-2">Nom &amp; Fonction : ___________________</p>
                    <div className="h-12 border-b-2 mx-4 mb-2" style={{ borderColor: '#06006E' }}></div>
                    <p className="text-xs text-gray-400">Date : ___ / ___ / _______</p>
                    <p className="text-xs text-gray-400">Cachet &amp; Signature</p>
                  </div>
                  <div className="p-4 text-center" style={{ background: '#f0f4ff' }}>
                    <p className="text-xs font-bold uppercase text-white mb-1 -mx-4 -mt-4 px-4 py-1.5" style={{ background: '#06006E' }}>Pour SIKA INDUSTRIE — Le Gérant</p>
                    <p className="text-sm font-bold mt-1 mb-2" style={{ color: '#06006E' }}>KOMLAN AMEMATCHRON</p>
                    <div className="h-12 border-b-2 mx-4 mb-2" style={{ borderColor: '#06006E' }}></div>
                    <p className="text-xs text-gray-400">Date : ___ / ___ / _______</p>
                    <p className="text-xs text-gray-400">Cachet &amp; Signature</p>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                {isDevisEnAttente(devisSelectionne.statut) && (
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
                {isDevisEnAttente(devisSelectionne.statut) && (
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
