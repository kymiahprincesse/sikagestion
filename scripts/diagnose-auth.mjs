#!/usr/bin/env node
/**
 * Script de Diagnostic SIKA - Authentification
 * Vérifie la configuration d'authentification et Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');

// ── UTILS ──
function log(icon, msg) {
  const colors = {
    '✅': '\x1b[32m',  // Green
    '❌': '\x1b[31m',  // Red
    '⚠️': '\x1b[33m',  // Yellow
    '📋': '\x1b[36m',  // Cyan
    '🔍': '\x1b[35m'   // Magenta
  };
  const reset = '\x1b[0m';
  const color = colors[icon] || '';
  console.log(`${color}${icon}${reset} ${msg}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

// ── LIRE .env.local ──
function loadEnv() {
  if (!fs.existsSync(envPath)) {
    log('❌', `Fichier .env.local non trouvé à: ${envPath}`);
    log('⚠️', 'Créez .env.local avec les variables de configuration');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith('#')) {
      env[match[1].trim()] = match[2].trim();
    }
  });

  return env;
}

// ── VÉRIFICATIONS ──
function checkConfiguration(env) {
  section('🔍 CONFIGURATION SUPABASE');

  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPER_ADMIN_LOGIN',
    'VITE_SUPER_ADMIN_PASSWORD_HASH',
  ];

  let allOk = true;

  required.forEach(key => {
    if (env[key]) {
      const value = key.includes('KEY') || key.includes('HASH') 
        ? env[key].substring(0, 20) + '...' 
        : env[key];
      log('✅', `${key}: ${value}`);
    } else {
      log('❌', `${key}: MANQUANT`);
      allOk = false;
    }
  });

  return allOk;
}

function validateSupabaseURL(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('supabase.co')) {
      return { valid: false, error: 'URL ne ressemble pas à Supabase' };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

function validatePasswordHash(hash) {
  if (!hash || hash.length === 0) {
    return { valid: false, error: 'Hash vide' };
  }
  if (hash.includes('votre') || hash.includes('LE_HASH')) {
    return { valid: false, error: 'Hash non remplacé (placeholder)' };
  }
  if (hash.length !== 64) {
    return { valid: false, error: `Longueur invalide: ${hash.length} (attendu: 64)` };
  }
  if (!/^[a-f0-9]+$/i.test(hash)) {
    return { valid: false, error: 'Contient des caractères invalides (doit être hex)' };
  }
  return { valid: true };
}

function checkPasswordHash(env) {
  section('🔐 VALIDATION HASH SUPER ADMIN');

  const hash = env.VITE_SUPER_ADMIN_PASSWORD_HASH;
  const validation = validatePasswordHash(hash);

  if (!validation.valid) {
    log('❌', `Hash invalide: ${validation.error}`);
    log('⚠️', 'Régénérez le hash avec generate-password-hash.html');
    return false;
  }

  log('✅', 'Hash valide (64 caractères hex)');
  return true;
}

function checkSupabaseURL(env) {
  section('🌐 VALIDATION URL SUPABASE');

  const url = env.VITE_SUPABASE_URL;
  const validation = validateSupabaseURL(url);

  if (!validation.valid) {
    log('❌', `URL invalide: ${validation.error}`);
    return false;
  }

  log('✅', `URL Supabase valide: ${url}`);
  return true;
}

function checkAPIKey(env) {
  section('🔑 VALIDATION CLÉ API SUPABASE');

  const key = env.VITE_SUPABASE_ANON_KEY;
  
  if (!key || key.length < 20) {
    log('❌', 'Clé API invalide (trop courte)');
    return false;
  }

  if (key.includes('your-') || key.includes('YOUR-')) {
    log('❌', 'Clé API non remplacée (placeholder)');
    return false;
  }

  log('✅', `Clé API valide (${key.length} caractères)`);
  return true;
}

function recommendations(env) {
  section('📋 RECOMMANDATIONS');

  const checks = [
    {
      name: 'Mot de passe SUPER_ADMIN',
      status: env.VITE_SUPER_ADMIN_PASSWORD_HASH?.length === 64,
      action: 'Régénérez le hash pour: 77916407@#@Mu\nVoir: generate-password-hash.html'
    },
    {
      name: 'Utilisateur dans Supabase',
      status: null,
      action: 'Vérifiez dans Supabase Dashboard → Table "utilisateurs"\nAssurez-vous que munokolive@gmail.com existe avec role=SUPER_ADMIN'
    },
    {
      name: 'Compte Supabase Auth',
      status: null,
      action: 'Vérifiez dans Supabase → Authentication → Users\nAssurez-vous que munokolive@gmail.com existe et est confirmé'
    },
    {
      name: 'auth_user_id dans la table',
      status: null,
      action: 'Vérifiez que le champ auth_user_id de l\'utilisateur pointe vers le compte Auth'
    },
    {
      name: 'Row Level Security (RLS)',
      status: null,
      action: 'Vérifiez les politiques RLS sur la table "clients"\nDéveloppez GUIDE_AUTHENTIFICATION_FIX.md pour plus de détails'
    }
  ];

  checks.forEach((check, i) => {
    const num = i + 1;
    if (check.status === true) {
      log('✅', `${num}. ${check.name} — ✓ OK`);
    } else if (check.status === false) {
      log('❌', `${num}. ${check.name}\n   → ${check.action}`);
    } else {
      log('⚠️', `${num}. ${check.name}\n   → ${check.action}`);
    }
  });
}

function main() {
  console.clear();
  log('📋', 'DIAGNOSTIC AUTHENTIFICATION SIKA\n');

  const env = loadEnv();

  const checks = [
    () => checkConfiguration(env),
    () => checkSupabaseURL(env),
    () => checkAPIKey(env),
    () => checkPasswordHash(env),
  ];

  let allPass = true;
  checks.forEach(check => {
    if (!check()) allPass = false;
  });

  recommendations(env);

  section('🎯 PROCHAINES ÉTAPES');

  if (allPass) {
    log('✅', 'Configuration de base OK');
    log('📋', 'Vérifiez maintenant le contenu de Supabase (voir recommandations)');
    log('📋', 'Consultez GUIDE_AUTHENTIFICATION_FIX.md pour les détails complets');
  } else {
    log('❌', 'Des problèmes de configuration ont été trouvés');
    log('⚠️', 'Corrigez les erreurs ci-dessus avant de continuer');
  }

  console.log('\n');
}

main();
