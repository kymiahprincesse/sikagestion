#!/usr/bin/env node

/**
 * Script d'injection des TÂCHES DÉTAILLÉES pour justifier les budgets projets
 * Exécuter avec: node inject-TACHES-detaillees.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://keyfnghpisdwwayrmlfk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleWZuZ2hwaXNkd3dheXJtbGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjA3NDUsImV4cCI6MjA5NTYzNjc0NX0.IWdepYM5NNQp23Qa8YVxwTYY7ngzwtqBW6HSFNI71EQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('═══════════════════════════════════════════════════════════════')
console.log('🔧 INJECTION TÂCHES DÉTAILLÉES - JUSTIFICATION BUDGETS')
console.log('═══════════════════════════════════════════════════════════════\n')

// ═══════════════════════════════════════════════════════════════
// PARAMÈTRES DE CALCUL (selon les paramètres de l'app)
// ═══════════════════════════════════════════════════════════════

const INDEMNITE_REPAS = 5000 // FCFA par technicien par jour
const PRIX_CARBURANT = 700 // FCFA par litre
const CONSOMMATION_MOYENNE = 8 // litres/100km

function calculerBudgetTache(params) {
  const { dureeJours, nbTechniciens, kmSite, nbDeplacements, budgetMateriel, budgetSousTraitance } = params
  
  // Calcul carburant: (km * nbDeplacements * consommation / 100) * prix
  const budgetCarburant = Math.round((kmSite * nbDeplacements * CONSOMMATION_MOYENNE / 100) * PRIX_CARBURANT)
  
  // Calcul nourriture: dureeJours * nbTechniciens * indemniteRepas
  const budgetNourriture = dureeJours * nbTechniciens * INDEMNITE_REPAS
  
  // Budget logistique = carburant + nourriture
  const budgetLogistique = budgetCarburant + budgetNourriture
  
  // Coût total
  const coutTotal = budgetLogistique + budgetMateriel + budgetSousTraitance
  
  return {
    budgetCarburant,
    budgetNourriture,
    budgetLogistique,
    budgetMateriel,
    budgetSousTraitance,
    coutTotal
  }
}

// ═══════════════════════════════════════════════════════════════
// RÉCUPÉRATION DES PROJETS EXISTANTS
// ═══════════════════════════════════════════════════════════════

async function recupererProjets() {
  console.log('📋 Récupération des projets existants...')
  const { data, error } = await supabase
    .from('projets')
    .select('id, nom, reference_projet, budget_prevu')
    .order('reference_projet')
  
  if (error) {
    console.error('❌ Erreur:', error.message)
    return null
  }
  
  console.log(`✅ ${data.length} projets récupérés\n`)
  return data
}

// ═══════════════════════════════════════════════════════════════
// DÉFINITION DES TÂCHES PAR PROJET
// ═══════════════════════════════════════════════════════════════

function genererTachesProjet(projet) {
  const ref = projet.reference_projet
  const taches = []
  
  // ═══════════════════════════════════════════════════════════════
  // GESTOCI - PROJ-GEST-2026-001 - Budget: 12 500 000 FCFA
  // ═══════════════════════════════════════════════════════════════
  if (ref === 'PROJ-GEST-2026-001') {
    // Tâche 1: Préparation et dépose ancien calorifuge
    taches.push({
      nom: 'Préparation et dépose ancien calorifuge',
      dateDebut: '2026-03-01',
      dateFin: '2026-03-10',
      dureeJours: 10,
      nbTechniciens: 4,
      kmSite: 25,
      nbDeplacements: 10,
      budgetMateriel: 500000,
      budgetSousTraitance: 0,
      statut: 'EN_COURS',
      notes: 'Dépose calorifuge existant blocs A et B - Évacuation déchets'
    })
    
    // Tâche 2: Fourniture laine de roche et accessoires
    taches.push({
      nom: 'Fourniture laine de roche et accessoires',
      dateDebut: '2026-03-11',
      dateFin: '2026-03-20',
      dureeJours: 10,
      nbTechniciens: 2,
      kmSite: 25,
      nbDeplacements: 5,
      budgetMateriel: 4500000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Laine de roche haute température + tôle alu + fixations'
    })
    
    // Tâche 3: Installation calorifuge conduites vapeur
    taches.push({
      nom: 'Installation calorifuge conduites vapeur',
      dateDebut: '2026-03-21',
      dateFin: '2026-04-15',
      dureeJours: 26,
      nbTechniciens: 6,
      kmSite: 25,
      nbDeplacements: 26,
      budgetMateriel: 2000000,
      budgetSousTraitance: 3500000,
      statut: 'A_FAIRE',
      notes: 'Pose laine de roche + bardage alu - Sous-traitance METALTECH'
    })
    
    // Tâche 4: Tests et réception
    taches.push({
      nom: 'Tests étanchéité et réception',
      dateDebut: '2026-04-16',
      dateFin: '2026-05-15',
      dureeJours: 30,
      nbTechniciens: 3,
      kmSite: 25,
      nbDeplacements: 15,
      budgetMateriel: 300000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Tests thermiques + contrôle qualité + dossier réception'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // GESTOCI - PROJ-GEST-2026-002 - Budget: 28 000 000 FCFA
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-GEST-2026-002') {
    // Tâche 1: Études et relevés terrain
    taches.push({
      nom: 'Études techniques et relevés terrain',
      dateDebut: '2026-01-10',
      dateFin: '2026-01-20',
      dureeJours: 11,
      nbTechniciens: 3,
      kmSite: 30,
      nbDeplacements: 8,
      budgetMateriel: 200000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Relevés topographiques + plans d\'exécution'
    })
    
    // Tâche 2: Fourniture tuyauterie DN200 et raccords
    taches.push({
      nom: 'Fourniture tuyauterie DN200 acier',
      dateDebut: '2026-01-21',
      dateFin: '2026-02-10',
      dureeJours: 21,
      nbTechniciens: 2,
      kmSite: 30,
      nbDeplacements: 10,
      budgetMateriel: 12000000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: '450m tuyauterie DN200 + coudes + brides - ACIER DISTRIBUTION CI'
    })
    
    // Tâche 3: Dépose ancienne tuyauterie
    taches.push({
      nom: 'Dépose ancienne tuyauterie DN200',
      dateDebut: '2026-02-11',
      dateFin: '2026-02-25',
      dureeJours: 15,
      nbTechniciens: 6,
      kmSite: 30,
      nbDeplacements: 15,
      budgetMateriel: 500000,
      budgetSousTraitance: 2000000,
      statut: 'EN_COURS',
      notes: 'Découpe + évacuation ancienne tuyauterie - Levage TRANS-CI'
    })
    
    // Tâche 4: Installation nouvelle tuyauterie
    taches.push({
      nom: 'Installation et soudure tuyauterie neuve',
      dateDebut: '2026-02-26',
      dateFin: '2026-03-20',
      dureeJours: 23,
      nbTechniciens: 8,
      kmSite: 30,
      nbDeplacements: 23,
      budgetMateriel: 3000000,
      budgetSousTraitance: 6500000,
      statut: 'A_FAIRE',
      notes: 'Pose + soudure certifiée + radiographie - METALTECH SOUDURE CI'
    })
    
    // Tâche 5: Tests et mise en service
    taches.push({
      nom: 'Tests hydrostatiques et mise en service',
      dateDebut: '2026-03-21',
      dateFin: '2026-03-30',
      dureeJours: 10,
      nbTechniciens: 4,
      kmSite: 30,
      nbDeplacements: 10,
      budgetMateriel: 800000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Tests pression + contrôle étanchéité + dossier qualité'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // GESTOCI - PROJ-GEST-2025-003 - Budget: 45 000 000 FCFA (TERMINÉ)
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-GEST-2025-003') {
    taches.push({
      nom: 'Inspection vidéo et contrôle épaisseurs',
      dateDebut: '2025-10-01',
      dateFin: '2025-10-15',
      dureeJours: 15,
      nbTechniciens: 4,
      kmSite: 30,
      nbDeplacements: 15,
      budgetMateriel: 1500000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Inspection complète 6 réservoirs R7-R12'
    })
    
    taches.push({
      nom: 'Fourniture tôles et matériaux réparation',
      dateDebut: '2025-10-16',
      dateFin: '2025-11-05',
      dureeJours: 21,
      nbTechniciens: 2,
      kmSite: 30,
      nbDeplacements: 8,
      budgetMateriel: 15000000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Tôles acier + brides + boulonnerie - ACIER DISTRIBUTION CI'
    })
    
    taches.push({
      nom: 'Réparation viroles et fonds réservoirs',
      dateDebut: '2025-11-06',
      dateFin: '2025-12-10',
      dureeJours: 35,
      nbTechniciens: 10,
      kmSite: 30,
      nbDeplacements: 35,
      budgetMateriel: 5000000,
      budgetSousTraitance: 18000000,
      statut: 'TERMINE',
      notes: 'Soudure viroles + remplacement fonds - METALTECH SOUDURE CI'
    })
    
    taches.push({
      nom: 'Tests et certification réservoirs',
      dateDebut: '2025-12-11',
      dateFin: '2025-12-28',
      dureeJours: 18,
      nbTechniciens: 3,
      kmSite: 30,
      nbDeplacements: 18,
      budgetMateriel: 2000000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Tests hydrostatiques + certification APAVE'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SUCRIVOIRE - PROJ-SUCR-2026-001 - Budget: 8 500 000 FCFA (TERMINÉ)
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-SUCR-2026-001') {
    taches.push({
      nom: 'Inspection et diagnostic calorifugeage',
      dateDebut: '2026-02-01',
      dateFin: '2026-02-05',
      dureeJours: 5,
      nbTechniciens: 3,
      kmSite: 180,
      nbDeplacements: 5,
      budgetMateriel: 100000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Diagnostic complet lignes vapeur et eau chaude'
    })
    
    taches.push({
      nom: 'Fourniture matériaux calorifuge',
      dateDebut: '2026-02-06',
      dateFin: '2026-02-10',
      dureeJours: 5,
      nbTechniciens: 2,
      kmSite: 180,
      nbDeplacements: 2,
      budgetMateriel: 3500000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Laine de roche + tôle alu - ISOTHERM AFRIQUE'
    })
    
    taches.push({
      nom: 'Réfection calorifugeage lignes vapeur',
      dateDebut: '2026-02-11',
      dateFin: '2026-02-22',
      dureeJours: 12,
      nbTechniciens: 5,
      kmSite: 180,
      nbDeplacements: 12,
      budgetMateriel: 1000000,
      budgetSousTraitance: 2500000,
      statut: 'TERMINE',
      notes: 'Réfection complète calorifuge - Sous-traitance locale'
    })
    
    taches.push({
      nom: 'Contrôle qualité et réception',
      dateDebut: '2026-02-23',
      dateFin: '2026-02-26',
      dureeJours: 4,
      nbTechniciens: 2,
      kmSite: 180,
      nbDeplacements: 4,
      budgetMateriel: 200000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Tests thermiques + dossier réception'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SUCRIVOIRE - PROJ-SUCR-2026-002 - Budget: 15 000 000 FCFA
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-SUCR-2026-002') {
    taches.push({
      nom: 'Études et plans d\'exécution ligne 3',
      dateDebut: '2026-04-15',
      dateFin: '2026-04-30',
      dureeJours: 16,
      nbTechniciens: 2,
      kmSite: 180,
      nbDeplacements: 8,
      budgetMateriel: 300000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Plans isométriques + schémas P&ID'
    })
    
    taches.push({
      nom: 'Fourniture tuyauterie inox 316L',
      dateDebut: '2026-05-01',
      dateFin: '2026-05-20',
      dureeJours: 20,
      nbTechniciens: 2,
      kmSite: 180,
      nbDeplacements: 5,
      budgetMateriel: 8000000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Tuyauterie inox + raccords + vannes - Import'
    })
    
    taches.push({
      nom: 'Installation réseau tuyauterie',
      dateDebut: '2026-05-21',
      dateFin: '2026-06-20',
      dureeJours: 31,
      nbTechniciens: 6,
      kmSite: 180,
      nbDeplacements: 31,
      budgetMateriel: 2000000,
      budgetSousTraitance: 3500000,
      statut: 'A_FAIRE',
      notes: 'Pose + soudure TIG inox - METALTECH SOUDURE CI'
    })
    
    taches.push({
      nom: 'Tests et mise en service ligne 3',
      dateDebut: '2026-06-21',
      dateFin: '2026-06-30',
      dureeJours: 10,
      nbTechniciens: 3,
      kmSite: 180,
      nbDeplacements: 10,
      budgetMateriel: 500000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Tests CIP + validation process'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SUCRIVOIRE - PROJ-SUCR-2026-003 - Budget: 22 000 000 FCFA (SUSPENDU)
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-SUCR-2026-003') {
    taches.push({
      nom: 'Diagnostic structure charpente existante',
      dateDebut: '2026-05-01',
      dateFin: '2026-05-10',
      dureeJours: 10,
      nbTechniciens: 3,
      kmSite: 180,
      nbDeplacements: 10,
      budgetMateriel: 200000,
      budgetSousTraitance: 0,
      statut: 'SUSPENDU',
      notes: 'Expertise structure + note de calcul'
    })
    
    taches.push({
      nom: 'Fourniture profilés et boulonnerie',
      dateDebut: '2026-05-11',
      dateFin: '2026-05-25',
      dureeJours: 15,
      nbTechniciens: 2,
      kmSite: 180,
      nbDeplacements: 5,
      budgetMateriel: 12000000,
      budgetSousTraitance: 0,
      statut: 'SUSPENDU',
      notes: 'Profilés HEA/IPE + boulons HR - ACIER DISTRIBUTION CI'
    })
    
    taches.push({
      nom: 'Renforcement et réfection charpente',
      dateDebut: '2026-05-26',
      dateFin: '2026-07-05',
      dureeJours: 41,
      nbTechniciens: 8,
      kmSite: 180,
      nbDeplacements: 41,
      budgetMateriel: 3000000,
      budgetSousTraitance: 5000000,
      statut: 'SUSPENDU',
      notes: 'Renforcement + soudure + peinture - METALTECH'
    })
    
    taches.push({
      nom: 'Contrôle et réception travaux',
      dateDebut: '2026-07-06',
      dateFin: '2026-07-15',
      dureeJours: 10,
      nbTechniciens: 2,
      kmSite: 180,
      nbDeplacements: 10,
      budgetMateriel: 300000,
      budgetSousTraitance: 0,
      statut: 'SUSPENDU',
      notes: 'Contrôle soudures + certification structure'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CIE - PROJ-CIE-2026-001 - Budget: 35 000 000 FCFA
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-CIE-2026-001') {
    taches.push({
      nom: 'Études et plans fabrication réservoir',
      dateDebut: '2026-04-20',
      dateFin: '2026-05-05',
      dureeJours: 16,
      nbTechniciens: 2,
      kmSite: 35,
      nbDeplacements: 8,
      budgetMateriel: 500000,
      budgetSousTraitance: 0,
      statut: 'EN_COURS',
      notes: 'Plans fabrication + note de calcul CODAP'
    })
    
    taches.push({
      nom: 'Fourniture tôles et accessoires',
      dateDebut: '2026-05-06',
      dateFin: '2026-05-25',
      dureeJours: 20,
      nbTechniciens: 2,
      kmSite: 35,
      nbDeplacements: 5,
      budgetMateriel: 15000000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Tôles acier S235 + brides + accessoires - ACIER DISTRIBUTION CI'
    })
    
    taches.push({
      nom: 'Fabrication réservoir 50m³ en atelier',
      dateDebut: '2026-05-26',
      dateFin: '2026-06-30',
      dureeJours: 36,
      nbTechniciens: 8,
      kmSite: 15,
      nbDeplacements: 36,
      budgetMateriel: 3000000,
      budgetSousTraitance: 10000000,
      statut: 'A_FAIRE',
      notes: 'Roulage + soudure + radiographie - METALTECH SOUDURE CI'
    })
    
    taches.push({
      nom: 'Transport et installation sur site',
      dateDebut: '2026-07-01',
      dateFin: '2026-07-15',
      dureeJours: 15,
      nbTechniciens: 6,
      kmSite: 35,
      nbDeplacements: 15,
      budgetMateriel: 1500000,
      budgetSousTraitance: 3000000,
      statut: 'A_FAIRE',
      notes: 'Transport exceptionnel + levage - TRANS-CI LOGISTIQUE'
    })
    
    taches.push({
      nom: 'Tests et mise en service',
      dateDebut: '2026-07-16',
      dateFin: '2026-07-31',
      dureeJours: 16,
      nbTechniciens: 3,
      kmSite: 35,
      nbDeplacements: 16,
      budgetMateriel: 800000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Tests hydrostatiques + certification'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CIE - PROJ-CIE-2026-002 - Budget: 58 000 000 FCFA
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-CIE-2026-002') {
    taches.push({
      nom: 'Études techniques et plans isométriques',
      dateDebut: '2026-06-01',
      dateFin: '2026-06-20',
      dureeJours: 20,
      nbTechniciens: 3,
      kmSite: 40,
      nbDeplacements: 10,
      budgetMateriel: 800000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Plans ISO + calculs perte charge + P&ID'
    })
    
    taches.push({
      nom: 'Fourniture tuyauterie vapeur HP',
      dateDebut: '2026-06-21',
      dateFin: '2026-07-20',
      dureeJours: 30,
      nbTechniciens: 2,
      kmSite: 40,
      nbDeplacements: 8,
      budgetMateriel: 28000000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Tuyauterie acier P265GH + brides PN40 + vannes - Import'
    })
    
    taches.push({
      nom: 'Installation réseau vapeur principal',
      dateDebut: '2026-07-21',
      dateFin: '2026-09-10',
      dureeJours: 52,
      nbTechniciens: 10,
      kmSite: 40,
      nbDeplacements: 52,
      budgetMateriel: 5000000,
      budgetSousTraitance: 18000000,
      statut: 'A_FAIRE',
      notes: 'Pose + soudure certifiée + radiographie - METALTECH SOUDURE CI'
    })
    
    taches.push({
      nom: 'Calorifugeage réseau vapeur',
      dateDebut: '2026-09-11',
      dateFin: '2026-09-25',
      dureeJours: 15,
      nbTechniciens: 6,
      kmSite: 40,
      nbDeplacements: 15,
      budgetMateriel: 3000000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Laine de roche HT + bardage alu - ISOTHERM AFRIQUE'
    })
    
    taches.push({
      nom: 'Tests et mise en service',
      dateDebut: '2026-09-26',
      dateFin: '2026-09-30',
      dureeJours: 5,
      nbTechniciens: 4,
      kmSite: 40,
      nbDeplacements: 5,
      budgetMateriel: 1000000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Tests pression + montée en température progressive'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CIE - PROJ-CIE-2025-003 - Budget: 18 000 000 FCFA (TERMINÉ)
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-CIE-2025-003') {
    taches.push({
      nom: 'Études et plans charpente métallique',
      dateDebut: '2025-11-01',
      dateFin: '2025-11-15',
      dureeJours: 15,
      nbTechniciens: 2,
      kmSite: 20,
      nbDeplacements: 8,
      budgetMateriel: 300000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Plans fabrication + note de calcul CM66'
    })
    
    taches.push({
      nom: 'Fourniture profilés et boulonnerie',
      dateDebut: '2025-11-16',
      dateFin: '2025-12-05',
      dureeJours: 20,
      nbTechniciens: 2,
      kmSite: 20,
      nbDeplacements: 5,
      budgetMateriel: 8000000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Profilés HEA/IPE + boulons HR - ACIER DISTRIBUTION CI'
    })
    
    taches.push({
      nom: 'Fabrication et montage charpente',
      dateDebut: '2025-12-06',
      dateFin: '2026-01-20',
      dureeJours: 46,
      nbTechniciens: 8,
      kmSite: 20,
      nbDeplacements: 46,
      budgetMateriel: 2500000,
      budgetSousTraitance: 6000000,
      statut: 'TERMINE',
      notes: 'Fabrication + montage + soudure - METALTECH SOUDURE CI'
    })
    
    taches.push({
      nom: 'Peinture et finitions',
      dateDebut: '2026-01-21',
      dateFin: '2026-02-05',
      dureeJours: 16,
      nbTechniciens: 4,
      kmSite: 20,
      nbDeplacements: 16,
      budgetMateriel: 800000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Grenaillage + peinture anticorrosion'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // PALM CI - PROJ-PALM-2026-001 - Budget: 18 500 000 FCFA
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-PALM-2026-001') {
    taches.push({
      nom: 'Études et plans réseau huile',
      dateDebut: '2026-05-05',
      dateFin: '2026-05-20',
      dureeJours: 16,
      nbTechniciens: 2,
      kmSite: 320,
      nbDeplacements: 8,
      budgetMateriel: 400000,
      budgetSousTraitance: 0,
      statut: 'EN_COURS',
      notes: 'Plans isométriques + schémas process'
    })
    
    taches.push({
      nom: 'Fourniture tuyauterie acier',
      dateDebut: '2026-05-21',
      dateFin: '2026-06-10',
      dureeJours: 21,
      nbTechniciens: 2,
      kmSite: 320,
      nbDeplacements: 5,
      budgetMateriel: 9000000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Tuyauterie acier + vannes + raccords - ACIER DISTRIBUTION CI'
    })
    
    taches.push({
      nom: 'Installation réseau tuyauterie',
      dateDebut: '2026-06-11',
      dateFin: '2026-07-10',
      dureeJours: 30,
      nbTechniciens: 6,
      kmSite: 320,
      nbDeplacements: 30,
      budgetMateriel: 2000000,
      budgetSousTraitance: 5500000,
      statut: 'A_FAIRE',
      notes: 'Pose + soudure + supports - METALTECH SOUDURE CI'
    })
    
    taches.push({
      nom: 'Tests et mise en service',
      dateDebut: '2026-07-11',
      dateFin: '2026-07-20',
      dureeJours: 10,
      nbTechniciens: 3,
      kmSite: 320,
      nbDeplacements: 10,
      budgetMateriel: 600000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Tests pression + nettoyage + validation'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // PALM CI - PROJ-PALM-2026-002 - Budget: 25 000 000 FCFA
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-PALM-2026-002') {
    taches.push({
      nom: 'Études et plans réservoirs',
      dateDebut: '2026-03-01',
      dateFin: '2026-03-15',
      dureeJours: 15,
      nbTechniciens: 2,
      kmSite: 320,
      nbDeplacements: 8,
      budgetMateriel: 500000,
      budgetSousTraitance: 0,
      statut: 'EN_RETARD',
      notes: 'Plans fabrication 2 réservoirs 30m³ - CODAP'
    })
    
    taches.push({
      nom: 'Fourniture tôles et accessoires',
      dateDebut: '2026-03-16',
      dateFin: '2026-04-05',
      dureeJours: 21,
      nbTechniciens: 2,
      kmSite: 320,
      nbDeplacements: 5,
      budgetMateriel: 12000000,
      budgetSousTraitance: 0,
      statut: 'EN_RETARD',
      notes: 'Tôles acier inox 304L + brides - Import'
    })
    
    taches.push({
      nom: 'Fabrication 2 réservoirs en atelier',
      dateDebut: '2026-04-06',
      dateFin: '2026-05-15',
      dureeJours: 40,
      nbTechniciens: 8,
      kmSite: 15,
      nbDeplacements: 40,
      budgetMateriel: 2500000,
      budgetSousTraitance: 8000000,
      statut: 'A_FAIRE',
      notes: 'Roulage + soudure TIG - METALTECH SOUDURE CI'
    })
    
    taches.push({
      nom: 'Transport et installation',
      dateDebut: '2026-05-16',
      dateFin: '2026-05-31',
      dureeJours: 16,
      nbTechniciens: 6,
      kmSite: 320,
      nbDeplacements: 8,
      budgetMateriel: 1000000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Transport + levage + raccordements'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // PALM CI - PROJ-PALM-2026-003 - Budget: 6 500 000 FCFA (TERMINÉ)
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-PALM-2026-003') {
    taches.push({
      nom: 'Diagnostic équipements process',
      dateDebut: '2026-01-15',
      dateFin: '2026-01-20',
      dureeJours: 6,
      nbTechniciens: 3,
      kmSite: 320,
      nbDeplacements: 6,
      budgetMateriel: 200000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Inspection complète équipements huilerie'
    })
    
    taches.push({
      nom: 'Fourniture pièces et consommables',
      dateDebut: '2026-01-21',
      dateFin: '2026-01-25',
      dureeJours: 5,
      nbTechniciens: 2,
      kmSite: 320,
      nbDeplacements: 3,
      budgetMateriel: 2500000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Pièces détachées + joints + filtres'
    })
    
    taches.push({
      nom: 'Maintenance préventive équipements',
      dateDebut: '2026-01-26',
      dateFin: '2026-02-10',
      dureeJours: 16,
      nbTechniciens: 5,
      kmSite: 320,
      nbDeplacements: 16,
      budgetMateriel: 1000000,
      budgetSousTraitance: 2000000,
      statut: 'TERMINE',
      notes: 'Révision complète + remplacement pièces usure'
    })
    
    taches.push({
      nom: 'Tests et remise en service',
      dateDebut: '2026-02-11',
      dateFin: '2026-02-12',
      dureeJours: 2,
      nbTechniciens: 3,
      kmSite: 320,
      nbDeplacements: 2,
      budgetMateriel: 100000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Tests fonctionnels + validation process'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SODEMI - PROJ-SODE-2026-001 - Budget: 32 000 000 FCFA
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-SODE-2026-001') {
    taches.push({
      nom: 'Études structure et plans exécution',
      dateDebut: '2026-02-01',
      dateFin: '2026-02-20',
      dureeJours: 20,
      nbTechniciens: 3,
      kmSite: 15,
      nbDeplacements: 10,
      budgetMateriel: 600000,
      budgetSousTraitance: 0,
      statut: 'EN_COURS',
      notes: 'Plans charpente + note calcul + permis construire'
    })
    
    taches.push({
      nom: 'Fourniture profilés métalliques',
      dateDebut: '2026-02-21',
      dateFin: '2026-03-10',
      dureeJours: 18,
      nbTechniciens: 2,
      kmSite: 15,
      nbDeplacements: 5,
      budgetMateriel: 15000000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Profilés HEA/IPE/UAP + boulonnerie - ACIER DISTRIBUTION CI'
    })
    
    taches.push({
      nom: 'Fabrication et montage charpente',
      dateDebut: '2026-03-11',
      dateFin: '2026-04-20',
      dureeJours: 41,
      nbTechniciens: 10,
      kmSite: 15,
      nbDeplacements: 41,
      budgetMateriel: 3000000,
      budgetSousTraitance: 11000000,
      statut: 'A_FAIRE',
      notes: 'Fabrication + montage + soudure - METALTECH SOUDURE CI'
    })
    
    taches.push({
      nom: 'Peinture et finitions',
      dateDebut: '2026-04-21',
      dateFin: '2026-04-30',
      dureeJours: 10,
      nbTechniciens: 4,
      kmSite: 15,
      nbDeplacements: 10,
      budgetMateriel: 1200000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Grenaillage + peinture anticorrosion + bardage'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SODEMI - PROJ-SODE-2026-002 - Budget: 42 000 000 FCFA
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-SODE-2026-002') {
    taches.push({
      nom: 'Études process et plans tuyauterie',
      dateDebut: '2026-06-01',
      dateFin: '2026-06-25',
      dureeJours: 25,
      nbTechniciens: 3,
      kmSite: 15,
      nbDeplacements: 12,
      budgetMateriel: 800000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Plans ISO + P&ID + calculs hydrauliques'
    })
    
    taches.push({
      nom: 'Fourniture tuyauterie process',
      dateDebut: '2026-06-26',
      dateFin: '2026-07-25',
      dureeJours: 30,
      nbTechniciens: 2,
      kmSite: 15,
      nbDeplacements: 8,
      budgetMateriel: 20000000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Tuyauterie PEHD + acier + vannes - Import spécialisé'
    })
    
    taches.push({
      nom: 'Installation réseau process',
      dateDebut: '2026-07-26',
      dateFin: '2026-09-20',
      dureeJours: 57,
      nbTechniciens: 10,
      kmSite: 15,
      nbDeplacements: 57,
      budgetMateriel: 4000000,
      budgetSousTraitance: 14000000,
      statut: 'A_FAIRE',
      notes: 'Pose + soudure + supports + instrumentation - METALTECH'
    })
    
    taches.push({
      nom: 'Tests et mise en service',
      dateDebut: '2026-09-21',
      dateFin: '2026-09-30',
      dureeJours: 10,
      nbTechniciens: 4,
      kmSite: 15,
      nbDeplacements: 10,
      budgetMateriel: 1500000,
      budgetSousTraitance: 0,
      statut: 'A_FAIRE',
      notes: 'Tests pression + nettoyage + validation process'
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SODEMI - PROJ-SODE-2025-003 - Budget: 38 000 000 FCFA (TERMINÉ)
  // ═══════════════════════════════════════════════════════════════
  else if (ref === 'PROJ-SODE-2025-003') {
    taches.push({
      nom: 'Études et plans 3 réservoirs',
      dateDebut: '2025-09-01',
      dateFin: '2025-09-20',
      dureeJours: 20,
      nbTechniciens: 2,
      kmSite: 15,
      nbDeplacements: 10,
      budgetMateriel: 600000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Plans fabrication 3x40m³ - CODAP'
    })
    
    taches.push({
      nom: 'Fourniture tôles et accessoires',
      dateDebut: '2025-09-21',
      dateFin: '2025-10-10',
      dureeJours: 20,
      nbTechniciens: 2,
      kmSite: 15,
      nbDeplacements: 5,
      budgetMateriel: 18000000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Tôles acier S235 + brides + accessoires - ACIER DISTRIBUTION CI'
    })
    
    taches.push({
      nom: 'Fabrication 3 réservoirs',
      dateDebut: '2025-10-11',
      dateFin: '2025-11-15',
      dureeJours: 36,
      nbTechniciens: 10,
      kmSite: 15,
      nbDeplacements: 36,
      budgetMateriel: 3500000,
      budgetSousTraitance: 13000000,
      statut: 'TERMINE',
      notes: 'Roulage + soudure + radiographie - METALTECH SOUDURE CI'
    })
    
    taches.push({
      nom: 'Installation et raccordements',
      dateDebut: '2025-11-16',
      dateFin: '2025-11-28',
      dureeJours: 13,
      nbTechniciens: 6,
      kmSite: 15,
      nbDeplacements: 13,
      budgetMateriel: 2000000,
      budgetSousTraitance: 0,
      statut: 'TERMINE',
      notes: 'Levage + installation + tuyauterie raccordement'
    })
  }
  
  return taches
}

// ═══════════════════════════════════════════════════════════════
// INJECTION DES TÂCHES
// ═══════════════════════════════════════════════════════════════

async function injecterTaches(projets) {
  console.log('🔧 Injection des tâches détaillées...\n')
  
  let totalTaches = 0
  let totalBudgetCalcule = 0
  
  for (const projet of projets) {
    console.log(`\n📁 Projet: ${projet.nom} (${projet.reference_projet})`)
    console.log(`   Budget prévu: ${projet.budget_prevu.toLocaleString('fr-FR')} FCFA`)
    
    const tachesProjet = genererTachesProjet(projet)
    
    if (tachesProjet.length === 0) {
      console.log('   ⚠️  Aucune tâche définie pour ce projet')
      continue
    }
    
    // Calculer les budgets et injecter
    const tachesAvecBudgets = tachesProjet.map(tache => {
      const budgets = calculerBudgetTache(tache)
      return {
        projet_id: projet.id,
        nom: tache.nom,
        date_debut: tache.dateDebut,
        date_fin_prevue: tache.dateFin,
        duree_jours: tache.dureeJours,
        nb_techniciens: tache.nbTechniciens,
        km_site: tache.kmSite,
        nb_deplacements: tache.nbDeplacements,
        budget_materiel: tache.budgetMateriel,
        budget_sous_traitance: tache.budgetSousTraitance,
        budget_carburant: budgets.budgetCarburant,
        budget_nourriture: budgets.budgetNourriture,
        budget_logistique: budgets.budgetLogistique,
        cout_total: budgets.coutTotal,
        statut: tache.statut,
        notes: tache.notes,
        date_creation: new Date().toISOString().split('T')[0]
      }
    })
    
    // Calculer le total des tâches
    const totalTachesProjet = tachesAvecBudgets.reduce((sum, t) => sum + t.cout_total, 0)
    
    console.log(`   📋 ${tachesAvecBudgets.length} tâches à injecter`)
    console.log(`   💰 Total calculé: ${totalTachesProjet.toLocaleString('fr-FR')} FCFA`)
    console.log(`   📊 Écart: ${(totalTachesProjet - projet.budget_prevu).toLocaleString('fr-FR')} FCFA`)
    
    // Afficher le détail des tâches
    tachesAvecBudgets.forEach((tache, index) => {
      console.log(`   ${index + 1}. ${tache.nom}`)
      console.log(`      - Durée: ${tache.duree_jours}j | Tech: ${tache.nb_techniciens} | Km: ${tache.km_site}`)
      console.log(`      - Carburant: ${tache.budget_carburant.toLocaleString('fr-FR')} | Nourriture: ${tache.budget_nourriture.toLocaleString('fr-FR')}`)
      console.log(`      - Matériel: ${tache.budget_materiel.toLocaleString('fr-FR')} | Sous-traitance: ${tache.budget_sous_traitance.toLocaleString('fr-FR')}`)
      console.log(`      - 💵 TOTAL: ${tache.cout_total.toLocaleString('fr-FR')} FCFA`)
    })
    
    // Injection dans Supabase
    const { data, error } = await supabase
      .from('taches')
      .insert(tachesAvecBudgets)
      .select()
    
    if (error) {
      console.error(`   ❌ Erreur injection: ${error.message}`)
      continue
    }
    
    console.log(`   ✅ ${data.length} tâches injectées avec succès`)
    totalTaches += data.length
    totalBudgetCalcule += totalTachesProjet
  }
  
  return { totalTaches, totalBudgetCalcule }
}

// ═══════════════════════════════════════════════════════════════
// EXÉCUTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════

async function main() {
  try {
    // Récupérer les projets
    const projets = await recupererProjets()
    if (!projets || projets.length === 0) {
      throw new Error('Aucun projet trouvé. Exécutez d\'abord inject-data.mjs')
    }
    
    // Injecter les tâches
    const { totalTaches, totalBudgetCalcule } = await injecterTaches(projets)
    
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('✅ INJECTION TÂCHES TERMINÉE AVEC SUCCÈS')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`📊 Total projets traités:  ${projets.length}`)
    console.log(`📊 Total tâches injectées: ${totalTaches}`)
    console.log(`📊 Budget total calculé:   ${totalBudgetCalcule.toLocaleString('fr-FR')} FCFA`)
    console.log('═══════════════════════════════════════════════════════════════\n')
    console.log('💡 Prochaine étape: Accédez à http://localhost:5187/planification')
    console.log('   pour visualiser les projets et leurs tâches détaillées\n')
    
  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error.message)
    process.exit(1)
  }
}

main()
