/**
 * Gestion des droits d'accès pour SIKA INDUSTRIE
 * Matrice des permissions par rôle et module
 */

// Définition des rôles
export const ROLES = {
  ADMIN: 'ADMIN',
  COMPTABLE: 'COMPTABLE',
  SECRETAIRE: 'SECRETAIRE',
  TECHNICIEN: 'TECHNICIEN'
};

// Définition des modules
export const MODULES = {
  DASHBOARD: 'DASHBOARD',
  CLIENTS: 'CLIENTS',
  DEVIS: 'DEVIS',
  FACTURES: 'FACTURES',
  ENCAISSEMENTS: 'ENCAISSEMENTS',
  CAISSE: 'CAISSE',
  JOURNAL: 'JOURNAL',
  FOURNISSEURS: 'FOURNISSEURS',
  APPELS_OFFRES: 'APPELS_OFFRES',
  PLANIFICATION: 'PLANIFICATION',
  PARAMETRES: 'PARAMETRES',
  AUDIT: 'AUDIT'
};

// Définition des actions
export const ACTIONS = {
  LIRE: 'LIRE',
  CREER: 'CREER',
  MODIFIER: 'MODIFIER',
  SUPPRIMER: 'SUPPRIMER',
  VALIDER: 'VALIDER',
  EXPORTER: 'EXPORTER'
};

// Matrice des droits : MATRIX_DROITS[ROLE][MODULE][ACTION]
export const MATRIX_DROITS = {
  ADMIN: {
    DASHBOARD: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    CLIENTS: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: true, VALIDER: false, EXPORTER: true },
    DEVIS: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: true, VALIDER: true, EXPORTER: true },
    FACTURES: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: true, VALIDER: true, EXPORTER: true },
    ENCAISSEMENTS: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: true, VALIDER: true, EXPORTER: true },
    CAISSE: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: true, VALIDER: true, EXPORTER: true },
    JOURNAL: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: true, VALIDER: true, EXPORTER: true },
    FOURNISSEURS: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: true, VALIDER: false, EXPORTER: true },
    APPELS_OFFRES: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: true, VALIDER: true, EXPORTER: true },
    PLANIFICATION: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: true, VALIDER: true, EXPORTER: true },
    PARAMETRES: { LIRE: true, CREER: false, MODIFIER: true, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    AUDIT: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: true, VALIDER: false, EXPORTER: true }
  },
  
  COMPTABLE: {
    DASHBOARD: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    CLIENTS: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    DEVIS: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: true, EXPORTER: true },
    FACTURES: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: true, EXPORTER: true },
    ENCAISSEMENTS: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: true, EXPORTER: true },
    CAISSE: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: true, EXPORTER: true },
    JOURNAL: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: true, EXPORTER: true },
    FOURNISSEURS: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    APPELS_OFFRES: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    PLANIFICATION: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    PARAMETRES: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    AUDIT: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: true }
  },
  
  SECRETAIRE: {
    DASHBOARD: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    CLIENTS: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    DEVIS: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    FACTURES: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    ENCAISSEMENTS: { LIRE: true, CREER: true, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    CAISSE: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    JOURNAL: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    FOURNISSEURS: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    APPELS_OFFRES: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    PLANIFICATION: { LIRE: true, CREER: true, MODIFIER: true, SUPPRIMER: false, VALIDER: false, EXPORTER: true },
    PARAMETRES: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    AUDIT: { LIRE: false, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false }
  },
  
  TECHNICIEN: {
    DASHBOARD: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    CLIENTS: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    DEVIS: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    FACTURES: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    ENCAISSEMENTS: { LIRE: false, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    CAISSE: { LIRE: false, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    JOURNAL: { LIRE: false, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    FOURNISSEURS: { LIRE: false, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    APPELS_OFFRES: { LIRE: true, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    PLANIFICATION: { LIRE: true, CREER: false, MODIFIER: true, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    PARAMETRES: { LIRE: false, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false },
    AUDIT: { LIRE: false, CREER: false, MODIFIER: false, SUPPRIMER: false, VALIDER: false, EXPORTER: false }
  }
};

// Fonction principale de vérification des droits
export const peutAcceder = (role, module, action) => {
  if (!role || !module || !action) {
    return false;
  }
  
  // Vérifier si le rôle existe
  if (!MATRIX_DROITS[role]) {
    return false;
  }
  
  // Vérifier si le module existe pour ce rôle
  if (!MATRIX_DROITS[role][module]) {
    return false;
  }
  
  // Vérifier si l'action est autorisée
  return MATRIX_DROITS[role][module][action] === true;
};

// Vérifier si un utilisateur peut accéder à un module (au moins une action autorisée)
export const peutAccederModule = (role, module) => {
  if (!role || !module) {
    return false;
  }
  
  if (!MATRIX_DROITS[role] || !MATRIX_DROITS[role][module]) {
    return false;
  }
  
  // Vérifier si au moins une action est autorisée
  const permissions = MATRIX_DROITS[role][module];
  return Object.values(permissions).some((autorise) => autorise === true);
};

// Obtenir toutes les permissions d'un rôle pour un module
export const getPermissions = (role, module) => {
  if (!role || !module) {
    return {};
  }
  
  if (!MATRIX_DROITS[role] || !MATRIX_DROITS[role][module]) {
    return {};
  }
  
  return MATRIX_DROITS[role][module];
};

// Obtenir tous les modules accessibles pour un rôle
export const getModulesAccessibles = (role) => {
  if (!role || !MATRIX_DROITS[role]) {
    return [];
  }
  
  return Object.keys(MATRIX_DROITS[role]).filter((module) => 
    peutAccederModule(role, module)
  );
};

// Liste du personnel SIKA avec leurs identifiants
export const PERSONNEL_SIKA = [
  { id: 1, nom: 'KOMLAN AMEMATCHRON', login: 'komlan', motDePasse: 'admin123', role: 'ADMIN' },
  { id: 2, nom: 'ANANI ALIDA OLGA', login: 'anani', motDePasse: 'compta123', role: 'COMPTABLE' },
  { id: 3, nom: 'KOUASSI JULIANA', login: 'kouassi', motDePasse: 'sec123', role: 'SECRETAIRE' },
  { id: 4, nom: 'Technicien 1', login: 'tech1', motDePasse: 'tech123', role: 'TECHNICIEN' },
  { id: 5, nom: 'Technicien 2', login: 'tech2', motDePasse: 'tech456', role: 'TECHNICIEN' },
  { id: 6, nom: 'Technicien 3', login: 'tech3', motDePasse: 'tech789', role: 'TECHNICIEN' },
  { id: 7, nom: 'Technicien 4', login: 'tech4', motDePasse: 'tech012', role: 'TECHNICIEN' },
  { id: 8, nom: 'Technicien 5', login: 'tech5', motDePasse: 'tech345', role: 'TECHNICIEN' },
  { id: 9, nom: 'Technicien 6', login: 'tech6', motDePasse: 'tech678', role: 'TECHNICIEN' },
  { id: 10, nom: 'Technicien 7', login: 'tech7', motDePasse: 'tech901', role: 'TECHNICIEN' },
  { id: 11, nom: 'Technicien 8', login: 'tech8', motDePasse: 'tech234', role: 'TECHNICIEN' },
  { id: 12, nom: 'Technicien 9', login: 'tech9', motDePasse: 'tech567', role: 'TECHNICIEN' },
  { id: 13, nom: 'Technicien 10', login: 'tech10', motDePasse: 'tech890', role: 'TECHNICIEN' }
];

// Vérifier les identifiants d'un utilisateur
export const verifierIdentifiants = (login, motDePasse) => {
  const utilisateur = PERSONNEL_SIKA.find(
    (p) => p.login === login && p.motDePasse === motDePasse
  );
  
  if (utilisateur) {
    const { motDePasse: _, ...utilisateurSansMdp } = utilisateur;
    return { success: true, utilisateur: utilisateurSansMdp };
  }
  
  return { success: false, message: 'Login ou mot de passe incorrect' };
};

// Obtenir un utilisateur par son ID
export const getUtilisateurById = (id) => {
  const utilisateur = PERSONNEL_SIKA.find((p) => p.id === id);
  if (utilisateur) {
    const { motDePasse: _, ...utilisateurSansMdp } = utilisateur;
    return utilisateurSansMdp;
  }
  return null;
};

// Obtenir tous les utilisateurs d'un rôle spécifique
export const getUtilisateursByRole = (role) => {
  return PERSONNEL_SIKA
    .filter((p) => p.role === role)
    .map(({ motDePasse: _, ...utilisateur }) => utilisateur);
};
