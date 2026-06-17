#!/usr/bin/env node
/**
 * 🔧 Activation des Utilisateurs Inactifs
 * Script pour activer tous les utilisateurs dans Supabase
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '../.env.local')

// ── LIRE .env.local ──
function loadEnv() {
  if (!fs.existsSync(envPath)) {
    console.error('❌ Fichier .env.local non trouvé')
    process.exit(1)
  }

  const content = fs.readFileSync(envPath, 'utf8')
  const env = {}
  
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match && !line.startsWith('#')) {
      env[match[1].trim()] = match[2].trim()
    }
  })

  return env
}

async function activateAllUsers() {
  const env = loadEnv()
  const url = env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('❌ VITE_SUPABASE_URL ou clé API manquante')
    process.exit(1)
  }

  console.log('\n' + '='.repeat(60))
  console.log('  🔧 ACTIVATION DES UTILISATEURS INACTIFS')
  console.log('='.repeat(60) + '\n')

  const supabase = createClient(url, key)

  // ── 1. Vérifier les utilisateurs actuels ──
  console.log('📋 Vérification des utilisateurs...')
  const { data: users, error: fetchError } = await supabase
    .from('utilisateurs')
    .select('id, nom, login, email, is_actif')
    .order('id')

  if (fetchError) {
    console.error('❌ Erreur fetch utilisateurs:', fetchError.message)
    process.exit(1)
  }

  if (!users || users.length === 0) {
    console.log('⚠️  Aucun utilisateur trouvé dans la table utilisateurs')
    console.log('📝 Vous devez d\'abord créer au moins un utilisateur')
    process.exit(0)
  }

  console.log(`✅ ${users.length} utilisateur(s) trouvé(s):\n`)

  users.forEach((user, i) => {
    const status = user.is_actif ? '✅ ACTIF' : '❌ INACTIF'
    console.log(`  ${i + 1}. [#${String(user.id).padStart(3, '0')}] ${user.nom} (${user.login}) — ${status}`)
  })

  const inactifs = users.filter(u => !u.is_actif)
  
  if (inactifs.length === 0) {
    console.log('\n✅ Tous les utilisateurs sont déjà actifs!')
    process.exit(0)
  }

  console.log(`\n⚠️  ${inactifs.length} utilisateur(s) inactif(s)`)

  // ── 2. Activer tous les utilisateurs ──
  console.log('\n🚀 Activation en cours...')

  const { error: updateError } = await supabase
    .from('utilisateurs')
    .update({ is_actif: true })
    .neq('is_actif', true)

  if (updateError) {
    console.error('❌ Erreur lors de l\'activation:', updateError.message)
    process.exit(1)
  }

  // ── 3. Vérifier le résultat ──
  console.log('✅ Utilisateurs activés!')

  const { data: updatedUsers } = await supabase
    .from('utilisateurs')
    .select('id, nom, login, is_actif')
    .order('id')

  console.log('\n📋 État après activation:\n')
  updatedUsers.forEach((user, i) => {
    console.log(`  ${i + 1}. [#${String(user.id).padStart(3, '0')}] ${user.nom} — ✅ ACTIF`)
  })

  console.log('\n' + '='.repeat(60))
  console.log('✅ TOUS LES UTILISATEURS SONT MAINTENANT ACTIFS!')
  console.log('='.repeat(60) + '\n')

  console.log('📝 Prochaines étapes:')
  console.log('  1. Reconnectez-vous avec vos identifiants')
  console.log('  2. Si le problème persiste, vérifiez:')
  console.log('     - Le hash VITE_SUPER_ADMIN_PASSWORD_HASH (.env.local)')
  console.log('     - Le compte dans Supabase Auth')
  console.log('  3. Consultez TROUBLESHOOTING_COMPLET.md\n')
}

activateAllUsers().catch(err => {
  console.error('❌ Erreur:', err.message)
  process.exit(1)
})
