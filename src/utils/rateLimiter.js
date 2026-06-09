/**
 * Rate Limiter pour protéger contre les attaques par force brute
 * Limite les tentatives de connexion et bloque temporairement après échecs
 */

import { logger } from './logger.js';

const LOGIN_ATTEMPTS_KEY = 'sika_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Vérifie si l'utilisateur est actuellement bloqué
 */
export function isLoginBlocked(identifier) {
  const attempts = getLoginAttempts();
  const userAttempts = attempts[identifier];
  
  if (!userAttempts) return false;
  
  const { count, lastAttempt, lockedUntil } = userAttempts;
  
  // Si bloqué, vérifier si le délai est écoulé
  if (lockedUntil && Date.now() < lockedUntil) {
    const remainingMinutes = Math.ceil((lockedUntil - Date.now()) / 60000);
    return { blocked: true, remainingMinutes };
  }
  
  // Si bloqué mais délai écoulé, réinitialiser
  if (lockedUntil && Date.now() >= lockedUntil) {
    clearLoginAttempts(identifier);
    return false;
  }
  
  return false;
}

/**
 * Enregistre une tentative de connexion (succès ou échec)
 */
export function recordLoginAttempt(identifier, success = false) {
  const attempts = getLoginAttempts();
  const now = Date.now();
  
  if (!attempts[identifier]) {
    attempts[identifier] = { count: 0, lastAttempt: now, lockedUntil: null };
  }
  
  const userAttempts = attempts[identifier];
  
  if (success) {
    // Réinitialiser après succès
    delete attempts[identifier];
    saveLoginAttempts(attempts);
    return { blocked: false };
  }
  
  // Incrémenter le compteur d'échecs
  userAttempts.count += 1;
  userAttempts.lastAttempt = now;
  
  // Bloquer si trop de tentatives
  if (userAttempts.count >= MAX_ATTEMPTS) {
    userAttempts.lockedUntil = now + LOCKOUT_DURATION;
    saveLoginAttempts(attempts);
    return { 
      blocked: true, 
      remainingMinutes: Math.ceil(LOCKOUT_DURATION / 60000),
      message: `Compte temporairement bloqué. Réessayez dans ${Math.ceil(LOCKOUT_DURATION / 60000)} minutes.`
    };
  }
  
  saveLoginAttempts(attempts);
  
  const remainingAttempts = MAX_ATTEMPTS - userAttempts.count;
  return { 
    blocked: false, 
    remainingAttempts,
    message: `Identifiants incorrects. ${remainingAttempts} tentative${remainingAttempts > 1 ? 's' : ''} restante${remainingAttempts > 1 ? 's' : ''}.`
  };
}

/**
 * Récupère les tentatives stockées (en mémoire uniquement pour la sécurité)
 * Note: Utilise sessionStorage au lieu de localStorage pour ne pas persister
 */
function getLoginAttempts() {
  try {
    // Utiliser sessionStorage pour ne pas persister entre les sessions
    const stored = sessionStorage.getItem(LOGIN_ATTEMPTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Sauvegarde les tentatives
 */
function saveLoginAttempts(attempts) {
  try {
    sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch (e) {
    logger.warn('Rate Limiter: Impossible de sauvegarder', e);
  }
}

/**
 * Efface les tentatives pour un identifiant
 */
export function clearLoginAttempts(identifier) {
  const attempts = getLoginAttempts();
  delete attempts[identifier];
  saveLoginAttempts(attempts);
}

/**
 * Réinitialise toutes les tentatives (utile pour les tests)
 */
export function resetAllLoginAttempts() {
  sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY);
}

/**
 * Hook React pour le rate limiting
 */
export function useLoginRateLimit() {
  return {
    isBlocked: (identifier) => isLoginBlocked(identifier),
    recordAttempt: (identifier, success) => recordLoginAttempt(identifier, success),
    clearAttempts: (identifier) => clearLoginAttempts(identifier),
    resetAll: () => resetAllLoginAttempts()
  };
}
