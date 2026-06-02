/**
 * Système de logging conditionnel
 * Les logs ne s'affichent qu'en mode développement
 */

import { IS_DEV } from '../config/constants';

/**
 * Logger centralisé
 * Tous les logs sont supprimés en production
 */
export const logger = {
  log: (...args) => {
    if (IS_DEV) console.log(...args);
  },
  warn: (...args) => {
    if (IS_DEV) console.warn(...args);
  },
  error: (...args) => {
    if (IS_DEV) console.error(...args);
  },
  info: (...args) => {
    if (IS_DEV) console.info(...args);
  },
  debug: (...args) => {
    if (IS_DEV) console.debug(...args);
  },
  group: (...args) => {
    if (IS_DEV) console.group(...args);
  },
  groupEnd: () => {
    if (IS_DEV) console.groupEnd();
  },
  table: (...args) => {
    if (IS_DEV) console.table(...args);
  },
};

/**
 * Logger spécifique pour les opérations Supabase
 */
export const supabaseLogger = {
  query: (table, params) => {
    if (IS_DEV) logger.log(`[Supabase] Query ${table}:`, params);
  },
  success: (table, count) => {
    if (IS_DEV) logger.log(`[Supabase] ✅ ${table}: ${count} résultat(s)`);
  },
  error: (table, error) => {
    if (IS_DEV) logger.error(`[Supabase] ❌ ${table}:`, error);
  },
  mutation: (table, operation, data) => {
    if (IS_DEV) logger.log(`[Supabase] ${operation} ${table}:`, data);
  },
};

/**
 * Logger pour le chargement de données
 */
export const dataLoaderLogger = {
  start: () => {
    if (IS_DEV) logger.log('🔄 Chargement des données...');
  },
  complete: (stats) => {
    if (IS_DEV) logger.log('✅ Données chargées:', stats);
  },
  error: (err) => {
    if (IS_DEV) logger.error('❌ Erreur chargement:', err);
  },
};

/**
 * Logger pour l'authentification
 */
export const authLogger = {
  login: (user) => {
    if (IS_DEV) logger.log('[Auth] Connexion:', user?.login || user?.email);
  },
  logout: (user) => {
    if (IS_DEV) logger.log('[Auth] Déconnexion:', user?.login || user?.email);
  },
  sessionExpired: () => {
    if (IS_DEV) logger.warn('[Auth] Session expirée');
  },
};

/**
 * Logger pour les performances
 */
export const perfLogger = {
  start: (label) => {
    if (IS_DEV) console.time(label);
  },
  end: (label) => {
    if (IS_DEV) console.timeEnd(label);
  },
};
