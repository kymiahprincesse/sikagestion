import { useState, useMemo } from 'react';
import { useAuditStore, getActionLabel, getModuleLabel, genererResume, ACTIONS_AUDIT } from '../store/useAuditStore';
import { useAuthStore } from '../store/useAuthStore';

export default function AuditHistorique({ module, enregistrementId = null }) {
  const logs = useAuditStore((state) => state.logs);
  const utilisateurs = useAuthStore((state) => [
    { nom: 'Tous' },
    ...Array.from(new Set(logs.map(l => l.utilisateur))).map(nom => ({ nom }))
  ]);

  const [filtres, setFiltres] = useState({
    dateDebut: '',
    dateFin: '',
    utilisateur: '',
    action: '',
    module: module || ''
  });

  const [afficherDetails, setAfficherDetails] = useState(null);

  const logsFiltres = useMemo(() => {
    let resultats = logs;

    // Filtre par module
    if (filtres.module) {
      resultats = resultats.filter(log => log.module === filtres.module);
    }

    // Filtre par enregistrement spécifique (si fourni)
    if (enregistrementId) {
      resultats = resultats.filter(log => {
        if (log.apres?.id === enregistrementId || log.avant?.id === enregistrementId) {
          return true;
        }
        return false;
      });
    }

    // Filtre par utilisateur
    if (filtres.utilisateur && filtres.utilisateur !== 'Tous') {
      resultats = resultats.filter(log => log.utilisateur === filtres.utilisateur);
    }

    // Filtre par action
    if (filtres.action) {
      resultats = resultats.filter(log => log.action === filtres.action);
    }

    // Filtre par période
    if (filtres.dateDebut) {
      resultats = resultats.filter(log => log.date >= filtres.dateDebut);
    }

    if (filtres.dateFin) {
      resultats = resultats.filter(log => log.date <= filtres.dateFin);
    }

    // Tri par date décroissante
    return resultats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [logs, filtres, module, enregistrementId]);

  const getActionBadgeColor = (action) => {
    const colors = {
      CREATE: 'bg-vert text-white',
      UPDATE: 'bg-bleu text-white',
      DELETE: 'bg-rouge text-white',
      PDF_EXPORT: 'bg-orange text-white',
      EXCEL_EXPORT: 'bg-orange text-white',
      PLANNING_UPDATE: 'bg-bleu text-white',
      PAYMENT: 'bg-vert text-white',
      VALIDATION: 'bg-vert text-white',
      CONVERSION: 'bg-bleu text-white'
    };
    return colors[action] || 'bg-argent text-navy';
  };

  const formatImpactFinancier = (impact) => {
    if (!impact || impact === 0) return '-';
    const signe = impact > 0 ? '+' : '';
    const couleur = impact > 0 ? 'text-vert' : 'text-rouge';
    return (
      <span className={`font-bold ${couleur}`}>
        {signe}{impact.toLocaleString()} FCFA
      </span>
    );
  };

  const toggleDetails = (logId) => {
    setAfficherDetails(afficherDetails === logId ? null : logId);
  };

  return (
    <div className="bg-white rounded-lg border-2 border-argent">
      {/* En-tête */}
      <div className="bg-navy text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📜</span>
          <div>
            <h3 className="text-lg font-bold">Historique des modifications</h3>
            <p className="text-xs text-argent">
              {logsFiltres.length} entrée{logsFiltres.length > 1 ? 's' : ''} • 
              Rétention 90 jours
            </p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="p-6 bg-navyClair border-b-2 border-argent">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-bold text-navy mb-1">Date début</label>
            <input
              type="date"
              value={filtres.dateDebut}
              onChange={(e) => setFiltres({ ...filtres, dateDebut: e.target.value })}
              className="w-full px-3 py-2 border-2 border-argent rounded focus:border-orange focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1">Date fin</label>
            <input
              type="date"
              value={filtres.dateFin}
              onChange={(e) => setFiltres({ ...filtres, dateFin: e.target.value })}
              className="w-full px-3 py-2 border-2 border-argent rounded focus:border-orange focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1">Utilisateur</label>
            <select
              value={filtres.utilisateur}
              onChange={(e) => setFiltres({ ...filtres, utilisateur: e.target.value })}
              className="w-full px-3 py-2 border-2 border-argent rounded focus:border-orange focus:outline-none text-sm"
            >
              <option value="">Tous</option>
              {Array.from(new Set(logs.map(l => l.utilisateur))).map(nom => (
                <option key={nom} value={nom}>{nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy mb-1">Action</label>
            <select
              value={filtres.action}
              onChange={(e) => setFiltres({ ...filtres, action: e.target.value })}
              className="w-full px-3 py-2 border-2 border-argent rounded focus:border-orange focus:outline-none text-sm"
            >
              <option value="">Toutes</option>
              {Object.keys(ACTIONS_AUDIT).map(action => (
                <option key={action} value={action}>
                  {getActionLabel(action)}
                </option>
              ))}
            </select>
          </div>

          {!module && (
            <div>
              <label className="block text-xs font-bold text-navy mb-1">Module</label>
              <select
                value={filtres.module}
                onChange={(e) => setFiltres({ ...filtres, module: e.target.value })}
                className="w-full px-3 py-2 border-2 border-argent rounded focus:border-orange focus:outline-none text-sm"
              >
                <option value="">Tous</option>
                {Array.from(new Set(logs.map(l => l.module))).map(mod => (
                  <option key={mod} value={mod}>{getModuleLabel(mod)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={() => setFiltres({ dateDebut: '', dateFin: '', utilisateur: '', action: '', module: module || '' })}
              className="px-4 py-2 bg-argent text-navy rounded hover:bg-navy hover:text-white transition-colors text-sm font-bold"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        {logsFiltres.length === 0 ? (
          <div className="p-12 text-center text-argent">
            <p className="text-lg">Aucun historique trouvé</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-navyClair border-b-2 border-argent">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-navy">DATE & HEURE</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-navy">UTILISATEUR</th>
                {!module && (
                  <th className="px-4 py-3 text-left text-xs font-bold text-navy">MODULE</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-bold text-navy">ACTION</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-navy">RÉSUMÉ</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-navy">IMPACT FINANCIER</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-navy">DÉTAILS</th>
              </tr>
            </thead>
            <tbody>
              {logsFiltres.map((log, index) => (
                <>
                  <tr
                    key={log.id}
                    className={`border-b border-argent hover:bg-orangeClair transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-navyClair'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-navy">
                      <div className="font-bold">{log.date}</div>
                      <div className="text-xs text-bleu">{log.heure}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-navy font-medium">
                      {log.utilisateur}
                    </td>
                    {!module && (
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-bleu text-white rounded text-xs font-bold">
                          {getModuleLabel(log.module)}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getActionBadgeColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-navy">
                      {genererResume(log)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatImpactFinancier(log.impactFinancier)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(log.avant || log.apres) && (
                        <button
                          onClick={() => toggleDetails(log.id)}
                          className="text-bleu hover:text-orange transition-colors"
                        >
                          {afficherDetails === log.id ? '▼' : '▶'}
                        </button>
                      )}
                    </td>
                  </tr>
                  
                  {afficherDetails === log.id && (log.avant || log.apres) && (
                    <tr className="bg-orangeClair border-b-2 border-orange">
                      <td colSpan={!module ? 7 : 6} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          {log.avant && (
                            <div>
                              <p className="text-xs font-bold text-navy mb-2">AVANT</p>
                              <pre className="bg-white p-3 rounded border border-argent text-xs overflow-auto max-h-60">
                                {JSON.stringify(log.avant, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.apres && (
                            <div>
                              <p className="text-xs font-bold text-navy mb-2">APRÈS</p>
                              <pre className="bg-white p-3 rounded border border-argent text-xs overflow-auto max-h-60">
                                {JSON.stringify(log.apres, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer avec statistiques */}
      {logsFiltres.length > 0 && (
        <div className="px-6 py-4 bg-navyClair border-t-2 border-argent flex items-center justify-between">
          <div className="text-sm text-navy">
            <span className="font-bold">{logsFiltres.length}</span> entrée{logsFiltres.length > 1 ? 's' : ''} affichée{logsFiltres.length > 1 ? 's' : ''}
          </div>
          <div className="text-sm text-navy">
            Impact financier total : {formatImpactFinancier(
              logsFiltres.reduce((sum, log) => sum + (log.impactFinancier || 0), 0)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
