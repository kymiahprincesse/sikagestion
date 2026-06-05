#!/usr/bin/env node

/**
 * Script de SYNCHRONISATION - Encaissements vers Journal de Caisse
 * Crée des mouvements d'ENTRÉE pour tous les encaissements existants
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://keyfnghpisdwwayrmlfk.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleWZuZ2hwaXNkd3dheXJtbGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjA3NDUsImV4cCI6MjA5NTYzNjc0NX0.IWdepYM5NNQp23Qa8YVxwTYY7ngzwtqBW6HSFNI71EQ'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('═══════════════════════════════════════════════════════════════')
console.log('🔄 SYNCHRONISATION ENCAISSEMENTS → JOURNAL DE CAISSE')
console.log('═══════════════════════════════════════════════════════════════\n')

async function syncEncaissements() {
  // 1. Récupérer tous les encaissements
  console.log('📥 Récupération des encaissements...')
  const { data: encaissements, error: err1 } = await supabase
    .from('encaissements')
    .select('*, factures(numero, objet)')
    .order('date_encaissement', { ascending: true })

  if (err1) {
    console.error('❌ Erreur:', err1.message)
    return
  }

  if (!encaissements || encaissements.length === 0) {
    console.log('ℹ️  Aucun encaissement à synchroniser')
    return
  }

  console.log(`   ✅ ${encaissements.length} encaissements trouvés\n`)

  // 2. Vérifier les encaissements déjà synchronisés
  console.log('🔍 Vérification des mouvements existants...')
  const { data: mouvementsExistants, error: err2 } = await supabase
    .from('mouvements_caisse')
    .select('id, description')
    .like('description', '%[ENCAISSEMENT]%')

  if (err2) {
    console.error('❌ Erreur:', err2.message)
    return
  }

  const descriptionsExistantes = new Set(mouvementsExistants?.map(m => m.description) || [])
  console.log(`   ℹ️  ${descriptionsExistantes.size} mouvements déjà présents\n`)

  // 3. Créer les mouvements manquants
  console.log('💰 Création des mouvements de caisse...\n')
  
  let crees = 0
  let ignores = 0
  let erreurs = 0

  for (const enc of encaissements) {
    const factureNum = enc.factures?.numero || 'N/A'
    const description = `[ENCAISSEMENT] ${factureNum} - ${enc.client_nom || 'Client'}`
    
    // Vérifier si déjà existant
    if (descriptionsExistantes.has(description)) {
      console.log(`   ⏭️  Ignoré (existe déjà): ${description}`)
      ignores++
      continue
    }

    const mouvement = {
      date: enc.date_encaissement || new Date().toISOString().split('T')[0],
      type: 'ENTREE',
      categorie: 'PAIEMENT_CLIENT',
      montant: enc.montant,
      description: description,
      beneficiaire: enc.client_nom || 'Client',
      mode_paiement: enc.mode_paiement || 'VIREMENT',
      piece_justificative: enc.reference || `ENC-${enc.id}`,
      utilisateur: 'Synchronisation',
      date_creation: enc.date_creation || new Date().toISOString()
    }

    const { data: mvt, error: errInsert } = await supabase
      .from('mouvements_caisse')
      .insert(mouvement)
      .select()
      .single()

    if (errInsert) {
      console.error(`   ❌ Erreur insertion: ${errInsert.message}`)
      erreurs++
    } else {
      console.log(`   ✅ Créé: ${description} (${enc.montant.toLocaleString('fr-FR')} FCFA)`)
      crees++
      
      // Mettre à jour l'encaissement avec la référence
      await supabase
        .from('encaissements')
        .update({ mouvement_caisse_id: mvt.id })
        .eq('id', enc.id)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('📊 RÉSULTATS DE LA SYNCHRONISATION')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`   ✅ Mouvements créés: ${crees}`)
  console.log(`   ⏭️  Déjà existants:  ${ignores}`)
  console.log(`   ❌ Erreurs:         ${erreurs}`)
  console.log('═══════════════════════════════════════════════════════════════\n')
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
  await syncEncaissements()
}

main().catch(err => {
  console.error('\n❌ ERREUR FATALE:', err.message)
  process.exit(1)
})
