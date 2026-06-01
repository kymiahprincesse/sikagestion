import { supabase } from '../lib/supabaseClient.js'

// ═══════════════════════════════════════════════════════════════
// SCRIPT D'INJECTION DES DONNÉES RÉELLES SIKAGESTION
// ═══════════════════════════════════════════════════════════════

const CLIENTS_REELS = [
  {
    nom: "GESTOCI SA",
    raison_sociale: "Société de Gestion des Stocks d'Hydrocarbures",
    secteur: "Énergie",
    type: "CLIENT",
    contact_nom: "M. YVES KOUADIO",
    contact_telephone: "+225 27 22 40 60 00",
    contact_email: "y.kouadio@gestoci.ci",
    adresse: "Zone Industrielle de Vridi, Boulevard de Marseille",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    conditions_paiement: 60,
    plafond_credit: 50000000,
    is_actif: true,
    notes: "Client stratégique - Secteur pétrolier",
    date_creation: "2025-01-15"
  },
  {
    nom: "SUCRIVOIRE SA",
    raison_sociale: "Compagnie Sucrière d'Ivoire",
    secteur: "Agroalimentaire",
    type: "CLIENT",
    contact_nom: "Mme AHOU BAMBA",
    contact_telephone: "+225 27 34 71 00 00",
    contact_email: "a.bamba@sucrivoire.ci",
    adresse: "Km 25 Route de Yamoussoukro",
    ville: "Bouaké",
    pays: "Côte d'Ivoire",
    conditions_paiement: 45,
    plafond_credit: 30000000,
    is_actif: true,
    notes: "Production sucrière - Maintenance régulière",
    date_creation: "2025-02-10"
  },
  {
    nom: "CIE",
    raison_sociale: "Compagnie Ivoirienne d'Electricité SA",
    secteur: "Énergie",
    type: "CLIENT",
    contact_nom: "Ing. KOUAMÉ ADOU",
    contact_telephone: "+225 27 21 25 35 00",
    contact_email: "k.adou@cie.ci",
    adresse: "Immeuble CIE, Avenue Christiani",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    conditions_paiement: 90,
    plafond_credit: 100000000,
    is_actif: true,
    notes: "Client majeur - Projets d'envergure nationale",
    date_creation: "2024-11-20"
  },
  {
    nom: "PALM CI",
    raison_sociale: "Société de Palme et d'Huilerie de Côte d'Ivoire",
    secteur: "Agroalimentaire",
    type: "CLIENT",
    contact_nom: "M. GNANGUI KONAN",
    contact_telephone: "+225 27 36 42 11 00",
    contact_email: "g.konan@palmci.ci",
    adresse: "Route de Dabou, Zone Agro-industrielle",
    ville: "San-Pedro",
    pays: "Côte d'Ivoire",
    conditions_paiement: 30,
    plafond_credit: 20000000,
    is_actif: true,
    notes: "Industrie palmiste - Tuyauterie spécialisée",
    date_creation: "2025-03-05"
  },
  {
    nom: "SODEMI",
    raison_sociale: "Société pour le Développement Minier SA",
    secteur: "Industrie",
    type: "CLIENT",
    contact_nom: "Dr. TRAORÉ IBRAHIMA",
    contact_telephone: "+225 27 22 44 30 00",
    contact_email: "i.traore@sodemi.ci",
    adresse: "Plateau, Boulevard de la République",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    conditions_paiement: 60,
    plafond_credit: 75000000,
    is_actif: true,
    notes: "Secteur minier - Équipements lourds",
    date_creation: "2025-01-28"
  }
]

const FOURNISSEURS_REELS = [
  {
    nom: "METALTECH SOUDURE CI",
    raison_sociale: "METALTECH SARL",
    type: "SOUS_TRAITANT",
    secteur: "Soudure industrielle et chaudronnerie",
    contact_nom: "M. KONAN YVES THIERRY",
    contact_telephone: "+225 07 09 33 44 55",
    contact_email: "contact@metaltech-ci.com",
    adresse: "Zone Industrielle Yopougon",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    banque: "SGBCI",
    numero_compte: "CI123456789012345",
    conditions_paiement: 30,
    is_actif: true,
    notes: "Sous-traitant soudure certifié",
    date_creation: "2024-06-15"
  },
  {
    nom: "ISOTHERM AFRIQUE",
    raison_sociale: "ISOTHERM AFRIQUE SAS",
    type: "SERVICE",
    secteur: "Fourniture matériaux calorifugeage",
    contact_nom: "Mme DIABATÉ FATOUMATA",
    contact_telephone: "+225 05 65 22 11 88",
    contact_email: "f.diabate@isotherm-afrique.com",
    adresse: "Boulevard Latrille, Marcory",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    banque: "BICICI",
    numero_compte: "CI987654321098765",
    conditions_paiement: 15,
    is_actif: true,
    notes: "Fournisseur principal laine de roche",
    date_creation: "2024-08-20"
  },
  {
    nom: "TRANS-CI LOGISTIQUE",
    raison_sociale: "TRANS-CI SAS",
    type: "TRANSPORT",
    secteur: "Transport industriel et levage",
    contact_nom: "M. BALLO MOUSSA",
    contact_telephone: "+225 01 72 88 44 66",
    contact_email: "m.ballo@transci.ci",
    adresse: "Autoroute du Nord, PK 12",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    banque: "Ecobank CI",
    numero_compte: "CI112233445566778",
    conditions_paiement: 7,
    is_actif: true,
    notes: "Transport équipements lourds",
    date_creation: "2024-09-10"
  },
  {
    nom: "ACIER DISTRIBUTION CI",
    raison_sociale: "ACIER DISTRIBUTION CI SARL",
    type: "MATERIEL",
    secteur: "Négoce acier et métaux",
    contact_nom: "M. SÉKA BI SÉKA",
    contact_telephone: "+225 07 99 55 22 11",
    contact_email: "contact@acierdistrib.ci",
    adresse: "Zone Portuaire, Quai de Pêche",
    ville: "Abidjan",
    pays: "Côte d'Ivoire",
    banque: "SGBCI",
    numero_compte: "CI556677889900112",
    conditions_paiement: 45,
    is_actif: true,
    notes: "Fournisseur tôles et profilés",
    date_creation: "2024-10-05"
  }
]

const UTILISATEURS_REELS = [
  {
    nom: "ASSANDE KOUAKOU",
    login: "assande",
    mot_de_passe: "Sika@2026#",
    role: "COMPTABLE",
    email: "assande.kouakou@sikaindustrie.ci",
    is_actif: true,
    date_creation: "2025-01-10"
  },
  {
    nom: "AMINATA DIALLO",
    login: "aminata",
    mot_de_passe: "Sika@2026#",
    role: "SECRETAIRE",
    email: "aminata.diallo@sikaindustrie.ci",
    is_actif: true,
    date_creation: "2025-02-01"
  },
  {
    nom: "RODRIGUE AHOUSSI",
    login: "rodrigue",
    mot_de_passe: "Sika@2026#",
    role: "TECHNICIEN",
    email: "rodrigue.ahoussi@sikaindustrie.ci",
    is_actif: true,
    date_creation: "2025-03-15"
  }
]

// ═══════════════════════════════════════════════════════════════
// FONCTIONS D'INJECTION
// ═══════════════════════════════════════════════════════════════

export async function injecterClients() {
  console.log('🔄 Injection des 5 clients réels...')
  
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert(CLIENTS_REELS)
      .select()
    
    if (error) throw error
    
    console.log(`✅ ${data.length} clients injectés avec succès`)
    return { success: true, data, count: data.length }
  } catch (error) {
    console.error('❌ Erreur injection clients:', error.message)
    return { success: false, error: error.message }
  }
}

export async function injecterFournisseurs() {
  console.log('🔄 Injection des 4 fournisseurs réels...')
  
  try {
    const { data, error } = await supabase
      .from('fournisseurs')
      .insert(FOURNISSEURS_REELS)
      .select()
    
    if (error) throw error
    
    console.log(`✅ ${data.length} fournisseurs injectés avec succès`)
    return { success: true, data, count: data.length }
  } catch (error) {
    console.error('❌ Erreur injection fournisseurs:', error.message)
    return { success: false, error: error.message }
  }
}

export async function injecterUtilisateurs() {
  console.log('🔄 Injection des 3 utilisateurs réels...')
  
  try {
    const { data, error } = await supabase
      .from('utilisateurs')
      .insert(UTILISATEURS_REELS)
      .select()
    
    if (error) throw error
    
    console.log(`✅ ${data.length} utilisateurs injectés avec succès`)
    return { success: true, data, count: data.length }
  } catch (error) {
    console.error('❌ Erreur injection utilisateurs:', error.message)
    return { success: false, error: error.message }
  }
}

export async function injecterProjets(clientsData) {
  console.log('🔄 Injection des 15 projets réels (3 par client)...')
  
  const projets = []
  
  // GESTOCI - 3 projets
  const gestoci = clientsData.find(c => c.nom === "GESTOCI SA")
  if (gestoci) {
    projets.push(
      {
        nom: "Calorifugeage des conduites vapeur – Dépôt Vridi",
        client_id: gestoci.id,
        reference_projet: "PROJ-GEST-2026-001",
        date_debut: "2026-03-01",
        date_fin_prevue: "2026-05-15",
        budget_prevu: 12500000,
        statut: "En cours",
        description: "Calorifugeage complet des conduites vapeur haute pression du dépôt Vridi - Blocs A et B",
        date_creation: "2026-02-15"
      },
      {
        nom: "Remplacement tuyauterie DN200 – Terminal pétrolier",
        client_id: gestoci.id,
        reference_projet: "PROJ-GEST-2026-002",
        date_debut: "2026-01-10",
        date_fin_prevue: "2026-03-30",
        budget_prevu: 28000000,
        statut: "En retard",
        description: "Remplacement de 450 mètres de tuyauterie DN200 - Terminal pétrolier zone C",
        date_creation: "2025-12-20"
      },
      {
        nom: "Inspection et réparation réservoirs R7 à R12",
        client_id: gestoci.id,
        reference_projet: "PROJ-GEST-2025-003",
        date_debut: "2025-10-01",
        date_fin_prevue: "2025-12-31",
        date_fin_reelle: "2025-12-28",
        budget_prevu: 45000000,
        cout_reel: 43500000,
        statut: "Terminé",
        description: "Inspection complète et réparation de 6 réservoirs de stockage hydrocarbures",
        date_creation: "2025-09-15"
      }
    )
  }
  
  // SUCRIVOIRE - 3 projets
  const sucrivoire = clientsData.find(c => c.nom === "SUCRIVOIRE SA")
  if (sucrivoire) {
    projets.push(
      {
        nom: "Maintenance préventive calorifugeage usine",
        client_id: sucrivoire.id,
        reference_projet: "PROJ-SUCR-2026-001",
        date_debut: "2026-02-01",
        date_fin_prevue: "2026-02-28",
        date_fin_reelle: "2026-02-26",
        budget_prevu: 8500000,
        cout_reel: 8200000,
        statut: "Terminé",
        description: "Maintenance annuelle du calorifugeage - Lignes vapeur et eau chaude",
        date_creation: "2026-01-10"
      },
      {
        nom: "Installation tuyauterie jus de canne – Ligne 3",
        client_id: sucrivoire.id,
        reference_projet: "PROJ-SUCR-2026-002",
        date_debut: "2026-04-15",
        date_fin_prevue: "2026-06-30",
        budget_prevu: 15000000,
        statut: "En préparation",
        description: "Installation complète réseau tuyauterie inox pour jus de canne - Nouvelle ligne 3",
        date_creation: "2026-03-20"
      },
      {
        nom: "Réfection charpente métallique hall stockage",
        client_id: sucrivoire.id,
        reference_projet: "PROJ-SUCR-2026-003",
        date_debut: "2026-05-01",
        date_fin_prevue: "2026-07-15",
        budget_prevu: 22000000,
        statut: "Suspendu",
        description: "Renforcement et réfection charpente métallique - Hall de stockage sucre",
        date_creation: "2026-04-01"
      }
    )
  }
  
  // CIE - 3 projets
  const cie = clientsData.find(c => c.nom === "CIE")
  if (cie) {
    projets.push(
      {
        nom: "Fabrication réservoir eau déminéralisée 50m³",
        client_id: cie.id,
        reference_projet: "PROJ-CIE-2026-001",
        date_debut: "2026-04-20",
        date_fin_prevue: "2026-07-31",
        budget_prevu: 35000000,
        statut: "En cours",
        description: "Fabrication et installation réservoir stockage eau déminéralisée - Centrale Azito",
        date_creation: "2026-04-01"
      },
      {
        nom: "Tuyauterie vapeur centrale thermique Vridi",
        client_id: cie.id,
        reference_projet: "PROJ-CIE-2026-002",
        date_debut: "2026-06-01",
        date_fin_prevue: "2026-09-30",
        budget_prevu: 58000000,
        statut: "En préparation",
        description: "Installation réseau tuyauterie vapeur haute pression - Centrale Vridi",
        date_creation: "2026-05-10"
      },
      {
        nom: "Charpente métallique poste transformation",
        client_id: cie.id,
        reference_projet: "PROJ-CIE-2025-003",
        date_debut: "2025-11-01",
        date_fin_prevue: "2026-01-31",
        date_fin_reelle: "2026-02-05",
        budget_prevu: 18000000,
        cout_reel: 18500000,
        statut: "Terminé",
        description: "Fabrication et montage charpente métallique - Poste transformation Yopougon",
        date_creation: "2025-10-15"
      }
    )
  }
  
  // PALM CI - 3 projets
  const palmci = clientsData.find(c => c.nom === "PALM CI")
  if (palmci) {
    projets.push(
      {
        nom: "Installation réseau tuyauterie huile de palme",
        client_id: palmci.id,
        reference_projet: "PROJ-PALM-2026-001",
        date_debut: "2026-05-05",
        date_fin_prevue: "2026-07-20",
        budget_prevu: 18500000,
        statut: "En cours",
        description: "Installation réseau tuyauterie acier pour huile de palme brute - Usine San-Pedro",
        date_creation: "2026-04-15"
      },
      {
        nom: "Réservoirs stockage huile raffinée 2x30m³",
        client_id: palmci.id,
        reference_projet: "PROJ-PALM-2026-002",
        date_debut: "2026-03-01",
        date_fin_prevue: "2026-05-31",
        budget_prevu: 25000000,
        statut: "En retard",
        description: "Fabrication et installation de 2 réservoirs stockage huile raffinée",
        date_creation: "2026-02-10"
      },
      {
        nom: "Maintenance annuelle équipements process",
        client_id: palmci.id,
        reference_projet: "PROJ-PALM-2026-003",
        date_debut: "2026-01-15",
        date_fin_prevue: "2026-02-15",
        date_fin_reelle: "2026-02-12",
        budget_prevu: 6500000,
        cout_reel: 6300000,
        statut: "Terminé",
        description: "Maintenance préventive annuelle - Équipements de process huilerie",
        date_creation: "2025-12-20"
      }
    )
  }
  
  // SODEMI - 3 projets
  const sodemi = clientsData.find(c => c.nom === "SODEMI")
  if (sodemi) {
    projets.push(
      {
        nom: "Charpente métallique bâtiment administratif",
        client_id: sodemi.id,
        reference_projet: "PROJ-SODE-2026-001",
        date_debut: "2026-02-01",
        date_fin_prevue: "2026-04-30",
        budget_prevu: 32000000,
        statut: "En cours",
        description: "Fabrication et montage charpente métallique - Nouveau bâtiment administratif",
        date_creation: "2026-01-15"
      },
      {
        nom: "Tuyauterie process traitement minerai",
        client_id: sodemi.id,
        reference_projet: "PROJ-SODE-2026-002",
        date_debut: "2026-06-01",
        date_fin_prevue: "2026-09-30",
        budget_prevu: 42000000,
        statut: "En préparation",
        description: "Installation réseau tuyauterie process - Unité traitement minerai",
        date_creation: "2026-05-15"
      },
      {
        nom: "Réservoirs stockage eau industrielle 3x40m³",
        client_id: sodemi.id,
        reference_projet: "PROJ-SODE-2025-003",
        date_debut: "2025-09-01",
        date_fin_prevue: "2025-11-30",
        date_fin_reelle: "2025-11-28",
        budget_prevu: 38000000,
        cout_reel: 37200000,
        statut: "Terminé",
        description: "Fabrication et installation 3 réservoirs eau industrielle - Site minier",
        date_creation: "2025-08-10"
      }
    )
  }
  
  try {
    const { data, error } = await supabase
      .from('projets')
      .insert(projets)
      .select()
    
    if (error) throw error
    
    console.log(`✅ ${data.length} projets injectés avec succès`)
    return { success: true, data, count: data.length }
  } catch (error) {
    console.error('❌ Erreur injection projets:', error.message)
    return { success: false, error: error.message }
  }
}

// ═══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE D'INJECTION
// ═══════════════════════════════════════════════════════════════

export async function injecterToutesDonnees() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('🚀 DÉBUT INJECTION DONNÉES RÉELLES SIKAGESTION')
  console.log('═══════════════════════════════════════════════════════════════')
  
  const rapport = {
    clients: { success: false, count: 0 },
    fournisseurs: { success: false, count: 0 },
    utilisateurs: { success: false, count: 0 },
    projets: { success: false, count: 0 }
  }
  
  // 1. Clients
  const resultClients = await injecterClients()
  rapport.clients = resultClients
  
  // 2. Fournisseurs
  const resultFournisseurs = await injecterFournisseurs()
  rapport.fournisseurs = resultFournisseurs
  
  // 3. Utilisateurs
  const resultUtilisateurs = await injecterUtilisateurs()
  rapport.utilisateurs = resultUtilisateurs
  
  // 4. Projets (nécessite les IDs clients)
  if (resultClients.success && resultClients.data) {
    const resultProjets = await injecterProjets(resultClients.data)
    rapport.projets = resultProjets
  }
  
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('📊 RAPPORT D\'INJECTION')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Clients:       ${rapport.clients.success ? '✅' : '❌'} ${rapport.clients.count} injectés`)
  console.log(`Fournisseurs:  ${rapport.fournisseurs.success ? '✅' : '❌'} ${rapport.fournisseurs.count} injectés`)
  console.log(`Utilisateurs:  ${rapport.utilisateurs.success ? '✅' : '❌'} ${rapport.utilisateurs.count} injectés`)
  console.log(`Projets:       ${rapport.projets.success ? '✅' : '❌'} ${rapport.projets.count} injectés`)
  console.log('═══════════════════════════════════════════════════════════════')
  
  return rapport
}
