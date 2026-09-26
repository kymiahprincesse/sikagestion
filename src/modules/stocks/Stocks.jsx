import React, { useEffect, useState, useMemo } from 'react';
import { useStocksStore } from '../../store/useStocksStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { formatFCFA } from '../../utils/format';

export default function Stocks() {
  const { stocks, fetchStocks, ajouterStock, modifierStock, supprimerStock } = useStocksStore();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ nom: '', reference: '', categorie: 'TÃ´le', quantite: 0, seuilAlerte: 5, prixUnitaire: 0, unite: 'UnitÃ©' });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const stats = useMemo(() => {
    const totalValeur = stocks.reduce((sum, item) => sum + ((item.quantite || 0) * (item.prixUnitaire || 0)), 0);
    const enAlerte = stocks.filter(item => item.quantite <= item.seuilAlerte).length;
    return { totalValeur, enAlerte };
  }, [stocks]);

  const handleSave = () => {
    if (editId) modifierStock(editId, formData);
    else ajouterStock(formData);
    setShowModal(false);
    setEditId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>Gestion des Stocks</h1>
          <p className="text-gray-500">MatiÃ¨res premiÃ¨res et consommables (Fallback actif hors-ligne)</p>
        </div>
        <button onClick={() => { setFormData({ nom: '', reference: '', categorie: 'TÃ´le', quantite: 0, seuilAlerte: 5, prixUnitaire: 0, unite: 'UnitÃ©' }); setEditId(null); setShowModal(true); }} className="bg-[var(--color-accent)] text-white px-4 py-2 rounded-lg font-bold shadow-md hover:scale-105 transition-all">
          + Ajouter un Article
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-xl border-l-4 border-[var(--color-primary)] shadow-lg">
          <div className="flex items-center gap-4">
            <Package size={32} style={{ color: 'var(--color-primary)' }} />
            <div><p className="text-sm text-gray-500">Articles RÃ©fÃ©rencÃ©s</p><h3 className="text-2xl font-bold">{stocks.length}</h3></div>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-xl border-l-4 border-red-500 bg-red-50/50 shadow-lg">
          <div className="flex items-center gap-4">
            <AlertTriangle size={32} className="text-red-500" />
            <div><p className="text-sm text-red-600 font-semibold">Ruptures & Alertes</p><h3 className="text-2xl font-bold text-red-600">{stats.enAlerte} articles</h3></div>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-xl border-l-4 border-[var(--color-success)] shadow-lg">
          <div className="flex items-center gap-4">
            <TrendingUp size={32} style={{ color: 'var(--color-success)' }} />
            <div><p className="text-sm text-gray-500">Valeur d'Inventaire</p><h3 className="text-2xl font-bold">{formatFCFA(stats.totalValeur)}</h3></div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
              <th className="p-4 border-b border-gray-200">RÃ©fÃ©rence</th>
              <th className="p-4 border-b border-gray-200">Nom de l'article</th>
              <th className="p-4 border-b border-gray-200">CatÃ©gorie</th>
              <th className="p-4 border-b border-gray-200">QuantitÃ©</th>
              <th className="p-4 border-b border-gray-200">Statut</th>
              <th className="p-4 border-b border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map(item => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                <td className="p-4 font-mono text-sm">{item.reference || '-'}</td>
                <td className="p-4 font-bold">{item.nom}</td>
                <td className="p-4"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{item.categorie}</span></td>
                <td className="p-4 font-bold">{item.quantite} {item.unite}</td>
                <td className="p-4">
                  {item.quantite <= item.seuilAlerte ? 
                    <span className="text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-bold flex items-center w-max gap-1"><AlertTriangle size={12}/> Alerte Stock</span> : 
                    <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold">En stock</span>}
                </td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => { setFormData(item); setEditId(item.id); setShowModal(true); }} className="text-blue-500 hover:underline text-sm font-semibold">Modifier</button>
                  <button onClick={() => supprimerStock(item.id)} className="text-red-500 hover:underline text-sm font-semibold">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {stocks.length === 0 && <div className="p-8 text-center text-gray-500 font-medium">Aucun article dans l'inventaire. Cliquez sur "Ajouter un Article" pour commencer.</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>{editId ? 'Modifier Article' : 'Nouvel Article'}</h2>
            <div className="space-y-4">
              <input type="text" placeholder="RÃ©fÃ©rence (ex: TOL-001)" value={formData.reference} onChange={e=>setFormData({...formData, reference: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-[var(--color-accent)]" />
              <input type="text" placeholder="Nom complet (ex: TÃ´le Acier 5mm)" value={formData.nom} onChange={e=>setFormData({...formData, nom: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-[var(--color-accent)]" />
              <select value={formData.categorie} onChange={e=>setFormData({...formData, categorie: e.target.value})} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-[var(--color-accent)] bg-white">
                <option>TÃ´le</option><option>Tuyau</option><option>Vanne</option><option>Consommable (Soudure)</option><option>Autre</option>
              </select>
              <div className="flex gap-4">
                <input type="number" placeholder="QuantitÃ© en stock" value={formData.quantite} onChange={e=>setFormData({...formData, quantite: parseFloat(e.target.value)})} className="w-1/2 p-3 border border-gray-200 rounded-lg outline-none focus:border-[var(--color-accent)]" />
                <input type="text" placeholder="UnitÃ© (ex: kg, pce)" value={formData.unite} onChange={e=>setFormData({...formData, unite: e.target.value})} className="w-1/2 p-3 border border-gray-200 rounded-lg outline-none focus:border-[var(--color-accent)]" />
              </div>
              <div className="flex gap-4">
                <input type="number" placeholder="Seuil Alerte" value={formData.seuilAlerte} onChange={e=>setFormData({...formData, seuilAlerte: parseFloat(e.target.value)})} className="w-1/2 p-3 border border-gray-200 rounded-lg outline-none focus:border-[var(--color-accent)]" />
                <input type="number" placeholder="Prix Unitaire FCFA" value={formData.prixUnitaire} onChange={e=>setFormData({...formData, prixUnitaire: parseFloat(e.target.value)})} className="w-1/2 p-3 border border-gray-200 rounded-lg outline-none focus:border-[var(--color-accent)]" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg transition">Annuler</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-[var(--color-accent)] hover:scale-105 text-white font-bold rounded-lg shadow-md transition">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
