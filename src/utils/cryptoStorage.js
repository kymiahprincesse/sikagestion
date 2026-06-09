/**
 * Chiffrement/déchiffrement pour le stockage local (localStorage/sessionStorage)
 * Utilise AES-GCM avec une clé dérivée du mot de passe utilisateur
 * 
 * IMPORTANT: Ce chiffrement côté client protège contre l'accès physique au localStorage
 * mais ne remplace pas une sécurité serveur robuste.
 */

import { logger } from './logger.js';

const STORAGE_KEY_PREFIX = 'sika_enc_';

/**
 * Dérive une clé de chiffrement à partir d'une passphrase
 */
async function deriveKey(passphrase) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('sika_storage_salt_2024'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Chiffre les données avant stockage
 */
export async function encryptData(data, passphrase) {
  try {
    const key = await deriveKey(passphrase);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(JSON.stringify(data))
    );

    // Combine IV + encrypted data pour le stockage
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    logger.error('Erreur chiffrement:', error);
    return null;
  }
}

/**
 * Déchiffre les données depuis le stockage
 */
export async function decryptData(encryptedData, passphrase) {
  try {
    const key = await deriveKey(passphrase);
    const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  } catch (error) {
    logger.error('Erreur déchiffrement:', error);
    return null;
  }
}

/**
 * Stocke des données chiffrées dans localStorage
 */
export async function setEncryptedItem(key, data, passphrase) {
  const encrypted = await encryptData(data, passphrase);
  if (encrypted) {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, encrypted);
    return true;
  }
  return false;
}

/**
 * Récupère et déchiffre des données depuis localStorage
 */
export async function getEncryptedItem(key, passphrase) {
  const encrypted = localStorage.getItem(STORAGE_KEY_PREFIX + key);
  if (!encrypted) return null;
  return await decryptData(encrypted, passphrase);
}

/**
 * Supprime une entrée chiffrée
 */
export function removeEncryptedItem(key) {
  localStorage.removeItem(STORAGE_KEY_PREFIX + key);
}

/**
 * Nettoie toutes les entrées chiffrées
 */
export function clearEncryptedStorage() {
  Object.keys(localStorage)
    .filter(key => key.startsWith(STORAGE_KEY_PREFIX))
    .forEach(key => localStorage.removeItem(key));
}
