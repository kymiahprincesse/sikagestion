/**
 * PURGE DONNÉES FICTIVES - PRODUCTION
 * Supprime toutes les données de test de Supabase
 * Usage: node scripts/purge-donnees-fictives.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://keyfnghpisdwwayrmlfk.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleWZuZ2hwaXNkd3dheXJtbGZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA2MDc0NSwiZXhwIjoyMDk1NjM2NzQ1fQ.oxeZXO4ANmjCuaHWXB60feqaEw-SakbCjOCdiorLLj8'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const TABLES_A_PURGER = [
  'mouvements_caisse',
  'encaissements',
  'factures',
  'devis',
  'appels_offres',
  'clients',
  'fournisseurs',
  'projets',
  'taches',
  'ressources_hebdo',
]

async function compterLignes(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) return `ERREUR: ${error.message}`
  return count
}

async function purgerTable(table) {
  const { error } = await supabase.from(table).delete().neq('id', 0)
  if (error) {
    // essai avec id non nul (uuid)
    const { error: err2 } = await supabase.from(table).delete().not('id', 'is', null)
    if (err2) return { ok: false, msg: err2.message }
  }
  return { ok: true }
}

async function main() {
  console.log('\n🚀 PURGE DES DONNÉES FICTIVES - SIKA GESTION PRODUCTION\n')
  console.log('='.repeat(55))

  // 1. Afficher le nombre de lignes avant purge
  console.log('\n📊 ÉTAT AVANT PURGE:')
  for (const table of TABLES_A_PURGER) {
    const n = await compterLignes(table)
    console.log(`  ${table}: ${n} ligne(s)`)
  }

  console.log('\n🗑  SUPPRESSION EN COURS...\n')

  // 2. Ordre important: d'abord les tables dépendantes
  const ordreSupp = [
    'encaissements',
    'mouvements_caisse',
    'taches',
    'ressources_hebdo',
    'factures',
    'devis',
    'appels_offres',
    'projets',
    'clients',
    'fournisseurs',
  ]

  for (const table of ordreSupp) {
    const avant = await compterLignes(table)
    if (avant === 0) {
      console.log(`  ✅ ${table}: déjà vide`)
      continue
    }
    const res = await purgerTable(table)
    if (res.ok) {
      console.log(`  ✅ ${table}: ${avant} ligne(s) supprimée(s)`)
    } else {
      console.log(`  ❌ ${table}: ${res.msg}`)
    }
  }

  // 3. Vérification finale
  console.log('\n📊 ÉTAT APRÈS PURGE:')
  for (const table of TABLES_A_PURGER) {
    const n = await compterLignes(table)
    const ok = n === 0 ? '✅' : '⚠️'
    console.log(`  ${ok} ${table}: ${n} ligne(s)`)
  }

  console.log('\n✅ PURGE TERMINÉE — L\'application est prête pour la PRODUCTION.\n')
  console.log('ℹ️  Les comptes utilisateurs (table "utilisateurs") sont conservés.')
  console.log('='.repeat(55) + '\n')
}

main().catch(err => {
  console.error('Erreur fatale:', err)
  process.exit(1)
})
