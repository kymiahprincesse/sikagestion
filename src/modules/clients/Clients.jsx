import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useClientsStore } from '../../store/useClientsStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useDevisStore } from '../../store/useDevisStore'
import { useFacturesStore } from '../../store/useFacturesStore'
import { usePlanificationStore } from '../../store/usePlanificationStore'
import { Breadcrumb, ActionButtons } from '../../components'
import ConfirmDialog from '../../components/ConfirmDialog'
import ConditionsPaiementSelector from '../../components/ConditionsPaiementSelector'
import { useNotificationsStore } from '../../store/useNotificationsStore'
import * as XLSX from 'xlsx'
import { formatFCFA } from '../../utils/format'
import { createSikaPDF, finalizeSikaPDF, sikaTable, formatMontant, formatDate, openPDFForPrint } from '../../utils/printUtils'

export default function Clients() {
  const { clients, addClient, updateClient, deleteClient, setClients } = useClientsStore()
  const { addLog } = useAuditStore()
  const { devis } = useDevisStore()
  const { factures } = useFacturesStore()
  const { projets } = usePlanificationStore()
  const { ajouterNotification } = useNotificationsStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterSecteur, setFilterSecteur] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterVille, setFilterVille] = useState('')
  const [filterActif, setFilterActif] = useState('tous')
  
  const [showModal, setShowModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [editingClient, setEditingClient] = useState(null)

  const [formData, setFormData] = useState({
    nom: '',
    raisonSociale: '',
    ncc: '',
    secteur: '',
    adresse: '',
    ville: '',
    pays: 'Côte d\'Ivoire',
    contactNom: '',
    contactTelephone: '',
    contactEmail: '',
    conditionsPaiement: 30,
    type: 'CLIENT',
    isActif: true,
    notes: ''
  })

  const breadcrumbItems = [
    { label: 'Accueil', path: '/' },
    { label: 'Clients' }
  ]

  const secteurs = useMemo(() => {
    const set = new Set(clients.map(c => c.secteur).filter(Boolean))
    return Array.from(set).sort()
  }, [clients])

  const villes = useMemo(() => {
    const set = new Set(clients.map(c => c.ville).filter(Boolean))
    return Array.from(set).sort()
  }, [clients])

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const searchLower = searchTerm.toLowerCase()
      const matchSearch = !searchTerm || 
        client.nom?.toLowerCase().includes(searchLower) ||
        client.raisonSociale?.toLowerCase().includes(searchLower) ||
        client.ncc?.toLowerCase().includes(searchLower) ||
        client.contactNom?.toLowerCase().includes(searchLower) ||
        client.contactEmail?.toLowerCase().includes(searchLower) ||
        client.contactTelephone?.toLowerCase().includes(searchLower) ||
        client.adresse?.toLowerCase().includes(searchLower) ||
        client.ville?.toLowerCase().includes(searchLower) ||
        client.secteur?.toLowerCase().includes(searchLower)

      const matchSecteur = !filterSecteur || client.secteur === filterSecteur
      const matchType = !filterType || client.type === filterType
      const matchVille = !filterVille || client.ville === filterVille
      const matchActif = filterActif === 'tous' || 
        (filterActif === 'actif' && client.isActif) ||
        (filterActif === 'inactif' && !client.isActif)

      return matchSearch && matchSecteur && matchType && matchVille && matchActif
    })
  }, [clients, searchTerm, filterSecteur, filterType, filterVille, filterActif])

  const getClientStats = (clientId) => {
    const clientDevis = devis?.filter(d => d.clientId === clientId) || []
    const clientFactures = factures?.filter(f => f.clientId === clientId) || []
    const clientProjets = projets?.filter(p => p.clientId === clientId) || []

    const caTotal = clientFactures.reduce((sum, f) => sum + (f.montantTTC || 0), 0)
    const resteARecouvrer = clientFactures
      .filter(f => f.statut !== 'Payé')
      .reduce((sum, f) => sum + (f.montantTTC || 0) - (f.montantPaye || 0), 0)

    return {
      nbDevis: clientDevis.length,
      nbFactures: clientFactures.length,
      nbProjets: clientProjets.length,
      caTotal,
      resteARecouvrer,
      devis: clientDevis,
      factures: clientFactures,
      projets: clientProjets
    }
  }

  const handleOpenModal = (client = null) => {
    if (client) {
      setEditingClient(client)
      setFormData({
        nom: client.nom || '',
        raisonSociale: client.raisonSociale || '',
        ncc: client.ncc || '',
        secteur: client.secteur || '',
        adresse: client.adresse || '',
        ville: client.ville || '',
        pays: client.pays || 'Côte d\'Ivoire',
        contactNom: client.contactNom || '',
        contactTelephone: client.contactTelephone || '',
        contactEmail: client.contactEmail || '',
        conditionsPaiement: client.conditionsPaiement || 30,
        type: client.type || 'CLIENT',
        isActif: client.isActif !== undefined ? client.isActif : true,
        notes: client.notes || ''
      })
    } else {
      setEditingClient(null)
      setFormData({
        nom: '',
        raisonSociale: '',
        ncc: '',
        secteur: '',
        adresse: '',
        ville: '',
        pays: 'Côte d\'Ivoire',
        contactNom: '',
        contactTelephone: '',
        contactEmail: '',
        conditionsPaiement: 30,
        type: 'CLIENT',
        isActif: true,
        notes: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingClient(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nom.trim()) {
      error('Le nom est obligatoire')
      return
    }

    try {
      const payload = {
        nom: formData.nom,
        raison_sociale: formData.raisonSociale || null,
        ncc: formData.ncc || null,
        secteur: formData.secteur || null,
        adresse: formData.adresse || null,
        ville: formData.ville || null,
        pays: formData.pays || null,
        contact_nom: formData.contactNom || null,
        contact_telephone: formData.contactTelephone || null,
        contact_email: formData.contactEmail || null,
        conditions_paiement: formData.conditionsPaiement || 30,
        type: formData.type || 'CLIENT',
        is_actif: formData.isActif !== undefined ? formData.isActif : true,
        notes: formData.notes || null
      }

      if (editingClient) {
        const { error: supaErr } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', editingClient.id)
        if (supaErr) throw supaErr
        updateClient(editingClient.id, formData)
        addLog({
          module: 'clients',
          action: 'Modification client',
          utilisateur: 'Admin',
          avant: editingClient,
          apres: { ...editingClient, ...formData }
        })
        success(`Client "${formData.nom}" modifié avec succès`)
      } else {
        const { data: inserted, error: supaErr } = await supabase
          .from('clients')
          .insert(payload)
          .select()
          .single()
        if (supaErr) throw supaErr
        const newClient = {
          ...formData,
          id: inserted.id,
          dateCreation: inserted.date_creation
        }
        setClients([...clients, newClient])
        addLog({
          module: 'clients',
          action: 'Création client',
          utilisateur: 'Admin',
          apres: newClient
        })
        success(`Client "${formData.nom}" créé avec succès`)
      }

      handleCloseModal()
    } catch (err) {
      console.error(err)
      error('Erreur lors de l\'enregistrement : ' + (err.message || 'Vérifiez la connexion Supabase'))
    }
  }

  const handleDelete = async (client) => {
    const confirmed = await confirmDelete(client.nom)
    if (confirmed) {
      try {
        const { error: supaErr } = await supabase
          .from('clients')
          .delete()
          .eq('id', client.id)
        if (supaErr) throw supaErr
        deleteClient(client.id)
        addLog({
          module: 'clients',
          action: 'Suppression client',
          utilisateur: 'Admin',
          avant: client
        })
        success(`Client "${client.nom}" supprimé avec succès`)
      } catch (err) {
        console.error(err)
        error('Erreur lors de la suppression : ' + (err.message || 'Vérifiez la connexion Supabase'))
      }
    }
  }

  const handleViewHistory = (client) => {
    setSelectedClient(client)
    setShowHistory(true)
  }

  const handleExportExcel = () => {
    if (filteredClients.length === 0) {
      error('Aucun client à exporter')
      return
    }

    try {

    const dataExport = filteredClients.map(c => {
      const stats = getClientStats(c.id)
      return {
        'Nom': c.nom,
        'Raison Sociale': c.raisonSociale || '',
        'NCC': c.ncc || '',
        'Secteur': c.secteur || '',
        'Ville': c.ville || '',
        'Pays': c.pays || '',
        'Contact': c.contactNom || '',
        'Téléphone': c.contactTelephone || '',
        'Email': c.contactEmail || '',
        'Type': c.type || 'Client',
        'Statut': c.isActif ? 'Actif' : 'Inactif',
        'Nb Devis': stats.nbDevis,
        'Nb Factures': stats.nbFactures,
        'Nb Projets': stats.nbProjets,
        'CA Total': stats.caTotal,
        'Reste à Recouvrer': stats.resteARecouvrer
      }
    })
    
    const ws = XLSX.utils.json_to_sheet(dataExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clients')
    XLSX.writeFile(wb, `Clients_${new Date().toISOString().split('T')[0]}.xlsx`)
    
    addLog({
      module: 'clients',
      action: 'Export Excel',
      utilisateur: 'Admin',
      apres: { nbClients: filteredClients.length }
    })
    success(`${filteredClients.length} clients exportés avec succès`)
    } catch (err) {
      error('Erreur lors de l\'export Excel')
    }
  }

  const handleExportPDF = async () => {
    if (filteredClients.length === 0) {
      error('Aucun client à exporter')
      return
    }

    try {
      const ctx = await createSikaPDF('LISTE DES CLIENTS')
      const { doc, startY, MARGE_G } = ctx
      
      let y = startY
      
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Date d'édition : ${formatDate(new Date())}`, MARGE_G, y)
      doc.text(`Total : ${filteredClients.length} client(s)`, MARGE_G + 60, y)
      y += 8
      
      const columns = ['Nom', 'Ville', 'Téléphone', 'Type', 'Statut', 'Devis', 'CA Total (FCFA)']
      const rows = filteredClients.map(c => {
        const stats = getClientStats(c.id)
        return [
          c.nom || '',
          c.ville || '',
          c.contactTelephone || '',
          c.type || 'Client',
          c.isActif ? 'Actif' : 'Inactif',
          stats.nbDevis || 0,
          formatMontant(stats.caTotal || 0)
        ]
      })
      
      sikaTable(doc, columns, rows, y, ctx)
      
      await finalizeSikaPDF(ctx, `SIKA_Clients_${new Date().toISOString().split('T')[0]}.pdf`)
      
      addLog({
        module: 'clients',
        action: 'Export PDF',
        utilisateur: 'Admin',
        apres: { nbClients: filteredClients.length }
      })
      success(`PDF généré avec succès (${filteredClients.length} clients)`)
    } catch (err) {
      console.error('Erreur lors de la génération du PDF:', err)
      error('Erreur lors de l\'export PDF')
    }
  }

  const handlePrintAll = async () => {
    if (filteredClients.length === 0) {
      error('Aucun client à imprimer')
      return
    }

    try {
      const ctx = await createSikaPDF('LISTE DES CLIENTS')
      const { doc, startY, MARGE_G } = ctx
      
      let y = startY
      
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Date : ${formatDate(new Date())}`, MARGE_G, y)
      doc.text(`Total : ${filteredClients.length} client(s)`, MARGE_G + 60, y)
      y += 8
      
      const columns = ['Nom', 'Ville', 'Téléphone', 'Type', 'Statut', 'Devis', 'CA Total (FCFA)']
      const rows = filteredClients.map(c => {
        const stats = getClientStats(c.id)
        return [
          c.nom || '',
          c.ville || '',
          c.contactTelephone || '',
          c.type || 'Client',
          c.isActif ? 'Actif' : 'Inactif',
          stats.nbDevis || 0,
          formatMontant(stats.caTotal || 0)
        ]
      })
      
      sikaTable(doc, columns, rows, y, ctx)
      
      await openPDFForPrint(ctx)
      
      addLog({
        module: 'clients',
        action: 'Impression globale',
        utilisateur: 'Admin',
        apres: { nbClients: filteredClients.length }
      })
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error)
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR',
        message: `Erreur lors de l'impression: ${error.message || 'Erreur inconnue'}`
      })
    }
  }

  const handlePrintFiche = async (client) => {
    try {
      const ctx = await createSikaPDF(`FICHE CLIENT - ${client.nom}`)
      const { doc, startY, MARGE_G, PAGE_W } = ctx
      const stats = getClientStats(client.id)
      
      let y = startY
      
      // Section INFORMATIONS GÉNÉRALES
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(27, 42, 74)
      doc.text('INFORMATIONS GÉNÉRALES', MARGE_G, y)
      y += 8
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const infosGenerales = [
        ['Nom', client.nom || '—'],
        ['Raison Sociale', client.raisonSociale || '—'],
        ['NCC', client.ncc || '—'],
        ['Secteur', client.secteur || '—'],
        ['Type', client.type || '—'],
        ['Statut', client.isActif ? 'Actif' : 'Inactif']
      ]
      
      infosGenerales.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.text(label + ' :', MARGE_G + 5, y)
        doc.setFont('helvetica', 'normal')
        doc.text(value, MARGE_G + 50, y)
        y += 6
      })
      
      y += 5
      
      // Section COORDONNÉES
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(27, 42, 74)
      doc.text('COORDONNÉES', MARGE_G, y)
      y += 8
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const coordonnees = [
        ['Adresse', client.adresse || '—'],
        ['Ville', client.ville || '—'],
        ['Pays', client.pays || '—'],
        ['Contact', client.contactNom || '—'],
        ['Téléphone', client.contactTelephone || '—'],
        ['Email', client.contactEmail || '—']
      ]
      
      coordonnees.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.text(label + ' :', MARGE_G + 5, y)
        doc.setFont('helvetica', 'normal')
        doc.text(value, MARGE_G + 50, y)
        y += 6
      })
      
      y += 5
      
      // Section STATISTIQUES
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(27, 42, 74)
      doc.text('STATISTIQUES', MARGE_G, y)
      y += 8
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const statistiques = [
        ['Nombre de devis', (stats.nbDevis || 0).toString()],
        ['Nombre de factures', (stats.nbFactures || 0).toString()],
        ['Nombre de projets', (stats.nbProjets || 0).toString()],
        ['CA Total', formatMontant(stats.caTotal || 0) + ' FCFA'],
        ['Reste à recouvrer', formatMontant(stats.resteARecouvrer || 0) + ' FCFA']
      ]
      
      statistiques.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.text(label + ' :', MARGE_G + 5, y)
        doc.setFont('helvetica', 'normal')
        doc.text(value, MARGE_G + 50, y)
        y += 6
      })
      
      await openPDFForPrint(ctx)
      
      addLog({
        module: 'clients',
        action: 'Impression fiche client',
        utilisateur: 'Admin',
        apres: { clientId: client.id, clientNom: client.nom }
      })
    } catch (error) {
      console.error('Erreur lors de la génération de la fiche:', error)
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR',
        message: `Erreur lors de l'impression de la fiche: ${error.message || 'Erreur inconnue'}`
      })
    }
  }

  const resetFilters = () => {
    setSearchTerm('')
    setFilterSecteur('')
    setFilterType('')
    setFilterVille('')
    setFilterActif('tous')
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-navy mb-2">Référentiel Clients</h1>
        <p className="text-bleu">Gestion complète de vos clients et fournisseurs</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-argent p-4 mb-6 sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-orange text-white rounded-lg font-medium hover:bg-orange/90 transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            <span>Nouveau Client</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-vert text-white rounded-lg font-medium hover:bg-vert/90 transition-colors flex items-center gap-2"
          >
            <span>📊</span>
            <span>Exporter Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-rouge text-white rounded-lg font-medium hover:bg-rouge/90 transition-colors flex items-center gap-2"
          >
            <span>📄</span>
            <span>Exporter PDF</span>
          </button>

          <button
            onClick={handlePrintAll}
            className="px-4 py-2 bg-bleu text-white rounded-lg font-medium hover:bg-bleu/90 transition-colors flex items-center gap-2"
          >
            <span>🖨️</span>
            <span>Imprimer Tout</span>
          </button>

          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="🔍 Rechercher (nom, NCC, contact, email, téléphone, ville, secteur...)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-argent p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium text-navy block mb-1">Secteur</label>
            <select
              value={filterSecteur}
              onChange={(e) => setFilterSecteur(e.target.value)}
              className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
            >
              <option value="">Tous les secteurs</option>
              {secteurs.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-navy block mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
            >
              <option value="">Tous les types</option>
              <option value="CLIENT">CLIENT</option>
              <option value="FOURNISSEUR">FOURNISSEUR</option>
              <option value="LES DEUX">LES DEUX</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-navy block mb-1">Ville</label>
            <select
              value={filterVille}
              onChange={(e) => setFilterVille(e.target.value)}
              className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
            >
              <option value="">Toutes les villes</option>
              {villes.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-navy block mb-1">Statut</label>
            <select
              value={filterActif}
              onChange={(e) => setFilterActif(e.target.value)}
              className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
            >
              <option value="tous">Tous</option>
              <option value="actif">Actifs</option>
              <option value="inactif">Inactifs</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full px-4 py-2 bg-argent text-gray-700 rounded-lg font-medium hover:bg-argent/80 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-argent overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-orange bg-navyClair">
                <th className="text-left py-3 px-4 text-navy font-bold">Nom</th>
                <th className="text-left py-3 px-4 text-navy font-bold">NCC</th>
                <th className="text-left py-3 px-4 text-navy font-bold">Secteur</th>
                <th className="text-left py-3 px-4 text-navy font-bold">Ville</th>
                <th className="text-left py-3 px-4 text-navy font-bold">Contact</th>
                <th className="text-left py-3 px-4 text-navy font-bold">Nb devis</th>
                <th className="text-left py-3 px-4 text-navy font-bold">CA total</th>
                <th className="text-left py-3 px-4 text-navy font-bold">Statut</th>
                <th className="text-left py-3 px-4 text-navy font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-bleu">
                    Aucun client trouvé
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const stats = getClientStats(client.id)
                  return (
                    <tr 
                      key={client.id} 
                      className="border-b border-argent hover:bg-orangeClair transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-navy">{client.nom}</div>
                        {client.raisonSociale && (
                          <div className="text-sm text-bleu">{client.raisonSociale}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-bleu">{client.ncc || '-'}</td>
                      <td className="py-3 px-4 text-bleu">{client.secteur || '-'}</td>
                      <td className="py-3 px-4 text-bleu">{client.ville || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-navy">{client.contactNom || '-'}</div>
                        {client.contactTelephone && (
                          <div className="text-xs text-bleu">{client.contactTelephone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-navy">
                        {stats.nbDevis}
                      </td>
                      <td className="py-3 px-4 font-bold text-navy">
                        {formatFCFA(stats.caTotal)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          client.isActif 
                            ? 'bg-vert/10 text-vert border border-vert' 
                            : 'bg-rouge/10 text-rouge border border-rouge'
                        }`}>
                          {client.isActif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(client)}
                            className="px-2 py-1 bg-bleu text-white rounded text-xs hover:bg-bleu/90"
                            title="Modifier"
                          >
                            📝
                          </button>
                          <button
                            onClick={() => handleViewHistory(client)}
                            className="px-2 py-1 bg-orange text-white rounded text-xs hover:bg-orange/90"
                            title="Voir historique"
                          >
                            👁
                          </button>
                          <button
                            onClick={() => handlePrintFiche(client)}
                            className="px-2 py-1 bg-navy text-white rounded text-xs hover:bg-navy/90"
                            title="Imprimer fiche"
                          >
                            🖨
                          </button>
                          <button
                            onClick={() => handleDelete(client)}
                            className="px-2 py-1 bg-rouge text-white rounded text-xs hover:bg-rouge/90"
                            title="Supprimer"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-bleu">
        {filteredClients.length} client(s) affiché(s) sur {clients.length} au total
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/80" onClick={handleCloseModal}></div>
          
          <div className="relative bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-navy text-white p-6 rounded-t-lg">
              <h2 className="text-2xl font-bold">
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-navy block mb-1">
                    Nom <span className="text-rouge">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-navy block mb-1">
                    Raison sociale
                  </label>
                  <input
                    type="text"
                    value={formData.raisonSociale}
                    onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })}
                    className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-navy block mb-1">
                    NCC (Numéro Compte Client)
                  </label>
                  <input
                    type="text"
                    value={formData.ncc}
                    onChange={(e) => setFormData({ ...formData, ncc: e.target.value })}
                    className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-navy block mb-1">
                    Secteur d'activité
                  </label>
                  <input
                    type="text"
                    value={formData.secteur}
                    onChange={(e) => setFormData({ ...formData, secteur: e.target.value })}
                    className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-navy block mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-navy block mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-navy block mb-1">
                    Pays
                  </label>
                  <input
                    type="text"
                    value={formData.pays}
                    onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                    className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-navy block mb-1">
                    Contact principal - Nom
                  </label>
                  <input
                    type="text"
                    value={formData.contactNom}
                    onChange={(e) => setFormData({ ...formData, contactNom: e.target.value })}
                    className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-navy block mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.contactTelephone}
                    onChange={(e) => setFormData({ ...formData, contactTelephone: e.target.value })}
                    className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-navy block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-navy block mb-1">
                    Conditions de paiement
                  </label>
                  <ConditionsPaiementSelector
                    value={formData.conditionsPaiement}
                    onChange={(jours) => setFormData({ ...formData, conditionsPaiement: jours })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-navy block mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
                  >
                    <option value="CLIENT">CLIENT</option>
                    <option value="FOURNISSEUR">FOURNISSEUR</option>
                    <option value="LES DEUX">LES DEUX</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActif}
                      onChange={(e) => setFormData({ ...formData, isActif: e.target.checked })}
                      className="w-5 h-5 text-orange border-argent rounded focus:ring-orange"
                    />
                    <span className="ml-2 text-sm font-medium text-navy">Client actif</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-navy block mb-1">
                    Notes libres
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-argent text-gray-700 rounded-lg font-medium hover:bg-argent/80 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange text-white rounded-lg font-medium hover:bg-orange/90 transition-colors"
                >
                  {editingClient ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistory && selectedClient && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-navy/80" onClick={() => setShowHistory(false)}></div>
          
          <div className="relative ml-auto bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-navy text-white p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Historique - {selectedClient.nom}</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-white hover:text-orange text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {(() => {
                const stats = getClientStats(selectedClient.id)
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-orangeClair p-4 rounded-lg border border-orange">
                        <div className="text-sm text-bleu mb-1">CA Total</div>
                        <div className="text-2xl font-bold text-navy">
                          {formatFCFA(stats.caTotal)}
                        </div>
                      </div>
                      <div className="bg-rouge/10 p-4 rounded-lg border border-rouge">
                        <div className="text-sm text-bleu mb-1">Reste à recouvrer</div>
                        <div className="text-2xl font-bold text-rouge">
                          {formatFCFA(stats.resteARecouvrer)}
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-navy mb-3 border-b-2 border-orange pb-2">
                        Devis ({stats.nbDevis})
                      </h3>
                      {stats.devis.length === 0 ? (
                        <p className="text-bleu text-sm">Aucun devis</p>
                      ) : (
                        <div className="space-y-2">
                          {stats.devis.map(d => (
                            <div key={d.id} className="flex justify-between items-center p-3 bg-navyClair rounded-lg">
                              <div>
                                <div className="font-medium text-navy">{d.numero}</div>
                                <div className="text-sm text-bleu">{d.date}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-navy">{formatFCFA(d.montantTTC)}</div>
                                <div className="text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    d.statut === 'Accepté' ? 'bg-vert/10 text-vert' :
                                    d.statut === 'Refusé' ? 'bg-rouge/10 text-rouge' :
                                    'bg-orange/10 text-orange'
                                  }`}>
                                    {d.statut}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-navy mb-3 border-b-2 border-orange pb-2">
                        Factures ({stats.nbFactures})
                      </h3>
                      {stats.factures.length === 0 ? (
                        <p className="text-bleu text-sm">Aucune facture</p>
                      ) : (
                        <div className="space-y-2">
                          {stats.factures.map(f => (
                            <div key={f.id} className="flex justify-between items-center p-3 bg-navyClair rounded-lg">
                              <div>
                                <div className="font-medium text-navy">{f.numero}</div>
                                <div className="text-sm text-bleu">{f.date}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-navy">{formatFCFA(f.montantTTC)}</div>
                                <div className="text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    f.statut === 'Payé' ? 'bg-vert/10 text-vert' :
                                    f.statut === 'Retard' ? 'bg-rouge/10 text-rouge' :
                                    'bg-orange/10 text-orange'
                                  }`}>
                                    {f.statut}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-navy mb-3 border-b-2 border-orange pb-2">
                        Projets de planification ({stats.nbProjets})
                      </h3>
                      {stats.projets.length === 0 ? (
                        <p className="text-bleu text-sm">Aucun projet</p>
                      ) : (
                        <div className="space-y-2">
                          {stats.projets.map(p => (
                            <div key={p.id} className="p-3 bg-navyClair rounded-lg">
                              <div className="font-medium text-navy">{p.nom}</div>
                              <div className="text-sm text-bleu">{p.description}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
