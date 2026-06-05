import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { SUPER_ADMIN_ID, SUPER_ADMIN_EMAIL, SUPER_ADMIN_LOGIN, AUDIT_ACTIONS, AUDIT_MODULES } from '../config/auditConfig';

export const ACTIONS_AUDIT  = AUDIT_ACTIONS;
export const MODULES_AUDIT  = AUDIT_MODULES;

export function calculerEcartFinancier(avant, apres) {
  if (!avant || !apres) return 0;
  const b1 = avant.budgetTotal || avant.budget || avant.montantTotal || 0;
  const b2 = apres.budgetTotal  || apres.budget  || apres.montantTotal  || 0;
  return b2 - b1;
}

export function getActionLabel(action) {
  const labels = {
    CONNEXION: 'Connexion',
    DECONNEXION: 'Déconnexion',
    CONNEXION_ECHEC: 'Connexion échouée',
    SESSION_EXPIREE: 'Session expirée',
    AJOUT: 'Ajout',
    MODIFICATION: 'Modification',
    SUPPRESSION: 'Suppression',
    VISUALISATION: 'Visualisation',
    IMPRESSION: 'Impression',
    EXPORT_PDF: 'Export PDF',
    EXPORT_EXCEL: 'Export Excel',
    IMPORT: 'Import',
    CHANGEMENT_MDP: 'Changement MDP',
    RESET_MDP: 'Reset MDP',
    ACTIVATION_USER: 'Activation utilisateur',
    DESACTIVATION_USER: 'Désactivation utilisateur',
    CONVERSION_DEVIS: 'Conversion devis',
    PAIEMENT_FACTURE: 'Paiement facture',
    CLOTURE_JOURNAL: 'Clôture journal',
    PLANNING_UPDATE: 'Mise à jour planning',
    ALERTE_BUDGET:   'Alerte budget',
  };
  return labels[action] || action;
}

export function getModuleLabel(module) {
  return AUDIT_MODULES[module] || module;
}

export function genererResume(log) {
  if (log.details) return log.details;
  if (log.cible) return log.cible;
  return `${getActionLabel(log.action || '')} — ${getModuleLabel(log.module || '')}`;
}

function maskSuperAdmin(logs) {
  return logs.filter(l =>
    l.userId !== SUPER_ADMIN_ID &&
    l.userLogin !== SUPER_ADMIN_LOGIN &&
    l.userEmail !== SUPER_ADMIN_EMAIL
  );
}

export const useAuditStore = create((set, get) => ({
  logs: [],
  loading: false,
  error: null,

  logAction: async ({
    module,
    action,
    utilisateur,
    cible = '',
    details = '',
    metadata = {},
    avant = null,
    apres = null,
    impactFinancier = null,
  }) => {
    if (
      utilisateur?.id === SUPER_ADMIN_ID ||
      utilisateur?.login === SUPER_ADMIN_LOGIN
    ) return;

    const entry = {
      module,
      action,
      utilisateur:  utilisateur?.nom || utilisateur?.login || '',
      userId:       utilisateur?.id,
      userNom:      utilisateur?.nom,
      userLogin:    utilisateur?.login,
      userRole:     utilisateur?.role,
      cible,
      details,
      metadata:     metadata || {},
      avant:        avant || null,
      apres:        apres || null,
      impact_financier: impactFinancier !== null ? impactFinancier : null,
      ipAddress:    await getClientIP(),
      userAgent:    navigator.userAgent,
      timestamp:    new Date().toISOString(),
      dateJour:     new Date().toLocaleDateString('fr-FR'),
      heureExacte:  new Date().toLocaleTimeString('fr-FR', {
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    }),
    };

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([entry])
        .select()
        .single();
      if (!error && data) {
        set(state => ({ logs: [data, ...state.logs] }));
      }
    } catch (e) {
      // SECURITY: Les logs d'audit ne sont plus stockés en local pour éviter
      // la fuite de données sensibles. Seul Supabase stocke les logs.
      console.warn('[Audit] Échec stockage Supabase:', e.message);
      // Fallback: stockage en mémoire uniquement (perdu au refresh)
      set(state => ({ logs: [{ ...entry, id: generateSecureId('LOG') }, ...state.logs] }));
    }
  },

  fetchLogs: async (filtres = {}) => {
    set({ loading: true });
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);

      if (filtres.module)      query = query.eq('module', filtres.module);
      if (filtres.action)      query = query.eq('action', filtres.action);
      if (filtres.userId)      query = query.eq('userId', filtres.userId);
      if (filtres.dateDebut)   query = query.gte('timestamp', filtres.dateDebut);
      if (filtres.dateFin)     query = query.lte('timestamp', filtres.dateFin + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      set({ logs: maskSuperAdmin(data || []), loading: false });
    } catch (err) {
      // SECURITY: Pas de fallback vers localStorage pour les logs d'audit
      console.warn('[Audit] Erreur fetch Supabase:', err?.message);
      set({ logs: [], loading: false });
    }
  },

  clearLogs: async () => {
    await supabase.from('audit_logs').delete().neq('id', 0);
    // SECURITY: Plus de localStorage pour les logs
    set({ logs: [] });
  },

  addLog: (...args) => {
    let params;
    if (typeof args[0] === 'string') {
      params = {
        module:      args[1] || '',
        action:      args[0] || '',
        utilisateur: null,
        cible:       args[2] != null ? String(args[2]) : '',
        details:     args[3] || '',
      };
    } else {
      params = args[0] || {};
    }
    if (typeof params.utilisateur === 'string') {
      const nom = params.utilisateur;
      params = { ...params, utilisateur: { nom, login: nom.toLowerCase().replace(/\s+/g, '.'), role: 'UTILISATEUR' } };
    }
    return get().logAction(params);
  },

  clearOldLogs: async () => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    const cutoffISO = cutoff.toISOString();
    await supabase.from('audit_logs').delete().lt('timestamp', cutoffISO);
    const local = JSON.parse(localStorage.getItem('sika_audit') || '[]');
    const filtered = local.filter(l => l.timestamp >= cutoffISO);
    localStorage.setItem('sika_audit', JSON.stringify(filtered));
    set(state => ({ logs: state.logs.filter(l => l.timestamp >= cutoffISO) }));
  },
}));

async function getClientIP() {
  try {
    const r = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
    const d = await r.json();
    return d.ip || 'N/A';
  } catch { return 'N/A'; }
}
