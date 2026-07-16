import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuditStore } from '../store/useAuditStore';
import { useAuthStore }  from '../store/useAuthStore';
import { AUDIT_MODULES, ACTION_COLORS, AUDIT_ACTIONS } from '../config/auditConfig';

const PAGE_SIZE = 50;

export default function TourDeControle() {
  const { logs, fetchLogs, clearOldLogs, loading } = useAuditStore();
  const { utilisateurConnecte: user } = useAuthStore();

  const [filtreModule,  setFiltreModule]  = useState('');
  const [filtreAction,  setFiltreAction]  = useState('');
  const [filtreDateDeb, setFiltreDateDeb] = useState('');
  const [filtreDateFin, setFiltreDateFin] = useState('');
  const [recherche,     setRecherche]     = useState('');
  const [page,          setPage]          = useState(1);
  const [confirmPurge,  setConfirmPurge]  = useState(false);
  const [purgeLoading,  setPurgeLoading]  = useState(false);

  const [onglet, setOnglet] = useState('logs');

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      fetchLogs({ module: filtreModule, action: filtreAction,
                  dateDebut: filtreDateDeb, dateFin: filtreDateFin });
    }
  }, [filtreModule, filtreAction, filtreDateDeb, filtreDateFin, user, fetchLogs]);

  const logsFiltres = logs.filter(l => {
    const q = recherche.toLowerCase();
    return !q || [l.userNom, l.userLogin, l.cible, l.details, l.module, l.action]
      .some(v => v?.toLowerCase().includes(q));
  });

  const totalPages  = Math.max(1, Math.ceil(logsFiltres.length / PAGE_SIZE));
  const logsPage    = logsFiltres.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExportExcel = () => {
    const rows = logsFiltres.map(l => ({
      Date:         l.dateJour,
      Heure:        l.heureExacte,
      Utilisateur:  l.userNom || '',
      Login:        l.userLogin || '',
      Rôle:         l.userRole || '',
      Module:       l.module || '',
      Action:       l.action || '',
      Cible:        l.cible || '',
      Détails:      l.details || '',
      IP:           l.ipAddress || '',
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Audit');
    XLSX.writeFile(wb, `SIKA_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePurge = async () => {
    if (!confirmPurge) { setConfirmPurge(true); return; }
    setPurgeLoading(true);
    await clearOldLogs();
    setPurgeLoading(false);
    setConfirmPurge(false);
  };

  const stats = {
    totalActions:     logs.length,
    connexions:       logs.filter(l => l.action === 'CONNEXION').length,
    impressions:      logs.filter(l => l.action === 'IMPRESSION' || l.action === 'EXPORT_PDF').length,
    suppressions:     logs.filter(l => l.action === 'SUPPRESSION').length,
    connexionsEchec:  logs.filter(l => l.action === 'CONNEXION_ECHEC').length,
    utilisateursActifs: [...new Set(logs.map(l => l.userLogin))].length,
  };

  const alertes = logs
    .filter(l => l.action === 'CONNEXION_ECHEC')
    .reduce((acc, l) => {
      acc[l.userLogin] = (acc[l.userLogin] || 0) + 1;
      return acc;
    }, {});

  return (
    <div style={{ padding: '20px', background: '#F8F9FC', minHeight: '100vh' }}>

      <div style={{ background: 'var(--color-primary)', borderRadius: '12px',
                    padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '32px' }}>🛡️</span>
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: 'bold' }}>
              TOUR DE CONTRÔLE
            </h1>
            <p style={{ color: 'var(--color-border)', margin: 0, fontSize: '13px' }}>
              Journal d'audit complet — Accès réservé aux Administrateurs
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--color-accent)', fontWeight: 'bold', fontSize: '24px' }}>{logs.length}</div>
              <div style={{ color: 'var(--color-border)', fontSize: '12px' }}>actions enregistrées</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => fetchLogs({ module: filtreModule, action: filtreAction, dateDebut: filtreDateDeb, dateFin: filtreDateFin })}
                style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                         fontSize: '12px', fontWeight: 'bold', background: 'var(--color-secondary)', color: 'white' }}>
                🔄 Actualiser
              </button>
              <button onClick={handleExportExcel}
                style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                         fontSize: '12px', fontWeight: 'bold', background: 'var(--color-success)', color: 'white' }}>
                📥 Excel
              </button>
              <button onClick={handlePurge} disabled={purgeLoading}
                style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                         fontSize: '12px', fontWeight: 'bold',
                         background: confirmPurge ? 'var(--color-accent)' : 'var(--color-border)',
                         color: confirmPurge ? 'white' : 'var(--color-primary)' }}>
                {purgeLoading ? '⏳...' : confirmPurge ? '✅ Confirmer purge' : '🗑️ Purger > 6 mois'}
              </button>
              {confirmPurge && <button onClick={() => setConfirmPurge(false)}
                style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                         fontSize: '12px', background: 'var(--color-surface-muted)', color: 'var(--color-primary)' }}>Annuler</button>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'logs',    label: '📋 Journal Complet' },
          { id: 'stats',   label: '📊 Statistiques' },
          { id: 'alertes', label: `🚨 Alertes (${Object.keys(alertes).length})` },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
              background: onglet === o.id ? 'var(--color-accent)' : 'white',
              color:      onglet === o.id ? 'white'   : 'var(--color-primary)',
              boxShadow:  '0 2px 4px rgba(0,0,0,0.1)',
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'logs' && (
        <>
          <div style={{ background: 'white', borderRadius: '10px', padding: '16px',
                        marginBottom: '16px', display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>

            <input placeholder="🔍 Rechercher (nom, action, cible...)"
              value={recherche} onChange={e => { setRecherche(e.target.value); setPage(1); }}
              style={inputStyle} />

            <select value={filtreModule} onChange={e => { setFiltreModule(e.target.value); setPage(1); }}
              style={inputStyle}>
              <option value="">📦 Tous les modules</option>
              {Object.values(AUDIT_MODULES).map(m =>
                <option key={m} value={m}>{m}</option>)}
            </select>

            <select value={filtreAction} onChange={e => { setFiltreAction(e.target.value); setPage(1); }}
              style={inputStyle}>
              <option value="">⚡ Toutes les actions</option>
              {Object.keys(AUDIT_ACTIONS).map(a =>
                <option key={a} value={a}>{a}</option>)}
            </select>

            <input type="date" value={filtreDateDeb}
              onChange={e => { setFiltreDateDeb(e.target.value); setPage(1); }} style={inputStyle} />
            <input type="date" value={filtreDateFin}
              onChange={e => { setFiltreDateFin(e.target.value); setPage(1); }} style={inputStyle} />

            <button onClick={() => {
              setFiltreModule(''); setFiltreAction('');
              setFiltreDateDeb(''); setFiltreDateFin(''); setRecherche(''); setPage(1);
            }} style={{ ...inputStyle, background: 'var(--color-surface-muted)', cursor: 'pointer',
                        color: 'var(--color-primary)', fontWeight: 'bold' }}>
              ↺ Réinitialiser
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--color-primary)', color: 'white' }}>
                    {['Date & Heure', 'Utilisateur', 'Rôle', 'Module',
                      'Action', 'Cible', 'Détails', 'IP'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', textAlign: 'left',
                                           fontSize: '11px', fontWeight: 'bold',
                                           whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logsPage.map((log, i) => {
                    const colors = ACTION_COLORS[log.action] || { bg: '#F5F5F5', text: '#555', badge: '•' };
                    return (
                      <tr key={log.id || i}
                        style={{ background: i % 2 === 0 ? 'white' : '#F8F9FC',
                                 borderBottom: '1px solid var(--color-surface-muted)' }}>

                        <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '12px' }}>
                            {log.dateJour}
                          </div>
                          <div style={{ color: '#666', fontSize: '11px' }}>
                            {log.heureExacte}
                          </div>
                        </td>

                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                            {log.userNom}
                          </div>
                          <div style={{ color: '#888', fontSize: '11px' }}>
                            @{log.userLogin}
                          </div>
                        </td>

                        <td style={{ padding: '10px' }}>
                          <span style={{ background: 'var(--color-surface-muted)', color: 'var(--color-secondary)',
                                         padding: '2px 8px', borderRadius: '10px',
                                         fontSize: '11px', fontWeight: 'bold' }}>
                            {log.userRole}
                          </span>
                        </td>

                        <td style={{ padding: '10px', color: 'var(--color-secondary)', fontWeight: '500' }}>
                          {log.module}
                        </td>

                        <td style={{ padding: '10px' }}>
                          <span style={{ background: colors.bg, color: colors.text,
                                         padding: '3px 10px', borderRadius: '10px',
                                         fontSize: '11px', fontWeight: 'bold',
                                         whiteSpace: 'nowrap' }}>
                            {colors.badge} {log.action}
                          </span>
                        </td>

                        <td style={{ padding: '10px', maxWidth: '180px' }}>
                          <div style={{ color: 'var(--color-primary)', fontSize: '12px',
                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap' }}>
                            {log.cible || '—'}
                          </div>
                        </td>

                        <td style={{ padding: '10px', maxWidth: '220px' }}>
                          <div style={{ color: '#666', fontSize: '11px',
                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap' }}
                               title={log.details}>
                            {log.details || '—'}
                          </div>
                        </td>

                        <td style={{ padding: '10px', color: '#999', fontSize: '11px',
                                     fontFamily: 'monospace' }}>
                          {log.ipAddress || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {logsFiltres.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  {loading ? '⏳ Chargement...' : '📭 Aucun log trouvé'}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 16px', borderTop: '1px solid var(--color-surface-muted)', background: '#F8F9FC' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  Page {page} / {totalPages} — {logsFiltres.length} entrée{logsFiltres.length > 1 ? 's' : ''}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setPage(1)} disabled={page === 1}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
                             background: page === 1 ? '#F0F0F0' : 'white', cursor: page === 1 ? 'default' : 'pointer',
                             fontSize: '12px' }}>«</button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
                             background: page === 1 ? '#F0F0F0' : 'white', cursor: page === 1 ? 'default' : 'pointer',
                             fontSize: '12px' }}>‹</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
                             background: page === totalPages ? '#F0F0F0' : 'white', cursor: page === totalPages ? 'default' : 'pointer',
                             fontSize: '12px' }}>›</button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
                             background: page === totalPages ? '#F0F0F0' : 'white', cursor: page === totalPages ? 'default' : 'pointer',
                             fontSize: '12px' }}>»</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {onglet === 'stats' && (() => {
        const moduleBreakdown = Object.values(AUDIT_MODULES).map(mod => ({
          mod,
          count: logs.filter(l => l.module === mod).length
        })).filter(x => x.count > 0).sort((a, b) => b.count - a.count);
        const maxCount = moduleBreakdown[0]?.count || 1;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Total actions',       val: stats.totalActions,          icon: '📊', color: 'var(--color-secondary)' },
                { label: 'Connexions',           val: stats.connexions,            icon: '🟢', color: 'var(--color-success)' },
                { label: 'Impressions/PDF',      val: stats.impressions,           icon: '🖨️', color: 'var(--color-accent)' },
                { label: 'Suppressions',         val: stats.suppressions,          icon: '🗑️', color: 'var(--color-accent)' },
                { label: 'Échecs connexion',     val: stats.connexionsEchec,       icon: '🔴', color: 'var(--color-accent)' },
                { label: 'Utilisateurs actifs',  val: stats.utilisateursActifs,    icon: '👤', color: 'var(--color-secondary)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', borderRadius: '12px',
                                            padding: '20px', textAlign: 'center',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                            borderTop: `4px solid ${s.color}` }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: s.color }}>{s.val}</div>
                  <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {moduleBreakdown.length > 0 && (
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <h3 style={{ color: 'var(--color-primary)', margin: '0 0 16px 0', fontSize: '15px', fontWeight: 'bold' }}>
                  📦 Actions par module
                </h3>
                {moduleBreakdown.map(({ mod, count }) => (
                  <div key={mod} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                                  fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--color-primary)', fontWeight: '500' }}>{mod}</span>
                      <span style={{ color: 'var(--color-secondary)', fontWeight: 'bold' }}>{count}</span>
                    </div>
                    <div style={{ background: 'var(--color-surface-muted)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ width: `${(count / maxCount) * 100}%`, height: '100%',
                                    background: 'var(--color-primary)', borderRadius: '4px',
                                    transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {onglet === 'alertes' && (
        <div>
          <h3 style={{ color: 'var(--color-accent)', marginBottom: '16px' }}>
            🚨 Tentatives de connexion échouées
          </h3>
          {Object.entries(alertes).length === 0 ? (
            <div style={{ background: 'white', borderRadius: '10px', padding: '30px',
                          textAlign: 'center', color: 'var(--color-success)', fontWeight: 'bold' }}>
              ✅ Aucune alerte de sécurité détectée
            </div>
          ) : (
            Object.entries(alertes).map(([login, count]) => (
              <div key={login} style={{ background: 'var(--color-accent-light)',
                                        border: `2px solid ${count >= 3 ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                        borderRadius: '10px', padding: '16px',
                                        marginBottom: '12px', display: 'flex',
                                        justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '15px' }}>
                    Login : <code style={{ background: '#F0F0F0', padding: '2px 6px',
                                           borderRadius: '4px' }}>{login}</code>
                  </div>
                  <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>
                    {count >= 3 ? '⚠️ Activité suspecte — Multiple tentatives détectées' :
                                  'Tentative échouée enregistrée'}
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                  {count}×
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--color-surface-muted)',
  fontSize: '13px', color: 'var(--color-primary)', outline: 'none', width: '100%',
  background: '#F8F9FC',
};
