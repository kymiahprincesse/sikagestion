import { useState, useEffect, useCallback } from 'react';
import { useDevisStore } from '../store/useDevisStore';
import { useClientsStore } from '../store/useClientsStore';
import { X, Merge, Trash2, AlertTriangle, CheckCircle, Search, Filter } from 'lucide-react';
import { formatFCFA, formatDate } from '../utils/format';

/**
 * Composant de gestion des doublons pour les devis
 * Permet de visualiser, fusionner ou supprimer les devis en doublon
 */
export default function GestionDoublons({ onClose, type = 'devis' }) {
  const { devis, analyserDoublons, fusionnerDoublons, supprimerDoublons, nettoyerDoublonsAuto } = useDevisStore();
  const { clients } = useClientsStore();
  
  const [doublons, setDoublons] = useState([]);
  const [doublonsSélectionnés, setDoublonsSélectionnés] = useState(new Set());
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState(null);
  const [filtreClient, setFiltreClient] = useState('');
  const [modeFusion, setModeFusion] = useState(false);

  const rechargerDoublons = useCallback(() => {
    const résultat = analyserDoublons();
    setDoublons(résultat);
  }, [analyserDoublons]);

  useEffect(() => {
    rechargerDoublons();
  }, [devis, rechargerDoublons]);

  const getClientNom = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.nom || client?.entreprise || 'Client inconnu';
  };

  const handleSélectionnerGroupe = (indices) => {
    const nouvelleSélection = new Set(doublonsSélectionnés);
    indices.forEach(idx => {
      if (nouvelleSélection.has(idx)) {
        nouvelleSélection.delete(idx);
      } else {
        nouvelleSélection.add(idx);
      }
    });
    setDoublonsSélectionnés(nouvelleSélection);
  };

  const handleFusionner = async (groupe) => {
    if (!confirm(`Fusionner ${groupe.length} devis en un seul ?`)) return;
    
    setChargement(true);
    try {
      const ids = groupe.map(d => d.id);
      const résultat = await fusionnerDoublons(ids, ids[0]);
      if (résultat) {
        setMessage({ type: 'success', texte: `${groupe.length} devis fusionnés avec succès` });
        rechargerDoublons();
      }
    } catch (erreur) {
      setMessage({ type: 'erreur', texte: 'Erreur lors de la fusion: ' + erreur.message });
    }
    setChargement(false);
  };

  const handleSupprimerDoublons = async (groupe) => {
    if (!confirm(`Supprimer ${groupe.length - 1} doublon(s) et garder le premier ?`)) return;
    
    setChargement(true);
    try {
      const ids = groupe.map(d => d.id);
      const résultat = supprimerDoublons(ids, ids[0]);
      setMessage({ type: 'success', texte: `${résultat.supprimés.length} doublon(s) supprimé(s)` });
      rechargerDoublons();
    } catch (erreur) {
      setMessage({ type: 'erreur', texte: 'Erreur lors de la suppression: ' + erreur.message });
    }
    setChargement(false);
  };

  const handleNettoyageAuto = async () => {
    if (!confirm('Lancer le nettoyage automatique des doublons récents ?')) return;
    
    setChargement(true);
    try {
      const résultat = nettoyerDoublonsAuto({ seuilTempsMinutes: 5, notifier: false });
      setMessage({ 
        type: 'success', 
        texte: `${résultat.nettoyés} groupe(s) nettoyé(s) sur ${résultat.doublonsTrouvés} trouvé(s)` 
      });
      rechargerDoublons();
    } catch (erreur) {
      setMessage({ type: 'erreur', texte: 'Erreur lors du nettoyage: ' + erreur.message });
    }
    setChargement(false);
  };

  const doublonsFiltrés = doublons.filter(({ groupe }) => {
    if (!filtreClient) return true;
    return groupe.some(d => getClientNom(d.clientId).toLowerCase().includes(filtreClient.toLowerCase()));
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-xl font-bold">Gestion des Doublons - {type.toUpperCase()}</h2>
            {doublons.length > 0 && (
              <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                {doublons.length} groupe(s)
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 mx-4 mt-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {message.texte}
            <button onClick={() => setMessage(null)} className="ml-auto text-sm underline">Fermer</button>
          </div>
        )}

        {/* Barre d'outils */}
        <div className="p-4 border-b flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Filtrer par client..."
              value={filtreClient}
              onChange={(e) => setFiltreClient(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={rechargerDoublons}
            disabled={chargement}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Analyser
          </button>
          
          <button
            onClick={handleNettoyageAuto}
            disabled={chargement || doublons.length === 0}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Nettoyage Auto
          </button>
        </div>

        {/* Liste des doublons */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {doublonsFiltrés.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg">Aucun doublon détecté !</p>
              <p className="text-sm">Tous vos devis sont uniques.</p>
            </div>
          ) : (
            doublonsFiltrés.map(({ groupe }, index) => (
              <div key={index} className="border rounded-lg overflow-hidden bg-gray-50">
                {/* En-tête du groupe */}
                <div className="bg-amber-50 border-b px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={groupe.every(d => doublonsSélectionnés.has(d.id))}
                      onChange={() => handleSélectionnerGroupe(groupe.map(d => d.id))}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="font-semibold text-amber-800">
                      Groupe {index + 1} - {groupe.length} devis similaires
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFusionner(groupe)}
                      disabled={chargement}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                    >
                      <Merge className="w-4 h-4" />
                      Fusionner
                    </button>
                    <button
                      onClick={() => handleSupprimerDoublons(groupe)}
                      disabled={chargement}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer doublons
                    </button>
                  </div>
                </div>

                {/* Tableau des devis du groupe */}
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Sélection</th>
                      <th className="px-4 py-2 text-left">Numéro</th>
                      <th className="px-4 py-2 text-left">Client</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-right">Montant TTC</th>
                      <th className="px-4 py-2 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupe.map((devis, idx) => (
                      <tr 
                        key={devis.id} 
                        className={`border-t hover:bg-white ${idx === 0 ? 'bg-green-50/50' : ''}`}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="radio"
                            name={`groupe-${index}`}
                            checked={idx === 0}
                            onChange={() => {}}
                            className="w-4 h-4 text-blue-600"
                          />
                          {idx === 0 && <span className="text-xs text-green-600 ml-2">Principal</span>}
                        </td>
                        <td className="px-4 py-2 font-mono">{devis.numero}</td>
                        <td className="px-4 py-2">{getClientNom(devis.clientId)}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {devis.type}
                          </span>
                        </td>
                        <td className="px-4 py-2">{formatDate(devis.date)}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatFCFA(devis.montantTTC)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            devis.statut === 'VALIDE' ? 'bg-green-100 text-green-800' :
                            devis.statut === 'BROUILLON' ? 'bg-gray-100 text-gray-800' :
                            devis.statut === 'ANNULE' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {devis.statut}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>

        {/* Pied de page */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {doublonsFiltrés.length} groupe(s) affiché(s) sur {doublons.length} total
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
