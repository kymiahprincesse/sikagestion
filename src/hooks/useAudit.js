import { useAuditStore } from '../store/useAuditStore';
import { useAuthStore } from '../store/useAuthStore';
import { AUDIT_ACTIONS, AUDIT_MODULES, SUPER_ADMIN_EMAIL } from '../config/auditConfig';

// Vérifie si l'utilisateur est le fantôme SUPER_ADMIN (pas de logs)
const isGhostUser = (user) => {
  return user?.email === SUPER_ADMIN_EMAIL || user?.login === SUPER_ADMIN_EMAIL || user?.isFantome === true;
};

export function useAudit() {
  const { logAction } = useAuditStore();
  const { utilisateurConnecte } = useAuthStore();

  const log = (module, action, cible = '', details = '', metadata = {}) => {
    // Ne pas loguer si l'utilisateur est le fantôme SUPER_ADMIN
    if (isGhostUser(utilisateurConnecte)) return;
    logAction({ module, action, utilisateur: utilisateurConnecte, cible, details, metadata });
  };

  return {
    // Logs pour connexion/déconnexion - gérés dans useAuthStore
    logConnexion:       (u)        => isGhostUser(u) ? null : logAction({ module: AUDIT_MODULES.AUTH, action: AUDIT_ACTIONS.CONNEXION,       utilisateur: u, cible: u?.nom, details: `Connexion réussie — Rôle: ${u?.role}` }),
    logDeconnexion:     (u)        => isGhostUser(u) ? null : logAction({ module: AUDIT_MODULES.AUTH, action: AUDIT_ACTIONS.DECONNEXION,     utilisateur: u, cible: u?.nom, details: 'Déconnexion volontaire' }),
    logConnexionEchec:  (login)    => logAction({ module: AUDIT_MODULES.AUTH, action: AUDIT_ACTIONS.CONNEXION_ECHEC, utilisateur: { nom: login, login, id: -1, role: 'INCONNU' }, cible: login, details: `Tentative échouée avec le login: "${login}"` }),
    logSessionExpiree:  (u)        => isGhostUser(u) ? null : logAction({ module: AUDIT_MODULES.AUTH, action: AUDIT_ACTIONS.SESSION_EXPIREE, utilisateur: u, details: 'Session expirée après 30min d\'inactivité' }),

    // Logs pour actions métier - fantôme = pas de logs
    logAjout:           (mod, cible, details, meta)   => log(mod, AUDIT_ACTIONS.AJOUT,           cible, details, meta),
    logModification:    (mod, cible, details, meta)   => log(mod, AUDIT_ACTIONS.MODIFICATION,    cible, details, meta),
    logSuppression:     (mod, cible, details, meta)   => log(mod, AUDIT_ACTIONS.SUPPRESSION,     cible, details, meta),
    logVisualisation:   (mod, cible, details)          => log(mod, AUDIT_ACTIONS.VISUALISATION,   cible, details),

    logImpression:      (mod, cible, details)          => log(mod, AUDIT_ACTIONS.IMPRESSION,      cible, details),
    logExportPDF:       (mod, cible, details)          => log(mod, AUDIT_ACTIONS.EXPORT_PDF,      cible, details),
    logExportExcel:     (mod, cible, details)          => log(mod, AUDIT_ACTIONS.EXPORT_EXCEL,    cible, details),
    logImport:          (mod, details, meta)           => log(mod, AUDIT_ACTIONS.IMPORT,          'Import données', details, meta),

    logPaiement:        (facture, montant, mode)       => log(AUDIT_MODULES.FACTURES,      AUDIT_ACTIONS.PAIEMENT_FACTURE,   facture, `Paiement de ${montant} FCFA — Mode: ${mode}`),
    logConversionDevis: (devis, type)                  => log(AUDIT_MODULES.DEVIS,         AUDIT_ACTIONS.CONVERSION_DEVIS,   devis,   `Converti en ${type}`),
    logClotureJournal:  (periode)                      => log(AUDIT_MODULES.JOURNAL,       AUDIT_ACTIONS.CLOTURE_JOURNAL,    periode, 'Journal clôturé et archivé'),
    logChangementMDP:   (nomUser)                      => log(AUDIT_MODULES.UTILISATEURS,  AUDIT_ACTIONS.CHANGEMENT_MDP,     nomUser, 'Mot de passe modifié'),
    logResetMDP:        (nomUser)                      => log(AUDIT_MODULES.UTILISATEURS,  AUDIT_ACTIONS.RESET_MDP,          nomUser, 'Mot de passe réinitialisé à "sika2026"'),

    // Fonction générique pour enregistrer une action (utilisée par Utilisateurs.jsx)
    enregistrerAction:  (module, action, details)     => log(module, action, '', details),
  };
}
