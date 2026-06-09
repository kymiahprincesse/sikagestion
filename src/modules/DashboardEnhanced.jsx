import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFacturesStore } from '../store/useFacturesStore'
import { useDevisStore } from '../store/useDevisStore'
import { useAOStore } from '../store/useAOStore'
import { usePlanificationStore } from '../store/usePlanificationStore'
import { useCaisseStore } from '../store/useCaisseStore'
import { useClientsStore } from '../store/useClientsStore'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, FileText, Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { formatFCFA } from '../utils/format'
import BackendStatusIndicator from '../components/BackendStatusIndicator'
import SyncButton from '../components/SyncButton'

export default function DashboardEnhanced() {
  const navigate = useNavigate()
  
  let facturesStore, devisStore, aoStore, planificationStore, caisseStore, clientsStore

  try {
    facturesStore = useFacturesStore()
    devisStore = useDevisStore()
    aoStore = useAOStore()
    planificationStore = usePlanificationStore()
    caisseStore = useCaisseStore()
    clientsStore = useClientsStore()
  } catch (error) {
    console.error('Erreur lors du chargement des stores:', error)
    return (
      <div className="p-8">
        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#E60000' }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#E60000' }}>Erreur de chargement</h2>
          <p style={{ color: '#06006E' }}>Une erreur est survenue lors du chargement du tableau de bord.</p>
          <p className="text-sm mt-2" style={{ color: '#06006E' }}>{error.message}</p>
        </div>
      </div>
    )
  }

  // Sécurité : vérifier que les stores sont bien chargés
  const factures = facturesStore?.factures || []
  const devis = devisStore?.devis || []
  const appelsDoffres = aoStore?.appelsDoffres || []
  const projets = planificationStore?.projets || []
  const clients = clientsStore?.clients || []
  const soldeCaisse = caisseStore?.soldeCaisse || 0

  const getStatsFactures = facturesStore?.getStatistiques || (() => ({ payees: 0, partielles: 0, impayees: 0 }))
  const getStatsAO = aoStore?.getStatistiques || (() => ({ aChiffrer: 0, enAttente: 0, soumis: 0, gagne: 0, perdu: 0 }))

  const statsFactures = getStatsFactures()
  const statsAO = getStatsAO()

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
      nbDevis: devis.length,
      nbAO: appelsDoffres.length,
      nbProjets: projets.length,
      nbClients: clients.length,
      soldeCaisse: soldeCaisse || 0
    }
  }, [factures, devis, appelsDoffres, projets, clients, soldeCaisse])

  // Évolution CA par mois (6 derniers mois)
  const evolutionCA = useMemo(() => {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin']
    const anneeCourante = new Date().getFullYear()
    
    return mois.map((m, i) => {
      const moisNum = String(i + 1).padStart(2, '0')
      const prefixeMois = `${anneeCourante}-${moisNum}`
      
      // Calculer CA et encaissement réels pour ce mois
      const facturesMois = factures.filter(f => f.date?.startsWith(prefixeMois) || f.dateDepot?.startsWith(prefixeMois))
      const ca = facturesMois.reduce((sum, f) => sum + (f.montantTTC || 0), 0)
      const encaisse = facturesMois.reduce((sum, f) => sum + (f.montantPaye || 0), 0)
      
      return {
        mois: m,
        CA: ca,
        Encaissé: encaisse
      }
    })
  }, [factures])

  // Répartition factures par statut
  const repartitionFactures = useMemo(() => {
    return [
      { name: 'Payées', value: statsFactures.payees, color: '#1A7A4A' },
      { name: 'Partielles', value: statsFactures.partielles, color: '#E60000' },
      { name: 'Impayées', value: statsFactures.impayees, color: '#E60000' }
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
      { name: 'À chiffrer', value: statsAO.aChiffrer, color: '#06006E' },
      { name: 'En attente', value: statsAO.enAttente, color: '#E60000' },
      { name: 'Soumis', value: statsAO.soumis, color: '#9C27B0' },
      { name: 'Gagné', value: statsAO.gagne, color: '#1A7A4A' },
      { name: 'Perdu', value: statsAO.perdu, color: '#E60000' }
    ]
  }, [statsAO])

  // Projets par statut
  const projetsParStatut = useMemo(() => {
    const statuts = {}
    projets.forEach(p => {
      statuts[p.statut] = (statuts[p.statut] || 0) + 1
    })
    return Object.entries(statuts).map(([statut, count]) => ({
      statut,
      count
    }))
  }, [projets])

  return (
    <div className="space-y-6">
      {/* HEADER avec Horloge */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#06006E' }}>Tableau de Bord</h1>
          <p className="text-lg mt-2" style={{ color: '#06006E' }}>Vue d'ensemble de votre activité SIKA INDUSTRIE</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#06006E' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#06006E' }}>Chiffre d'Affaires</p>
              <p className="text-2xl font-bold mt-2" style={{ color: '#06006E' }}>
                {formatFCFA(stats.totalCA)}
              </p>
              <p className="text-xs mt-1" style={{ color: '#1A7A4A' }}>
                <TrendingUp size={14} className="inline mr-1" />
                +12% vs mois dernier
              </p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8ECF4' }}>
              <DollarSign size={24} style={{ color: '#06006E' }} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#1A7A4A' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#1A7A4A' }}>Encaissé</p>
              <p className="text-2xl font-bold mt-2" style={{ color: '#06006E' }}>
                {formatFCFA(stats.totalEncaisse)}
              </p>
              <p className="text-xs mt-1" style={{ color: '#1A7A4A' }}>
                {stats.tauxEncaissement.toFixed(1)}% du CA
              </p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E9' }}>
              <CheckCircle size={24} style={{ color: '#1A7A4A' }} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#E60000' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#E60000' }}>Reste à Encaisser</p>
              <p className="text-2xl font-bold mt-2" style={{ color: '#06006E' }}>
                {formatFCFA(stats.totalRestant)}
              </p>
              <p className="text-xs mt-1" style={{ color: '#E60000' }}>
                {statsFactures.impayees} factures impayées
              </p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFE6E6' }}>
              <Clock size={24} style={{ color: '#E60000' }} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#9C27B0' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#9C27B0' }}>Solde Caisse</p>
              <p className="text-2xl font-bold mt-2" style={{ color: '#06006E' }}>
                {formatFCFA(stats.soldeCaisse)}
              </p>
              <p className="text-xs mt-1" style={{ color: '#06006E' }}>
                Disponible immédiatement
              </p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3E5F5' }}>
              <FileText size={24} style={{ color: '#9C27B0' }} />
            </div>
          </div>
        </div>
      </div>

      {/* STATISTIQUES RAPIDES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-3xl font-bold" style={{ color: '#06006E' }}>{stats.nbClients}</p>
          <p className="text-sm mt-1" style={{ color: '#06006E' }}>Clients</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-3xl font-bold" style={{ color: '#06006E' }}>{stats.nbProjets}</p>
          <p className="text-sm mt-1" style={{ color: '#06006E' }}>Projets</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-3xl font-bold" style={{ color: '#06006E' }}>{stats.nbDevis}</p>
          <p className="text-sm mt-1" style={{ color: '#06006E' }}>Devis</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-3xl font-bold" style={{ color: '#06006E' }}>{stats.nbAO}</p>
          <p className="text-sm mt-1" style={{ color: '#06006E' }}>Appels d'Offres</p>
        </div>
      </div>

      {/* GRAPHIQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution CA */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#06006E' }}>Évolution du Chiffre d'Affaires</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={evolutionCA}>
              <defs>
                <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06006E" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#06006E" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorEncaisse" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A7A4A" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#1A7A4A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF4" />
              <XAxis dataKey="mois" stroke="#06006E" />
              <YAxis stroke="#06006E" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(value) => formatFCFA(value)} />
              <Legend />
              <Area type="monotone" dataKey="CA" stroke="#06006E" fillOpacity={1} fill="url(#colorCA)" />
              <Area type="monotone" dataKey="Encaissé" stroke="#1A7A4A" fillOpacity={1} fill="url(#colorEncaisse)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition Factures */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#06006E' }}>Répartition des Factures</h3>
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
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#06006E' }}>Top 5 Clients par CA</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topClients} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF4" />
              <XAxis type="number" stroke="#06006E" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
              <YAxis type="category" dataKey="nom" stroke="#06006E" width={100} />
              <Tooltip formatter={(value) => formatFCFA(value)} />
              <Bar dataKey="ca" fill="#E60000" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition AO */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#06006E' }}>Appels d'Offres par Statut</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={repartitionAO}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF4" />
              <XAxis dataKey="name" stroke="#06006E" />
              <YAxis stroke="#06006E" />
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
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#06006E' }}>
            <AlertTriangle size={20} style={{ color: '#E60000' }} />
            Alertes et Notifications
          </h3>
          <div className="space-y-3">
            {statsFactures.impayees > 0 && (
              <div className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#FFE6E6' }}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E60000' }}></div>
                  <span style={{ color: '#06006E' }}>{statsFactures.impayees} facture(s) impayée(s)</span>
                </div>
                <button 
                  onClick={() => navigate('/factures')}
                  className="text-sm font-semibold hover:underline" 
                  style={{ color: '#E60000' }}
                >
                  Voir →
                </button>
              </div>
            )}
            {statsAO.aChiffrer > 0 && (
              <div className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#E8ECF4' }}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#06006E' }}></div>
                  <span style={{ color: '#06006E' }}>{statsAO.aChiffrer} AO à chiffrer</span>
                </div>
                <button 
                  onClick={() => navigate('/ao')}
                  className="text-sm font-semibold hover:underline" 
                  style={{ color: '#06006E' }}
                >
                  Voir →
                </button>
              </div>
            )}
            <div className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#E8F5E9' }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#1A7A4A' }}></div>
                <span style={{ color: '#06006E' }}>Tout est à jour !</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#06006E' }}>Actions Rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate('/devis/liste')}
              className="p-4 rounded-lg text-left transition-all hover:shadow-md" 
              style={{ backgroundColor: '#E8ECF4' }}
            >
              <p className="text-2xl mb-2">📋</p>
              <p className="font-semibold" style={{ color: '#06006E' }}>Nouveau Devis</p>
            </button>
            <button 
              onClick={() => navigate('/factures')}
              className="p-4 rounded-lg text-left transition-all hover:shadow-md" 
              style={{ backgroundColor: '#FFE6E6' }}
            >
              <p className="text-2xl mb-2">🧾</p>
              <p className="font-semibold" style={{ color: '#06006E' }}>Nouvelle Facture</p>
            </button>
            <button 
              onClick={() => navigate('/encaissements')}
              className="p-4 rounded-lg text-left transition-all hover:shadow-md" 
              style={{ backgroundColor: '#E8F5E9' }}
            >
              <p className="text-2xl mb-2">💰</p>
              <p className="font-semibold" style={{ color: '#06006E' }}>Encaissement</p>
            </button>
            <button 
              onClick={() => navigate('/planification')}
              className="p-4 rounded-lg text-left transition-all hover:shadow-md" 
              style={{ backgroundColor: '#F3E5F5' }}
            >
              <p className="text-2xl mb-2">🚀</p>
              <p className="font-semibold" style={{ color: '#06006E' }}>Nouveau Projet</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
