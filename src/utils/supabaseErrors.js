/**
 * Utilitaires de gestion des erreurs Supabase
 * Standardise le traitement des erreurs API
 */

import { IS_DEV } from '../config/constants';

/**
 * Niveaux de criticité des erreurs
 */
export const ERROR_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

/**
 * Codes d'erreur Supabase connus
 */
const SUPABASE_ERROR_CODES = {
  '23505': { message: 'Cet enregistrement existe déjà', level: ERROR_LEVELS.WARNING },
  '23503': { message: 'Référence invalide - vérifiez les dépendances', level: ERROR_LEVELS.ERROR },
  '42P01': { message: 'Table introuvable', level: ERROR_LEVELS.CRITICAL },
  '42501': { message: 'Permission refusée', level: ERROR_LEVELS.ERROR },
  'PGRST301': { message: 'JWT expiré ou invalide', level: ERROR_LEVELS.ERROR },
  'PGRST116': { message: 'Limite de résultats dépassée', level: ERROR_LEVELS.WARNING },
};

/**
 * Gère une erreur Supabase et retourne un objet standardisé
 * @param {Error|null} error - L'erreur Supabase
 * @param {string} context - Contexte de l'opération (ex: 'fetch clients')
 * @returns {Object} Objet standardisé { handled: boolean, message: string, level: string, shouldThrow: boolean }
 */
export function handleSupabaseError(error, context = '') {
  if (!error) {
    return { handled: false, message: '', level: ERROR_LEVELS.INFO, shouldThrow: false };
  }

  const code = error.code || error.statusCode || 'UNKNOWN';
  const knownError = SUPABASE_ERROR_CODES[code];

  const result = {
    handled: true,
    code,
    originalError: IS_DEV ? error : undefined,
    message: knownError?.message || error.message || 'Une erreur est survenue',
    level: knownError?.level || ERROR_LEVELS.ERROR,
    shouldThrow: knownError?.level === ERROR_LEVELS.CRITICAL,
    context,
  };

  // Log conditionnel selon l'environnement
  if (IS_DEV) {
    console.error(`[Supabase Error${context ? ` - ${context}` : ''}]`, {
      code: result.code,
      message: result.message,
      details: error.details,
      hint: error.hint,
    });
  }

  return result;
}

/**
 * Vérifie si une réponse Supabase contient une erreur
 * @param {Object} response - Réponse Supabase { data, error }
 * @param {string} context - Contexte de l'opération
 * @param {Object} options - Options { throwOnError: boolean, silent: boolean }
 * @returns {Object} { success: boolean, data, error, message }
 */
export function checkSupabaseResponse(response, context = '', options = {}) {
  const { throwOnError = false, silent = false } = options;

  if (response.error) {
    const handled = handleSupabaseError(response.error, context);

    if (throwOnError || handled.shouldThrow) {
      throw new Error(handled.message);
    }

    return {
      success: false,
      data: null,
      error: response.error,
      message: handled.message,
      level: handled.level,
    };
  }

  if (!silent && IS_DEV) {
    console.log(`[Supabase Success${context ? ` - ${context}` : ''}]`, {
      count: Array.isArray(response.data) ? response.data.length : 1,
    });
  }

  return {
    success: true,
    data: response.data,
    error: null,
    message: '',
    level: ERROR_LEVELS.INFO,
  };
}

/**
 * Wrapper pour les opérations Supabase avec retry
 * @param {Function} operation - Fonction retournant une promesse Supabase
 * @param {Object} options - Options { retries: number, delay: number, context: string }
 * @returns {Promise<Object>} Résultat standardisé
 */
export async function withSupabaseRetry(operation, options = {}) {
  const { retries = 3, delay = 1000, context = '' } = options;

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await operation();
      return checkSupabaseResponse(result, context, { silent: attempt > 1 });
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        if (IS_DEV) {
          console.warn(`[Supabase Retry${context ? ` - ${context}` : ''}] Tentative ${attempt}/${retries} échouée, nouvelle tentative dans ${delay}ms...`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    data: null,
    error: lastError,
    message: lastError?.message || 'Échec après plusieurs tentatives',
    level: ERROR_LEVELS.ERROR,
  };
}
