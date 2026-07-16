import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFacturesStore } from '../store/useFacturesStore'
import { useDevisStore } from '../store/useDevisStore'
import { useAOStore } from '../store/useAOStore'
import { usePlanificationStore } from '../store/usePlanificationStore'
import { useCaisseStore } from '../store/useCaisseStore'
import { useClientsStore } from '../store/useClientsStore'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, DollarSign, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { formatFCFA } from '../utils/format'
import { isDevisEnAttente, isDevisVisibleDansListe } from '../utils/devisStatus'
import BackendStatusIndicator from '../components/BackendStatusIndicator'
import SyncButton from '../components/SyncButton'

export default function DashboardEnhanced() {
  const navigate = useNavigate()

  const factures = useFacturesStore(state => state.factures || [])
  const devis = useDevisStore(state => state.devis || [])
  const appelsDoffres = useAOStore(state => state.appelsDoffres || [])
  const projets = usePlanificationStore(state => state.projets || [])
  const clients = useClientsStore(state => state.clients || [])
  const soldeCaisse = useCaisseStore(state => state.soldeCaisse || 0)
  const getStatistiquesFactures = useFacturesStore(state => state.getStatistiques)
  const getStatistiquesAO = useAOStore(state => state.getStatistiques)

  const statsFactures = useMemo(() => {
    if (typeof getStatistiquesFactures === 'function') return getStatistiquesFactures(factures)
    return { payees: 0, partielles: 0, impayees: 0 }
  }, [getStatistiquesFactures, factures])

  const statsAO = useMemo(() => {
    if (typeof getStatistiquesAO === 'function') return getStatistiquesAO(appelsDoffres)
    return { aChiffrer: 0, enAttente: 0, soumis: 0, gagne: 0, perdu: 0 }
  }, [getStatistiquesAO, appelsDoffres])

  // Statistiques globales
  const stats = useMemo(() => {
    const totalCA = factures.reduce((sum, f) => sum + (f.montantTTC || 0), 0)
    const totalEncaisse = factures.reduce((sum, f) => sum + (f.montantEncaisse || 0), 0)
    const tauxEncaissement = totalCA > 0 ? (totalEncaisse / totalCA) * 100 : 0

    return {
      totalCA,
      totalEncaisse,
      totalRestant: totalCA - totalEncaisse,
      tauxEncaissement,
      nbFactures: factures.length,
      nbDevis: devis.filter(isDevisVisibleDansListe).length,
      nbDevisEnAttente: devis.filter(d => isDevisVisibleDansListe(d) && isDevisEnAttente(d.statut)).length,
      nbAO: appelsDoffres.length,
      nbProjets: projets.length,
      nbClients: clients.length,
      soldeCaisse: soldeCaisse || 0
    }
  }, [factures, devis, appelsDoffres, projets, clients, soldeCaisse])

  // Évolution CA par mois (6 derniers mois glissants)
  const evolutionCA = useMemo(() => {
    const NOMS_MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    const now = new Date()
    const derniersMois = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      return {
        label: NOMS_MOIS[d.getMonth()],
        prefixe: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      }
    })

    return derniersMois.map(({ label, prefixe }) => {
      const facturesMois = factures.filter(f => f.date?.startsWith(prefixe) || f.dateDepot?.startsWith(prefixe))
      const ca = facturesMois.reduce((sum, f) => sum + (f.montantTTC || 0), 0)
      const encaisse = facturesMois.reduce((sum, f) => sum + (f.montantPaye || 0), 0)
      return { mois: label, CA: ca, Encaissé: encaisse }
    })
  }, [factures])

  // Répartition factures par statut
  const repartitionFactures = useMemo(() => {
    return [
      { name: 'Payées', value: statsFactures.payees, color: 'var(--color-success)' },
      { name: 'Partielles', value: statsFactures.partielles, color: 'var(--color-accent)' },
      { name: 'Impayées', value: statsFactures.impayees, color: 'var(--color-accent)' }
    ]
  }, [statsFactures])

  // Top 5 clients par CA
  const topClients = useMemo(() => {
    const clientsCA = {}
    factures.forEach(f => {
      if (!clientsCA[f.clientId]) {
        const client = clients.find(c => c.id === f.clientId)
        clientsCA[f.clientId] = {
          nom: client?.nom || 'Inconnu',
          ca: 0
        }
      }
      clientsCA[f.clientId].ca += f.montantTTC || 0
    })

    return Object.values(clientsCA)
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 5)
  }, [factures, clients])

  // Répartition AO par statut
  const repartitionAO = useMemo(() => {
    return [
      { name: 'À chiffrer', value: statsAO.aChiffrer, color: 'var(--color-primary)' },
      { name: 'En attente', value: statsAO.enAttente, color: 'var(--color-accent)' },
      { name: 'Soumis', value: statsAO.soumis, color: '#9C27B0' },
      { name: 'Gagné', value: statsAO.gagne, color: 'var(--color-success)' },
      { name: 'Perdu', value: statsAO.perdu, color: 'var(--color-accent)' }
    ]
  }, [statsAO])

  const tickFormatterMillions = useMemo(() => (value) => (typeof value === 'number' && isFinite(value)) ? `${(value / 1000000).toFixed(0)}M` : '0M', [])
  const tooltipFormatterFCFA = useMemo(() => (value) => formatFCFA(value), [])



  return (
    <div className="space-y-6">
      {/* HEADER avec Horloge */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>Tableau de Bord</h1>
          <p className="text-lg mt-2" style={{ color: 'var(--color-primary)' }}>Vue d'ensemble de votre activité SIKA INDUSTRIE</p>
        </div>
        <div className="flex items-center justify-start lg:justify-end">
          <SyncButton />
        </div>
      </div>

      {/* INDICATEUR BACKEND */}
      <div className="grid grid-cols-1 gap-4">
        <BackendStatusIndicator variant="full" />
      </div>

      {/* KPIs PRINCIPAUX */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-in">
        <div className="glass-panel p-6 rounded-xl shadow-lg border-l-4 glow-blue hover:scale-[1.02] hover:shadow-xl transition-all duration-300 ease-out cursor-pointer" style={{ borderColor: 'var(--color-primary)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Chiffre d'Affaires</p>
              <p className="text-2xl font-bold mt-2" style={{ color: 'var(--color-primary)' }}>
                {formatFCFA(stats.totalCA)}
              </p>
              <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-success)' }}>
                <TrendingUp size={14} className="inline mr-1" />
                +12% vs mois dernier
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: 'var(--color-surface-muted)' }}>
              <DollarSign size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl shadow-lg border-l-4 glow-blue hover:scale-[1.02] hover:shadow-xl transition-all duration-300 ease-out cursor-pointer" style={{ borderColor: 'var(--color-success)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Encaissé</p>
              <p className="text-2xl font-bold mt-2" style={{ color: 'var(--color-primary)' }}>
                {formatFCFA(stats.totalEncaisse)}
              </p>
              <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-success)' }}>
                {stats.tauxEncaissement.toFixed(1)}% du CA
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: '#E8F5E9' }}>
              <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl shadow-lg border-l-4 glow-blue hover:scale-[1.02] hover:shadow-xl transition-all duration-300 ease-out cursor-pointer" style={{ borderColor: 'var(--color-accent)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Reste à Encaisser</p>
              <p className="text-2xl font-bold mt-2" style={{ color: 'var(--color-primary)' }}>
                {formatFCFA(stats.totalRestant)}
              </p>
              <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-accent)' }}>
                {statsFactures.impayees} factures impayées
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: 'var(--color-accent-light)' }}>
              <Clock size={24} style={{ color: 'var(--color-accent)' }} />
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl shadow-lg border-l-4 glow-blue hover:scale-[1.02] hover:shadow-xl transition-all duration-300 ease-out cursor-pointer" style={{ borderColor: '#9C27B0' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Solde Caisse</p>
              <p className="text-2xl font-bold mt-2" style={{ color: 'var(--color-primary)' }}>
                {formatFCFA(stats.soldeCaisse)}
              </p>
              <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-primary)' }}>
                Disponible immédiatement
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: '#F3E5F5' }}>
              <FileText size={24} style={{ color: '#9C27B0' }} />
            </div>
          </div>
        </div>
      </div>

      {/* STATISTIQUES RAPIDES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl shadow-md text-center hover:scale-[1.03] hover:shadow-lg transition-all duration-300 ease-out cursor-pointer border-t-2" style={{ borderTopColor: 'var(--color-primary)' }}>
          <p className="text-3xl font-extrabold" style={{ color: 'var(--color-primary)' }}>{stats.nbClients}</p>
          <p className="text-xs font-semibold tracking-wider uppercase mt-1.5 text-slate-500">Clients</p>
        </div>
        <div className="glass-panel p-5 rounded-xl shadow-md text-center hover:scale-[1.03] hover:shadow-lg transition-all duration-300 ease-out cursor-pointer border-t-2" style={{ borderTopColor: 'var(--color-primary)' }}>
          <p className="text-3xl font-extrabold" style={{ color: 'var(--color-primary)' }}>{stats.nbProjets}</p>
          <p className="text-xs font-semibold tracking-wider uppercase mt-1.5 text-slate-500">Projets</p>
        </div>
        <div className="glass-panel p-5 rounded-xl shadow-md text-center hover:scale-[1.03] hover:shadow-lg transition-all duration-300 ease-out cursor-pointer border-t-2" style={{ borderTopColor: 'var(--color-primary)' }}>
          <p className="text-3xl font-extrabold" style={{ color: 'var(--color-primary)' }}>{stats.nbDevis}</p>
          <p className="text-xs font-semibold tracking-wider uppercase mt-1.5 text-slate-500">Devis</p>
        </div>
        <div className="glass-panel p-5 rounded-xl shadow-md text-center hover:scale-[1.03] hover:shadow-lg transition-all duration-300 ease-out cursor-pointer border-t-2" style={{ borderTopColor: 'var(--color-primary)' }}>
          <p className="text-3xl font-extrabold" style={{ color: 'var(--color-primary)' }}>{stats.nbAO}</p>
          <p className="text-xs font-semibold tracking-wider uppercase mt-1.5 text-slate-500">Appels d'Offres</p>
        </div>
      </div>

      {/* GRAPHIQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution CA */}
        <div className="glass-panel p-6 rounded-xl shadow-lg glow-blue hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Évolution du Chiffre d'Affaires</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={evolutionCA}>
              <defs>
                <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorEncaisse" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-muted)" />
              <XAxis dataKey="mois" stroke="var(--color-primary)" />
              <YAxis stroke="var(--color-primary)" tickFormatter={tickFormatterMillions} domain={[0, 'auto']} />
              <Tooltip formatter={tooltipFormatterFCFA} />
              <Legend />
              <Area type="monotone" dataKey="CA" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorCA)" />
              <Area type="monotone" dataKey="Encaissé" stroke="var(--color-success)" fillOpacity={1} fill="url(#colorEncaisse)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition Factures */}
        <div className="glass-panel p-6 rounded-xl shadow-lg glow-blue hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Répartition des Factures</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={repartitionFactures}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {repartitionFactures.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 Clients */}
        <div className="glass-panel p-6 rounded-xl shadow-lg glow-blue hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Top 5 Clients par CA</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topClients} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-muted)" />
              <XAxis type="number" stroke="var(--color-primary)" tickFormatter={tickFormatterMillions} domain={[0, 'auto']} />
              <YAxis type="category" dataKey="nom" stroke="var(--color-primary)" width={100} />
              <Tooltip formatter={tooltipFormatterFCFA} />
              <Bar dataKey="ca" fill="var(--color-accent)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition AO */}
        <div className="glass-panel p-6 rounded-xl shadow-lg glow-blue hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Appels d'Offres par Statut</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={repartitionAO}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-muted)" />
              <XAxis dataKey="name" stroke="var(--color-primary)" />
              <YAxis stroke="var(--color-primary)" domain={[0, 'auto']} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {repartitionAO.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ALERTES ET ACTIONS RAPIDES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-xl shadow-lg glow-blue hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <AlertTriangle size={20} style={{ color: 'var(--color-accent)' }} />
            Alertes et Notifications
          </h3>
          <div className="space-y-3">
            {statsFactures.impayees > 0 && (
              <div className="p-3.5 rounded-lg flex items-center justify-between transition-all duration-300 hover:shadow-md border-l-4 border-red-600 bg-red-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse bg-red-600"></div>
                  <span className="font-medium text-slate-800" style={{ color: 'var(--color-primary)' }}>{statsFactures.impayees} facture(s) impayée(s)</span>
                </div>
                <button 
                  onClick={() => navigate('/factures')}
                  className="text-sm font-bold hover:underline py-1 px-3 rounded bg-red-600/10" 
                  style={{ color: 'var(--color-accent)' }}
                >
                  Voir →
                </button>
              </div>
            )}
            {statsAO.aChiffrer > 0 && (
              <div className="p-3.5 rounded-lg flex items-center justify-between transition-all duration-300 hover:shadow-md border-l-4 border-navy bg-navy/10">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse bg-primary"></div>
                  <span className="font-medium text-slate-800" style={{ color: 'var(--color-primary)' }}>{statsAO.aChiffrer} AO à chiffrer</span>
                </div>
                <button 
                  onClick={() => navigate('/ao')}
                  className="text-sm font-bold hover:underline py-1 px-3 rounded bg-[var(--color-primary)]/10" 
                  style={{ color: 'var(--color-primary)' }}
                >
                  Voir →
                </button>
              </div>
            )}
            <div className="p-3.5 rounded-lg flex items-center justify-between border-l-4 border-[var(--color-success)] bg-[var(--color-success)]/10">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-success"></div>
                <span className="font-medium text-slate-800" style={{ color: 'var(--color-primary)' }}>Tout est à jour !</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl shadow-lg glow-blue hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Actions Rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate('/devis/liste')}
              className="p-4 rounded-xl text-left border border-slate-200/50 hover:border-slate-300 hover:scale-[1.03] hover:shadow-md transition-all duration-300" 
              style={{ backgroundColor: 'var(--color-surface-muted)' }}
            >
              <p className="text-2xl mb-2">📋</p>
              <p className="font-semibold text-sm tracking-wide" style={{ color: 'var(--color-primary)' }}>Nouveau Devis</p>
            </button>
            <button 
              onClick={() => navigate('/factures')}
              className="p-4 rounded-xl text-left border border-slate-200/50 hover:border-slate-300 hover:scale-[1.03] hover:shadow-md transition-all duration-300" 
              style={{ backgroundColor: 'var(--color-accent-light)' }}
            >
              <p className="text-2xl mb-2">🧾</p>
              <p className="font-semibold text-sm tracking-wide" style={{ color: 'var(--color-primary)' }}>Nouvelle Facture</p>
            </button>
            <button 
              onClick={() => navigate('/encaissements')}
              className="p-4 rounded-xl text-left border border-slate-200/50 hover:border-slate-300 hover:scale-[1.03] hover:shadow-md transition-all duration-300" 
              style={{ backgroundColor: '#E8F5E9' }}
            >
              <p className="text-2xl mb-2">💰</p>
              <p className="font-semibold text-sm tracking-wide" style={{ color: 'var(--color-primary)' }}>Encaissement</p>
            </button>
            <button 
              onClick={() => navigate('/planification')}
              className="p-4 rounded-xl text-left border border-slate-200/50 hover:border-slate-300 hover:scale-[1.03] hover:shadow-md transition-all duration-300" 
              style={{ backgroundColor: '#F3E5F5' }}
            >
              <p className="text-2xl mb-2">🚀</p>
              <p className="font-semibold text-sm tracking-wide" style={{ color: 'var(--color-primary)' }}>Nouveau Projet</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
