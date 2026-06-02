/**
 * Constantes globales de l'application SIKA GESTION
 * Centralise toute la configuration modifiable
 */

// ── AUTHENTIFICATION & SESSION ───────────────────────────
export const AUTH_CONFIG = {
  // Timeout d'inactivité : 30 minutes
  TIMEOUT_INACTIVITE: 30 * 60 * 1000,
  // Avertissement avant expiration : 5 minutes avant (25 min)
  AVERTISSEMENT_INACTIVITE: 25 * 60 * 1000,
  // Durée minimale de session
  SESSION_MIN_DURATION: 5 * 60 * 1000,
};

// ── PAGINATION ───────────────────────────────────────────
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
};

// ── API & REQUÊTES ─────────────────────────────────────
export const API_CONFIG = {
  // Délai avant retry en cas d'erreur réseau
  RETRY_DELAY: 1000,
  // Nombre maximum de retries
  MAX_RETRIES: 3,
  // Timeout des requêtes fetch
  REQUEST_TIMEOUT: 30000,
};

// ── NOTIFICATIONS ────────────────────────────────────────
export const NOTIFICATION_CONFIG = {
  // Durée d'affichage des toasts (ms)
  TOAST_DURATION: 5000,
  // Nombre maximum de notifications simultanées
  MAX_NOTIFICATIONS: 5,
};

// ── TVA & CALCULS FINANCIERS ───────────────────────────
export const FINANCIAL_CONFIG = {
  TVA_RATE: 0.18, // 18% en Côte d'Ivoire
  DEFAULT_CURRENCY: 'FCFA',
  DECIMAL_PLACES: 0,
};

// ── RÔLES UTILISATEURS ─────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
  VIEWER: 'VIEWER',
};

// ── STATUTS FACTURES ───────────────────────────────────
export const FACTURE_STATUTS = {
  EN_ATTENTE: 'EN_ATTENTE',
  PAYEE: 'PAYEE',
  PARTIELLEMENT_PAYEE: 'PARTIELLEMENT_PAYEE',
  EN_RETARD: 'EN_RETARD',
  ANNULEE: 'ANNULEE',
};

// ── STATUTS DEVIS ───────────────────────────────────────
export const DEVIS_STATUTS = {
  BROUILLON: 'BROUILLON',
  ENVOYE: 'ENVOYE',
  ACCEPTE: 'ACCEPTE',
  REFUSE: 'REFUSE',
  EXPIRE: 'EXPIRE',
  TRANSFORME: 'TRANSFORME',
};

// ── ENVIRONNEMENT ───────────────────────────────────────
export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;
