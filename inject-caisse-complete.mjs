#!/usr/bin/env node

/**
 * Script d'injection COMPLÈTE - Mouvements de Caisse
 * Remplit TOUS les indicateurs du Dashboard
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://keyfnghpisdwwayrmlfk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleWZuZ2hwaXNkd3dheXJtbGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjA3NDUsImV4cCI6MjA5NTYzNjc0NX0.IWdepYM5NNQp23Qa8YVxwTYY7ngzwtqBW6HSFNI71EQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('═══════════════════════════════════════════════════════════════')
console.log('💰 INJECTION COMPLÈTE - MOUVEMENTS DE CAISSE')
console.log('═══════════════════════════════════════════════════════════════\n')

async function injecterMouvementsCaisse() {
  console.log('📦 Injection des mouvements de caisse...\n')
  
  // Récupérer les factures pour lier les paiements
  const { data: factures } = await supabase.from('factures').select('*')
  const fact1 = factures?.find(f => f.numero === "FACT-2026-001")
  const fact3 = factures?.find(f => f.numero === "FACT-2026-003")
  
  // Récupérer les projets pour les dépenses
  const { data: projets } = await supabase.from('projets').select('*')
  
  const mouvements = [
    // ========== ENTRÉES - PAIEMENTS CLIENTS ==========
    {
      date: "2026-03-20",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement GESTOCI - Acompte 50% Facture FACT-2026-001",
      montant: 3004725, // 50% de 5077350 (devis1 TTC)
      beneficiaire: "GESTOCI SA",
      mode_paiement: "VIREMENT",
      piece_justificative: "VIR-SGBCI-20260405-7842",
      reference_projet: fact1?.devis_id ? `DEV-CAL-2026-001` : null,
      utilisateur: "Admin SIKA",
      date_creation: "2026-03-20"
    },
    {
      date: "2026-03-20",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement SUCRIVOIRE - Facture FACT-2026-003 (Maintenance)",
      montant: 8534350, // TTC facture 3
      beneficiaire: "SUCRIVOIRE SA",
      mode_paiement: "CHEQUE",
      piece_justificative: "CHQ-N°458720",
      reference_projet: "CONTRAT-MAINTENANCE-2026",
      utilisateur: "Admin SIKA",
      date_creation: "2026-03-20"
    },
    {
      date: "2026-02-15",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement PALM CI - Solde projet tuyauterie 2025",
      montant: 4850000,
      beneficiaire: "PALM CI",
      mode_paiement: "VIREMENT",
      piece_justificative: "VIR-BIAO-20260215-3421",
      reference_projet: "PROJ-TUY-2025-018",
      utilisateur: "Admin SIKA",
      date_creation: "2026-02-15"
    },
    {
      date: "2026-01-28",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement CIE - Acompte projet réservoir",
      montant: 16740000, // 50% du devis CIE
      beneficiaire: "CIE",
      mode_paiement: "VIREMENT",
      piece_justificative: "VIR-SGBCI-20260128-9654",
      reference_projet: "DEV-RES-2026-002",
      utilisateur: "Admin SIKA",
      date_creation: "2026-01-28"
    },
    {
      date: "2026-04-10",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement SODEMI - Facture charpente métallique",
      montant: 6200000,
      beneficiaire: "SODEMI",
      mode_paiement: "VIREMENT",
      piece_justificative: "VIR-ECOBANK-20260410-7823",
      reference_projet: "PROJ-CHARP-2026-003",
      utilisateur: "Admin SIKA",
      date_creation: "2026-04-10"
    },

    // ========== ENTRÉES - AUTRES ==========
    {
      date: "2026-03-05",
      type: "ENTREE",
      categorie: "APPORT_CAPITAL",
      description: "Apport en capital - Renforcement trésorerie",
      montant: 15000000,
      beneficiaire: "SIKA INDUSTRIE",
      mode_paiement: "VIREMENT",
      piece_justificative: "APPORT-2026-001",
      utilisateur: "Direction",
      date_creation: "2026-03-05"
    },
    {
      date: "2026-02-20",
      type: "ENTREE",
      categorie: "REMBOURSEMENT",
      description: "Remboursement avance fournisseur METALTECH",
      montant: 850000,
      beneficiaire: "METALTECH SOUDURE CI",
      mode_paiement: "VIREMENT",
      piece_justificative: "REMB-2026-002",
      utilisateur: "Comptabilité",
      date_creation: "2026-02-20"
    },

    // ========== SORTIES - ACHATS MATÉRIAUX ==========
    {
      date: "2026-03-22",
      type: "SORTIE",
      categorie: "ACHAT_MATERIEL",
      description: "Achat laine de roche DN100-DN150 (45ML + 30ML)",
      montant: 2850000,
      beneficiaire: "ISOTHERM AFRIQUE",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-ISOTHERM-2026-087",
      reference_projet: "DEV-CAL-2026-001",
      utilisateur: "Achats SIKA",
      date_creation: "2026-03-22"
    },
    {
      date: "2026-03-25",
      type: "SORTIE",
      categorie: "ACHAT_MATERIEL",
      description: "Achat tôles acier A516 Grade 70 pour réservoir",
      montant: 8500000,
      beneficiaire: "ACIER DISTRIBUTION CI",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-ACIER-2026-124",
      reference_projet: "DEV-RES-2026-002",
      utilisateur: "Achats SIKA",
      date_creation: "2026-03-25"
    },
    {
      date: "2026-04-05",
      type: "SORTIE",
      categorie: "ACHAT_MATERIEL",
      description: "Achat tuyauterie DN80 et DN50 (95ML total)",
      montant: 3200000,
      beneficiaire: "ACIER DISTRIBUTION CI",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-ACIER-2026-156",
      reference_projet: "DEV-TUY-2026-003",
      utilisateur: "Achats SIKA",
      date_creation: "2026-04-05"
    },
    {
      date: "2026-04-12",
      type: "SORTIE",
      categorie: "ACHAT_MATERIEL",
      description: "Achat robinetterie et vannes (DN80 x8 + accessoires)",
      montant: 1850000,
      beneficiaire: "METALTECH SOUDURE CI",
      mode_paiement: "CHEQUE",
      piece_justificative: "CHQ-N°458721",
      reference_projet: "DEV-TUY-2026-003",
      utilisateur: "Achats SIKA",
      date_creation: "2026-04-12"
    },
    {
      date: "2026-02-18",
      type: "SORTIE",
      categorie: "ACHAT_MATERIEL",
      description: "Achat électrodes soudure et consommables",
      montant: 450000,
      beneficiaire: "METALTECH SOUDURE CI",
      mode_paiement: "ESPECES",
      piece_justificative: "FACT-METAL-2026-034",
      utilisateur: "Achats SIKA",
      date_creation: "2026-02-18"
    },

    // ========== SORTIES - SOUS-TRAITANCE ==========
    {
      date: "2026-03-28",
      type: "SORTIE",
      categorie: "SOUS_TRAITANCE",
      description: "Sous-traitance soudage réservoir CIE",
      montant: 4500000,
      beneficiaire: "METALTECH SOUDURE CI",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-ST-2026-045",
      reference_projet: "DEV-RES-2026-002",
      utilisateur: "Achats SIKA",
      date_creation: "2026-03-28"
    },
    {
      date: "2026-04-08",
      type: "SORTIE",
      categorie: "SOUS_TRAITANCE",
      description: "Sous-traitance transport et levage",
      montant: 1200000,
      beneficiaire: "TRANS-CI LOGISTIQUE",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-TRANS-2026-089",
      reference_projet: "DEV-RES-2026-002",
      utilisateur: "Achats SIKA",
      date_creation: "2026-04-08"
    },
    {
      date: "2026-02-25",
      type: "SORTIE",
      categorie: "SOUS_TRAITANCE",
      description: "Sous-traitance peinture époxy réservoir",
      montant: 2800000,
      beneficiaire: "ISOTHERM AFRIQUE",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-ISOTHERM-2026-056",
      reference_projet: "PROJ-RES-2025-012",
      utilisateur: "Achats SIKA",
      date_creation: "2026-02-25"
    },

    // ========== SORTIES - SALAIRES ==========
    {
      date: "2026-04-30",
      type: "SORTIE",
      categorie: "SALAIRE",
      description: "Salaires mois d'avril 2026 (12 employés)",
      montant: 8500000,
      beneficiaire: "Personnel SIKA INDUSTRIE",
      mode_paiement: "VIREMENT",
      piece_justificative: "PAIE-2026-04",
      utilisateur: "RH SIKA",
      date_creation: "2026-04-30"
    },
    {
      date: "2026-03-31",
      type: "SORTIE",
      categorie: "SALAIRE",
      description: "Salaires mois de mars 2026 (12 employés)",
      montant: 8500000,
      beneficiaire: "Personnel SIKA INDUSTRIE",
      mode_paiement: "VIREMENT",
      piece_justificative: "PAIE-2026-03",
      utilisateur: "RH SIKA",
      date_creation: "2026-03-31"
    },
    {
      date: "2026-02-28",
      type: "SORTIE",
      categorie: "SALAIRE",
      description: "Salaires mois de février 2026 (12 employés)",
      montant: 8500000,
      beneficiaire: "Personnel SIKA INDUSTRIE",
      mode_paiement: "VIREMENT",
      piece_justificative: "PAIE-2026-02",
      utilisateur: "RH SIKA",
      date_creation: "2026-02-28"
    },

    // ========== SORTIES - CHARGES FIXES ==========
    {
      date: "2026-04-05",
      type: "SORTIE",
      categorie: "LOYER",
      description: "Loyer atelier et bureaux - Avril 2026",
      montant: 1200000,
      beneficiaire: "SCI ZONE INDUSTRIELLE YOPOUGON",
      mode_paiement: "VIREMENT",
      piece_justificative: "QUIT-2026-04",
      utilisateur: "Comptabilité",
      date_creation: "2026-04-05"
    },
    {
      date: "2026-03-05",
      type: "SORTIE",
      categorie: "LOYER",
      description: "Loyer atelier et bureaux - Mars 2026",
      montant: 1200000,
      beneficiaire: "SCI ZONE INDUSTRIELLE YOPOUGON",
      mode_paiement: "VIREMENT",
      piece_justificative: "QUIT-2026-03",
      utilisateur: "Comptabilité",
      date_creation: "2026-03-05"
    },
    {
      date: "2026-04-10",
      type: "SORTIE",
      categorie: "ELECTRICITE",
      description: "Facture électricité atelier - Mars 2026",
      montant: 450000,
      beneficiaire: "CIE",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-CIE-2026-03",
      utilisateur: "Comptabilité",
      date_creation: "2026-04-10"
    },
    {
      date: "2026-03-10",
      type: "SORTIE",
      categorie: "ELECTRICITE",
      description: "Facture électricité atelier - Février 2026",
      montant: 420000,
      beneficiaire: "CIE",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-CIE-2026-02",
      utilisateur: "Comptabilité",
      date_creation: "2026-03-10"
    },
    {
      date: "2026-04-15",
      type: "SORTIE",
      categorie: "EAU",
      description: "Facture eau atelier - Mars 2026",
      montant: 85000,
      beneficiaire: "SODECI",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-SODECI-2026-03",
      utilisateur: "Comptabilité",
      date_creation: "2026-04-15"
    },
    {
      date: "2026-03-15",
      type: "SORTIE",
      categorie: "EAU",
      description: "Facture eau atelier - Février 2026",
      montant: 78000,
      beneficiaire: "SODECI",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-SODECI-2026-02",
      utilisateur: "Comptabilité",
      date_creation: "2026-03-15"
    },

    // ========== SORTIES - CARBURANT & TRANSPORT ==========
    {
      date: "2026-04-20",
      type: "SORTIE",
      categorie: "CARBURANT",
      description: "Carburant véhicules société - Avril 2026",
      montant: 350000,
      beneficiaire: "TOTAL ENERGIES CI",
      mode_paiement: "CARTE",
      piece_justificative: "FACT-TOTAL-2026-04",
      utilisateur: "Logistique",
      date_creation: "2026-04-20"
    },
    {
      date: "2026-03-20",
      type: "SORTIE",
      categorie: "CARBURANT",
      description: "Carburant véhicules société - Mars 2026",
      montant: 380000,
      beneficiaire: "TOTAL ENERGIES CI",
      mode_paiement: "CARTE",
      piece_justificative: "FACT-TOTAL-2026-03",
      utilisateur: "Logistique",
      date_creation: "2026-03-20"
    },
    {
      date: "2026-04-18",
      type: "SORTIE",
      categorie: "TRANSPORT",
      description: "Transport matériaux chantier GESTOCI",
      montant: 250000,
      beneficiaire: "TRANS-CI LOGISTIQUE",
      mode_paiement: "ESPECES",
      piece_justificative: "BL-TRANS-2026-124",
      reference_projet: "DEV-CAL-2026-001",
      utilisateur: "Logistique",
      date_creation: "2026-04-18"
    },

    // ========== SORTIES - ENTRETIEN & MAINTENANCE ==========
    {
      date: "2026-03-12",
      type: "SORTIE",
      categorie: "ENTRETIEN_VEHICULE",
      description: "Révision camion plateau ISUZU",
      montant: 450000,
      beneficiaire: "CFAO MOTORS",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-CFAO-2026-087",
      utilisateur: "Logistique",
      date_creation: "2026-03-12"
    },
    {
      date: "2026-02-28",
      type: "SORTIE",
      categorie: "MAINTENANCE_EQUIPEMENT",
      description: "Maintenance machine à souder Lincoln Electric",
      montant: 280000,
      beneficiaire: "METALTECH SOUDURE CI",
      mode_paiement: "CHEQUE",
      piece_justificative: "FACT-METAL-2026-056",
      utilisateur: "Maintenance",
      date_creation: "2026-02-28"
    },
    {
      date: "2026-04-22",
      type: "SORTIE",
      categorie: "MAINTENANCE_EQUIPEMENT",
      description: "Étalonnage appareils de mesure et contrôle",
      montant: 180000,
      beneficiaire: "BUREAU VERITAS CI",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-BV-2026-034",
      utilisateur: "Qualité",
      date_creation: "2026-04-22"
    },

    // ========== SORTIES - FOURNITURES & CONSOMMABLES ==========
    {
      date: "2026-04-08",
      type: "SORTIE",
      categorie: "FOURNITURE_BUREAU",
      description: "Fournitures de bureau - Avril 2026",
      montant: 125000,
      beneficiaire: "LIBRAIRIE DE FRANCE",
      mode_paiement: "ESPECES",
      piece_justificative: "FACT-LDF-2026-234",
      utilisateur: "Administration",
      date_creation: "2026-04-08"
    },
    {
      date: "2026-03-15",
      type: "SORTIE",
      categorie: "CONSOMMABLE",
      description: "Consommables atelier (disques, meules, gants, etc.)",
      montant: 320000,
      beneficiaire: "METALTECH SOUDURE CI",
      mode_paiement: "ESPECES",
      piece_justificative: "FACT-METAL-2026-045",
      utilisateur: "Achats SIKA",
      date_creation: "2026-03-15"
    },

    // ========== SORTIES - ASSURANCES & TAXES ==========
    {
      date: "2026-03-01",
      type: "SORTIE",
      categorie: "ASSURANCE",
      description: "Assurance multirisque entreprise - Trimestre 1 2026",
      montant: 850000,
      beneficiaire: "NSIA ASSURANCES",
      mode_paiement: "VIREMENT",
      piece_justificative: "PRIME-NSIA-2026-T1",
      utilisateur: "Direction",
      date_creation: "2026-03-01"
    },
    {
      date: "2026-04-25",
      type: "SORTIE",
      categorie: "TAXE",
      description: "Patente et taxes municipales 2026",
      montant: 450000,
      beneficiaire: "MAIRIE DE YOPOUGON",
      mode_paiement: "VIREMENT",
      piece_justificative: "QUIT-PATENTE-2026",
      utilisateur: "Comptabilité",
      date_creation: "2026-04-25"
    },

    // ========== SORTIES - FORMATION & DIVERS ==========
    {
      date: "2026-03-18",
      type: "SORTIE",
      categorie: "FORMATION",
      description: "Formation soudage TIG - 3 soudeurs",
      montant: 750000,
      beneficiaire: "CENTRE FORMATION PROFESSIONNELLE",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-CFP-2026-012",
      utilisateur: "RH SIKA",
      date_creation: "2026-03-18"
    },
    {
      date: "2026-04-12",
      type: "SORTIE",
      categorie: "HONORAIRE",
      description: "Honoraires expert-comptable - T1 2026",
      montant: 650000,
      beneficiaire: "CABINET EXPERTISE COMPTABLE ABIDJAN",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-CECA-2026-T1",
      utilisateur: "Direction",
      date_creation: "2026-04-12"
    },
    {
      date: "2026-02-22",
      type: "SORTIE",
      categorie: "PUBLICITE",
      description: "Publicité et communication - Salon SIMAT 2026",
      montant: 1200000,
      beneficiaire: "AGENCE COMMUNICATION CI",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-AGCOM-2026-018",
      utilisateur: "Direction",
      date_creation: "2026-02-22"
    }
  ]

  // Insérer tous les mouvements
  const { data, error } = await supabase
    .from('mouvements_caisse')
    .insert(mouvements)
    .select()

  if (error) {
    console.error('❌ Erreur insertion:', error)
    throw error
  }

  // Calculer les totaux
  const totalEntrees = mouvements.filter(m => m.type === 'ENTREE').reduce((sum, m) => sum + m.montant, 0)
  const totalSorties = mouvements.filter(m => m.type === 'SORTIE').reduce((sum, m) => sum + m.montant, 0)
  const solde = totalEntrees - totalSorties

  console.log('✅ Mouvements de caisse injectés avec succès!\n')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('📊 STATISTIQUES CAISSE')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`💰 Total ENTRÉES:  ${totalEntrees.toLocaleString('fr-FR')} FCFA`)
  console.log(`💸 Total SORTIES:  ${totalSorties.toLocaleString('fr-FR')} FCFA`)
  console.log(`📈 SOLDE CAISSE:   ${solde.toLocaleString('fr-FR')} FCFA`)
  console.log('═══════════════════════════════════════════════════════════════\n')
  
  console.log('📋 RÉPARTITION PAR CATÉGORIE:')
  console.log('───────────────────────────────────────────────────────────────')
  
  // Grouper par catégorie
  const parCategorie = mouvements.reduce((acc, m) => {
    if (!acc[m.categorie]) {
      acc[m.categorie] = { entrees: 0, sorties: 0, count: 0 }
    }
    if (m.type === 'ENTREE') {
      acc[m.categorie].entrees += m.montant
    } else {
      acc[m.categorie].sorties += m.montant
    }
    acc[m.categorie].count++
    return acc
  }, {})
  
  Object.entries(parCategorie).forEach(([cat, stats]) => {
    const total = stats.entrees - stats.sorties
    const signe = total >= 0 ? '+' : ''
    console.log(`${cat.padEnd(25)} : ${signe}${total.toLocaleString('fr-FR').padStart(12)} FCFA (${stats.count} mvts)`)
  })
  
  console.log('═══════════════════════════════════════════════════════════════\n')
  console.log(`✅ ${mouvements.length} mouvements injectés`)
  console.log(`   - ${mouvements.filter(m => m.type === 'ENTREE').length} ENTRÉES`)
  console.log(`   - ${mouvements.filter(m => m.type === 'SORTIE').length} SORTIES\n`)
}

async function main() {
  try {
    await injecterMouvementsCaisse()
    
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('✅ INJECTION COMPLÈTE TERMINÉE AVEC SUCCÈS !')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('🌐 Accédez au Dashboard pour voir les données:')
    console.log('   http://localhost:5187/dashboard\n')
    console.log('💰 Module Caisse:')
    console.log('   http://localhost:5187/caisse\n')
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    process.exit(1)
  }
}

main()
