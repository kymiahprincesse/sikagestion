import { supabase } from './supabaseClient';
import { connectionManager } from './connectionManager';
import { logger } from '../utils/logger';

/**
 * Exécute une opération Supabase, et si elle échoue pour cause de réseau,
 * la met en file d'attente (Dexie) pour exécution ultérieure.
 * 
 * @param {string} table Nom de la table
 * @param {string} operation 'insert' | 'update' | 'delete'
 * @param {object} payload Les données (incluant l'id)
 * @returns {Promise<{data: any, error: any, offline: boolean}>}
 */
export async function safeSupabaseExecute(table, operation, payload) {
  // 1. Si on sait déjà qu'on est hors ligne, on met directement en queue
  if (!navigator.onLine || !connectionManager.isSupabaseConnected) {
    logger.info(`Mode Hors Ligne : Opération ${operation} sur ${table} mise en attente.`);
    connectionManager.queueOperation({ table, operation, data: payload, id: payload.id });
    return { data: payload, error: null, offline: true };
  }

  // 2. Si on est en ligne, on tente l'opération normalement
  try {
    let result;
    switch (operation) {
      case 'insert':
        result = await supabase.from(table).insert(payload).select().single();
        break;
      case 'update':
        result = await supabase.from(table).update(payload).eq('id', payload.id).select().single();
        break;
      case 'delete':
        result = await supabase.from(table).delete().eq('id', payload.id);
        break;
      default:
        throw new Error(`Opération inconnue: ${operation}`);
    }

    // 3. En cas d'erreur de réseau inattendue (ex: "Failed to fetch")
    if (result.error && (result.error.message === 'Failed to fetch' || result.error.code === 'NETWORK_ERROR')) {
      logger.warn(`Erreur réseau inattendue, mise en queue de ${operation} sur ${table}.`);
      connectionManager.queueOperation({ table, operation, data: payload, id: payload.id });
      return { data: payload, error: null, offline: true };
    }

    return { ...result, offline: false };
  } catch (error) {
    // Erreur fatale (souvent réseau)
    if (error.message === 'Failed to fetch') {
      logger.warn(`Fetch failed, mise en queue de ${operation} sur ${table}.`);
      connectionManager.queueOperation({ table, operation, data: payload, id: payload.id });
      return { data: payload, error: null, offline: true };
    }
    return { data: null, error, offline: false };
  }
}
