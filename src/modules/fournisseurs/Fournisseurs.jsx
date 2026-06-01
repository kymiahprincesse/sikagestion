import { useState, useMemo, useEffect, useCallback } from 'react'
import { useFournisseursStore } from '../../store/useFournisseursStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useNotifications } from '../../components/NotificationProvider'
import SikaHeader from '../../components/SikaHeader'
import SikaFooter from '../../components/SikaFooter'
import ConditionsPaiementSelector from '../../components/ConditionsPaiementSelector'
import { Search, Plus, Edit2, Trash2, Eye, Phone, Mail, MapPin, Building2, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatDateLong } from '../../utils/format'
import enteteImg from '../../assets/ENTETE SIKApng1.png'
import piedImg from '../../assets/ENTETE SIKA pied 1.png'

export default function Fournisseurs() {
  const { fournisseurs, addFournisseur, updateFournisseur, deleteFournisseur, getFournisseurById, setFournisseurs } = useFournisseursStore()
  const { addLog } = useAuditStore()
  const utilisateur = useAuthStore(state => state.utilisateurConnecte)
  const { success, error, confirmDelete } = useNotifications()

  const [loading, setLoading] = useState(false)

  const reloadFournisseurs = useCallback(async () => {
    try {
      const { data, error: err } = await supabase.from('fournisseurs').select('*').order('id')
      if (err) throw err
      if (data) {
        setFournisseurs(data.map(f => ({
          id: f.id,
          nom: f.nom,
          raisonSociale: f.raison_sociale,
          type: f.type,
          secteur: f.secteur,
          adresse: f.adresse,
          ville: f.ville,
          pays: f.pays,
          contactNom: f.contact_nom,
          contactTelephone: f.contact_telephone,
          contactEmail: f.contact_email,
          conditionsPaiement: f.conditions_paiement,
          numeroCompte: f.numero_compte,
          banque: f.banque,
          isActif: f.is_actif,
          notes: f.notes,
          dateCreation: f.date_creation
        })))
      }
    } catch (err) {
      console.error('Erreur chargement fournisseurs:', err)
    }
  }, [setFournisseurs])

  useEffect(() => { reloadFournisseurs() }, [reloadFournisseurs])

  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [fournisseurSelectionne, setFournisseurSelectionne] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [filtreType, setFiltreType] = useState('')
  const [filtreActif, setFiltreActif] = useState('tous')

  const [formData, setFormData] = useState({
    nom: '',
    raisonSociale: '',
    type: 'MATERIEL',
    secteur: '',
    adresse: '',
    ville: 'Abidjan',
    pays: 'Côte d\'Ivoire',
    contactNom: '',
    contactTelephone: '',
    contactEmail: '',
    conditionsPaiement: 30,
    numeroCompte: '',
    banque: '',
    isActif: true,
    notes: ''
  })

  const typesFournisseur = [
    { value: 'MATERIEL', label: 'Matériel & Équipement', icon: '🔧' },
    { value: 'MATIERE_PREMIERE', label: 'Matières Premières', icon: '📦' },
    { value: 'SERVICE', label: 'Services', icon: '🛠️' },
    { value: 'SOUS_TRAITANT', label: 'Sous-traitant', icon: '👷' },
    { value: 'TRANSPORT', label: 'Transport & Logistique', icon: '🚚' },
    { value: 'AUTRE', label: 'Autre', icon: '📋' }
  ]

  const fournisseursFiltres = useMemo(() => {
    let resultat = [...fournisseurs]

    if (recherche) {
      const terme = recherche.toLowerCase()
      resultat = resultat.filter(f =>
        f.nom?.toLowerCase().includes(terme) ||
        f.raisonSociale?.toLowerCase().includes(terme) ||
        f.contactNom?.toLowerCase().includes(terme) ||
        f.secteur?.toLowerCase().includes(terme)
      )
    }

    if (filtreType) {
      resultat = resultat.filter(f => f.type === filtreType)
    }

    if (filtreActif === 'actifs') {
      resultat = resultat.filter(f => f.isActif === true)
    } else if (filtreActif === 'inactifs') {
      resultat = resultat.filter(f => f.isActif === false)
    }

    return resultat.sort((a, b) => a.nom.localeCompare(b.nom))
  }, [fournisseurs, recherche, filtreType, filtreActif])

  const stats = useMemo(() => {
    return {
      total: fournisseurs.length,
      actifs: fournisseurs.filter(f => f.isActif).length,
      inactifs: fournisseurs.filter(f => !f.isActif).length,
      parType: typesFournisseur.map(type => ({
        type: type.value,
        label: type.label,
        count: fournisseurs.filter(f => f.type === type.value).length
      }))
    }
  }, [fournisseurs])

  const handleNouveauFournisseur = () => {
    setFournisseurSelectionne(null)
    setFormData({
      nom: '',
      raisonSociale: '',
      type: 'MATERIEL',
      secteur: '',
      adresse: '',
      ville: 'Abidjan',
      pays: 'Côte d\'Ivoire',
      contactNom: '',
      contactTelephone: '',
      contactEmail: '',
      conditionsPaiement: 30,
      numeroCompte: '',
      banque: '',
      isActif: true,
      notes: ''
    })
    setShowModal(true)
  }

  const handleModifier = (fournisseur) => {
    setFournisseurSelectionne(fournisseur)
    setFormData(fournisseur)
    setShowModal(true)
  }

  const handleVoir = (fournisseur) => {
    setFournisseurSelectionne(fournisseur)
    setShowDetailModal(true)
  }

  const handleSauvegarder = async () => {
    if (!formData.nom || !formData.contactNom) {
      error('Le nom du fournisseur et le contact sont obligatoires')
      return
    }

    setLoading(true)
    try {
      const payload = {
        nom: formData.nom,
        raison_sociale: formData.raisonSociale || null,
        type: formData.type,
        secteur: formData.secteur || null,
        adresse: formData.adresse || null,
        ville: formData.ville || null,
        pays: formData.pays || null,
        contact_nom: formData.contactNom,
        contact_telephone: formData.contactTelephone || null,
        contact_email: formData.contactEmail || null,
        conditions_paiement: formData.conditionsPaiement || null,
        numero_compte: formData.numeroCompte || null,
        banque: formData.banque || null,
        is_actif: formData.isActif !== undefined ? formData.isActif : true,
        notes: formData.notes || null,
        date_creation: formData.dateCreation || new Date().toISOString().split('T')[0]
      }

      if (fournisseurSelectionne) {
        const { error: supaErr } = await supabase
          .from('fournisseurs')
          .update(payload)
          .eq('id', fournisseurSelectionne.id)
        if (supaErr) throw supaErr
        addLog({ module: 'Fournisseurs', action: 'Modification fournisseur', utilisateur: utilisateur?.nom, details: `Fournisseur ${formData.nom} modifié` })
        success(`Fournisseur "${formData.nom}" modifié avec succès`)
      } else {
        const { data: inserted, error: supaErr } = await supabase
          .from('fournisseurs')
          .insert(payload)
          .select()
          .single()
        if (supaErr) throw supaErr
        addFournisseur({ ...formData, id: inserted.id, dateCreation: inserted.date_creation })
        addLog({ module: 'Fournisseurs', action: 'Création fournisseur', utilisateur: utilisateur?.nom, details: `Nouveau fournisseur ${formData.nom}` })
        success(`Fournisseur "${formData.nom}" créé avec succès`)
      }

      await reloadFournisseurs()
      setShowModal(false)
    } catch (err) {
      console.error(err)
      error('Erreur enregistrement : ' + (err.message || 'Vérifiez la connexion Supabase'))
    } finally {
      setLoading(false)
    }
  }

  const handleSupprimer = async (fournisseur) => {
    const confirmed = await confirmDelete(fournisseur.nom)
    if (confirmed) {
      try {
        const { error: supaErr } = await supabase
          .from('fournisseurs')
          .delete()
          .eq('id', fournisseur.id)
        if (supaErr) throw supaErr
        deleteFournisseur(fournisseur.id)
        addLog({ module: 'Fournisseurs', action: 'Suppression fournisseur', utilisateur: utilisateur?.nom, details: `Fournisseur ${fournisseur.nom} supprimé` })
        success(`Fournisseur "${fournisseur.nom}" supprimé avec succès`)
        await reloadFournisseurs()
      } catch (err) {
        console.error(err)
        error('Erreur lors de la suppression : ' + (err.message || ''))
      }
    }
  }

  const handlePrintFiche = (fournisseur) => {
    const typeInfo = typesFournisseur.find(t => t.value === fournisseur.type)
    const origin = window.location.origin
    const toAbs = (url) => url.startsWith('http') ? url : `${origin}${url}`
    const entete = toAbs(enteteImg)
    const pied = toAbs(piedImg)
    const win = window.open('', '_blank', 'width=850,height=1100')
    win.document.write(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Fiche Fournisseur – ${fournisseur.nom}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1B2A4A; background: #fff; }
    /* ── EN-TÊTE FIXE SUR CHAQUE PAGE ── */
    .entete { position: fixed; top: 0; left: 0; right: 0; z-index: 100; }
    .entete img { width: 100%; display: block; }
    /* Sous-bande titre document */
    .entete-sub { background: #1B2A4A; padding: 6px 32px; display: flex; justify-content: space-between; align-items: center; }
    .entete-sub h2 { color: #fff; font-size: 15px; font-weight: 700; letter-spacing: .04em; }
    .entete-sub span { color: #C8C8D0; font-size: 11px; }
    /* ── PIED DE PAGE FIXE SUR CHAQUE PAGE ── */
    .pied { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; }
    .pied img { width: 100%; display: block; }
    /* ── CONTENU ── */
    .body { margin-top: 160px; margin-bottom: 90px; padding: 24px 36px; }
    .title-section { border-left: 4px solid #E60000; padding-left: 14px; margin-bottom: 20px; }
    .title-section h3 { font-size: 19px; color: #1B2A4A; font-weight: 700; }
    .title-section small { font-size: 12px; color: #666; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; margin-left: 8px; vertical-align: middle; }
    .badge-actif { background: #1A7A4A; color: #fff; }
    .badge-inactif { background: #E60000; color: #fff; }
    .meta-row { display: flex; justify-content: space-between; font-size: 11px; color: #777; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #E8ECF4; }
    .section-title { font-size: 11px; font-weight: 700; color: #E60000; text-transform: uppercase; letter-spacing: .07em; border-bottom: 2px solid #E60000; padding-bottom: 4px; margin-bottom: 12px; margin-top: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 32px; margin-bottom: 4px; }
    .field label { font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: .06em; }
    .field p { font-size: 13px; color: #1B2A4A; margin-top: 2px; font-weight: 500; }
    .notes-box { background: #E8ECF4; border-left: 4px solid #1B2A4A; padding: 10px 14px; border-radius: 3px; font-size: 12px; line-height: 1.65; color: #1B2A4A; }
    @page { margin: 0; size: A4; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <!-- EN-TÊTE -->
  <div class="entete">
    <img src="${entete}" alt="En-tête SIKA INDUSTRIE" />
    <div class="entete-sub">
      <h2>FICHE FOURNISSEUR</h2>
      <span>Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} — ERP/CRM SIKA v1.0</span>
    </div>
  </div>

  <!-- CONTENU -->
  <div class="body">
    <div class="title-section">
      <h3>${fournisseur.nom} <span class="badge ${fournisseur.isActif ? 'badge-actif' : 'badge-inactif'}">${fournisseur.isActif ? 'Actif' : 'Inactif'}</span></h3>
      <small>${fournisseur.raisonSociale || '&nbsp;'}</small>
    </div>
    <div class="meta-row">
      <span>Réf. interne : <strong>#${fournisseur.id}</strong></span>
      <span>Créé le : <strong>${fournisseur.dateCreation || '—'}</strong></span>
    </div>

    <div class="section-title">Informations Générales</div>
    <div class="grid">
      <div class="field"><label>Type</label><p>${typeInfo?.icon || ''} ${typeInfo?.label || fournisseur.type}</p></div>
      <div class="field"><label>Secteur d'activité</label><p>${fournisseur.secteur || '—'}</p></div>
      <div class="field"><label>Adresse</label><p>${fournisseur.adresse || '—'}</p></div>
      <div class="field"><label>Ville / Pays</label><p>${fournisseur.ville || '—'} — ${fournisseur.pays || '—'}</p></div>
    </div>

    <div class="section-title">Contact Principal</div>
    <div class="grid">
      <div class="field"><label>Nom du contact</label><p>${fournisseur.contactNom || '—'}</p></div>
      <div class="field"><label>Téléphone</label><p>${fournisseur.contactTelephone || '—'}</p></div>
      <div class="field" style="grid-column:1/-1"><label>Email</label><p>${fournisseur.contactEmail || '—'}</p></div>
    </div>

    <div class="section-title">Informations Bancaires & Paiement</div>
    <div class="grid">
      <div class="field"><label>Banque</label><p>${fournisseur.banque || '—'}</p></div>
      <div class="field"><label>Numéro de compte</label><p>${fournisseur.numeroCompte || '—'}</p></div>
      <div class="field"><label>Conditions de paiement</label><p>${fournisseur.conditionsPaiement ? fournisseur.conditionsPaiement + ' jours' : '—'}</p></div>
    </div>

    ${fournisseur.notes ? `<div class="section-title">Notes</div><div class="notes-box">${fournisseur.notes}</div>` : ''}
  </div>

  <!-- PIED DE PAGE -->
  <div class="pied">
    <img src="${pied}" alt="Pied de page SIKA INDUSTRIE" />
  </div>
</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  const handlePrintListe = () => {
    const origin = window.location.origin
    const toAbs = (url) => url.startsWith('http') ? url : `${origin}${url}`
    const entete = toAbs(enteteImg)
    const pied = toAbs(piedImg)
    const rows = fournisseursFiltres.map((f, i) => {
      const ti = typesFournisseur.find(t => t.value === f.type)
      return `<tr style="background:${i % 2 === 0 ? '#fff' : '#E8ECF4'}">
        <td>${i + 1}</td>
        <td><strong>${f.nom}</strong>${f.raisonSociale ? '<br><small>' + f.raisonSociale + '</small>' : ''}</td>
        <td>${ti?.icon || ''} ${ti?.label || f.type}</td>
        <td>${f.contactNom || '—'}</td>
        <td>${f.contactTelephone || '—'}</td>
        <td>${f.contactEmail || '—'}</td>
        <td>${f.ville || '—'}</td>
        <td>${f.conditionsPaiement ? f.conditionsPaiement + 'j' : '—'}</td>
        <td><span style="padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;background:${f.isActif ? '#1A7A4A' : '#E60000'};color:#fff">${f.isActif ? 'Actif' : 'Inactif'}</span></td>
      </tr>`
    }).join('')
    const filtresTexte = [
      filtreType ? 'Type : ' + (typesFournisseur.find(t => t.value === filtreType)?.label || filtreType) : '',
      filtreActif !== 'tous' ? 'Statut : ' + filtreActif : '',
      recherche ? 'Recherche : « ' + recherche + ' »' : ''
    ].filter(Boolean).join(' | ')
    const win = window.open('', '_blank', 'width=1050,height=900')
    win.document.write(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Liste Fournisseurs – SIKA INDUSTRIE</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1B2A4A; background: #fff; font-size: 12px; }
    /* ── EN-TÊTE FIXE SUR CHAQUE PAGE ── */
    .entete { position: fixed; top: 0; left: 0; right: 0; z-index: 100; }
    .entete img { width: 100%; display: block; }
    .entete-sub { background: #1B2A4A; padding: 6px 24px; display: flex; justify-content: space-between; align-items: center; }
    .entete-sub h2 { color: #fff; font-size: 13px; font-weight: 700; letter-spacing: .04em; }
    .entete-sub span { color: #C8C8D0; font-size: 10px; }
    /* ── PIED DE PAGE FIXE SUR CHAQUE PAGE ── */
    .pied { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; }
    .pied img { width: 100%; display: block; }
    /* ── CONTENU ── */
    .body { margin-top: 160px; margin-bottom: 90px; padding: 16px 24px; }
    .meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding: 8px 12px; background: #E8ECF4; border-left: 4px solid #E60000; border-radius: 3px; font-size: 11px; color: #555; }
    .meta strong { color: #1B2A4A; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1B2A4A !important; color: #fff; }
    th { padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; white-space: nowrap; }
    td { padding: 6px 8px; border-bottom: 1px solid #E8ECF4; vertical-align: middle; font-size: 11px; }
    small { color: #888; font-size: 10px; }
    @page { margin: 0; size: A4 landscape; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <!-- EN-TÊTE -->
  <div class="entete">
    <img src="${entete}" alt="En-tête SIKA INDUSTRIE" />
    <div class="entete-sub">
      <h2>LISTE DES FOURNISSEURS</h2>
      <span>Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} — ERP/CRM SIKA v1.0</span>
    </div>
  </div>

  <!-- CONTENU -->
  <div class="body">
    <div class="meta">
      <span><strong>${fournisseursFiltres.length}</strong> fournisseur(s) affiché(s)${filtresTexte ? '&nbsp;&nbsp;—&nbsp;&nbsp;' + filtresTexte : ''}</span>
    </div>
    <table>
      <thead><tr>
        <th>#</th><th>Fournisseur</th><th>Type</th><th>Contact</th><th>Téléphone</th><th>Email</th><th>Ville</th><th>Paiement</th><th>Statut</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <!-- PIED DE PAGE -->
  <div class="pied">
    <img src="${pied}" alt="Pied de page SIKA INDUSTRIE" />
  </div>
</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  const toggleActif = async (fournisseur) => {
    try {
      const { error: supaErr } = await supabase
        .from('fournisseurs')
        .update({ is_actif: !fournisseur.isActif })
        .eq('id', fournisseur.id)
      if (supaErr) throw supaErr
      updateFournisseur(fournisseur.id, { isActif: !fournisseur.isActif })
      addLog({ module: 'Fournisseurs', action: fournisseur.isActif ? 'Désactivation fournisseur' : 'Activation fournisseur', utilisateur: utilisateur?.nom, details: `Fournisseur ${fournisseur.nom}` })
      success(`Fournisseur ${fournisseur.isActif ? 'désactivé' : 'activé'}`)
    } catch (err) {
      console.error(err)
      error('Erreur lors de la modification du statut : ' + (err.message || ''))
    }
  }

  return (
    <div className="space-y-6">
      <SikaHeader
        titre="Gestion des Fournisseurs"
        soustitre="Référentiel complet des fournisseurs et sous-traitants"
      />

      {/* STATISTIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#06006E' }}>
          <p className="text-sm font-medium" style={{ color: '#06006E' }}>Total Fournisseurs</p>
          <p className="text-3xl font-bold mt-2" style={{ color: '#06006E' }}>{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#1A7A4A' }}>
          <p className="text-sm font-medium" style={{ color: '#1A7A4A' }}>Actifs</p>
          <p className="text-3xl font-bold mt-2" style={{ color: '#06006E' }}>{stats.actifs}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#E60000' }}>
          <p className="text-sm font-medium" style={{ color: '#E60000' }}>Inactifs</p>
          <p className="text-3xl font-bold mt-2" style={{ color: '#06006E' }}>{stats.inactifs}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#E60000' }}>
          <p className="text-sm font-medium" style={{ color: '#E60000' }}>Types</p>
          <p className="text-3xl font-bold mt-2" style={{ color: '#06006E' }}>{typesFournisseur.length}</p>
        </div>
      </div>

      {/* FILTRES ET RECHERCHE */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={20} style={{ color: '#06006E' }} />
              <input
                type="text"
                placeholder="Rechercher un fournisseur..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                style={{ borderColor: '#C8C8D0' }}
              />
            </div>
          </div>

          <div>
            <select
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
              style={{ borderColor: '#C8C8D0' }}
            >
              <option value="">Tous les types</option>
              {typesFournisseur.map(type => (
                <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filtreActif}
              onChange={(e) => setFiltreActif(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
              style={{ borderColor: '#C8C8D0' }}
            >
              <option value="tous">Tous les statuts</option>
              <option value="actifs">Actifs uniquement</option>
              <option value="inactifs">Inactifs uniquement</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={handlePrintListe}
            className="flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: '#E8ECF4', color: '#1B2A4A', border: '1px solid #C8C8D0' }}
            title="Imprimer la liste filtrée"
          >
            <Printer size={18} />
            <span>Imprimer la liste</span>
          </button>
          <button
            onClick={handleNouveauFournisseur}
            className="flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#E60000' }}
          >
            <Plus size={20} />
            <span>Nouveau Fournisseur</span>
          </button>
        </div>
      </div>

      {/* TABLEAU FOURNISSEURS */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#06006E' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Fournisseur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Téléphone</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase">Statut</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#C8C8D0' }}>
              {fournisseursFiltres.map((fournisseur, index) => {
                const typeInfo = typesFournisseur.find(t => t.value === fournisseur.type)
                return (
                  <tr
                    key={fournisseur.id}
                    className="hover:bg-opacity-50"
                    style={{ backgroundColor: index % 2 === 0 ? 'white' : '#E8ECF4' }}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold" style={{ color: '#06006E' }}>{fournisseur.nom}</p>
                        <p className="text-sm" style={{ color: '#06006E' }}>{fournisseur.raisonSociale}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">
                        {typeInfo?.icon} {typeInfo?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm" style={{ color: '#06006E' }}>{fournisseur.contactNom}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm" style={{ color: '#06006E' }}>{fournisseur.contactTelephone}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActif(fournisseur)}
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: fournisseur.isActif ? '#1A7A4A' : '#E60000',
                          color: 'white'
                        }}
                      >
                        {fournisseur.isActif ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleVoir(fournisseur)}
                          className="p-2 rounded-lg transition-all hover:bg-opacity-10 hover:bg-bleu"
                          style={{ color: '#06006E' }}
                          title="Voir détails"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleModifier(fournisseur)}
                          className="p-2 rounded-lg transition-all hover:bg-opacity-10 hover:bg-orange"
                          style={{ color: '#E60000' }}
                          title="Modifier"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleSupprimer(fournisseur)}
                          className="p-2 rounded-lg transition-all hover:bg-opacity-10 hover:bg-rouge"
                          style={{ color: '#E60000' }}
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {fournisseursFiltres.length === 0 && (
          <div className="text-center py-12">
            <Building2 size={48} className="mx-auto mb-4" style={{ color: '#C8C8D0' }} />
            <p className="text-lg" style={{ color: '#06006E' }}>Aucun fournisseur trouvé</p>
          </div>
        )}
      </div>

      {/* MODAL CRÉATION/MODIFICATION */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b" style={{ borderColor: '#C8C8D0', backgroundColor: '#06006E' }}>
              <h2 className="text-2xl font-bold text-white">
                {fournisseurSelectionne ? 'Modifier Fournisseur' : 'Nouveau Fournisseur'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations générales */}
              <div>
                <h3 className="text-lg font-bold mb-4" style={{ color: '#06006E' }}>Informations Générales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Nom Commercial *
                    </label>
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                      style={{ borderColor: '#C8C8D0' }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Raison Sociale
                    </label>
                    <input
                      type="text"
                      value={formData.raisonSociale}
                      onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                      style={{ borderColor: '#C8C8D0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Type de Fournisseur *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                      style={{ borderColor: '#C8C8D0' }}
                    >
                      {typesFournisseur.map(type => (
                        <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Secteur d'Activité
                    </label>
                    <input
                      type="text"
                      value={formData.secteur}
                      onChange={(e) => setFormData({ ...formData, secteur: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                      style={{ borderColor: '#C8C8D0' }}
                    />
                  </div>
                </div>
              </div>

              {/* Coordonnées */}
              <div>
                <h3 className="text-lg font-bold mb-4" style={{ color: '#06006E' }}>Coordonnées</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={formData.adresse}
                      onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                      style={{ borderColor: '#C8C8D0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Ville
                    </label>
                    <input
                      type="text"
                      value={formData.ville}
                      onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                      style={{ borderColor: '#C8C8D0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Pays
                    </label>
                    <input
                      type="text"
                      value={formData.pays}
                      onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                      style={{ borderColor: '#C8C8D0' }}
                    />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-lg font-bold mb-4" style={{ color: '#06006E' }}>Contact Principal</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Nom du Contact *
                    </label>
                    <input
                      type="text"
                      value={formData.contactNom}
                      onChange={(e) => setFormData({ ...formData, contactNom: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                      style={{ borderColor: '#C8C8D0' }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.contactTelephone}
                      onChange={(e) => setFormData({ ...formData, contactTelephone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                      style={{ borderColor: '#C8C8D0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                      style={{ borderColor: '#C8C8D0' }}
                    />
                  </div>
                </div>
              </div>

              {/* Informations bancaires */}
              <div>
                <h3 className="text-lg font-bold mb-4" style={{ color: '#06006E' }}>Informations Bancaires</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Banque
                    </label>
                    <input
                      type="text"
                      value={formData.banque}
                      onChange={(e) => setFormData({ ...formData, banque: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                      style={{ borderColor: '#C8C8D0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Numéro de Compte
                    </label>
                    <input
                      type="text"
                      value={formData.numeroCompte}
                      onChange={(e) => setFormData({ ...formData, numeroCompte: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                      style={{ borderColor: '#C8C8D0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                      Conditions de Paiement
                    </label>
                    <ConditionsPaiementSelector
                      value={formData.conditionsPaiement}
                      onChange={(jours) => setFormData({ ...formData, conditionsPaiement: jours })}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
                  style={{ borderColor: '#C8C8D0' }}
                />
              </div>

              {/* Statut */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActif"
                  checked={formData.isActif}
                  onChange={(e) => setFormData({ ...formData, isActif: e.target.checked })}
                  className="w-5 h-5 rounded focus:ring-2 focus:ring-orange"
                />
                <label htmlFor="isActif" className="text-sm font-medium" style={{ color: '#06006E' }}>
                  Fournisseur actif
                </label>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: '#C8C8D0' }}>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 rounded-lg font-semibold transition-all hover:bg-opacity-10"
                style={{ color: '#06006E', backgroundColor: '#E8ECF4' }}
              >
                Annuler
              </button>
              <button
                onClick={handleSauvegarder}
                disabled={loading}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: '#E60000' }}
              >
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />}
                {loading ? 'Enregistrement...' : (fournisseurSelectionne ? 'Mettre à jour' : 'Créer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAILS */}
      {showDetailModal && fournisseurSelectionne && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b" style={{ borderColor: '#C8C8D0', backgroundColor: '#06006E' }}>
              <h2 className="text-2xl font-bold text-white">Détails Fournisseur</h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#06006E' }}>Nom Commercial</p>
                  <p className="text-lg font-semibold" style={{ color: '#06006E' }}>{fournisseurSelectionne.nom}</p>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#06006E' }}>Raison Sociale</p>
                  <p className="text-lg" style={{ color: '#06006E' }}>{fournisseurSelectionne.raisonSociale || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#06006E' }}>Type</p>
                  <p className="text-lg" style={{ color: '#06006E' }}>
                    {typesFournisseur.find(t => t.value === fournisseurSelectionne.type)?.label}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#06006E' }}>Secteur</p>
                  <p className="text-lg" style={{ color: '#06006E' }}>{fournisseurSelectionne.secteur || '-'}</p>
                </div>
              </div>

              <div className="border-t pt-4" style={{ borderColor: '#C8C8D0' }}>
                <h3 className="text-lg font-bold mb-3" style={{ color: '#06006E' }}>Contact</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone size={18} style={{ color: '#06006E' }} />
                    <span>{fournisseurSelectionne.contactTelephone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={18} style={{ color: '#06006E' }} />
                    <span>{fournisseurSelectionne.contactEmail || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={18} style={{ color: '#06006E' }} />
                    <span>{fournisseurSelectionne.adresse}, {fournisseurSelectionne.ville}, {fournisseurSelectionne.pays}</span>
                  </div>
                </div>
              </div>

              {fournisseurSelectionne.notes && (
                <div className="border-t pt-4" style={{ borderColor: '#C8C8D0' }}>
                  <h3 className="text-lg font-bold mb-3" style={{ color: '#06006E' }}>Notes</h3>
                  <p style={{ color: '#06006E' }}>{fournisseurSelectionne.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-between items-center" style={{ borderColor: '#C8C8D0' }}>
              <button
                onClick={() => handlePrintFiche(fournisseurSelectionne)}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: '#E8ECF4', color: '#1B2A4A', border: '1px solid #C8C8D0' }}
                title="Imprimer la fiche fournisseur"
              >
                <Printer size={18} />
                <span>Imprimer la fiche</span>
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#06006E' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <SikaFooter />
    </div>
  )
}
