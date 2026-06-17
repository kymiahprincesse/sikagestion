#!/usr/bin/env node

/**
 * Script de NETTOYAGE COMPLET - Journal de Caisse
 * Supprime toutes les données fictives et réinitialise la synchronisation
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('ERREUR: VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requises pour exécuter ce script.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('═══════════════════════════════════════════════════════════════')
console.log('🧹 NETTOYAGE COMPLET - JOURNAL DE CAISSE')
console.log('═══════════════════════════════════════════════════════════════\n')

async function cleanupJournal() {
  console.log('⚠️  Suppression de toutes les données du journal...\n')

  // 1. Supprimer tous les mouvements de caisse
  console.log('1️⃣ Suppression des mouvements_caisse...')
  const { data: mouvements, error: err1 } = await supabase
    .from('mouvements_caisse')
    .select('id')
  
  if (err1) {
    console.error('   ❌ Erreur:', err1.message)
  } else if (mouvements?.length > 0) {
    const { error: delErr } = await supabase
      .from('mouvements_caisse')
      .delete()
      .in('id', mouvements.map(m => m.id))
    if (delErr) console.error('   ❌ Erreur suppression:', delErr.message)
    else console.log(`   ✅ ${mouvements.length} mouvements supprimés`)
  } else {
    console.log('   ℹ️  Aucun mouvement à supprimer')
  }

  // 2. Réinitialiser les références dans depenses
  console.log('\n2️⃣ Réinitialisation des références dépenses...')
  const { data: depenses, error: err2 } = await supabase
    .from('depenses')
    .select('id, mouvement_caisse_id')
    .not('mouvement_caisse_id', 'is', null)
  
  if (err2) {
    console.error('   ❌ Erreur:', err2.message)
  } else if (depenses?.length > 0) {
    for (const dep of depenses) {
      const { error: updErr } = await supabase
        .from('depenses')
        .update({ mouvement_caisse_id: null, statut: 'VALIDE' })
        .eq('id', dep.id)
      if (updErr) console.error(`   ❌ Erreur dépense #${dep.id}:`, updErr.message)
    }
    console.log(`   ✅ ${depenses.length} dépenses réinitialisées`)
  } else {
    console.log('   ℹ️  Aucune dépense liée à réinitialiser')
  }

  // 3. Réinitialiser les références dans achats
  console.log('\n3️⃣ Réinitialisation des références achats...')
  const { data: achats, error: err3 } = await supabase
    .from('achats')
    .select('id, mouvement_caisse_id')
    .not('mouvement_caisse_id', 'is', null)
  
  if (err3) {
    console.error('   ❌ Erreur:', err3.message)
  } else if (achats?.length > 0) {
    for (const ach of achats) {
      const { error: updErr } = await supabase
        .from('achats')
        .update({ mouvement_caisse_id: null, statut: 'VALIDE' })
        .eq('id', ach.id)
      if (updErr) console.error(`   ❌ Erreur achat #${ach.id}:`, updErr.message)
    }
    console.log(`   ✅ ${achats.length} achats réinitialisés`)
  } else {
    console.log('   ℹ️  Aucun achat lié à réinitialiser')
  }

  // 4. Supprimer les écritures comptables (optionnel)
  console.log('\n4️⃣ Suppression des écritures comptables...')
  const { data: ecritures, error: err4 } = await supabase
    .from('ecritures_journal')
    .select('id')
  
  if (err4) {
    console.error('   ❌ Erreur:', err4.message)
  } else if (ecritures?.length > 0) {
    const { error: delErr } = await supabase
      .from('ecritures_journal')
      .delete()
      .in('id', ecritures.map(e => e.id))
    if (delErr) console.error('   ❌ Erreur suppression:', delErr.message)
    else console.log(`   ✅ ${ecritures.length} écritures supprimées`)
  } else {
    console.log('   ℹ️  Aucune écriture à supprimer')
  }

  // 5. Nettoyer les encaissements si nécessaire
  console.log('\n5️⃣ Nettoyage des encaissements...')
  const { data: encaissements, error: err5 } = await supabase
    .from('encaissements')
    .select('id')
  
  if (err5) {
    console.error('   ❌ Erreur:', err5.message)
  } else {
    console.log(`   ℹ️  ${encaissements?.length || 0} encaissements préservés (données réelles)`)
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('✅ NETTOYAGE TERMINÉ')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('\n📋 Résumé:')
  console.log('   • Journal de caisse vidé')
  console.log('   • Dépenses déliées du journal')
  console.log('   • Achats déliés du journal')
  console.log('   • Écritures comptables supprimées')
  console.log('\n🔄 Vous pouvez maintenant:')
  console.log('   1. Créer de nouvelles dépenses/achats et les enregistrer au journal')
  console.log('   2. Synchroniser les encaissements existants')
  console.log('   3. Le journal reçoit uniquement des données réelles\n')
}

async function verifierConnexion() {
  console.log('🔌 Vérification de la connexion Supabase...')
  const { error } = await supabase.from('clients').select('count', { count: 'exact', head: true })
  if (error) {
    console.error('❌ Connexion échouée:', error.message)
    process.exit(1)
  }
  console.log('✅ Connecté à Supabase\n')
}

async function main() {
  await verifierConnexion()
  await cleanupJournal()
}

main().catch(err => {
  console.error('\n❌ ERREUR FATALE:', err.message)
  process.exit(1)
})
