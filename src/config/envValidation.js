/**
 * Validation des variables d'environnement au démarrage
 * Bloque l'application si des variables critiques sont manquantes
 */

const REQUIRED_ENV = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const WARNING_ENV = [
  'VITE_SIKA_MGMT_SECRET',
  'VITE_SUPER_ADMIN_LOGIN',
  'VITE_SUPER_ADMIN_PASSWORD_HASH',
];

/**
 * Valide que toutes les variables requises sont présentes
 * @returns {Object} { valid: boolean, missing: string[], warnings: string[] }
 */
export function validateEnv() {
  const missing = REQUIRED_ENV.filter(v => !import.meta.env[v]);
  const warnings = WARNING_ENV.filter(v => !import.meta.env[v]);

  if (missing.length > 0) {
    console.error('╔══════════════════════════════════════════════════════════╗');
    console.error('║  SIKA GESTION - ERREUR DE CONFIGURATION                  ║');
    console.error('╠══════════════════════════════════════════════════════════╣');
    console.error('║  Variables d\'environnement manquantes :                 ║');
    missing.forEach(v => console.error(`║  • ${v.padEnd(48)}║`));
    console.error('╠══════════════════════════════════════════════════════════╣');
    console.error('║  Créez un fichier .env.local avec ces variables.        ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
  }

  if (warnings.length > 0) {
    console.warn('[SIKA CONFIG] Variables optionnelles manquantes :', warnings.join(', '));
    console.warn('[SIKA CONFIG] Certaines fonctionnalités seront désactivées.');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * Vérifie si on est en mode production
 */
export function isProduction() {
  return import.meta.env.PROD === true;
}

/**
 * Vérifie si le mode debug est actif
 */
export function isDebugMode() {
  return import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.DEV === true;
}

// Auto-validation au chargement du module
export const envStatus = validateEnv();

// Exporter le statut pour usage dans l'application
export default envStatus;
