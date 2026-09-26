import React, { useMemo } from 'react';
import { useDevisStore } from '../../store/useDevisStore';
import { useClientsStore } from '../../store/useClientsStore';
import { useCaisseStore } from '../../store/useCaisseStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { BrainCircuit, TrendingUp, AlertTriangle, Target, Lightbulb, Zap } from 'lucide-react';
import { formatFCFA } from '../../utils/format';
import { format, parseISO, subMonths, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#2b3a67', '#e84855', '#32a852', '#f9a03f', '#8e44ad', '#3498db'];

export default function SikaIntelligence() {
  const devis = useDevisStore(state => state.devis);
  const clients = useClientsStore(state => state.clients);
  const transactions = useCaisseStore(state => state.transactions);

  // --- ANALYSE IA (Local Compute) ---
  const insights = useMemo(() => {
    if (!devis || devis.length === 0) return { aiMessage: "Pas assez de donnÃ©es pour l'analyse.", warnings: [], metrics: {} };

    let totalDevis = devis.length;
    let devisAccepte = devis.filter(d => d.statut === 'ACCEPTE' || d.statut === 'FACTURE');
    let totalChiffreAffaire = devisAccepte.reduce((sum, d) => sum + (d.montant_ttc || 0), 0);
    let conversionRate = totalDevis > 0 ? (devisAccepte.length / totalDevis) * 100 : 0;

    // Analyse par service
    const serviceMap = {};
    devisAccepte.forEach(d => {
      serviceMap[d.service] = (serviceMap[d.service] || 0) + (d.montant_ttc || 0);
    });
    const bestService = Object.keys(serviceMap).sort((a,b) => serviceMap[b] - serviceMap[a])[0];

    // TrÃ©sorerie (30 derniers jours)
    const thirtyDaysAgo = subMonths(new Date(), 1);
    let recentCashIn = 0;
    let recentCashOut = 0;
    (transactions || []).filter(t => isAfter(parseISO(t.date), thirtyDaysAgo)).forEach(t => {
      if (t.type === 'ENTREE') recentCashIn += t.montant;
      else recentCashOut += t.montant;
    });

    let warnings = [];
    if (conversionRate < 40) warnings.push("Taux de conversion faible. RÃ©visez vos relances clients.");
    if (recentCashOut > recentCashIn) warnings.push("Attention : DÃ©penses supÃ©rieures aux rentrÃ©es ce mois-ci.");

    // GÃ©nÃ©ration du message "IA"
    let aiMessage = "Tout semble au vert !";
    if (conversionRate >= 70) aiMessage = "Excellente dynamique commerciale. Pensez Ã  sÃ©curiser vos stocks pour rÃ©pondre Ã  la demande.";
    else if (bestService) aiMessage = `Votre service "${bestService}" porte votre chiffre d'affaires. Envisagez une promotion ciblÃ©e sur ce secteur.`;

    // Data for charts
    const chartServices = Object.entries(serviceMap).map(([name, value]) => ({ name, value }));

    return {
      aiMessage,
      warnings,
      metrics: {
        totalChiffreAffaire,
        conversionRate: conversionRate.toFixed(1),
        bestService,
        recentCashIn,
        recentCashOut,
        cashFlow: recentCashIn - recentCashOut
      },
      chartServices
    };
  }, [devis, transactions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b pb-4 border-gray-200">
        <div className="p-3 bg-purple-100 rounded-xl">
          <BrainCircuit size={32} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Sika Intelligence</h1>
          <p className="text-gray-500">Votre Assistant StratÃ©gique & Analytique</p>
        </div>
      </div>

      {/* MESSAGE IA PRINCIPAL */}
      <div className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-10">
          <BrainCircuit size={150} />
        </div>
        <h3 className="flex items-center gap-2 text-purple-800 font-bold text-lg mb-2"><Zap className="text-purple-600"/> Recommandation de l'IA</h3>
        <p className="text-gray-700 text-lg leading-relaxed">{insights.aiMessage}</p>
        
        {insights.warnings.length > 0 && (
          <div className="mt-4 pt-4 border-t border-purple-200 space-y-2">
            {insights.warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
                <AlertTriangle size={16} /> {w}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* METRIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm mb-1">Taux de Conversion</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-bold text-blue-600">{insights.metrics.conversionRate}%</h3>
            <Target size={20} className="text-blue-400 mb-1" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm mb-1">Meilleur Service</p>
          <div className="flex items-end gap-2">
            <h3 className="text-xl font-bold text-gray-800 truncate">{insights.metrics.bestService || '-'}</h3>
            <Lightbulb size={20} className="text-yellow-500 mb-1" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm mb-1">Cash Flow (30j)</p>
          <div className="flex items-end gap-2">
            <h3 className={`text-2xl font-bold ${insights.metrics.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatFCFA(insights.metrics.cashFlow)}
            </h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm mb-1">CA SÃ©curisÃ© (Global)</p>
          <h3 className="text-2xl font-bold text-indigo-600">{formatFCFA(insights.metrics.totalChiffreAffaire)}</h3>
        </div>
      </div>

      {/* GRAPHES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">RÃ©partition du CA par Service</h3>
          <div className="h-[300px]">
            {insights.chartServices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={insights.chartServices} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {insights.chartServices.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatFCFA(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">Aucune donnÃ©e</div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">PrÃ©dictions & OpportunitÃ©s</h3>
          <ul className="space-y-4">
            <li className="flex gap-4 items-start">
              <div className="bg-green-100 p-2 rounded-lg text-green-600 mt-1"><TrendingUp size={20}/></div>
              <div>
                <h4 className="font-bold text-gray-800">Croissance estimÃ©e</h4>
                <p className="text-sm text-gray-600">BasÃ© sur vos devis en attente, vous pourriez sÃ©curiser jusqu'Ã  {formatFCFA(devis.filter(d=>d.statut==='BROUILLON' || d.statut==='VALIDE').reduce((s,d)=>s+(d.montant_ttc||0),0))} supplÃ©mentaires ce trimestre.</p>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mt-1"><Target size={20}/></div>
              <div>
                <h4 className="font-bold text-gray-800">Action recommandÃ©e</h4>
                <p className="text-sm text-gray-600">Contactez les clients ayant reÃ§u un devis depuis plus de 7 jours. {devis.filter(d=>d.statut==='VALIDE').length} devis sont actuellement en attente de rÃ©ponse.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
