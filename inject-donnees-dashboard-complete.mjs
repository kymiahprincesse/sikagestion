#!/usr/bin/env node

/**
 * Script d'injection COMPLÈTE - Données Dashboard
 * Ajoute des mouvements supplémentaires pour équilibrer la caisse
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://keyfnghpisdwwayrmlfk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleWZuZ2hwaXNkd3dheXJtbGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjA3NDUsImV4cCI6MjA5NTYzNjc0NX0.IWdepYM5NNQp23Qa8YVxwTYY7ngzwtqBW6HSFNI71EQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('═══════════════════════════════════════════════════════════════')
console.log('💰 INJECTION SUPPLÉMENTAIRE - ÉQUILIBRAGE CAISSE')
console.log('═══════════════════════════════════════════════════════════════\n')

async function ajouterMouvementsSupplementaires() {
  console.log('📦 Ajout de mouvements supplémentaires pour équilibrer la caisse...\n')
  
  const mouvementsSupp = [
    // ========== ENTRÉES SUPPLÉMENTAIRES - JANVIER 2026 ==========
    {
      date: "2026-01-15",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement GESTOCI - Solde facture projet 2025",
      montant: 12500000,
      beneficiaire: "GESTOCI SA",
      mode_paiement: "VIREMENT",
      piece_justificative: "VIR-SGBCI-20260115-4521",
      reference_projet: "PROJ-CAL-2025-045",
      utilisateur: "Admin SIKA",
      date_creation: "2026-01-15"
    },
    {
      date: "2026-01-22",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement SODEMI - Acompte charpente métallique",
      montant: 8500000,
      beneficiaire: "SODEMI",
      mode_paiement: "VIREMENT",
      piece_justificative: "VIR-ECOBANK-20260122-8934",
      reference_projet: "PROJ-CHARP-2026-001",
      utilisateur: "Admin SIKA",
      date_creation: "2026-01-22"
    },
    {
      date: "2026-01-08",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement PALM CI - Facture maintenance tuyauterie",
      montant: 3200000,
      beneficiaire: "PALM CI",
      mode_paiement: "CHEQUE",
      piece_justificative: "CHQ-N°458715",
      reference_projet: "MAINT-TUY-2026-001",
      utilisateur: "Admin SIKA",
      date_creation: "2026-01-08"
    },

    // ========== ENTRÉES SUPPLÉMENTAIRES - FÉVRIER 2026 ==========
    {
      date: "2026-02-12",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement CIE - Acompte projet tuyauterie vapeur",
      montant: 9800000,
      beneficiaire: "CIE",
      mode_paiement: "VIREMENT",
      piece_justificative: "VIR-SGBCI-20260212-7823",
      reference_projet: "PROJ-TUY-2026-008",
      utilisateur: "Admin SIKA",
      date_creation: "2026-02-12"
    },
    {
      date: "2026-02-25",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement SUCRIVOIRE - Facture réparation réservoir",
      montant: 4500000,
      beneficiaire: "SUCRIVOIRE SA",
      mode_paiement: "VIREMENT",
      piece_justificative: "VIR-BIAO-20260225-5612",
      reference_projet: "REP-RES-2026-002",
      utilisateur: "Admin SIKA",
      date_creation: "2026-02-25"
    },

    // ========== ENTRÉES SUPPLÉMENTAIRES - MARS 2026 ==========
    {
      date: "2026-03-08",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement GESTOCI - Facture calorifugeage terminal C",
      montant: 6800000,
      beneficiaire: "GESTOCI SA",
      mode_paiement: "VIREMENT",
      piece_justificative: "VIR-SGBCI-20260308-9234",
      reference_projet: "CAL-TERM-C-2026",
      utilisateur: "Admin SIKA",
      date_creation: "2026-03-08"
    },
    {
      date: "2026-03-18",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement SODEMI - Solde projet hangar stockage",
      montant: 7200000,
      beneficiaire: "SODEMI",
      mode_paiement: "VIREMENT",
      piece_justificative: "VIR-ECOBANK-20260318-4567",
      reference_projet: "HANG-STOCK-2026",
      utilisateur: "Admin SIKA",
      date_creation: "2026-03-18"
    },

    // ========== ENTRÉES SUPPLÉMENTAIRES - AVRIL 2026 ==========
    {
      date: "2026-04-05",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement PALM CI - Acompte installation tuyauterie",
      montant: 5600000,
      beneficiaire: "PALM CI",
      mode_paiement: "VIREMENT",
      piece_justificative: "VIR-BIAO-20260405-7891",
      reference_projet: "DEV-TUY-2026-003",
      utilisateur: "Admin SIKA",
      date_creation: "2026-04-05"
    },
    {
      date: "2026-04-15",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement CIE - Avancement 45% réservoir eau déminéralisée",
      montant: 15033000, // 45% du montant TTC devis2
      beneficiaire: "CIE",
      mode_paiement: "VIREMENT",
      piece_justificative: "VIR-SGBCI-20260415-3421",
      reference_projet: "DEV-RES-2026-002",
      utilisateur: "Admin SIKA",
      date_creation: "2026-04-15"
    },
    {
      date: "2026-04-28",
      type: "ENTREE",
      categorie: "PAIEMENT_CLIENT",
      description: "Paiement SUCRIVOIRE - Facture pliage tôles inox",
      montant: 2678600, // TTC devis4
      beneficiaire: "SUCRIVOIRE SA",
      mode_paiement: "CHEQUE",
      piece_justificative: "CHQ-N°458725",
      reference_projet: "DEV-PLI-2026-004",
      utilisateur: "Admin SIKA",
      date_creation: "2026-04-28"
    },

    // ========== ENTRÉES - AUTRES SOURCES ==========
    {
      date: "2026-01-10",
      type: "ENTREE",
      categorie: "VENTE_MATERIEL",
      description: "Vente chutes acier et ferraille",
      montant: 850000,
      beneficiaire: "RECYCLAGE MÉTAUX CI",
      mode_paiement: "ESPECES",
      piece_justificative: "FACT-VENTE-2026-001",
      utilisateur: "Logistique",
      date_creation: "2026-01-10"
    },
    {
      date: "2026-02-05",
      type: "ENTREE",
      categorie: "LOCATION_MATERIEL",
      description: "Location échafaudages à sous-traitant",
      montant: 450000,
      beneficiaire: "ENTREPRISE BTP CI",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-LOC-2026-002",
      utilisateur: "Logistique",
      date_creation: "2026-02-05"
    },

    // ========== SORTIES SUPPLÉMENTAIRES - JANVIER 2026 ==========
    {
      date: "2026-01-31",
      type: "SORTIE",
      categorie: "SALAIRE",
      description: "Salaires mois de janvier 2026 (12 employés)",
      montant: 8500000,
      beneficiaire: "Personnel SIKA INDUSTRIE",
      mode_paiement: "VIREMENT",
      piece_justificative: "PAIE-2026-01",
      utilisateur: "RH SIKA",
      date_creation: "2026-01-31"
    },
    {
      date: "2026-01-05",
      type: "SORTIE",
      categorie: "LOYER",
      description: "Loyer atelier et bureaux - Janvier 2026",
      montant: 1200000,
      beneficiaire: "SCI ZONE INDUSTRIELLE YOPOUGON",
      mode_paiement: "VIREMENT",
      piece_justificative: "QUIT-2026-01",
      utilisateur: "Comptabilité",
      date_creation: "2026-01-05"
    },
    {
      date: "2026-01-18",
      type: "SORTIE",
      categorie: "ACHAT_MATERIEL",
      description: "Achat tôles acier pour stock",
      montant: 4200000,
      beneficiaire: "ACIER DISTRIBUTION CI",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-ACIER-2026-012",
      utilisateur: "Achats SIKA",
      date_creation: "2026-01-18"
    },

    // ========== SORTIES SUPPLÉMENTAIRES - FÉVRIER 2026 ==========
    {
      date: "2026-02-05",
      type: "SORTIE",
      categorie: "LOYER",
      description: "Loyer atelier et bureaux - Février 2026",
      montant: 1200000,
      beneficiaire: "SCI ZONE INDUSTRIELLE YOPOUGON",
      mode_paiement: "VIREMENT",
      piece_justificative: "QUIT-2026-02",
      utilisateur: "Comptabilité",
      date_creation: "2026-02-05"
    },
    {
      date: "2026-02-10",
      type: "SORTIE",
      categorie: "ELECTRICITE",
      description: "Facture électricité atelier - Janvier 2026",
      montant: 380000,
      beneficiaire: "CIE",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-CIE-2026-01",
      utilisateur: "Comptabilité",
      date_creation: "2026-02-10"
    },
    {
      date: "2026-02-15",
      type: "SORTIE",
      categorie: "ACHAT_MATERIEL",
      description: "Achat consommables soudure (électrodes, gaz)",
      montant: 1850000,
      beneficiaire: "METALTECH SOUDURE CI",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-METAL-2026-028",
      utilisateur: "Achats SIKA",
      date_creation: "2026-02-15"
    },

    // ========== SORTIES SUPPLÉMENTAIRES - MARS 2026 ==========
    {
      date: "2026-03-10",
      type: "SORTIE",
      categorie: "CARBURANT",
      description: "Carburant véhicules société - Février 2026",
      montant: 320000,
      beneficiaire: "TOTAL ENERGIES CI",
      mode_paiement: "CARTE",
      piece_justificative: "FACT-TOTAL-2026-02",
      utilisateur: "Logistique",
      date_creation: "2026-03-10"
    },
    {
      date: "2026-03-15",
      type: "SORTIE",
      categorie: "EAU",
      description: "Facture eau atelier - Janvier 2026",
      montant: 72000,
      beneficiaire: "SODECI",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-SODECI-2026-01",
      utilisateur: "Comptabilité",
      date_creation: "2026-03-15"
    },

    // ========== SORTIES SUPPLÉMENTAIRES - AVRIL 2026 ==========
    {
      date: "2026-04-08",
      type: "SORTIE",
      categorie: "ACHAT_MATERIEL",
      description: "Achat peinture époxy et apprêt",
      montant: 1200000,
      beneficiaire: "ISOTHERM AFRIQUE",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-ISOTHERM-2026-098",
      reference_projet: "DEV-RES-2026-002",
      utilisateur: "Achats SIKA",
      date_creation: "2026-04-08"
    },
    {
      date: "2026-04-12",
      type: "SORTIE",
      categorie: "SOUS_TRAITANCE",
      description: "Sous-traitance contrôle radiographique soudures",
      montant: 950000,
      beneficiaire: "BUREAU VERITAS CI",
      mode_paiement: "VIREMENT",
      piece_justificative: "FACT-BV-2026-045",
      reference_projet: "DEV-RES-2026-002",
      utilisateur: "Qualité",
      date_creation: "2026-04-12"
    },
    {
      date: "2026-04-25",
      type: "SORTIE",
      categorie: "FOURNITURE_BUREAU",
      description: "Fournitures de bureau - Mars 2026",
      montant: 95000,
      beneficiaire: "LIBRAIRIE DE FRANCE",
      mode_paiement: "ESPECES",
      piece_justificative: "FACT-LDF-2026-198",
      utilisateur: "Administration",
      date_creation: "2026-04-25"
    }
  ]

  // Insérer tous les mouvements
  const { data, error } = await supabase
    .from('mouvements_caisse')
    .insert(mouvementsSupp)
    .select()

  if (error) {
    console.error('❌ Erreur insertion:', error)
    throw error
  }

  // Récupérer TOUS les mouvements pour calculer le solde total
  const { data: tousMouvements } = await supabase
    .from('mouvements_caisse')
    .select('*')

  const totalEntrees = tousMouvements.filter(m => m.type === 'ENTREE').reduce((sum, m) => sum + parseFloat(m.montant), 0)
  const totalSorties = tousMouvements.filter(m => m.type === 'SORTIE').reduce((sum, m) => sum + parseFloat(m.montant), 0)
  const soldeTotal = totalEntrees - totalSorties

  console.log('✅ Mouvements supplémentaires injectés avec succès!\n')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('📊 STATISTIQUES CAISSE COMPLÈTES')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`💰 Total ENTRÉES:  ${totalEntrees.toLocaleString('fr-FR')} FCFA`)
  console.log(`💸 Total SORTIES:  ${totalSorties.toLocaleString('fr-FR')} FCFA`)
  console.log(`📈 SOLDE CAISSE:   ${soldeTotal.toLocaleString('fr-FR')} FCFA`)
  console.log('═══════════════════════════════════════════════════════════════\n')
  
  console.log(`✅ ${mouvementsSupp.length} mouvements supplémentaires injectés`)
  console.log(`   - ${mouvementsSupp.filter(m => m.type === 'ENTREE').length} ENTRÉES`)
  console.log(`   - ${mouvementsSupp.filter(m => m.type === 'SORTIE').length} SORTIES`)
  console.log(`📊 TOTAL GÉNÉRAL: ${tousMouvements.length} mouvements dans la base\n`)
}

async function main() {
  try {
    await ajouterMouvementsSupplementaires()
    
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('✅ INJECTION COMPLÈTE TERMINÉE AVEC SUCCÈS !')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('🌐 Accédez au Dashboard pour voir TOUTES les données:')
    console.log('   http://localhost:5187/dashboard\n')
    console.log('💰 Module Caisse avec solde positif:')
    console.log('   http://localhost:5187/caisse\n')
    console.log('📋 Tous les indicateurs sont maintenant remplis!')
    console.log('   ✓ Solde Caisse')
    console.log('   ✓ Chiffre d\'affaires mensuel')
    console.log('   ✓ Dépenses mensuelles')
    console.log('   ✓ Factures en attente')
    console.log('   ✓ Projets actifs')
    console.log('   ✓ Statistiques complètes\n')
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    process.exit(1)
  }
}

main()
