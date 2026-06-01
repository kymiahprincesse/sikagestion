#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 * SCRIPT D'INJECTION COMPLÈTE - SIKAGESTION
 * ═══════════════════════════════════════════════════════════════
 * 
 * Ce script injecte TOUTES les données nécessaires pour remplir
 * TOUS les indicateurs du Dashboard sans aucune case vide.
 * 
 * Données injectées:
 * ✓ Clients (5)
 * ✓ Fournisseurs (4)
 * ✓ Projets (15)
 * ✓ Devis (4 + lignes)
 * ✓ Factures (3 + lignes + paiements)
 * ✓ Appels d'offres (3)
 * ✓ Mouvements de caisse (73)
 * 
 * Résultat: Dashboard 100% rempli avec données réalistes
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://keyfnghpisdwwayrmlfk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleWZuZ2hwaXNkd3dheXJtbGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjA3NDUsImV4cCI6MjA5NTYzNjc0NX0.IWdepYM5NNQp23Qa8YVxwTYY7ngzwtqBW6HSFNI71EQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('\n')
console.log('╔═══════════════════════════════════════════════════════════════╗')
console.log('║                                                               ║')
console.log('║         🚀 INJECTION COMPLÈTE - SIKAGESTION 2026 🚀          ║')
console.log('║                                                               ║')
console.log('╚═══════════════════════════════════════════════════════════════╝')
console.log('\n')

// Fonction pour nettoyer les données existantes (optionnel)
async function nettoyerDonnees() {
  console.log('🧹 Nettoyage des données existantes...\n')
  
  try {
    await supabase.from('paiements_factures').delete().neq('id', 0)
    await supabase.from('lignes_factures').delete().neq('id', 0)
    await supabase.from('lignes_devis').delete().neq('id', 0)
    await supabase.from('mouvements_caisse').delete().neq('id', 0)
    await supabase.from('factures').delete().neq('id', 0)
    await supabase.from('devis').delete().neq('id', 0)
    await supabase.from('appels_offres').delete().neq('id', 0)
    await supabase.from('projets').delete().neq('id', 0)
    await supabase.from('fournisseurs').delete().neq('id', 0)
    await supabase.from('clients').delete().neq('id', 0)
    
    console.log('✅ Données nettoyées\n')
  } catch (err) {
    console.log('⚠️  Nettoyage ignoré (tables peut-être vides)\n')
  }
}

async function main() {
  try {
    const startTime = Date.now()
    
    // Demander confirmation pour nettoyer
    console.log('⚠️  Ce script va injecter des données complètes.')
    console.log('   Pour nettoyer d\'abord, décommentez la ligne nettoyerDonnees()\n')
    
    // await nettoyerDonnees() // Décommenter pour nettoyer avant injection
    
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('📦 ÉTAPE 1/3 - Injection des données de base')
    console.log('═══════════════════════════════════════════════════════════════\n')
    
    // Exécuter inject-data.mjs
    console.log('→ Exécution: Clients, Fournisseurs, Projets...')
    const { execSync } = await import('child_process')
    execSync('node inject-data.mjs', { stdio: 'inherit' })
    
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('📦 ÉTAPE 2/3 - Injection Devis, Factures, Appels d\'offres')
    console.log('═══════════════════════════════════════════════════════════════\n')
    
    // Exécuter inject-all-complete.mjs
    console.log('→ Exécution: Devis, Factures, AO...')
    execSync('node inject-all-complete.mjs', { stdio: 'inherit' })
    
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('📦 ÉTAPE 3/3 - Injection Mouvements de Caisse')
    console.log('═══════════════════════════════════════════════════════════════\n')
    
    // Exécuter inject-caisse-complete.mjs
    console.log('→ Exécution: Mouvements de caisse...')
    execSync('node inject-caisse-complete.mjs', { stdio: 'inherit' })
    
    // Exécuter inject-donnees-dashboard-complete.mjs
    console.log('\n→ Exécution: Équilibrage caisse...')
    execSync('node inject-donnees-dashboard-complete.mjs', { stdio: 'inherit' })
    
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    
    console.log('\n')
    console.log('╔═══════════════════════════════════════════════════════════════╗')
    console.log('║                                                               ║')
    console.log('║              ✅ INJECTION COMPLÈTE RÉUSSIE ! ✅              ║')
    console.log('║                                                               ║')
    console.log('╚═══════════════════════════════════════════════════════════════╝')
    console.log('\n')
    console.log('📊 RÉCAPITULATIF DES DONNÉES INJECTÉES')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('✓ Clients:              5 entreprises ivoiriennes')
    console.log('✓ Fournisseurs:         4 fournisseurs actifs')
    console.log('✓ Projets:              15 projets (statuts variés)')
    console.log('✓ Devis:                4 devis + 20 lignes détaillées')
    console.log('✓ Factures:             3 factures + 14 lignes + 2 paiements')
    console.log('✓ Appels d\'offres:      3 AO (statuts variés)')
    console.log('✓ Mouvements caisse:    73 mouvements (entrées/sorties)')
    console.log('✓ Solde caisse:         53 848 500 FCFA (positif)')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`⏱️  Temps d'exécution: ${duration}s\n`)
    
    console.log('🌐 ACCÈS À L\'APPLICATION')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('Dashboard:          http://localhost:5187/dashboard')
    console.log('Clients:            http://localhost:5187/clients')
    console.log('Devis:              http://localhost:5187/devis/liste')
    console.log('Factures:           http://localhost:5187/factures')
    console.log('Appels d\'offres:    http://localhost:5187/ao')
    console.log('Caisse:             http://localhost:5187/caisse')
    console.log('Planification:      http://localhost:5187/planification')
    console.log('═══════════════════════════════════════════════════════════════\n')
    
    console.log('💡 INDICATEURS DASHBOARD - TOUS REMPLIS !')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('✓ Solde Caisse:                 53 848 500 FCFA')
    console.log('✓ Chiffre d\'affaires:           Données mensuelles complètes')
    console.log('✓ Dépenses:                     Toutes catégories remplies')
    console.log('✓ Factures en attente:          2 factures (GESTOCI, CIE)')
    console.log('✓ Projets actifs:               15 projets avec budgets')
    console.log('✓ Graphiques:                   Données temps réel Supabase')
    console.log('═══════════════════════════════════════════════════════════════\n')
    
    console.log('🎯 PROCHAINES ÉTAPES')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('1. Démarrer le serveur:  npm run dev')
    console.log('2. Ouvrir le Dashboard:  http://localhost:5187/dashboard')
    console.log('3. Vérifier les données en temps réel depuis Supabase')
    console.log('4. Tester les fonctionnalités de chaque module')
    console.log('═══════════════════════════════════════════════════════════════\n')
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DE L\'INJECTION:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

main()
