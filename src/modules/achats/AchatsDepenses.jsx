import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/useAuthStore'
import { useFournisseursStore } from '../../store/useFournisseursStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useNotifications } from '../../components/NotificationProvider'
import {
  ShoppingCart, Receipt, Plus, Edit2, Trash2, Eye, Search, RefreshCw,
  FileSpreadsheet, BookOpen, X, TrendingDown, BarChart2, Printer
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { createSikaPDF, sikaTable, finalizeSikaPDF, formatMontant, addDiagonalWatermark } from '../../utils/printUtils'
import { formatFCFA } from '../../utils/format'

/* ─── Constantes Achats ────────────────────────────────────── */
const CATEGORIES_ACHATS = [
  { value: 'MATERIEL',        label: 'Matériel & Équipement',   icon: '🔧', journalCat: 'ACHAT_MATERIEL' },
  { value: 'MATIERE_PREMIERE',label: 'Matières premières',       icon: '📦', journalCat: 'ACHAT_MATERIEL' },
  { value: 'SOUS_TRAITANCE',  label: 'Sous-traitance',          icon: '👷', journalCat: 'SOUS_TRAITANCE' },
  { value: 'TRANSPORT',       label: 'Transport & Logistique',   icon: '🚚', journalCat: 'TRANSPORT' },
  { value: 'FOURNITURES',     label: 'Fournitures diverses',     icon: '📋', journalCat: 'ACHAT_MATERIEL' },
  { value: 'AUTRE',           label: 'Autres achats',            icon: '🛒', journalCat: 'AUTRE_SORTIE' },
]

const TYPES_ACHAT = ['FACTURE', 'BON_COMMANDE', 'AVOIR', 'PROFORMA']

/* ─── Constantes Dépenses ──────────────────────────────────── */
const CATEGORIES_DEPENSES = [
  { value: 'LOYER',           label: 'Loyer & Charges locatives', icon: '🏢', journalCat: 'LOYER' },
  { value: 'SALAIRE',         label: 'Salaires & Charges sociales',icon: '👔', journalCat: 'SALAIRE' },
  { value: 'TRANSPORT',       label: 'Transport & Déplacements',  icon: '🚗', journalCat: 'TRANSPORT' },
  { value: 'CARBURANT',       label: 'Carburant véhicules',       icon: '⛽', journalCat: 'TRANSPORT' },
  { value: 'FOURNITURE_BUREAU',label: 'Fournitures de bureau',    icon: '🖊️', journalCat: 'FOURNITURE_BUREAU' },
  { value: 'TELEPHONE',       label: 'Téléphone & Internet',      icon: '📱', journalCat: 'FOURNITURE_BUREAU' },
  { value: 'EAU_ELECTRICITE', label: 'Eau & Électricité',         icon: '💡', journalCat: 'AUTRE_SORTIE' },
  { value: 'ENTRETIEN',       label: 'Entretien & Réparations',   icon: '🔨', journalCat: 'AUTRE_SORTIE' },
  { value: 'REPAS',           label: 'Repas & Restauration',      icon: '🍽️', journalCat: 'AUTRE_SORTIE' },
  { value: 'ASSURANCE',       label: 'Assurances',                icon: '🛡️', journalCat: 'AUTRE_SORTIE' },
  { value: 'PUBLICITE',       label: 'Publicité & Marketing',     icon: '📢', journalCat: 'AUTRE_SORTIE' },
  { value: 'FORMATION',       label: 'Formation du personnel',    icon: '🎓', journalCat: 'AUTRE_SORTIE' },
  { value: 'HONORAIRES',      label: 'Honoraires & Consultants',  icon: '📝', journalCat: 'SOUS_TRAITANCE' },
  { value: 'IMPOTS_TAXES',    label: 'Impôts & Taxes',            icon: '📊', journalCat: 'AUTRE_SORTIE' },
  { value: 'SOUS_TRAITANCE',  label: 'Sous-traitance',            icon: '👷', journalCat: 'SOUS_TRAITANCE' },
  { value: 'AUTRE_CHARGE',    label: 'Autres charges',            icon: '💸', journalCat: 'AUTRE_SORTIE' },
]

/* ─── Communs ──────────────────────────────────────────────── */
const STATUTS = [
  { value: 'EN_ATTENTE', label: 'En attente', bg: '#FFF3CD', color: '#856404' },
  { value: 'VALIDE',     label: 'Validé',     bg: '#D1ECF1', color: '#0C5460' },
  { value: 'PAYE',       label: 'Payé',       bg: '#D4EDDA', color: '#155724' },
  { value: 'ANNULE',     label: 'Annulé',     bg: '#F8D7DA', color: '#721C24' },
]
const MODES_PAIEMENT = ['VIREMENT', 'CHEQUE', 'ESPECES', 'TRAITE', 'AUTRE']
const fmt = (n) => formatFCFA(n || 0)

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow p-5 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase" style={{ color: '#C8C8D0' }}>{label}</p>
          <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   ONGLET ACHATS
══════════════════════════════════════════════════════════════ */
function OngletAchats() {
  const [achats,     setAchats]     = useState([])
  const storeFournisseurs = useFournisseursStore(state => state.fournisseurs)
  const fournisseurs = storeFournisseurs.filter(f => f.isActif !== false)
  const [projets,    setProjets]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selected,   setSelected]   = useState(null)

  const [recherche,       setRecherche]       = useState('')
  const [filtreStatut,    setFiltreStatut]    = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [filtreDateDebut, setFiltreDateDebut] = useState('')
  const [filtreDateFin,   setFiltreDateFin]   = useState('')

  const utilisateur = useAuthStore(s => s.utilisateurConnecte)
  const { addLog }  = useAuditStore()
  const { success, error: notifError, confirmDelete } = useNotifications()

  const emptyForm = {
    fournisseur_id: '', numero_facture: '', reference: '',
    date_achat: new Date().toISOString().split('T')[0],
    categorie: 'MATERIEL', type_achat: 'FACTURE',
    montant_ht: '', montant_tva: '', montant_ttc: '',
    mode_paiement: 'VIREMENT', statut: 'EN_ATTENTE',
    projet_id: '', description: '', notes: ''
  }
  const [form, setForm] = useState(emptyForm)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [aRes, pRes] = await Promise.all([
      supabase.from('achats').select('*, fournisseurs(nom)').order('date_achat', { ascending: false }),
      supabase.from('projets').select('id, nom').order('nom'),
    ])
    if (!aRes.error) setAchats(aRes.data || [])
    if (!pRes.error) setProjets(pRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const achatsFiltres = useMemo(() => achats.filter(a => {
    const q = recherche.toLowerCase()
    const matchQ = !q ||
      (a.description || '').toLowerCase().includes(q) ||
      (a.numero_facture || '').toLowerCase().includes(q) ||
      (a.reference || '').toLowerCase().includes(q) ||
      (a.fournisseurs?.nom || '').toLowerCase().includes(q)
    return matchQ &&
      (!filtreStatut    || a.statut    === filtreStatut) &&
      (!filtreCategorie || a.categorie === filtreCategorie) &&
      (!filtreDateDebut || a.date_achat >= filtreDateDebut) &&
      (!filtreDateFin   || a.date_achat <= filtreDateFin)
  }), [achats, recherche, filtreStatut, filtreCategorie, filtreDateDebut, filtreDateFin])

  const stats = useMemo(() => {
    const total   = achats.reduce((s, a) => s + Number(a.montant_ttc || 0), 0)
    const paye    = achats.filter(a => a.statut === 'PAYE').reduce((s, a) => s + Number(a.montant_ttc || 0), 0)
    const attente = achats.filter(a => a.statut === 'EN_ATTENTE').reduce((s, a) => s + Number(a.montant_ttc || 0), 0)
    return { nb: achats.length, total, paye, attente }
  }, [achats])

  const handleFormChange = (key, val) => {
    setForm(prev => {
      const next = { ...prev, [key]: val }
      if (key === 'montant_ht' || key === 'montant_tva') {
        const ht  = parseFloat(key === 'montant_ht'  ? val : prev.montant_ht)  || 0
        const tva = parseFloat(key === 'montant_tva' ? val : prev.montant_tva) || 0
        next.montant_ttc = (ht + tva).toString()
      }
      return next
    })
  }

  // Fonction pour générer les numéros automatiques
  const generateAutoNumbers = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-4)

    // Numéro de facture: FAC-YYYY-XXXX
    const numeroFacture = `FAC-${year}-${timestamp}`

    // Référence interne: ACH-YYYYMMDD-XXXX
    const reference = `ACH-${year}${month}${day}-${timestamp}`

    return { numeroFacture, reference }
  }, [])

  const handleOuvrir = (achat = null) => {
    setSelected(achat)
    
    if (!achat) {
      // Génération automatique pour un nouvel achat
      const { numeroFacture, reference } = generateAutoNumbers()
      setForm({
        ...emptyForm,
        numero_facture: numeroFacture,
        reference: reference,
        date_achat: new Date().toISOString().split('T')[0]
      })
    } else {
      setForm({
      fournisseur_id: achat.fournisseur_id || '',
      numero_facture: achat.numero_facture || '',
      reference:      achat.reference || '',
      date_achat:     achat.date_achat || emptyForm.date_achat,
      categorie:      achat.categorie || 'MATERIEL',
      type_achat:     achat.type_achat || 'FACTURE',
      montant_ht:     achat.montant_ht ?? '',
      montant_tva:    achat.montant_tva ?? '',
      montant_ttc:    achat.montant_ttc ?? '',
      mode_paiement:  achat.mode_paiement || 'VIREMENT',
      statut:         achat.statut || 'EN_ATTENTE',
      projet_id:      achat.projet_id || '',
      description:    achat.description || '',
      notes:          achat.notes || ''
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.description && !form.numero_facture) { notifError('Description ou numéro de facture requis'); return }
    if (!form.montant_ttc && !form.montant_ht) { notifError('Le montant est requis'); return }
    try {
      const payload = {
        fournisseur_id: form.fournisseur_id || null,
        numero_facture: form.numero_facture || null,
        reference:      form.reference || null,
        date_achat:     form.date_achat,
        categorie:      form.categorie,
        type_achat:     form.type_achat,
        montant_ht:     parseFloat(form.montant_ht)  || null,
        montant_tva:    parseFloat(form.montant_tva) || null,
        montant_ttc:    parseFloat(form.montant_ttc) || parseFloat(form.montant_ht) || 0,
        mode_paiement:  form.mode_paiement || null,
        statut:         form.statut,
        projet_id:      form.projet_id || null,
        description:    form.description || null,
        notes:          form.notes || null,
      }
      if (selected) {
        const { error: e } = await supabase.from('achats').update(payload).eq('id', selected.id)
        if (e) throw e
        addLog({ module: 'Achats', action: 'Modification achat', utilisateur: utilisateur?.nom, details: `Achat #${selected.id} modifié` })
        success('Achat modifié avec succès')
      } else {
        const { error: e } = await supabase.from('achats').insert(payload)
        if (e) throw e
        addLog({ module: 'Achats', action: 'Création achat', utilisateur: utilisateur?.nom, details: `Achat ${form.numero_facture || form.description}` })
        success('Achat créé avec succès')
      }
      setShowModal(false)
      loadData()
    } catch (err) { notifError('Erreur : ' + (err.message || '')) }
  }

  const handleDelete = async (achat) => {
    const ok = await confirmDelete(achat.numero_facture || achat.description || `Achat #${achat.id}`)
    if (!ok) return
    try {
      const { error: e } = await supabase.from('achats').delete().eq('id', achat.id)
      if (e) throw e
      addLog({ module: 'Achats', action: 'Suppression achat', utilisateur: utilisateur?.nom, details: `Achat #${achat.id} supprimé` })
      success('Achat supprimé')
      loadData()
    } catch (err) { notifError('Erreur : ' + (err.message || '')) }
  }

  const handleJournal = async (achat) => {
    if (achat.mouvement_caisse_id) { notifError('Cet achat est déjà enregistré dans le journal'); return }
    const catInfo  = CATEGORIES_ACHATS.find(c => c.value === achat.categorie)
    const fournNom = achat.fournisseurs?.nom || 'Fournisseur'
    try {
      const { data: mvt, error: e } = await supabase.from('mouvements_caisse').insert({
        date:          achat.date_achat,
        type:          'SORTIE',
        categorie:     catInfo?.journalCat || 'ACHAT_MATERIEL',
        montant:       achat.montant_ttc,
        description:   `[ACHAT] ${achat.description || achat.numero_facture || ''}`,
        beneficiaire:  fournNom,
        mode_paiement: achat.mode_paiement || 'VIREMENT',
        reference:     achat.numero_facture || achat.reference || `ACH-${achat.id}`,
        utilisateur:   utilisateur?.nom,
        caisse_nom:    'Caisse Principale',
      }).select().single()
      if (e) throw e
      await supabase.from('achats').update({
        statut: 'PAYE',
        montant_paye: achat.montant_ttc,
        mouvement_caisse_id: mvt.id,
      }).eq('id', achat.id)
      addLog({ module: 'Achats', action: 'Enregistrement journal', utilisateur: utilisateur?.nom, details: `Achat #${achat.id} → Journal` })
      success('Achat enregistré dans le Journal de Caisse ✓')
      loadData()
    } catch (err) { notifError('Erreur journal : ' + (err.message || '')) }
  }

  const handleExcel = () => {
    const rows = achatsFiltres.map(a => ({
      Date:           a.date_achat,
      'N° Facture':   a.numero_facture || '',
      Référence:      a.reference || '',
      Description:    a.description || '',
      Fournisseur:    a.fournisseurs?.nom || '',
      Catégorie:      CATEGORIES_ACHATS.find(c => c.value === a.categorie)?.label || a.categorie || '',
      'Montant HT':   a.montant_ht  || 0,
      TVA:            a.montant_tva || 0,
      'Montant TTC':  a.montant_ttc || 0,
      Statut:         STATUTS.find(s => s.value === a.statut)?.label || a.statut || '',
      'Mode paiement':a.mode_paiement || '',
      'Dans Journal': a.mouvement_caisse_id ? 'Oui' : 'Non',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Achats')
    XLSX.writeFile(wb, `Achats_SIKA_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handlePrintGlobal = async () => {
    try {
      const ctx = await createSikaPDF('LISTE DES ACHATS — SIKA INDUSTRIE')
      const { doc, startY, MARGE_G } = ctx
      const totalTTC = achatsFiltres.reduce((s, a) => s + Number(a.montant_ttc || 0), 0)
      const totalHT  = achatsFiltres.reduce((s, a) => s + Number(a.montant_ht  || 0), 0)
      const totalTVA = achatsFiltres.reduce((s, a) => s + Number(a.montant_tva || 0), 0)
      let y = startY
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(80, 80, 100)
      doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')}  ·  ${achatsFiltres.length} achat(s)  ·  Total TTC : ${formatMontant(totalTTC)} FCFA`, MARGE_G, y)
      y += 6
      const cols = ['Date', 'N° Facture', 'Description', 'Fournisseur', 'Catégorie', 'Montant HT', 'TVA', 'Montant TTC', 'Statut', 'Paiement']
      const rows = achatsFiltres.map(a => [
        new Date(a.date_achat).toLocaleDateString('fr-FR'),
        a.numero_facture || a.reference || '—',
        (a.description || '—').substring(0, 35),
        (a.fournisseurs?.nom || '—').substring(0, 20),
        CATEGORIES_ACHATS.find(c => c.value === a.categorie)?.label || a.categorie || '—',
        formatMontant(a.montant_ht),
        formatMontant(a.montant_tva),
        formatMontant(a.montant_ttc),
        STATUTS.find(s => s.value === a.statut)?.label || a.statut,
        a.mode_paiement || '—',
      ])
      rows.push([
        { content: 'TOTAL', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [27,42,74], textColor: [255,255,255] } },
        { content: formatMontant(totalHT),  styles: { fontStyle: 'bold', fillColor: [27,42,74], textColor: [255,255,255] } },
        { content: formatMontant(totalTVA), styles: { fontStyle: 'bold', fillColor: [27,42,74], textColor: [255,255,255] } },
        { content: formatMontant(totalTTC) + ' FCFA', styles: { fontStyle: 'bold', fillColor: [230,0,0], textColor: [255,255,255] } },
        { content: '', colSpan: 2, styles: { fillColor: [27,42,74] } },
      ])
      sikaTable(doc, cols, rows, y, ctx)
      await finalizeSikaPDF(ctx, `Achats_SIKA_${new Date().toISOString().split('T')[0]}.pdf`, utilisateur)
      success('PDF liste des achats généré ✓')
    } catch (err) { notifError('Erreur impression : ' + (err.message || '')) }
  }

  const handlePrintDetail = async (achat) => {
    try {
      const ctx = await createSikaPDF("BON D'ACHAT — SIKA INDUSTRIE")
      const { doc, startY, MARGE_G, PAGE_W, CONTENT_W } = ctx
      const cat    = CATEGORIES_ACHATS.find(c => c.value === achat.categorie)
      const statut = STATUTS.find(s => s.value === achat.statut)
      let y = startY
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(27,42,74)
      doc.text(`Réf : ${achat.reference || achat.numero_facture || 'ACH-' + achat.id}`, PAGE_W-15, y, { align: 'right' })
      doc.text(`Date : ${new Date(achat.date_achat).toLocaleDateString('fr-FR')}`, PAGE_W-15, y+5, { align: 'right' })
      doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(120,120,140)
      doc.text('N° Facture :', MARGE_G, y)
      doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(27,42,74)
      doc.text(achat.numero_facture || '—', MARGE_G+27, y)
      y += 12
      doc.setFillColor(232,236,244); doc.roundedRect(MARGE_G, y, CONTENT_W, 18, 2, 2, 'F')
      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(120,120,140)
      doc.text('FOURNISSEUR', MARGE_G+3, y+5)
      doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.setTextColor(27,42,74)
      doc.text(achat.fournisseurs?.nom || '—', MARGE_G+3, y+13)
      y += 22
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(120,120,140)
      doc.text('OBJET / DESCRIPTION', MARGE_G, y); y += 4
      doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(27,42,74)
      const descLines = doc.splitTextToSize(achat.description || '—', CONTENT_W)
      doc.text(descLines, MARGE_G, y); y += descLines.length * 5 + 5
      sikaTable(doc, ['Champ', 'Valeur'], [
        ['Catégorie',        cat?.label || achat.categorie || '—'],
        ['Type document',    achat.type_achat || '—'],
        ['Mode de paiement', achat.mode_paiement || '—'],
        ['Statut règlement', statut?.label || achat.statut || '—'],
        ['Journal de caisse', achat.mouvement_caisse_id ? `Enregistré (mouvement #${achat.mouvement_caisse_id})` : 'Non enregistré'],
      ], y, ctx)
      y = doc.lastAutoTable.finalY + 6
      sikaTable(doc, ['Désignation', 'Montant (FCFA)'], [
        ['Montant Hors Taxes (HT)', formatMontant(achat.montant_ht) + ' FCFA'],
        ['TVA (18%)',               formatMontant(achat.montant_tva) + ' FCFA'],
        [
          { content: 'MONTANT TOTAL TTC', styles: { fontStyle: 'bold', fontSize: 10 } },
          { content: formatMontant(achat.montant_ttc) + ' FCFA', styles: { fontStyle: 'bold', fontSize: 10, textColor: [230,0,0] } },
        ],
      ], y, ctx)
      if (achat.notes) {
        y = doc.lastAutoTable.finalY + 6
        doc.setFont('helvetica','italic'); doc.setFontSize(8.5); doc.setTextColor(120,120,140)
        doc.text(doc.splitTextToSize('Notes : ' + achat.notes, CONTENT_W), MARGE_G, y)
      }
      addDiagonalWatermark(doc, utilisateur || { nom: 'SIKA INDUSTRIE' })
      await finalizeSikaPDF(ctx, `Achat_${achat.reference || achat.id}_SIKA.pdf`, utilisateur)
      success('Fiche achat imprimée ✓')
    } catch (err) { notifError('Erreur impression : ' + (err.message || '')) }
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon="🛒" label="Total Achats"      value={stats.nb + ' achat(s)'} color="#1B2A4A" />
        <StatCard icon="💰" label="Montant Total TTC" value={fmt(stats.total)}        color="#1F5C99" />
        <StatCard icon="✅" label="Montant Payé"      value={fmt(stats.paye)}         color="#1A7A4A" />
        <StatCard icon="⏳" label="En Attente"        value={fmt(stats.attente)}      color="#E60000" />
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#1B2A4A]">Filtres</h3>
          <div className="flex gap-2">
            <button onClick={loadData} className="bg-[#1F5C99] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs hover:opacity-90">
              <RefreshCw size={13} /> Actualiser
            </button>
            <button onClick={handleExcel} className="bg-[#1A7A4A] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs hover:opacity-90">
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button onClick={handlePrintGlobal} className="bg-[#1B2A4A] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs hover:opacity-90">
              <Printer size={13} /> Imprimer
            </button>
            <button onClick={() => handleOuvrir()} className="bg-[#E60000] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs hover:opacity-90">
              <Plus size={13} /> Nouvel Achat
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C8C8D0]" size={14} />
            <input type="text" placeholder="Rechercher fournisseur, facture, description…"
              value={recherche} onChange={e => setRecherche(e.target.value)}
              className="w-full pl-8 pr-4 py-2 border border-[#C8C8D0] rounded-lg text-sm focus:outline-none focus:border-[#E60000]" />
          </div>
          <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
            className="border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}
            className="border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value="">Toutes catégories</option>
            {CATEGORIES_ACHATS.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" value={filtreDateDebut} onChange={e => setFiltreDateDebut(e.target.value)}
              className="flex-1 border border-[#C8C8D0] rounded-lg px-2 py-2 text-sm focus:outline-none" />
            <input type="date" value={filtreDateFin} onChange={e => setFiltreDateFin(e.target.value)}
              className="flex-1 border border-[#C8C8D0] rounded-lg px-2 py-2 text-sm focus:outline-none" />
          </div>
        </div>
        <p className="text-xs text-[#C8C8D0] mt-2">{achatsFiltres.length} achat(s) affiché(s)</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw size={32} className="animate-spin text-[#E60000]" /></div>
        ) : achatsFiltres.length === 0 ? (
          <div className="text-center py-16 text-[#C8C8D0]">
            <ShoppingCart size={40} className="mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">Aucun achat trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-[#1B2A4A] text-white text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">N° Facture</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Fournisseur</th>
                  <th className="px-4 py-3 text-left">Catégorie</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-center">Journal</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {achatsFiltres.map((a, idx) => {
                  const statut = STATUTS.find(s => s.value === a.statut)
                  const cat    = CATEGORIES_ACHATS.find(c => c.value === a.categorie)
                  return (
                    <tr key={a.id} className="hover:bg-[#FFE6E6] transition-colors border-b border-[#E8ECF4]"
                      style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-[#1F5C99]">
                        {new Date(a.date_achat).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1B2A4A]">
                        {a.numero_facture || a.reference || <span className="text-[#C8C8D0]">—</span>}
                      </td>
                      <td className="px-4 py-3 max-w-xs"><p className="truncate text-[#1B2A4A]">{a.description || '—'}</p></td>
                      <td className="px-4 py-3 text-[#1B2A4A]">{a.fournisseurs?.nom || <span className="text-[#C8C8D0]">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8ECF4] text-[#1B2A4A]">{cat?.icon} {cat?.label || a.categorie}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#E60000]">{fmt(a.montant_ttc)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: statut?.bg, color: statut?.color }}>{statut?.label || a.statut}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.mouvement_caisse_id ? (
                          <span className="text-xs text-[#1A7A4A] font-semibold">✓ Enregistré</span>
                        ) : (
                          <button onClick={() => handleJournal(a)} title="Enregistrer dans le Journal"
                            className="text-[#1F5C99] hover:text-[#E60000] transition-colors" disabled={a.statut === 'ANNULE'}>
                            <BookOpen size={16} />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setSelected(a); setShowDetail(true) }}
                            className="p-1.5 rounded hover:bg-[#E8ECF4] text-[#1F5C99]" title="Voir"><Eye size={14} /></button>
                          <button onClick={() => handleOuvrir(a)}
                            className="p-1.5 rounded hover:bg-[#E8ECF4] text-[#E60000]" title="Modifier"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(a)}
                            className="p-1.5 rounded hover:bg-[#FFE6E6] text-[#E60000]" title="Supprimer"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-[#E8ECF4]">
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right font-bold text-[#1B2A4A] text-sm">Total affiché :</td>
                  <td className="px-4 py-2 text-right font-bold text-[#E60000]">
                    {fmt(achatsFiltres.reduce((s, a) => s + Number(a.montant_ttc || 0), 0))}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal Création / Modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-[#1B2A4A] text-white p-5 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart size={20} className="text-[#E60000]" />
                {selected ? 'Modifier un Achat' : 'Nouvel Achat'}
              </h2>
              <button onClick={() => setShowModal(false)} className="hover:text-[#E60000]"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Date Achat *</label>
                  <input type="date" value={form.date_achat} onChange={e => handleFormChange('date_achat', e.target.value)}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">N° Facture <span className="text-[#1F5C99] font-normal">(auto)</span></label>
                  <input type="text" value={form.numero_facture} onChange={e => handleFormChange('numero_facture', e.target.value)}
                    placeholder="FAC-2024-001"
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000] bg-[#F8F9FA]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Référence interne <span className="text-[#1F5C99] font-normal">(auto)</span></label>
                  <input type="text" value={form.reference} onChange={e => handleFormChange('reference', e.target.value)}
                    placeholder="ACH-001"
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000] bg-[#F8F9FA]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Description *</label>
                <input type="text" value={form.description} onChange={e => handleFormChange('description', e.target.value)}
                  placeholder="Nature de l'achat…"
                  className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Fournisseur</label>
                  <select value={form.fournisseur_id} onChange={e => handleFormChange('fournisseur_id', e.target.value)}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">— Aucun —</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Catégorie *</label>
                  <select value={form.categorie} onChange={e => handleFormChange('categorie', e.target.value)}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {CATEGORIES_ACHATS.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Type document</label>
                  <select value={form.type_achat} onChange={e => handleFormChange('type_achat', e.target.value)}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {TYPES_ACHAT.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Montant HT (FCFA)</label>
                  <input type="number" value={form.montant_ht} onChange={e => handleFormChange('montant_ht', e.target.value)}
                    placeholder="0"
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">TVA (FCFA)</label>
                  <input type="number" value={form.montant_tva} onChange={e => handleFormChange('montant_tva', e.target.value)}
                    placeholder="0"
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Montant TTC * <span className="text-[#1F5C99] text-xs font-normal">(auto-calculé)</span></label>
                  <input type="number" value={form.montant_ttc} onChange={e => handleFormChange('montant_ttc', e.target.value)}
                    placeholder="0"
                    className="w-full border-2 border-[#E60000] rounded-lg px-3 py-2 text-sm font-bold text-[#E60000] focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Mode Paiement</label>
                  <select value={form.mode_paiement} onChange={e => handleFormChange('mode_paiement', e.target.value)}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {MODES_PAIEMENT.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Statut</label>
                  <select value={form.statut} onChange={e => handleFormChange('statut', e.target.value)}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Projet lié</label>
                  <select value={form.projet_id} onChange={e => handleFormChange('projet_id', e.target.value)}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">— Aucun —</option>
                    {projets.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => handleFormChange('notes', e.target.value)}
                  rows={2} placeholder="Remarques éventuelles…"
                  className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000] resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-[#C8C8D0] rounded-lg text-sm text-[#1B2A4A] hover:bg-[#E8ECF4]">Annuler</button>
                <button onClick={handleSave}
                  className="px-6 py-2 rounded-lg text-sm text-white font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#E60000' }}>
                  {selected ? 'Enregistrer modifications' : "Créer l'achat"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail */}
      {showDetail && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="bg-[#1B2A4A] text-white p-5 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold">Détail Achat #{selected.id}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePrintDetail(selected)} className="hover:text-[#E60000]" title="Imprimer">
                  <Printer size={18} />
                </button>
                <button onClick={() => setShowDetail(false)} className="hover:text-[#E60000]"><X size={20} /></button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {[
                ['Date',         new Date(selected.date_achat).toLocaleDateString('fr-FR')],
                ['N° Facture',   selected.numero_facture || '—'],
                ['Référence',    selected.reference || '—'],
                ['Description',  selected.description || '—'],
                ['Fournisseur',  selected.fournisseurs?.nom || '—'],
                ['Catégorie',    (CATEGORIES_ACHATS.find(c => c.value === selected.categorie)?.icon || '') + ' ' + (CATEGORIES_ACHATS.find(c => c.value === selected.categorie)?.label || selected.categorie)],
                ['Type Document',selected.type_achat || '—'],
                ['Montant HT',   fmt(selected.montant_ht)],
                ['TVA',          fmt(selected.montant_tva)],
                ['Montant TTC',  fmt(selected.montant_ttc)],
                ['Mode Paiement',selected.mode_paiement || '—'],
                ['Statut',       STATUTS.find(s => s.value === selected.statut)?.label || selected.statut],
                ['Dans Journal', selected.mouvement_caisse_id ? '✓ Oui (réf #' + selected.mouvement_caisse_id + ')' : '✗ Non'],
                ['Notes',        selected.notes || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between border-b border-[#E8ECF4] pb-2">
                  <span className="text-xs font-semibold text-[#C8C8D0] uppercase">{label}</span>
                  <span className="text-sm font-medium text-[#1B2A4A] text-right max-w-xs">{val}</span>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <button onClick={() => handlePrintDetail(selected)}
                  className="flex-1 bg-[#1B2A4A] text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-80">
                  <Printer size={15} /> Imprimer la fiche
                </button>
                {!selected.mouvement_caisse_id && selected.statut !== 'ANNULE' && (
                  <button onClick={() => { handleJournal(selected); setShowDetail(false) }}
                    className="flex-1 bg-[#1F5C99] text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90">
                    <BookOpen size={16} /> Enregistrer Journal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   ONGLET DÉPENSES
══════════════════════════════════════════════════════════════ */
function OngletDepenses() {
  const [depenses,   setDepenses]   = useState([])
  const [projets,    setProjets]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selected,   setSelected]   = useState(null)

  const [recherche,       setRecherche]       = useState('')
  const [filtreStatut,    setFiltreStatut]    = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [filtreDateDebut, setFiltreDateDebut] = useState('')
  const [filtreDateFin,   setFiltreDateFin]   = useState('')

  const utilisateur = useAuthStore(s => s.utilisateurConnecte)
  const { addLog }  = useAuditStore()
  const { success, error: notifError, confirmDelete } = useNotifications()

  const today = new Date().toISOString().split('T')[0]
  const emptyForm = {
    reference: '', date_depense: today, categorie: 'FOURNITURE_BUREAU',
    libelle: '', beneficiaire: '', montant: '',
    mode_paiement: 'ESPECES', statut: 'EN_ATTENTE',
    projet_id: '', notes: ''
  }
  const [form, setForm] = useState(emptyForm)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [dRes, pRes] = await Promise.all([
      supabase.from('depenses').select('*').order('date_depense', { ascending: false }),
      supabase.from('projets').select('id, nom').order('nom'),
    ])
    if (!dRes.error) setDepenses(dRes.data || [])
    if (!pRes.error) setProjets(pRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const depensesFiltrees = useMemo(() => depenses.filter(d => {
    const q = recherche.toLowerCase()
    const matchQ = !q ||
      (d.libelle || '').toLowerCase().includes(q) ||
      (d.beneficiaire || '').toLowerCase().includes(q) ||
      (d.reference || '').toLowerCase().includes(q)
    return matchQ &&
      (!filtreStatut    || d.statut    === filtreStatut) &&
      (!filtreCategorie || d.categorie === filtreCategorie) &&
      (!filtreDateDebut || d.date_depense >= filtreDateDebut) &&
      (!filtreDateFin   || d.date_depense <= filtreDateFin)
  }), [depenses, recherche, filtreStatut, filtreCategorie, filtreDateDebut, filtreDateFin])

  const stats = useMemo(() => {
    const total   = depenses.reduce((s, d) => s + Number(d.montant || 0), 0)
    const paye    = depenses.filter(d => d.statut === 'PAYE').reduce((s, d) => s + Number(d.montant || 0), 0)
    const mois    = new Date().toISOString().slice(0, 7)
    const moisCou = depenses.filter(d => d.date_depense?.startsWith(mois)).reduce((s, d) => s + Number(d.montant || 0), 0)
    return { nb: depenses.length, total, paye, moisCou }
  }, [depenses])

  const totalFiltres = depensesFiltrees.reduce((s, d) => s + Number(d.montant || 0), 0)

  const repartition = useMemo(() => {
    const map = {}
    depensesFiltrees.forEach(d => {
      const info = CATEGORIES_DEPENSES.find(c => c.value === d.categorie)
      const key  = d.categorie
      if (!map[key]) map[key] = { label: info?.label || key, icon: info?.icon || '💸', montant: 0, nb: 0 }
      map[key].montant += Number(d.montant || 0)
      map[key].nb++
    })
    return Object.entries(map).sort((a, b) => b[1].montant - a[1].montant)
  }, [depensesFiltrees])

  const handleOuvrir = (dep = null) => {
    setSelected(dep)
    setForm(dep ? {
      reference:    dep.reference || '',
      date_depense: dep.date_depense || today,
      categorie:    dep.categorie || 'FOURNITURE_BUREAU',
      libelle:      dep.libelle || '',
      beneficiaire: dep.beneficiaire || '',
      montant:      dep.montant ?? '',
      mode_paiement:dep.mode_paiement || 'ESPECES',
      statut:       dep.statut || 'EN_ATTENTE',
      projet_id:    dep.projet_id || '',
      notes:        dep.notes || ''
    } : emptyForm)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.libelle.trim()) { notifError('Le libellé est obligatoire'); return }
    if (!form.montant || parseFloat(form.montant) <= 0) { notifError('Le montant doit être positif'); return }
    try {
      const payload = {
        reference:    form.reference || null,
        date_depense: form.date_depense,
        categorie:    form.categorie,
        libelle:      form.libelle.trim(),
        beneficiaire: form.beneficiaire || null,
        montant:      parseFloat(form.montant),
        mode_paiement:form.mode_paiement || null,
        statut:       form.statut,
        projet_id:    form.projet_id || null,
        notes:        form.notes || null,
      }
      if (selected) {
        const { error: e } = await supabase.from('depenses').update(payload).eq('id', selected.id)
        if (e) throw e
        addLog({ module: 'Dépenses', action: 'Modification dépense', utilisateur: utilisateur?.nom, details: `Dépense "${form.libelle}" modifiée` })
        success('Dépense modifiée avec succès')
      } else {
        const { error: e } = await supabase.from('depenses').insert(payload)
        if (e) throw e
        addLog({ module: 'Dépenses', action: 'Création dépense', utilisateur: utilisateur?.nom, details: `Nouvelle dépense "${form.libelle}"` })
        success('Dépense créée avec succès')
      }
      setShowModal(false)
      loadData()
    } catch (err) { notifError('Erreur : ' + (err.message || '')) }
  }

  const handleDelete = async (dep) => {
    const ok = await confirmDelete(dep.libelle || `Dépense #${dep.id}`)
    if (!ok) return
    try {
      const { error: e } = await supabase.from('depenses').delete().eq('id', dep.id)
      if (e) throw e
      addLog({ module: 'Dépenses', action: 'Suppression dépense', utilisateur: utilisateur?.nom, details: `Dépense "${dep.libelle}" supprimée` })
      success('Dépense supprimée')
      loadData()
    } catch (err) { notifError('Erreur : ' + (err.message || '')) }
  }

  const handleJournal = async (dep) => {
    if (dep.mouvement_caisse_id) { notifError('Cette dépense est déjà dans le journal'); return }
    const catInfo = CATEGORIES_DEPENSES.find(c => c.value === dep.categorie)
    try {
      const { data: mvt, error: e } = await supabase.from('mouvements_caisse').insert({
        date:          dep.date_depense,
        type:          'SORTIE',
        categorie:     catInfo?.journalCat || 'AUTRE_SORTIE',
        montant:       dep.montant,
        description:   `[DÉPENSE] ${dep.libelle}`,
        beneficiaire:  dep.beneficiaire || catInfo?.label || dep.categorie,
        mode_paiement: dep.mode_paiement || 'ESPECES',
        reference:     dep.reference || `DEP-${dep.id}`,
        utilisateur:   utilisateur?.nom,
        caisse_nom:    'Caisse Principale',
      }).select().single()
      if (e) throw e
      await supabase.from('depenses').update({ statut: 'PAYE', mouvement_caisse_id: mvt.id }).eq('id', dep.id)
      addLog({ module: 'Dépenses', action: 'Enregistrement journal', utilisateur: utilisateur?.nom, details: `Dépense "${dep.libelle}" → Journal` })
      success('Dépense enregistrée dans le Journal de Caisse ✓')
      loadData()
    } catch (err) { notifError('Erreur journal : ' + (err.message || '')) }
  }

  const handleExcel = () => {
    const rows = depensesFiltrees.map(d => ({
      Date:            d.date_depense,
      Référence:       d.reference || '',
      Libellé:         d.libelle,
      Bénéficiaire:    d.beneficiaire || '',
      Catégorie:       CATEGORIES_DEPENSES.find(c => c.value === d.categorie)?.label || d.categorie,
      Montant:         d.montant,
      'Mode paiement': d.mode_paiement || '',
      Statut:          STATUTS.find(s => s.value === d.statut)?.label || d.statut,
      'Dans Journal':  d.mouvement_caisse_id ? 'Oui' : 'Non',
      Notes:           d.notes || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dépenses')
    XLSX.writeFile(wb, `Depenses_SIKA_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handlePrintGlobal = async () => {
    try {
      const ctx = await createSikaPDF('LISTE DES DÉPENSES — SIKA INDUSTRIE')
      const { doc, startY, MARGE_G } = ctx
      let y = startY
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(80,80,100)
      doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')}  ·  ${depensesFiltrees.length} dépense(s)  ·  Total : ${formatMontant(totalFiltres)} FCFA`, MARGE_G, y)
      y += 6
      const cols = ['Date', 'Référence', 'Libellé', 'Bénéficiaire', 'Catégorie', 'Montant (FCFA)', 'Statut', 'Paiement']
      const rows = depensesFiltrees.map(d => [
        new Date(d.date_depense).toLocaleDateString('fr-FR'),
        d.reference || '—',
        (d.libelle || '—').substring(0, 35),
        (d.beneficiaire || '—').substring(0, 20),
        CATEGORIES_DEPENSES.find(c => c.value === d.categorie)?.label || d.categorie || '—',
        formatMontant(d.montant),
        STATUTS.find(s => s.value === d.statut)?.label || d.statut,
        d.mode_paiement || '—',
      ])
      rows.push([
        { content: 'TOTAL', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [27,42,74], textColor: [255,255,255] } },
        { content: formatMontant(totalFiltres) + ' FCFA', styles: { fontStyle: 'bold', fillColor: [230,0,0], textColor: [255,255,255] } },
        { content: '', colSpan: 2, styles: { fillColor: [27,42,74] } },
      ])
      sikaTable(doc, cols, rows, y, ctx)
      await finalizeSikaPDF(ctx, `Depenses_SIKA_${new Date().toISOString().split('T')[0]}.pdf`, utilisateur)
      success('PDF liste des dépenses généré ✓')
    } catch (err) { notifError('Erreur impression : ' + (err.message || '')) }
  }

  const handlePrintDetail = async (dep) => {
    try {
      const ctx = await createSikaPDF('FICHE DE DÉPENSE — SIKA INDUSTRIE')
      const { doc, startY, MARGE_G, PAGE_W, CONTENT_W } = ctx
      const cat    = CATEGORIES_DEPENSES.find(c => c.value === dep.categorie)
      const statut = STATUTS.find(s => s.value === dep.statut)
      let y = startY
      doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(27,42,74)
      doc.text(`Réf : ${dep.reference || 'DEP-' + dep.id}`, PAGE_W-15, y, { align: 'right' })
      doc.text(`Date : ${new Date(dep.date_depense).toLocaleDateString('fr-FR')}`, PAGE_W-15, y+5, { align: 'right' })
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(120,120,140)
      doc.text('Catégorie :', MARGE_G, y)
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(27,42,74)
      doc.text(cat?.label || dep.categorie || '—', MARGE_G+24, y)
      y += 12
      doc.setFillColor(232,236,244); doc.roundedRect(MARGE_G, y, CONTENT_W, 18, 2, 2, 'F')
      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(120,120,140)
      doc.text('BÉNÉFICIAIRE / FOURNISSEUR', MARGE_G+3, y+5)
      doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.setTextColor(27,42,74)
      doc.text(dep.beneficiaire || '—', MARGE_G+3, y+13)
      y += 22
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(120,120,140)
      doc.text('LIBELLÉ / OBJET DE LA DÉPENSE', MARGE_G, y); y += 4
      doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(27,42,74)
      const libLines = doc.splitTextToSize(dep.libelle || '—', CONTENT_W)
      doc.text(libLines, MARGE_G, y); y += libLines.length * 5 + 5
      sikaTable(doc, ['Champ', 'Valeur'], [
        ['Mode de paiement',  dep.mode_paiement || '—'],
        ['Statut',            statut?.label || dep.statut || '—'],
        ['Journal de caisse', dep.mouvement_caisse_id ? `Enregistré (mouvement #${dep.mouvement_caisse_id})` : 'Non enregistré'],
      ], y, ctx)
      y = doc.lastAutoTable.finalY + 6
      sikaTable(doc, ['Désignation', 'Montant (FCFA)'], [
        [
          { content: 'MONTANT TOTAL', styles: { fontStyle: 'bold', fontSize: 10 } },
          { content: formatMontant(dep.montant) + ' FCFA', styles: { fontStyle: 'bold', fontSize: 10, textColor: [230,0,0] } },
        ],
      ], y, ctx)
      if (dep.notes) {
        y = doc.lastAutoTable.finalY + 6
        doc.setFont('helvetica','italic'); doc.setFontSize(8.5); doc.setTextColor(120,120,140)
        doc.text(doc.splitTextToSize('Notes : ' + dep.notes, CONTENT_W), MARGE_G, y)
      }
      addDiagonalWatermark(doc, utilisateur || { nom: 'SIKA INDUSTRIE' })
      await finalizeSikaPDF(ctx, `Depense_${dep.reference || dep.id}_SIKA.pdf`, utilisateur)
      success('Fiche dépense imprimée ✓')
    } catch (err) { notifError('Erreur impression : ' + (err.message || '')) }
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon="💸" label="Total Dépenses"  value={stats.nb + ' dépense(s)'} color="#1B2A4A" />
        <StatCard icon="📊" label="Montant Total"   value={fmt(stats.total)}          color="#E60000" />
        <StatCard icon="✅" label="Montant Réglé"   value={fmt(stats.paye)}           color="#1A7A4A" />
        <StatCard icon="📅" label="Mois courant"    value={fmt(stats.moisCou)}        color="#1F5C99" />
      </div>

      {/* Répartition + Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-5 md:col-span-1">
          <h3 className="text-sm font-bold text-[#1B2A4A] mb-3 flex items-center gap-2">
            <BarChart2 size={16} className="text-[#E60000]" /> Répartition par catégorie
          </h3>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {repartition.length === 0 ? (
              <p className="text-xs text-[#C8C8D0] text-center py-4">Aucune donnée</p>
            ) : repartition.map(([cat, info]) => {
              const pct = totalFiltres > 0 ? Math.round((info.montant / totalFiltres) * 100) : 0
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-[#1B2A4A] font-medium truncate">{info.icon} {info.label}</span>
                    <span className="text-[#E60000] font-bold ml-2 whitespace-nowrap">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#E8ECF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#E60000] rounded-full transition-all" style={{ width: pct + '%' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 md:col-span-2">
          <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#1B2A4A]">Filtres</h3>
            <div className="flex gap-2">
              <button onClick={loadData} className="bg-[#1F5C99] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs hover:opacity-90">
                <RefreshCw size={13} /> Actualiser
              </button>
              <button onClick={handleExcel} className="bg-[#1A7A4A] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs hover:opacity-90">
                <FileSpreadsheet size={13} /> Excel
              </button>
              <button onClick={handlePrintGlobal} className="bg-[#1B2A4A] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs hover:opacity-90">
                <Printer size={13} /> Imprimer
              </button>
              <button onClick={() => handleOuvrir()} className="bg-[#E60000] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs hover:opacity-90">
                <Plus size={13} /> Nouvelle Dépense
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C8C8D0]" size={14} />
              <input type="text" placeholder="Rechercher libellé, bénéficiaire, référence…"
                value={recherche} onChange={e => setRecherche(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-[#C8C8D0] rounded-lg text-sm focus:outline-none focus:border-[#E60000]" />
            </div>
            <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
              className="border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Tous les statuts</option>
              {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}
              className="border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Toutes catégories</option>
              {CATEGORIES_DEPENSES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
            <input type="date" value={filtreDateDebut} onChange={e => setFiltreDateDebut(e.target.value)}
              className="border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <input type="date" value={filtreDateFin} onChange={e => setFiltreDateFin(e.target.value)}
              className="border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <p className="text-xs text-[#C8C8D0] mt-2">{depensesFiltrees.length} dépense(s) · Total : {fmt(totalFiltres)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw size={32} className="animate-spin text-[#E60000]" /></div>
        ) : depensesFiltrees.length === 0 ? (
          <div className="text-center py-16 text-[#C8C8D0]">
            <Receipt size={40} className="mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">Aucune dépense trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-[#1B2A4A] text-white text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Référence</th>
                  <th className="px-4 py-3 text-left">Libellé</th>
                  <th className="px-4 py-3 text-left">Bénéficiaire</th>
                  <th className="px-4 py-3 text-left">Catégorie</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                  <th className="px-4 py-3 text-center">Journal</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {depensesFiltrees.map((d, idx) => {
                  const statut = STATUTS.find(s => s.value === d.statut)
                  const cat    = CATEGORIES_DEPENSES.find(c => c.value === d.categorie)
                  return (
                    <tr key={d.id} className="hover:bg-[#FFE6E6] transition-colors border-b border-[#E8ECF4]"
                      style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-[#1F5C99]">
                        {new Date(d.date_depense).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-[#1B2A4A] font-mono text-xs">
                        {d.reference || <span className="text-[#C8C8D0]">—</span>}
                      </td>
                      <td className="px-4 py-3 max-w-xs"><p className="truncate font-medium text-[#1B2A4A]">{d.libelle}</p></td>
                      <td className="px-4 py-3 text-[#1B2A4A] text-xs">{d.beneficiaire || <span className="text-[#C8C8D0]">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8ECF4] text-[#1B2A4A]">{cat?.icon} {cat?.label || d.categorie}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#E60000]">{fmt(d.montant)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: statut?.bg, color: statut?.color }}>{statut?.label || d.statut}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {d.mouvement_caisse_id ? (
                          <span className="text-xs text-[#1A7A4A] font-semibold">✓ Enregistré</span>
                        ) : (
                          <button onClick={() => handleJournal(d)} title="Enregistrer dans le Journal"
                            className="text-[#1F5C99] hover:text-[#E60000] transition-colors" disabled={d.statut === 'ANNULE'}>
                            <BookOpen size={16} />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setSelected(d); setShowDetail(true) }}
                            className="p-1.5 rounded hover:bg-[#E8ECF4] text-[#1F5C99]" title="Voir"><Eye size={14} /></button>
                          <button onClick={() => handleOuvrir(d)}
                            className="p-1.5 rounded hover:bg-[#E8ECF4] text-[#E60000]" title="Modifier"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(d)}
                            className="p-1.5 rounded hover:bg-[#FFE6E6] text-[#E60000]" title="Supprimer"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-[#E8ECF4]">
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right font-bold text-[#1B2A4A] text-sm">Total affiché :</td>
                  <td className="px-4 py-2 text-right font-bold text-[#E60000]">{fmt(totalFiltres)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal Création / Modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-[#1B2A4A] text-white p-5 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Receipt size={20} className="text-[#E60000]" />
                {selected ? 'Modifier la Dépense' : 'Nouvelle Dépense'}
              </h2>
              <button onClick={() => setShowModal(false)} className="hover:text-[#E60000]"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Date *</label>
                  <input type="date" value={form.date_depense}
                    onChange={e => setForm(p => ({ ...p, date_depense: e.target.value }))}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Référence</label>
                  <input type="text" value={form.reference} placeholder="DEP-001"
                    onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Catégorie *</label>
                  <select value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {CATEGORIES_DEPENSES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Libellé *</label>
                  <input type="text" value={form.libelle} placeholder="Description de la dépense…"
                    onChange={e => setForm(p => ({ ...p, libelle: e.target.value }))}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Bénéficiaire / Fournisseur</label>
                  <input type="text" value={form.beneficiaire} placeholder="Nom bénéficiaire…"
                    onChange={e => setForm(p => ({ ...p, beneficiaire: e.target.value }))}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Montant (FCFA) *</label>
                  <input type="number" value={form.montant} placeholder="0"
                    onChange={e => setForm(p => ({ ...p, montant: e.target.value }))}
                    className="w-full border-2 border-[#E60000] rounded-lg px-3 py-2 text-sm font-bold text-[#E60000] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Mode Paiement</label>
                  <select value={form.mode_paiement} onChange={e => setForm(p => ({ ...p, mode_paiement: e.target.value }))}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {MODES_PAIEMENT.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Statut</label>
                  <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Projet lié</label>
                  <select value={form.projet_id} onChange={e => setForm(p => ({ ...p, projet_id: e.target.value }))}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">— Aucun —</option>
                    {projets.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Notes</label>
                <textarea value={form.notes} rows={2} placeholder="Remarques…"
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000] resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-[#C8C8D0] rounded-lg text-sm text-[#1B2A4A] hover:bg-[#E8ECF4]">Annuler</button>
                <button onClick={handleSave}
                  className="px-6 py-2 rounded-lg text-sm text-white font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#E60000' }}>
                  {selected ? 'Enregistrer modifications' : 'Créer la dépense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail */}
      {showDetail && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="bg-[#1B2A4A] text-white p-5 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold">Détail Dépense #{selected.id}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePrintDetail(selected)} className="hover:text-[#E60000]" title="Imprimer"><Printer size={18} /></button>
                <button onClick={() => setShowDetail(false)} className="hover:text-[#E60000]"><X size={20} /></button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {[
                ['Date',         new Date(selected.date_depense).toLocaleDateString('fr-FR')],
                ['Référence',    selected.reference || '—'],
                ['Libellé',      selected.libelle],
                ['Bénéficiaire', selected.beneficiaire || '—'],
                ['Catégorie',    (CATEGORIES_DEPENSES.find(c => c.value === selected.categorie)?.icon || '') + ' ' + (CATEGORIES_DEPENSES.find(c => c.value === selected.categorie)?.label || selected.categorie)],
                ['Montant',      fmt(selected.montant)],
                ['Mode Paiement',selected.mode_paiement || '—'],
                ['Statut',       STATUTS.find(s => s.value === selected.statut)?.label || selected.statut],
                ['Dans Journal', selected.mouvement_caisse_id ? '✓ Oui (réf #' + selected.mouvement_caisse_id + ')' : '✗ Non'],
                ['Notes',        selected.notes || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between border-b border-[#E8ECF4] pb-2">
                  <span className="text-xs font-semibold text-[#C8C8D0] uppercase">{label}</span>
                  <span className="text-sm font-medium text-[#1B2A4A] text-right max-w-xs">{val}</span>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <button onClick={() => handlePrintDetail(selected)}
                  className="flex-1 bg-[#1B2A4A] text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-80">
                  <Printer size={15} /> Imprimer la fiche
                </button>
                {!selected.mouvement_caisse_id && selected.statut !== 'ANNULE' && (
                  <button onClick={() => { handleJournal(selected); setShowDetail(false) }}
                    className="flex-1 bg-[#1F5C99] text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90">
                    <BookOpen size={16} /> Enregistrer Journal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL — Achats & Dépenses (onglets)
══════════════════════════════════════════════════════════════ */
export default function AchatsDepenses() {
  const [onglet, setOnglet] = useState('achats')

  return (
    <div className="min-h-screen bg-[#E8ECF4] p-6 space-y-5">

      {/* Header */}
      <div className="bg-[#1B2A4A] text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <ShoppingCart size={26} className="text-[#E60000]" />
          <Receipt size={22} className="text-[#E60000] -ml-2" />
          Achats & Dépenses — SIKA INDUSTRIE
        </h1>
        <p className="text-[#C8C8D0] mt-1 text-sm">Gestion centralisée des achats fournisseurs et des charges · Synchronisé Supabase</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-white rounded-xl shadow p-1.5 w-fit">
        <button
          onClick={() => setOnglet('achats')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            onglet === 'achats'
              ? 'bg-[#1B2A4A] text-white shadow'
              : 'text-[#C8C8D0] hover:text-[#1B2A4A] hover:bg-[#E8ECF4]'
          }`}>
          <ShoppingCart size={16} className={onglet === 'achats' ? 'text-[#E60000]' : ''} />
          Achats fournisseurs
        </button>
        <button
          onClick={() => setOnglet('depenses')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            onglet === 'depenses'
              ? 'bg-[#1B2A4A] text-white shadow'
              : 'text-[#C8C8D0] hover:text-[#1B2A4A] hover:bg-[#E8ECF4]'
          }`}>
          <Receipt size={16} className={onglet === 'depenses' ? 'text-[#E60000]' : ''} />
          Dépenses & Charges
        </button>
      </div>

      {/* Contenu de l'onglet actif */}
      {onglet === 'achats' ? <OngletAchats /> : <OngletDepenses />}
    </div>
  )
}
