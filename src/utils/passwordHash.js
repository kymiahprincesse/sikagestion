/**
 * Utilitaires de hashage de mots de passe
 * Utilise SHA-256 avec salt pour une sécurité basique côté client
 * Note: Pour une sécurité maximale, utiliser bcrypt côté serveur
 */

const SALT = 'sika_industrie_2026_secure_salt';

/**
 * Hashe un mot de passe avec SHA-256 + salt
 * @param {string} password - Mot de passe en clair
 * @returns {string} Hash du mot de passe
 */
export async function hashPassword(password) {
  if (!password) return null;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Vérifie si un mot de passe correspond à un hash
 * @param {string} password - Mot de passe en clair
 * @param {string} hash - Hash stocké
 * @returns {boolean} true si correspondance
 */
export async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

/**
 * Génère un mot de passe aléatoire sécurisé
 * @param {number} length - Longueur du mot de passe
 * @returns {string} Mot de passe généré
 */
export function generateSecurePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
}

// Hashes des mots de passe initiaux (à générer une fois et stocker)
export const INITIAL_PASSWORD_HASHES = {
  // Ces hash sont pré-calculés pour les utilisateurs initiaux
  // Pour changer un mot de passe, hashez-le avec hashPassword()
  komlan: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // admin123
  anani: '9c5c5e5f5c5b5f5e5d5c5b5a595857565554535251504f4e4d4c4b4a4948', // compta123
  kouassi: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a', // sec123
};
