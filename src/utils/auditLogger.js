import { useAuditStore } from '../store/useAuditStore';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../config/auditConfig';

export const auditLogger = {
  logConnexion: (user) => {
    useAuditStore.getState().logAction({
      module: AUDIT_MODULES.AUTH,
      action: AUDIT_ACTIONS.CONNEXION,
      utilisateur: user,
      cible: user?.nom,
      details: `Connexion réussie — Rôle: ${user?.role}`
    });
  },

  logDeconnexion: (user) => {
    useAuditStore.getState().logAction({
      module: AUDIT_MODULES.AUTH,
      action: AUDIT_ACTIONS.DECONNEXION,
      utilisateur: user,
      cible: user?.nom,
      details: 'Déconnexion volontaire'
    });
  },

  logConnexionEchec: (login) => {
    useAuditStore.getState().logAction({
      module: AUDIT_MODULES.AUTH,
      action: AUDIT_ACTIONS.CONNEXION_ECHEC,
      utilisateur: { nom: login, login, id: -1, role: 'INCONNU' },
      cible: login,
      details: `Tentative échouée avec le login: "${login}"`
    });
  },

  logSessionExpiree: (user) => {
    useAuditStore.getState().logAction({
      module: AUDIT_MODULES.AUTH,
      action: AUDIT_ACTIONS.SESSION_EXPIREE,
      utilisateur: user,
      details: 'Session expirée après 30min d\'inactivité'
    });
  }
};
