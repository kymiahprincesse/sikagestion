import { useAuditStore } from '../store/useAuditStore';
import { useAuthStore } from '../store/useAuthStore';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../config/auditConfig';

export function useAudit() {
  const { logAction } = useAuditStore();
  const { utilisateurConnecte } = useAuthStore();

  const log = (module, action, cible = '', details = '', metadata = {}) => {
    logAction({ module, action, utilisateur: utilisateurConnecte, cible, details, metadata });
  };

  return {
    logConnexion:       (u)        => logAction({ module: AUDIT_MODULES.AUTH, action: AUDIT_ACTIONS.CONNEXION,       utilisateur: u, cible: u?.nom, details: `Connexion réussie — Rôle: ${u?.role}` }),
    logDeconnexion:     (u)        => logAction({ module: AUDIT_MODULES.AUTH, action: AUDIT_ACTIONS.DECONNEXION,     utilisateur: u, cible: u?.nom, details: 'Déconnexion volontaire' }),
    logConnexionEchec:  (login)    => logAction({ module: AUDIT_MODULES.AUTH, action: AUDIT_ACTIONS.CONNEXION_ECHEC, utilisateur: { nom: login, login, id: -1, role: 'INCONNU' }, cible: login, details: `Tentative échouée avec le login: "${login}"` }),
    logSessionExpiree:  (u)        => logAction({ module: AUDIT_MODULES.AUTH, action: AUDIT_ACTIONS.SESSION_EXPIREE, utilisateur: u, details: 'Session expirée après 30min d\'inactivité' }),

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
  };
}
