import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/useAuthStore'
import { useFournisseursStore } from '../../store/useFournisseursStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useNotifications } from '../../components/NotificationProvider'
import {
  ShoppingCart, Plus, Edit2, Trash2, Eye, Search, RefreshCw,
  FileSpreadsheet, BookOpen, X, ChevronDown, ChevronUp, TrendingDown, Printer
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { createSikaPDF, sikaTable, finalizeSikaPDF, formatMontant, addDiagonalWatermark } from '../../utils/printUtils'
import { formatFCFA } from '../../utils/format'

const CATEGORIES = [
  { value: 'MATERIEL',        label: 'Matériel & Équipement',   icon: '🔧', journalCat: 'ACHAT_MATERIEL' },
  { value: 'MATIERE_PREMIERE',label: 'Matières premières',       icon: '📦', journalCat: 'ACHAT_MATERIEL' },
  { value: 'SOUS_TRAITANCE',  label: 'Sous-traitance',          icon: '👷', journalCat: 'SOUS_TRAITANCE' },
  { value: 'TRANSPORT',       label: 'Transport & Logistique',   icon: '🚚', journalCat: 'TRANSPORT' },
  { value: 'FOURNITURES',     label: 'Fournitures diverses',     icon: '📋', journalCat: 'ACHAT_MATERIEL' },
  { value: 'AUTRE',           label: 'Autres achats',            icon: '🛒', journalCat: 'AUTRE_SORTIE' },
]

const STATUTS = [
  { value: 'EN_ATTENTE', label: 'En attente', bg: '#FFF3CD', color: '#856404' },
  { value: 'VALIDE',     label: 'Validé',     bg: '#D1ECF1', color: '#0C5460' },
  { value: 'PAYE',       label: 'Payé',       bg: '#D4EDDA', color: '#155724' },
  { value: 'ANNULE',     label: 'Annulé',     bg: '#F8D7DA', color: '#721C24' },
]

const MODES_PAIEMENT = ['VIREMENT', 'CHEQUE', 'ESPECES', 'TRAITE', 'AUTRE']
const TYPES_ACHAT   = ['FACTURE', 'BON_COMMANDE', 'AVOIR', 'PROFORMA']

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

export default function Achats() {
  const [achats,       setAchats]       = useState([])
  const storeFournisseurs = useFournisseursStore(state => state.fournisseurs)
  const fournisseurs = storeFournisseurs.filter(f => f.isActif !== false)
  const [projets,      setProjets]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [showDetail,   setShowDetail]   = useState(false)
  const [selected,     setSelected]     = useState(null)

  const [recherche,        setRecherche]        = useState('')
  const [filtreStatut,     setFiltreStatut]     = useState('')
  const [filtreCategorie,  setFiltreCategorie]  = useState('')
  const [filtreDateDebut,  setFiltreDateDebut]  = useState('')
  const [filtreDateFin,    setFiltreDateFin]    = useState('')

  const utilisateur          = useAuthStore(s => s.utilisateurConnecte)
  const { addLog }           = useAuditStore()
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

  /* ── Chargement des données ─── */
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

  /* ── Filtres ─── */
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

  /* ── Stats ─── */
  const stats = useMemo(() => {
    const total   = achats.reduce((s, a) => s + Number(a.montant_ttc || 0), 0)
    const paye    = achats.filter(a => a.statut === 'PAYE').reduce((s, a) => s + Number(a.montant_ttc || 0), 0)
    const attente = achats.filter(a => a.statut === 'EN_ATTENTE').reduce((s, a) => s + Number(a.montant_ttc || 0), 0)
    return { nb: achats.length, total, paye, attente }
  }, [achats])

  /* ── Calcul TTC auto ─── */
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

  /* ── CRUD ─── */
  const handleOuvrir = (achat = null) => {
    setSelected(achat)
    setForm(achat ? {
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
    } : emptyForm)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.description && !form.numero_facture) {
      notifError('Description ou numéro de facture requis')
      return
    }
    if (!form.montant_ttc && !form.montant_ht) {
      notifError('Le montant est requis')
      return
    }
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
    } catch (err) {
      notifError('Erreur : ' + (err.message || ''))
    }
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
    } catch (err) {
      notifError('Erreur : ' + (err.message || ''))
    }
  }

  /* ── Enregistrement dans le Journal de Caisse ─── */
  const handleJournal = async (achat) => {
    if (achat.mouvement_caisse_id) {
      notifError('Cet achat est déjà enregistré dans le journal')
      return
    }
    const catInfo  = CATEGORIES.find(c => c.value === achat.categorie)
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
    } catch (err) {
      notifError('Erreur journal : ' + (err.message || ''))
    }
  }

  /* ── Export Excel ─── */
  const handleExcel = () => {
    const rows = achatsFiltres.map(a => ({
      Date:           a.date_achat,
      'N° Facture':   a.numero_facture || '',
      Référence:      a.reference || '',
      Description:    a.description || '',
      Fournisseur:    a.fournisseurs?.nom || '',
      Catégorie:      CATEGORIES.find(c => c.value === a.categorie)?.label || a.categorie || '',
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

  /* ── Impression globale (liste filtrée) ─── */
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
      doc.text(
        `Édité le ${new Date().toLocaleDateString('fr-FR')}  ·  ${achatsFiltres.length} achat(s)  ·  Total TTC : ${formatMontant(totalTTC)} FCFA`,
        MARGE_G, y
      )
      y += 6
      const cols = ['Date', 'N° Facture', 'Description', 'Fournisseur', 'Catégorie', 'Montant HT', 'TVA', 'Montant TTC', 'Statut', 'Paiement']
      const rows = achatsFiltres.map(a => [
        new Date(a.date_achat).toLocaleDateString('fr-FR'),
        a.numero_facture || a.reference || '—',
        (a.description || '—').substring(0, 35),
        (a.fournisseurs?.nom || '—').substring(0, 20),
        CATEGORIES.find(c => c.value === a.categorie)?.label || a.categorie || '—',
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
    } catch (err) {
      notifError('Erreur impression : ' + (err.message || ''))
    }
  }

  /* ── Impression fiche détail ─── */
  const handlePrintDetail = async (achat) => {
    try {
      const ctx = await createSikaPDF("BON D'ACHAT — SIKA INDUSTRIE")
      const { doc, startY, MARGE_G, PAGE_W, CONTENT_W } = ctx
      const cat    = CATEGORIES.find(c => c.value === achat.categorie)
      const statut = STATUTS.find(s => s.value === achat.statut)
      let y = startY

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(27, 42, 74)
      doc.text(`Réf : ${achat.reference || achat.numero_facture || 'ACH-' + achat.id}`, PAGE_W - 15, y, { align: 'right' })
      doc.text(`Date : ${new Date(achat.date_achat).toLocaleDateString('fr-FR')}`, PAGE_W - 15, y + 5, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(120, 120, 140)
      doc.text('N° Facture :', MARGE_G, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(27, 42, 74)
      doc.text(achat.numero_facture || '—', MARGE_G + 27, y)
      y += 12

      doc.setFillColor(232, 236, 244)
      doc.roundedRect(MARGE_G, y, CONTENT_W, 18, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(120, 120, 140)
      doc.text('FOURNISSEUR', MARGE_G + 3, y + 5)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(27, 42, 74)
      doc.text(achat.fournisseurs?.nom || '—', MARGE_G + 3, y + 13)
      y += 22

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 140)
      doc.text('OBJET / DESCRIPTION', MARGE_G, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(27, 42, 74)
      const descLines = doc.splitTextToSize(achat.description || '—', CONTENT_W)
      doc.text(descLines, MARGE_G, y)
      y += descLines.length * 5 + 5

      sikaTable(doc, ['Champ', 'Valeur'], [
        ['Catégorie',        cat?.label || achat.categorie || '—'],
        ['Type document',    achat.type_achat || '—'],
        ['Mode de paiement', achat.mode_paiement || '—'],
        ['Statut règlement', statut?.label || achat.statut || '—'],
        ['Journal de caisse', achat.mouvement_caisse_id
          ? `Enregistré (mouvement #${achat.mouvement_caisse_id})`
          : 'Non enregistré'],
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
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8.5)
        doc.setTextColor(120, 120, 140)
        const noteLines = doc.splitTextToSize('Notes : ' + achat.notes, CONTENT_W)
        doc.text(noteLines, MARGE_G, y)
      }

      addDiagonalWatermark(doc, utilisateur || { nom: 'SIKA INDUSTRIE' })
      await finalizeSikaPDF(ctx, `Achat_${achat.reference || achat.id}_SIKA.pdf`, utilisateur)
      success('Fiche achat imprimée ✓')
    } catch (err) {
      notifError('Erreur impression : ' + (err.message || ''))
    }
  }

  /* ── Render ─── */
  return (
    <div className="min-h-screen bg-[#E8ECF4] p-6 space-y-6">

      {/* Header */}
      <div className="bg-[#1B2A4A] text-white p-6 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <ShoppingCart size={28} className="text-[#E60000]" />
            Gestion des Achats — SIKA INDUSTRIE
          </h1>
          <p className="text-[#C8C8D0] mt-1 text-sm">Commandes & factures fournisseurs · Synchronisé Supabase</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={loadData} className="bg-[#1F5C99] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:opacity-90">
            <RefreshCw size={15} /> Actualiser
          </button>
          <button onClick={handleExcel} className="bg-[#1A7A4A] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:opacity-90">
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button onClick={handlePrintGlobal} className="bg-white/10 border border-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-white/20">
            <Printer size={15} /> Imprimer liste
          </button>
          <button onClick={() => handleOuvrir()} className="bg-[#E60000] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:opacity-90">
            <Plus size={15} /> Nouvel Achat
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon="🛒" label="Total Achats"        value={stats.nb + ' achat(s)'}  color="#1B2A4A" />
        <StatCard icon="💰" label="Montant Total TTC"   value={fmt(stats.total)}          color="#1F5C99" />
        <StatCard icon="✅" label="Montant Payé"        value={fmt(stats.paye)}           color="#1A7A4A" />
        <StatCard icon="⏳" label="En Attente"          value={fmt(stats.attente)}        color="#E60000" />
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C8C8D0]" size={16} />
            <input
              type="text" placeholder="Rechercher fournisseur, facture, description…"
              value={recherche} onChange={e => setRecherche(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#C8C8D0] rounded-lg text-sm focus:outline-none focus:border-[#E60000]"
            />
          </div>
          <select value={filtreStatut}    onChange={e => setFiltreStatut(e.target.value)}
            className="border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value="">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}
            className="border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value="">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" value={filtreDateDebut} onChange={e => setFiltreDateDebut(e.target.value)}
              className="flex-1 border border-[#C8C8D0] rounded-lg px-2 py-2 text-sm focus:outline-none" />
            <input type="date" value={filtreDateFin}   onChange={e => setFiltreDateFin(e.target.value)}
              className="flex-1 border border-[#C8C8D0] rounded-lg px-2 py-2 text-sm focus:outline-none" />
          </div>
        </div>
        <p className="text-xs text-[#C8C8D0] mt-2">{achatsFiltres.length} achat(s) affiché(s)</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={36} className="animate-spin text-[#E60000]" />
          </div>
        ) : achatsFiltres.length === 0 ? (
          <div className="text-center py-20 text-[#C8C8D0]">
            <ShoppingCart size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-semibold">Aucun achat trouvé</p>
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
                  const cat    = CATEGORIES.find(c => c.value === a.categorie)
                  return (
                    <tr key={a.id}
                      className="hover:bg-[#FFE6E6] transition-colors border-b border-[#E8ECF4]"
                      style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-[#1F5C99]">
                        {new Date(a.date_achat).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1B2A4A]">
                        {a.numero_facture || a.reference || <span className="text-[#C8C8D0]">—</span>}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="truncate text-[#1B2A4A]">{a.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-[#1B2A4A]">
                        {a.fournisseurs?.nom || <span className="text-[#C8C8D0]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8ECF4] text-[#1B2A4A]">
                          {cat?.icon} {cat?.label || a.categorie}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#E60000]">
                        {fmt(a.montant_ttc)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: statut?.bg, color: statut?.color }}>
                          {statut?.label || a.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.mouvement_caisse_id ? (
                          <span className="text-xs text-[#1A7A4A] font-semibold">✓ Enregistré</span>
                        ) : (
                          <button onClick={() => handleJournal(a)}
                            title="Enregistrer dans le Journal"
                            className="text-[#1F5C99] hover:text-[#E60000] transition-colors"
                            disabled={a.statut === 'ANNULE'}>
                            <BookOpen size={16} />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setSelected(a); setShowDetail(true) }}
                            className="p-1.5 rounded hover:bg-[#E8ECF4] text-[#1F5C99]" title="Voir">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => handleOuvrir(a)}
                            className="p-1.5 rounded hover:bg-[#E8ECF4] text-[#E60000]" title="Modifier">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(a)}
                            className="p-1.5 rounded hover:bg-[#FFE6E6] text-[#E60000]" title="Supprimer">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-[#E8ECF4]">
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right font-bold text-[#1B2A4A] text-sm">
                    Total affiché :
                  </td>
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

              {/* Ligne 1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Date Achat *</label>
                  <input type="date" value={form.date_achat} onChange={e => handleFormChange('date_achat', e.target.value)}
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">N° Facture</label>
                  <input type="text" value={form.numero_facture} onChange={e => handleFormChange('numero_facture', e.target.value)}
                    placeholder="FAC-2024-001"
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Référence interne</label>
                  <input type="text" value={form.reference} onChange={e => handleFormChange('reference', e.target.value)}
                    placeholder="ACH-001"
                    className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Description *</label>
                <input type="text" value={form.description} onChange={e => handleFormChange('description', e.target.value)}
                  placeholder="Nature de l'achat…"
                  className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
              </div>

              {/* Fournisseur + Catégorie + Type */}
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
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
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

              {/* Montants */}
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
                  <label className="block text-xs font-semibold text-[#1B2A4A] mb-1 flex items-center gap-1">
                    Montant TTC *
                    <span className="text-[#1F5C99] text-xs">(auto-calculé)</span>
                  </label>
                  <input type="number" value={form.montant_ttc} onChange={e => handleFormChange('montant_ttc', e.target.value)}
                    placeholder="0"
                    className="w-full border-2 border-[#E60000] rounded-lg px-3 py-2 text-sm font-bold text-[#E60000] focus:outline-none" />
                </div>
              </div>

              {/* Mode paiement + Statut + Projet */}
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

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#1B2A4A] mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => handleFormChange('notes', e.target.value)}
                  rows={2} placeholder="Remarques éventuelles…"
                  className="w-full border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E60000] resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-[#C8C8D0] rounded-lg text-sm text-[#1B2A4A] hover:bg-[#E8ECF4]">
                  Annuler
                </button>
                <button onClick={handleSave}
                  className="px-6 py-2 rounded-lg text-sm text-white font-semibold hover:opacity-90"
                  style={{ backgroundColor: '#E60000' }}>
                  {selected ? 'Enregistrer modifications' : 'Créer l\'achat'}
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
                <button onClick={() => handlePrintDetail(selected)} className="hover:text-[#E60000]" title="Imprimer la fiche">
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
                ['Catégorie',    (CATEGORIES.find(c => c.value === selected.categorie)?.icon || '') + ' ' + (CATEGORIES.find(c => c.value === selected.categorie)?.label || selected.categorie)],
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
