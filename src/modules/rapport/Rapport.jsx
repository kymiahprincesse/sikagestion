import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useFacturesStore } from '../../store/useFacturesStore'
import { useDevisStore } from '../../store/useDevisStore'
import { useAOStore } from '../../store/useAOStore'
import { usePlanificationStore } from '../../store/usePlanificationStore'
import { useCaisseStore } from '../../store/useCaisseStore'
import { useClientsStore } from '../../store/useClientsStore'
import { formatFCFA, formatNumberPoints } from '../../utils/format'
import { isDevisEnAttente, isDevisVisibleDansListe } from '../../utils/devisStatus'

const COULEURS = ['var(--color-primary)', 'var(--color-accent)', 'var(--color-secondary)', 'var(--color-success)', 'var(--color-border)', 'var(--color-surface-muted)']

function KpiCard({ titre, valeur, sous, couleur, icone, onClick }) {
  return (
    <div
      className={`bg-surface rounded-xl p-5 shadow-sm border-l-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      style={{ borderLeftColor: couleur }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icone}</span>
        <span className="text-xs font-semibold px-2 py-1 rounded-full text-white" style={{ backgroundColor: couleur }}>
          {titre}
        </span>
      </div>
      <p className="text-2xl font-bold mt-1" style={{ color: couleur }}>{valeur}</p>
      {sous && <p className="text-xs mt-1" style={{ color: 'var(--color-secondary)' }}>{sous}</p>}
    </div>
  )
}

export default function Rapport() {
  const navigate = useNavigate()
  const factures = useFacturesStore(s => s.factures)
  const devis = useDevisStore(s => s.devis)
  const ao = useAOStore(s => s.appelsDoffres)
  const projets = usePlanificationStore(s => s.projets)
  const mouvements = useCaisseStore(s => s.mouvements || [])
  const clients = useClientsStore(s => s.clients)

  const kpis = useMemo(() => {
    const totalCA = factures.reduce((s, f) => s + (f.montantTTC || 0), 0)
    const totalEncaisse = factures.reduce((s, f) => s + (f.montantPaye || 0), 0)
    const resteAEncaisser = totalCA - totalEncaisse
    const facturesEnRetard = factures.filter(f => {
      if (f.statut === 'PAYEE' || f.statut === 'ANNULEE') return false
      if (!f.dateEcheance) return false
      return new Date(f.dateEcheance) < new Date()
    })
    const totalSoldeCaisse = mouvements.reduce((s, m) =>
      m.type === 'ENTREE' ? s + m.montant : s - m.montant, 0)
    const tauxEncaissement = totalCA > 0 ? Math.round((totalEncaisse / totalCA) * 100) : 0
    const statsAO = {
      total: ao.length,
      gagne: ao.filter(a => a.statut === 'GAGNE').length,
      perdu: ao.filter(a => a.statut === 'PERDU').length,
    }
    const tauxReussiteAO = (statsAO.gagne + statsAO.perdu) > 0
      ? Math.round((statsAO.gagne / (statsAO.gagne + statsAO.perdu)) * 100) : 0
    return { totalCA, totalEncaisse, resteAEncaisser, facturesEnRetard, totalSoldeCaisse, tauxEncaissement, tauxReussiteAO, statsAO }
  }, [factures, ao, mouvements])

  const evolutionCA = useMemo(() => {
    const moisLabels = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      moisLabels.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      })
    }
    return moisLabels.map(({ key, label }) => {
      const ca = factures
        .filter(f => f.dateDepot?.startsWith(key))
        .reduce((s, f) => s + (f.montantTTC || 0), 0)
      const encaisse = factures
        .filter(f => f.dateDepot?.startsWith(key))
        .reduce((s, f) => s + (f.montantPaye || 0), 0)
      return { mois: label, CA: Math.round(ca / 1000), Encaissé: Math.round(encaisse / 1000) }
    })
  }, [factures])

  const devisVisibles = useMemo(() => devis.filter(isDevisVisibleDansListe), [devis])

  const devisParType = useMemo(() => {
    const types = {}
    devisVisibles.forEach(d => {
      const t = d.typeDevis || d.type || 'AUTRE'
      types[t] = (types[t] || 0) + 1
    })
    return Object.entries(types).map(([name, value]) => ({ name, value }))
  }, [devisVisibles])

  const budgetVsReel = useMemo(() =>
    projets
      .filter(p => p.budgetPrevu > 0)
      .slice(0, 8)
      .map(p => ({
        nom: p.nom?.length > 16 ? p.nom.slice(0, 14) + '…' : p.nom,
        Prévu: Math.round((p.budgetPrevu || 0) / 1000),
        Réel: Math.round((p.coutReel || 0) / 1000),
      })), [projets])

  const facturesEnRetardTop = kpis.facturesEnRetard
    .sort((a, b) => (b.montantTTC - b.montantPaye) - (a.montantTTC - a.montantPaye))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Rapport de synthèse</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-secondary)' }}>Vue consolidée — {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titre="Chiffre d'affaires"
          valeur={formatFCFA(kpis.totalCA)}
          sous={`Taux encaissement : ${kpis.tauxEncaissement}%`}
          couleur="var(--color-primary)"
          icone="📊"
          onClick={() => navigate('/factures')}
        />
        <KpiCard
          titre="Encaissé"
          valeur={formatFCFA(kpis.totalEncaisse)}
          sous={`Reste : ${formatFCFA(kpis.resteAEncaisser)}`}
          couleur="var(--color-success)"
          icone="✅"
          onClick={() => navigate('/encaissements')}
        />
        <KpiCard
          titre="Factures en retard"
          valeur={kpis.facturesEnRetard.length}
          sous={kpis.facturesEnRetard.length > 0 ? `⚠️ ${formatFCFA(kpis.facturesEnRetard.reduce((s,f) => s+(f.montantTTC - (f.montantPaye||0)), 0))} impayé` : 'Aucun retard'}
          couleur={kpis.facturesEnRetard.length > 0 ? 'var(--color-accent)' : 'var(--color-success)'}
          icone="🔴"
          onClick={() => navigate('/factures')}
        />
        <KpiCard
          titre="Solde caisse"
          valeur={formatFCFA(kpis.totalSoldeCaisse)}
          sous={`${mouvements.filter(m => m.type === 'ENTREE').length} entrées · ${mouvements.filter(m => m.type === 'SORTIE').length} sorties`}
          couleur="var(--color-secondary)"
          icone="🏦"
          onClick={() => navigate('/journal')}
        />
      </div>

      {/* Ligne 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titre="Clients actifs"
          valeur={clients.filter(c => c.isActif !== false).length}
          sous={`${clients.length} clients total`}
          couleur="var(--color-primary)"
          icone="👥"
          onClick={() => navigate('/clients')}
        />
        <KpiCard
          titre="Projets en cours"
          valeur={projets.filter(p => p.statut === 'EN_COURS').length}
          sous={`${projets.length} projets total`}
          couleur="var(--color-secondary)"
          icone="🚀"
          onClick={() => navigate('/planification')}
        />
        <KpiCard
          titre="Devis en attente"
          valeur={devisVisibles.filter(d => isDevisEnAttente(d.statut)).length}
          sous={`${devisVisibles.length} devis visibles`}
          couleur="var(--color-accent)"
          icone="📄"
          onClick={() => navigate('/devis/liste')}
        />
        <KpiCard
          titre="AO — Taux réussite"
          valeur={`${kpis.tauxReussiteAO}%`}
          sous={`${kpis.statsAO.gagne} gagnés / ${kpis.statsAO.total} total`}
          couleur="var(--color-success)"
          icone="🎯"
          onClick={() => navigate('/ao')}
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Évolution CA */}
        <div className="bg-surface rounded-xl p-5 shadow-sm">
          <h2 className="font-bold mb-4 text-sm uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
            Évolution CA — 6 derniers mois (milliers FCFA)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolutionCA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-muted)" />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${formatNumberPoints(v)} K FCFA`} />
              <Legend />
              <Line type="monotone" dataKey="CA" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Encaissé" stroke="var(--color-success)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Devis par type */}
        <div className="bg-surface rounded-xl p-5 shadow-sm">
          <h2 className="font-bold mb-4 text-sm uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
            Répartition devis par type
          </h2>
          {devisParType.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={devisParType}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                >
                  {devisParType.map((item, i) => (
                    <Cell key={`cell-${item.name}-${i}`} fill={COULEURS[i % COULEURS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--color-border)' }}>
              Aucun devis enregistré
            </div>
          )}
        </div>

        {/* Budget vs Réel projets */}
        <div className="bg-surface rounded-xl p-5 shadow-sm lg:col-span-2">
          <h2 className="font-bold mb-4 text-sm uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
            Budget vs Réel par projet (milliers FCFA)
          </h2>
          {budgetVsReel.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={budgetVsReel} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-muted)" />
                <XAxis dataKey="nom" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${formatNumberPoints(v)} K FCFA`} />
                <Legend />
                <Bar dataKey="Prévu" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Réel" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--color-border)' }}>
              Aucun projet avec budget enregistré
            </div>
          )}
        </div>
      </div>

      {/* Factures en retard */}
      {facturesEnRetardTop.length > 0 && (
        <div className="bg-surface rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--color-surface-muted)' }}>
            <h2 className="font-bold text-sm uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
              🔴 Factures en retard de paiement ({kpis.facturesEnRetard.length})
            </h2>
            <button
              onClick={() => navigate('/factures')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Voir toutes
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-surface-muted)' }}>
                <tr>
                  {['Facture', 'Client', 'Montant TTC', 'Payé', 'Reste', 'Échéance'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold uppercase" style={{ color: 'var(--color-primary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {facturesEnRetardTop.map((f, i) => {
                  const reste = f.montantTTC - (f.montantPaye || 0)
                  const joursRetard = f.dateEcheance
                    ? Math.floor((new Date() - new Date(f.dateEcheance)) / 86400000)
                    : 0
                  return (
                    <tr key={f.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#F8F9FC' }}>
                      <td className="px-4 py-2 font-medium" style={{ color: 'var(--color-primary)' }}>{f.numero || `#${f.id}`}</td>
                      <td className="px-4 py-2" style={{ color: 'var(--color-secondary)' }}>{f.clientNom || '—'}</td>
                      <td className="px-4 py-2">{formatFCFA(f.montantTTC)}</td>
                      <td className="px-4 py-2 text-green-600">{formatFCFA(f.montantPaye || 0)}</td>
                      <td className="px-4 py-2 font-bold" style={{ color: 'var(--color-accent)' }}>{formatFCFA(reste)}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--color-accent)' }}>
                          +{joursRetard}j
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
