import { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Lock, 
  Download,
  FileSpreadsheet,
  Search,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar
} from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';
import { createSikaPDF, finalizeSikaPDF, sikaTable, formatMontant, formatDate } from '../../utils/printUtils';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';

/* ─── helpers semaine ISO ─────────────────────────────────────── */
function getISOWeek(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getWeekBounds(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

function getWeekKey(dateStr) {
  const year = new Date(dateStr).getFullYear();
  const week = getISOWeek(dateStr);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function formatWeekLabel(dateStr) {
  const { monday, sunday } = getWeekBounds(dateStr);
  const fmt = (d) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const week = getISOWeek(dateStr);
  return `Semaine ${week} — du ${fmt(monday)} au ${fmt(sunday)}`;
}

const CATEGORIE_COLORS = {
  PAIEMENT_CLIENT: '#1A7A4A',
  VENTE_MATERIEL: '#1A7A4A',
  LOCATION_MATERIEL: '#1A7A4A',
  AUTRE_ENTREE: '#1A7A4A',
  ACHAT_MATERIEL: '#E60000',
  LOYER: '#E60000',
  SALAIRE: '#E60000',
  TRANSPORT: '#E60000',
  FOURNITURE_BUREAU: '#E60000',
  SOUS_TRAITANCE: '#E60000',
  AUTRE_SORTIE: '#E60000',
};

function formatFCFA(n) {
  return Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
}
/* ─────────────────────────────────────────────────────────────── */

const JournalCaisse = () => {
  const [activeTab, setActiveTab] = useState('journal');
  const [selectedCaisse, setSelectedCaisse] = useState('Caisse Principale');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [caissesList, setCaissesList] = useState(['Caisse Principale']);


  /* ── Fetch Supabase ──────────────────────────────────────────── */
  const fetchMouvements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mouvements_caisse')
      .select('*')
      .order('date', { ascending: true })
      .order('id', { ascending: true });
    if (!error) {
      setMouvements(data || []);
      const noms = [...new Set((data || []).map(m => m.caisse_nom).filter(Boolean))];
      if (noms.length > 0) setCaissesList(noms);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMouvements(); }, []);

  /* ── Filtre par caisse + année ───────────────────────────────── */
  const mouvementsFiltres = useMemo(() => {
    return mouvements.filter(m => {
      const yr = new Date(m.date).getFullYear();
      const matchCaisse = !m.caisse_nom || m.caisse_nom === selectedCaisse;
      const matchYear = yr === selectedYear;
      const matchSearch = !searchTerm ||
        (m.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.beneficiaire || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchCaisse && matchYear && matchSearch;
    });
  }, [mouvements, selectedCaisse, selectedYear, searchTerm]);

  /* ── Journal par semaine avec solde cumulatif ────────────────── */
  const journalParSemaine = useMemo(() => {
    if (!mouvementsFiltres.length) return [];

    const allSorted = [...mouvements].sort((a, b) =>
      new Date(a.date) - new Date(b.date) || a.id - b.id
    );
    const soldeAvantAnnee = allSorted
      .filter(m => new Date(m.date).getFullYear() < selectedYear &&
        (!m.caisse_nom || m.caisse_nom === selectedCaisse))
      .reduce((acc, m) => acc + (m.type === 'ENTREE' ? Number(m.montant) : -Number(m.montant)), 0);

    const weekMap = {};
    mouvementsFiltres.forEach(m => {
      const key = getWeekKey(m.date);
      if (!weekMap[key]) weekMap[key] = [];
      weekMap[key].push(m);
    });

    const sortedKeys = Object.keys(weekMap).sort();
    let soldeReport = soldeAvantAnnee;

    return sortedKeys.map(weekKey => {
      const ops = [...weekMap[weekKey]].sort(
        (a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id
      );
      const reportSolde = soldeReport;
      let soldeCourant = soldeReport;

      const opsWithSolde = ops.map(op => {
        soldeCourant += op.type === 'ENTREE' ? Number(op.montant) : -Number(op.montant);
        return { ...op, soldeCumul: soldeCourant };
      });

      const totalEntrees = ops
        .filter(o => o.type === 'ENTREE')
        .reduce((s, o) => s + Number(o.montant), 0);
      const totalSorties = ops
        .filter(o => o.type === 'SORTIE')
        .reduce((s, o) => s + Number(o.montant), 0);

      soldeReport = soldeCourant;

      return {
        weekKey,
        label: formatWeekLabel(ops[0].date),
        reportSolde,
        ops: opsWithSolde,
        totalEntrees,
        totalSorties,
        soldeFinal: soldeCourant,
      };
    });
  }, [mouvementsFiltres, mouvements, selectedYear, selectedCaisse]);

  /* ── Stats globales de l'année ───────────────────────────────── */
  const stats = useMemo(() => {
    const entrees = mouvementsFiltres
      .filter(m => m.type === 'ENTREE')
      .reduce((s, m) => s + Number(m.montant), 0);
    const sorties = mouvementsFiltres
      .filter(m => m.type === 'SORTIE')
      .reduce((s, m) => s + Number(m.montant), 0);
    const soldeFinal = journalParSemaine.length
      ? journalParSemaine[journalParSemaine.length - 1].soldeFinal
      : 0;
    return { entrees, sorties, soldeFinal, nbOps: mouvementsFiltres.length };
  }, [mouvementsFiltres, journalParSemaine]);

  /* ── Historique = bilan par mois de l'année ──────────────────── */
  const historiqueParMois = useMemo(() => {
    const allSorted = [...mouvements]
      .filter(m => !m.caisse_nom || m.caisse_nom === selectedCaisse)
      .sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);

    const monthMap = {};
    allSorted.forEach(m => {
      const d = new Date(m.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = [];
      monthMap[key].push(m);
    });

    const sortedKeys = Object.keys(monthMap).sort();
    let soldePrecedent = 0;

    return sortedKeys.map(key => {
      const ops = monthMap[key];
      const entrees = ops.filter(o => o.type === 'ENTREE').reduce((s, o) => s + Number(o.montant), 0);
      const sorties = ops.filter(o => o.type === 'SORTIE').reduce((s, o) => s + Number(o.montant), 0);
      const soldeFinal = soldePrecedent + entrees - sorties;
      const [yr, mo] = key.split('-');
      const periode = new Date(Number(yr), Number(mo) - 1, 1)
        .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const result = {
        key,
        periode,
        soldeInitial: soldePrecedent,
        soldeFinal,
        totalEntrees: entrees,
        totalSorties: sorties,
        nbOps: ops.length,
        dateDebut: ops[0].date,
        dateFin: ops[ops.length - 1].date,
      };
      soldePrecedent = soldeFinal;
      return result;
    }).filter(h => {
      if (!searchTerm) return true;
      return h.periode.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [mouvements, selectedCaisse, searchTerm]);

  /* ── Toggle semaine ouverte ──────────────────────────────────── */
  const toggleWeek = (key) =>
    setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));

  /* ── Export Excel du journal complet ─────────────────────────── */
  const handleExportExcel = () => {
    const rows = [];
    journalParSemaine.forEach(sem => {
      rows.push({
        Date: '',
        Référence: '',
        'Libellé': `=== ${sem.label} ===`,
        Encaissement: '',
        Décaissement: '',
        Solde: '',
      });
      rows.push({
        Date: '',
        Référence: `RPT-${sem.weekKey}`,
        'Libellé': 'Report solde semaine précédente',
        Encaissement: '',
        Décaissement: '',
        Solde: sem.reportSolde,
      });
      sem.ops.forEach(op => {
        rows.push({
          Date: new Date(op.date).toLocaleDateString('fr-FR'),
          Référence: op.reference || '',
          'Libellé': op.description || '',
          Encaissement: op.type === 'ENTREE' ? Number(op.montant) : '',
          Décaissement: op.type === 'SORTIE' ? Number(op.montant) : '',
          Solde: op.soldeCumul,
        });
      });
      rows.push({
        Date: '',
        Référence: '',
        'Libellé': `TOTAL ${sem.label}`,
        Encaissement: sem.totalEntrees,
        Décaissement: sem.totalSorties,
        Solde: sem.soldeFinal,
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Journal');
    XLSX.writeFile(wb, `Journal_${selectedCaisse.replace(/ /g, '_')}_${selectedYear}.xlsx`);
  };

  /* ── Impression PDF opération ────────────────────────────────── */
  const handlePrintOperation = async (op) => {
    try {
      const ctx = await createSikaPDF(`Détail Opération — ${op.reference || op.id}`);
      const { doc, startY } = ctx;
      sikaTable(doc, ['Champ', 'Détail'], [
        ['Caisse', selectedCaisse],
        ['Date', new Date(op.date).toLocaleDateString('fr-FR')],
        ['Référence', op.reference || '—'],
        ['Description', op.description || '—'],
        ['Bénéficiaire', op.beneficiaire || '—'],
        ['Mode paiement', op.mode_paiement || '—'],
        ['Type', op.type === 'ENTREE' ? 'Encaissement' : 'Décaissement'],
        ['Montant', formatMontant(op.montant) + ' FCFA'],
        ['Solde après opération', formatMontant(op.soldeCumul) + ' FCFA'],
      ], startY, ctx);
      await finalizeSikaPDF(ctx, `Op_${op.reference || op.id}_${op.date}.pdf`);
    } catch (err) {
      console.error('Erreur PDF:', err);
    }
  };

  /* ── Impression PDF semaine ──────────────────────────────────── */
  const handlePrintSemaine = async (sem) => {
    try {
      const ctx = await createSikaPDF(`Journal de Caisse — ${sem.label}`);
      const { doc, startY } = ctx;
      const cols = ['Date', 'Référence', 'Libellé / Bénéficiaire', 'Encaissement', 'Décaissement', 'Solde'];
      const rows = [
        ['', `RPT-${sem.weekKey}`, 'Report solde semaine précédente', '', '', formatMontant(sem.reportSolde)],
        ...sem.ops.map(op => [
          new Date(op.date).toLocaleDateString('fr-FR'),
          op.reference || '',
          op.description || '',
          op.type === 'ENTREE' ? formatMontant(op.montant) : '',
          op.type === 'SORTIE' ? formatMontant(op.montant) : '',
          formatMontant(op.soldeCumul),
        ]),
        ['', '', 'TOTAUX SEMAINE', formatMontant(sem.totalEntrees), formatMontant(sem.totalSorties), formatMontant(sem.soldeFinal)],
      ];
      sikaTable(doc, cols, rows, startY, ctx);
      await finalizeSikaPDF(ctx, `Journal_S${sem.weekKey}.pdf`);
    } catch (err) {
      console.error('Erreur PDF semaine:', err);
    }
  };

  const yearsAvailable = useMemo(() => {
    const yrs = [...new Set(mouvements.map(m => new Date(m.date).getFullYear()))].sort((a, b) => b - a);
    return yrs.length ? yrs : [new Date().getFullYear()];
  }, [mouvements]);

  return (
    <div className="min-h-screen bg-[#E8ECF4]">
      <Breadcrumb
        items={[
          { label: 'Accueil', path: '/' },
          { label: 'Caisse', path: '/caisse' },
          { label: 'Journal de Caisse' },
        ]}
      />

      <div className="p-6 space-y-6">

        {/* ── En-tête ──────────────────────────────────────────── */}
        <div className="bg-[#1B2A4A] text-white p-6 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Wallet size={28} className="text-[#E60000]" />
              Journal de Caisse — SIKA INDUSTRIE
            </h1>
            <p className="text-[#C8C8D0] mt-1 text-sm">
              Généré automatiquement · Synchronisé Supabase · {stats.nbOps} opérations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedCaisse}
              onChange={e => setSelectedCaisse(e.target.value)}
              className="bg-white text-[#1B2A4A] border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none"
            >
              {caissesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-white text-[#1B2A4A] border border-[#C8C8D0] rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none"
            >
              {yearsAvailable.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={fetchMouvements}
              className="bg-[#E60000] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-red-700 transition-colors"
            >
              <RefreshCw size={16} /> Actualiser
            </button>
          </div>
        </div>

        {/* ── Cartes stats ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-[#1A7A4A]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C8C8D0] uppercase font-semibold">Total Encaissements {selectedYear}</p>
                <p className="text-xl font-bold text-[#1A7A4A] mt-1">{formatFCFA(stats.entrees)}</p>
              </div>
              <TrendingUp className="text-[#1A7A4A]" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-[#E60000]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C8C8D0] uppercase font-semibold">Total Décaissements {selectedYear}</p>
                <p className="text-xl font-bold text-[#E60000] mt-1">{formatFCFA(stats.sorties)}</p>
              </div>
              <TrendingDown className="text-[#E60000]" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-5 border-l-4 border-[#1B2A4A]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C8C8D0] uppercase font-semibold">Solde Actuel</p>
                <p className={`text-xl font-bold mt-1 ${stats.soldeFinal >= 0 ? 'text-[#1B2A4A]' : 'text-[#E60000]'}`}>
                  {formatFCFA(stats.soldeFinal)}
                </p>
              </div>
              <Wallet className="text-[#1B2A4A]" size={32} />
            </div>
          </div>
        </div>

        {/* ── Onglets ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-[#C8C8D0] flex">
            {[
              { id: 'journal', label: '📋 Journal par Semaine' },
              { id: 'historique', label: '📚 Historique Mensuel' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-semibold transition-colors text-sm ${
                  activeTab === tab.id
                    ? 'bg-[#E60000] text-white border-b-4 border-[#E60000]'
                    : 'text-[#1B2A4A] hover:bg-[#FFE6E6]'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            <div className="flex items-center gap-2 px-4">
              <button
                onClick={handleExportExcel}
                className="bg-[#1A7A4A] text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 hover:bg-green-700 transition-colors"
              >
                <FileSpreadsheet size={15} /> Excel
              </button>
            </div>
          </div>

          <div className="p-5">
            {/* ─── Barre de recherche ─── */}
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C8C8D0]" size={18} />
              <input
                type="text"
                placeholder="Rechercher opération, référence, bénéficiaire..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-[#C8C8D0] rounded-lg text-sm focus:outline-none focus:border-[#E60000]"
              />
            </div>

            {/* ──────────────────── TAB: JOURNAL PAR SEMAINE ──── */}
            {activeTab === 'journal' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-16 text-[#C8C8D0]">
                    <RefreshCw size={40} className="mx-auto animate-spin mb-3" />
                    <p>Chargement du journal depuis Supabase…</p>
                  </div>
                ) : journalParSemaine.length === 0 ? (
                  <div className="text-center py-16 text-[#C8C8D0]">
                    <Calendar size={48} className="mx-auto mb-3" />
                    <p className="font-semibold">Aucune opération pour {selectedYear}</p>
                    <p className="text-sm mt-1">Les mouvements enregistrés dans la caisse apparaîtront ici automatiquement.</p>
                  </div>
                ) : (
                  journalParSemaine.map(sem => {
                    const isOpen = expandedWeeks[sem.weekKey] !== false;
                    const soldeNet = sem.totalEntrees - sem.totalSorties;
                    return (
                      <div key={sem.weekKey} className="border border-[#C8C8D0] rounded-xl overflow-hidden shadow-sm">
                        {/* Header semaine */}
                        <div
                          className="flex items-center justify-between px-5 py-3 bg-[#1B2A4A] text-white cursor-pointer select-none"
                          onClick={() => toggleWeek(sem.weekKey)}
                        >
                          <div className="flex items-center gap-3">
                            {isOpen
                              ? <ChevronDown size={18} className="text-[#E60000]" />
                              : <ChevronRight size={18} className="text-[#E60000]" />}
                            <span className="font-bold text-sm">{sem.label}</span>
                            <span className="bg-[#E60000] text-white text-xs px-2 py-0.5 rounded-full">
                              {sem.ops.length} opération{sem.ops.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <span className="text-[#4ade80]">+{formatFCFA(sem.totalEntrees)}</span>
                            <span className="text-[#fca5a5]">-{formatFCFA(sem.totalSorties)}</span>
                            <span className={`font-bold ${soldeNet >= 0 ? 'text-[#4ade80]' : 'text-[#fca5a5]'}`}>
                              Net: {soldeNet >= 0 ? '+' : ''}{formatFCFA(soldeNet)}
                            </span>
                            <div className="flex gap-2 ml-2" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handlePrintSemaine(sem)}
                                className="bg-[#E60000] text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-red-700"
                                title="Imprimer PDF semaine"
                              >
                                <Printer size={13} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Corps semaine */}
                        {isOpen && (
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="bg-[#E8ECF4] text-[#1B2A4A]">
                                  <th className="border-b border-[#C8C8D0] px-4 py-2 text-left">Date</th>
                                  <th className="border-b border-[#C8C8D0] px-4 py-2 text-left">Référence</th>
                                  <th className="border-b border-[#C8C8D0] px-4 py-2 text-left">Description / Bénéficiaire</th>
                                  <th className="border-b border-[#C8C8D0] px-4 py-2 text-left">Catégorie</th>
                                  <th className="border-b border-[#C8C8D0] px-4 py-2 text-right text-[#1A7A4A]">Encaissement</th>
                                  <th className="border-b border-[#C8C8D0] px-4 py-2 text-right text-[#E60000]">Décaissement</th>
                                  <th className="border-b border-[#C8C8D0] px-4 py-2 text-right">Solde cumulé</th>
                                  <th className="border-b border-[#C8C8D0] px-2 py-2 text-center w-12"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* Ligne report */}
                                <tr className="bg-[#FFE6E6]">
                                  <td className="border-b border-[#C8C8D0] px-4 py-2 text-[#1B2A4A] font-semibold" colSpan={2}>
                                    Report semaine précédente
                                  </td>
                                  <td className="border-b border-[#C8C8D0] px-4 py-2 text-[#1B2A4A] italic text-xs" colSpan={2}>
                                    Solde reporté automatiquement
                                  </td>
                                  <td className="border-b border-[#C8C8D0] px-4 py-2 text-right text-[#1A7A4A] font-bold" colSpan={2}>
                                    {formatFCFA(sem.reportSolde)}
                                  </td>
                                  <td className="border-b border-[#C8C8D0] px-4 py-2 text-right font-bold text-[#1B2A4A]">
                                    {formatFCFA(sem.reportSolde)}
                                  </td>
                                  <td className="border-b border-[#C8C8D0]" />
                                </tr>

                                {/* Opérations */}
                                {sem.ops.map((op, idx) => (
                                  <tr
                                    key={op.id}
                                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#E8ECF4]'} hover:bg-[#FFE6E6] transition-colors`}
                                  >
                                    <td className="border-b border-[#C8C8D0] px-4 py-2 whitespace-nowrap">
                                      {new Date(op.date).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="border-b border-[#C8C8D0] px-4 py-2 font-mono text-xs text-[#1F5C99]">
                                      {op.reference || '—'}
                                    </td>
                                    <td className="border-b border-[#C8C8D0] px-4 py-2">
                                      <div className="font-medium text-[#1B2A4A] truncate max-w-xs">{op.description}</div>
                                      {op.beneficiaire && (
                                        <div className="text-xs text-[#C8C8D0] truncate">{op.beneficiaire}</div>
                                      )}
                                    </td>
                                    <td className="border-b border-[#C8C8D0] px-4 py-2">
                                      <span
                                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                        style={{
                                          background: (CATEGORIE_COLORS[op.categorie] || '#C8C8D0') + '22',
                                          color: CATEGORIE_COLORS[op.categorie] || '#888',
                                        }}
                                      >
                                        {(op.categorie || '').replace(/_/g, ' ')}
                                      </span>
                                    </td>
                                    <td className="border-b border-[#C8C8D0] px-4 py-2 text-right font-semibold text-[#1A7A4A]">
                                      {op.type === 'ENTREE' ? formatFCFA(op.montant) : '—'}
                                    </td>
                                    <td className="border-b border-[#C8C8D0] px-4 py-2 text-right font-semibold text-[#E60000]">
                                      {op.type === 'SORTIE' ? formatFCFA(op.montant) : '—'}
                                    </td>
                                    <td className="border-b border-[#C8C8D0] px-4 py-2 text-right font-bold text-[#1B2A4A]">
                                      {formatFCFA(op.soldeCumul)}
                                    </td>
                                    <td className="border-b border-[#C8C8D0] px-2 py-2 text-center">
                                      <button
                                        onClick={() => { setSelectedOperation(op); setShowDetailModal(true); }}
                                        className="text-[#1F5C99] hover:text-[#1B2A4A]"
                                        title="Voir détails"
                                      >
                                        <Eye size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}

                                {/* Ligne total semaine */}
                                <tr className="bg-[#1B2A4A] text-white font-bold text-sm">
                                  <td colSpan={4} className="px-4 py-2.5 text-right uppercase text-xs tracking-wide">
                                    Total {sem.label}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-[#4ade80]">
                                    {formatFCFA(sem.totalEntrees)}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-[#fca5a5]">
                                    {formatFCFA(sem.totalSorties)}
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    {formatFCFA(sem.soldeFinal)}
                                  </td>
                                  <td />
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ──────────────────── TAB: HISTORIQUE MENSUEL ───── */}
            {activeTab === 'historique' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#1B2A4A] text-white">
                      <th className="border border-[#C8C8D0] px-4 py-3 text-left">Période</th>
                      <th className="border border-[#C8C8D0] px-4 py-3 text-center">Du</th>
                      <th className="border border-[#C8C8D0] px-4 py-3 text-center">Au</th>
                      <th className="border border-[#C8C8D0] px-4 py-3 text-right">Solde Ouverture</th>
                      <th className="border border-[#C8C8D0] px-4 py-3 text-right text-[#4ade80]">Encaissements</th>
                      <th className="border border-[#C8C8D0] px-4 py-3 text-right text-[#fca5a5]">Décaissements</th>
                      <th className="border border-[#C8C8D0] px-4 py-3 text-right">Solde Clôture</th>
                      <th className="border border-[#C8C8D0] px-4 py-3 text-center">Opérations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historiqueParMois.map((mois, idx) => (
                      <tr
                        key={mois.key}
                        className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#E8ECF4]'} hover:bg-[#FFE6E6] transition-colors`}
                      >
                        <td className="border border-[#C8C8D0] px-4 py-2.5 font-semibold text-[#1B2A4A] capitalize">
                          {mois.periode}
                        </td>
                        <td className="border border-[#C8C8D0] px-4 py-2.5 text-center text-xs">
                          {new Date(mois.dateDebut).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="border border-[#C8C8D0] px-4 py-2.5 text-center text-xs">
                          {new Date(mois.dateFin).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="border border-[#C8C8D0] px-4 py-2.5 text-right">
                          {formatFCFA(mois.soldeInitial)}
                        </td>
                        <td className="border border-[#C8C8D0] px-4 py-2.5 text-right text-[#1A7A4A] font-semibold">
                          {formatFCFA(mois.totalEntrees)}
                        </td>
                        <td className="border border-[#C8C8D0] px-4 py-2.5 text-right text-[#E60000] font-semibold">
                          {formatFCFA(mois.totalSorties)}
                        </td>
                        <td className="border border-[#C8C8D0] px-4 py-2.5 text-right font-bold text-[#1B2A4A]">
                          {formatFCFA(mois.soldeFinal)}
                        </td>
                        <td className="border border-[#C8C8D0] px-4 py-2.5 text-center">
                          <span className="bg-[#E8ECF4] text-[#1B2A4A] px-2 py-0.5 rounded-full text-xs font-semibold">
                            {mois.nbOps}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {historiqueParMois.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-[#C8C8D0]">
                          Aucune donnée disponible
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal détail opération ───────────────────────────── */}
      {showDetailModal && selectedOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="bg-[#1B2A4A] text-white p-4 rounded-t-xl flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Eye size={18} className="text-[#E60000]" />
                Détail de l'opération
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="hover:text-[#E60000]">✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#E8ECF4] p-3 rounded-lg">
                  <p className="text-xs text-[#C8C8D0] font-semibold uppercase">Date</p>
                  <p className="font-bold text-[#1B2A4A] mt-0.5">
                    {new Date(selectedOperation.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-[#E8ECF4] p-3 rounded-lg">
                  <p className="text-xs text-[#C8C8D0] font-semibold uppercase">Référence</p>
                  <p className="font-bold text-[#1F5C99] font-mono mt-0.5">{selectedOperation.reference || '—'}</p>
                </div>
              </div>
              <div className="bg-[#E8ECF4] p-3 rounded-lg">
                <p className="text-xs text-[#C8C8D0] font-semibold uppercase">Description</p>
                <p className="font-medium text-[#1B2A4A] mt-0.5">{selectedOperation.description || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#E8ECF4] p-3 rounded-lg">
                  <p className="text-xs text-[#C8C8D0] font-semibold uppercase">Bénéficiaire</p>
                  <p className="font-medium text-[#1B2A4A] mt-0.5">{selectedOperation.beneficiaire || '—'}</p>
                </div>
                <div className="bg-[#E8ECF4] p-3 rounded-lg">
                  <p className="text-xs text-[#C8C8D0] font-semibold uppercase">Mode paiement</p>
                  <p className="font-medium text-[#1B2A4A] mt-0.5">{selectedOperation.mode_paiement || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg ${selectedOperation.type === 'ENTREE' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="text-xs font-semibold uppercase text-[#C8C8D0]">Type</p>
                  <p className={`font-bold text-lg mt-0.5 ${selectedOperation.type === 'ENTREE' ? 'text-[#1A7A4A]' : 'text-[#E60000]'}`}>
                    {selectedOperation.type === 'ENTREE' ? '▲ Encaissement' : '▼ Décaissement'}
                  </p>
                </div>
                <div className="bg-[#E8ECF4] p-3 rounded-lg">
                  <p className="text-xs text-[#C8C8D0] font-semibold uppercase">Montant</p>
                  <p className={`font-bold text-lg mt-0.5 ${selectedOperation.type === 'ENTREE' ? 'text-[#1A7A4A]' : 'text-[#E60000]'}`}>
                    {formatFCFA(selectedOperation.montant)}
                  </p>
                </div>
              </div>
              <div className="bg-[#1B2A4A] text-white p-3 rounded-lg">
                <p className="text-xs font-semibold uppercase text-[#C8C8D0]">Solde après opération</p>
                <p className="font-bold text-xl mt-0.5">{formatFCFA(selectedOperation.soldeCumul)}</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => handlePrintOperation(selectedOperation)}
                  className="bg-[#1B2A4A] text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-[#2a3f6a] transition-colors"
                >
                  <Printer size={15} /> Imprimer
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="border border-[#C8C8D0] text-[#1B2A4A] px-4 py-2 rounded-lg text-sm hover:bg-[#E8ECF4] transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalCaisse;
