export const SUPER_ADMIN_EMAIL = 'munokolive@gmail.com';
export const SUPER_ADMIN_LOGIN = 'munokolive';
export const SUPER_ADMIN_ID    = 0;

export const AUDIT_ACTIONS = {
  CONNEXION:          'CONNEXION',
  DECONNEXION:        'DECONNEXION',
  CONNEXION_ECHEC:    'CONNEXION_ECHEC',
  SESSION_EXPIREE:    'SESSION_EXPIREE',

  AJOUT:              'AJOUT',
  MODIFICATION:       'MODIFICATION',
  SUPPRESSION:        'SUPPRESSION',
  VISUALISATION:      'VISUALISATION',

  IMPRESSION:         'IMPRESSION',
  EXPORT_PDF:         'EXPORT_PDF',
  EXPORT_EXCEL:       'EXPORT_EXCEL',
  IMPORT:             'IMPORT',

  CHANGEMENT_MDP:     'CHANGEMENT_MDP',
  RESET_MDP:          'RESET_MDP',
  ACTIVATION_USER:    'ACTIVATION_USER',
  DESACTIVATION_USER: 'DESACTIVATION_USER',
  CONVERSION_DEVIS:   'CONVERSION_DEVIS',
  PAIEMENT_FACTURE:   'PAIEMENT_FACTURE',
  CLOTURE_JOURNAL:    'CLOTURE_JOURNAL',

  PLANNING_UPDATE:    'PLANNING_UPDATE',
  ALERTE_BUDGET:      'ALERTE_BUDGET',
};

export const AUDIT_MODULES = {
  AUTH:           'Authentification',
  CLIENTS:        'Clients',
  AO:             'Appels d\'Offres',
  DEVIS:          'Devis',
  FACTURES:       'Factures',
  ENCAISSEMENTS:  'Encaissements',
  CAISSE:         'Caisse',
  JOURNAL:        'Journal de Caisse',
  FOURNISSEURS:   'Fournisseurs',
  PLANIFICATION:  'Planification',
  UTILISATEURS:   'Utilisateurs',
  IMPORT_EXPORT:  'Import / Export',
  PARAMETRES:     'Paramètres',
};

export const ACTION_COLORS = {
  CONNEXION:          { bg: '#E8F5E9', text: '#1A7A4A', badge: '🟢' },
  DECONNEXION:        { bg: '#E8ECF4', text: '#1F5C99', badge: '🔵' },
  CONNEXION_ECHEC:    { bg: '#FFEBEE', text: '#C0392B', badge: '🔴' },
  SESSION_EXPIREE:    { bg: '#FFE6E6', text: '#E60000', badge: '🟠' },
  AJOUT:              { bg: '#E8F5E9', text: '#1A7A4A', badge: '➕' },
  MODIFICATION:       { bg: '#FFE6E6', text: '#E60000', badge: '✏️' },
  SUPPRESSION:        { bg: '#FFEBEE', text: '#C0392B', badge: '🗑️' },
  VISUALISATION:      { bg: '#E8ECF4', text: '#1F5C99', badge: '👁️' },
  IMPRESSION:         { bg: '#E8ECF4', text: '#1F5C99', badge: '🖨️' },
  EXPORT_PDF:         { bg: '#FFE6E6', text: '#E60000', badge: '📄' },
  EXPORT_EXCEL:       { bg: '#E8F5E9', text: '#1A7A4A', badge: '📊' },
  IMPORT:             { bg: '#E8ECF4', text: '#1F5C99', badge: '📥' },
  CHANGEMENT_MDP:     { bg: '#FFE6E6', text: '#E60000', badge: '🔑' },
  RESET_MDP:          { bg: '#FFEBEE', text: '#C0392B', badge: '🔒' },
  ACTIVATION_USER:    { bg: '#E8F5E9', text: '#1A7A4A', badge: '✅' },
  DESACTIVATION_USER: { bg: '#FFEBEE', text: '#C0392B', badge: '❌' },
  CONVERSION_DEVIS:   { bg: '#E8F5E9', text: '#1A7A4A', badge: '🔄' },
  PAIEMENT_FACTURE:   { bg: '#E8F5E9', text: '#1A7A4A', badge: '💰' },
  CLOTURE_JOURNAL:    { bg: '#FFEBEE', text: '#E60000', badge: '📕' },
  PLANNING_UPDATE:    { bg: '#E8ECF4', text: '#1F5C99', badge: '📅' },
  ALERTE_BUDGET:      { bg: '#FFE6E6', text: '#E60000', badge: '⚠️' },
};
