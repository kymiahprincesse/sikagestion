#!/usr/bin/env node

/**
 * Script d'injection COMPLÈTE - Devis, Factures, Appels d'offres
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://keyfnghpisdwwayrmlfk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleWZuZ2hwaXNkd3dheXJtbGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjA3NDUsImV4cCI6MjA5NTYzNjc0NX0.IWdepYM5NNQp23Qa8YVxwTYY7ngzwtqBW6HSFNI71EQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('═══════════════════════════════════════════════════════════════')
console.log('🚀 INJECTION COMPLÈTE - DEVIS, FACTURES, APPELS D\'OFFRES')
console.log('═══════════════════════════════════════════════════════════════\n')

async function injecterDevis() {
  console.log('📦 Injection des devis...')
  
  // Récupérer les clients
  const { data: clients } = await supabase.from('clients').select('*')
  const gestoci = clients.find(c => c.nom === "GESTOCI SA")
  const cie = clients.find(c => c.nom === "CIE")
  const palmci = clients.find(c => c.nom === "PALM CI")
  const sucrivoire = clients.find(c => c.nom === "SUCRIVOIRE SA")
  
  // DEVIS 1 - CALORIFUGE GESTOCI
  const lignes1 = [
    { designation: "CONDUITE VAPEUR DN150", ml: 45, pt: 12, pu: 28500, montant: 1624500 },
    { designation: "CONDUITE VAPEUR DN100", ml: 30, pt: 8, pu: 21000, montant: 798000 },
    { designation: "ROBINETTERIE DN150", ml: 0, pt: 6, pu: 95000, montant: 570000 },
    { designation: "COUDE DN150", ml: 0, pt: 14, pu: 35000, montant: 490000 },
    { designation: "BRIDE DN150", ml: 0, pt: 20, pu: 18500, montant: 370000 },
    { designation: "ACCESSOIRES DIVERS", ml: 0, pt: 1, pu: 450000, montant: 450000 }
  ]
  const totalHT1 = 4302500
  const tva1 = totalHT1 * 0.18
  const ttc1 = totalHT1 + tva1
  
  const { data: devis1 } = await supabase.from('devis').insert({
    numero: "DEV-CAL-2026-001",
    client_id: gestoci.id,
    client_nom: gestoci.nom,
    type_devis: "CALORIFUGE",
    objet: "Calorifugeage des lignes vapeur haute pression – Dépôt Vridi Blocs A et B",
    demande_par: "M. YVES KOUADIO",
    date_devis: "2026-03-15",
    date_validation: "2026-03-20",
    montant_ht: totalHT1,
    montant_tva: tva1,
    montant_ttc: ttc1,
    montant_total: ttc1,
    taux_tva: 18,
    taux_remise: 0,
    statut: "VALIDE",
    notes: "Devis validé - En attente de facturation",
    date_creation: "2026-03-15"
  }).select().single()
  
  await supabase.from('lignes_devis').insert(
    lignes1.map((l, i) => ({ devis_id: devis1.id, ...l, ordre: i + 1 }))
  )
  
  // DEVIS 2 - RESERVOIR CIE
  const lignes2 = [
    { designation: "Mobilisation chantier et études", quantite: 1, unite: "Forfait", pu: 2500000, montant: 2500000 },
    { designation: "Fabrication viroles et fonds", quantite: 1, unite: "Forfait", pu: 18500000, montant: 18500000 },
    { designation: "Soudage et contrôle radiographique", quantite: 1, unite: "Forfait", pu: 6500000, montant: 6500000 },
    { designation: "Traitement de surface et peinture époxy", quantite: 1, unite: "Forfait", pu: 3200000, montant: 3200000 },
    { designation: "Transport et montage sur site", quantite: 1, unite: "Forfait", pu: 2800000, montant: 2800000 }
  ]
  const totalHT2 = 33500000
  const remise2 = totalHT2 * 0.08
  const htApresRemise2 = totalHT2 - remise2
  const tva2 = htApresRemise2 * 0.18
  const ttc2 = htApresRemise2 + tva2
  
  const { data: devis2 } = await supabase.from('devis').insert({
    numero: "DEV-RES-2026-002",
    client_id: cie.id,
    client_nom: cie.nom,
    type_devis: "RESERVOIR",
    objet: "Fabrication et installation d'un réservoir de stockage eau déminéralisée 50m³",
    demande_par: "Ing. KOUAMÉ ADOU",
    date_devis: "2026-04-10",
    date_validation: "2026-04-18",
    montant_ht: totalHT2,
    montant_remise: remise2,
    montant_ht_apres_remise: htApresRemise2,
    montant_tva: tva2,
    montant_ttc: ttc2,
    montant_total: ttc2,
    taux_tva: 18,
    taux_remise: 8,
    statut: "VALIDE",
    parametres_reservoir: {
      volume: "50m³",
      forme: "Cylindrique",
      materiau: "Acier A516 Grade 70",
      pression: "6 bar",
      temperature: "80°C",
      revetement: "Époxy",
      lieu: "Centrale d'Azito"
    },
    modalites_paiement: "50% à la commande / 45% à l'avancement / 5% à la réception",
    notes: "Devis validé - Délai fabrication 12 semaines",
    date_creation: "2026-04-10"
  }).select().single()
  
  await supabase.from('lignes_devis').insert(
    lignes2.map((l, i) => ({ devis_id: devis2.id, ...l, ordre: i + 1 }))
  )
  
  // DEVIS 3 - TUYAUTERIE PALM CI
  const lignes3 = [
    { designation: "Tuyauterie acier DN80 Sch 40", quantite: 60, unite: "ML", pu: 32000, montant: 1920000 },
    { designation: "Tuyauterie acier DN50 Sch 40", quantite: 35, unite: "ML", pu: 24000, montant: 840000 },
    { designation: "Coudes et raccords DN80", quantite: 18, unite: "Pcs", pu: 28000, montant: 504000 },
    { designation: "Vannes à bille DN80", quantite: 8, unite: "Pcs", pu: 145000, montant: 1160000 },
    { designation: "Supports et colliers de fixation", quantite: 1, unite: "Forfait", pu: 850000, montant: 850000 },
    { designation: "Main d'œuvre montage et soudure", quantite: 1, unite: "Forfait", pu: 3200000, montant: 3200000 }
  ]
  const totalHT3 = 8474000
  const tva3 = totalHT3 * 0.18
  const ttc3 = totalHT3 + tva3
  
  const { data: devis3 } = await supabase.from('devis').insert({
    numero: "DEV-TUY-2026-003",
    client_id: palmci.id,
    client_nom: palmci.nom,
    type_devis: "TUYAUTERIE",
    objet: "Installation réseau tuyauterie huile de palme brute – Usine San-Pedro",
    demande_par: "M. GNANGUI KONAN",
    date_devis: "2026-05-02",
    montant_ht: totalHT3,
    montant_tva: tva3,
    montant_ttc: ttc3,
    montant_total: ttc3,
    taux_tva: 18,
    taux_remise: 0,
    statut: "BROUILLON",
    notes: "Devis en attente de validation client",
    date_creation: "2026-05-02"
  }).select().single()
  
  await supabase.from('lignes_devis').insert(
    lignes3.map((l, i) => ({ devis_id: devis3.id, ...l, ordre: i + 1 }))
  )
  
  // DEVIS 4 - PLIAGE SUCRIVOIRE
  const lignes4 = [
    { designation: "Pliage tôle inox 304 - 3mm - Goulottes", quantite: 12, unite: "Pcs", pu: 85000, montant: 1020000 },
    { designation: "Pliage tôle inox 304 - 2mm - Capots protection", quantite: 8, unite: "Pcs", pu: 65000, montant: 520000 },
    { designation: "Découpe laser tôle inox 304", quantite: 1, unite: "Forfait", pu: 450000, montant: 450000 },
    { designation: "Finition et polissage", quantite: 1, unite: "Forfait", pu: 280000, montant: 280000 }
  ]
  const totalHT4 = 2270000
  const tva4 = totalHT4 * 0.18
  const ttc4 = totalHT4 + tva4
  
  const { data: devis4 } = await supabase.from('devis').insert({
    numero: "DEV-PLI-2026-004",
    client_id: sucrivoire.id,
    client_nom: sucrivoire.nom,
    type_devis: "PLIAGE",
    objet: "Pliage et découpe tôles inox 304 – Équipements process",
    demande_par: "Mme AHOU BAMBA",
    date_devis: "2026-04-25",
    montant_ht: totalHT4,
    montant_tva: tva4,
    montant_ttc: ttc4,
    montant_total: ttc4,
    taux_tva: 18,
    taux_remise: 0,
    statut: "BROUILLON",
    parametres_pliage: {
      type_tole: "Inox 304",
      epaisseurs: "2mm, 3mm",
      finition: "Poli miroir"
    },
    notes: "Devis en cours de finalisation",
    date_creation: "2026-04-25"
  }).select().single()
  
  await supabase.from('lignes_devis').insert(
    lignes4.map((l, i) => ({ devis_id: devis4.id, ...l, ordre: i + 1 }))
  )
  
  console.log('✅ 4 devis injectés avec leurs lignes\n')
  return { devis1, devis2, devis3, devis4 }
}

async function injecterFactures() {
  console.log('📦 Injection des factures...')
  
  const { data: clients } = await supabase.from('clients').select('*')
  const gestoci = clients.find(c => c.nom === "GESTOCI SA")
  const cie = clients.find(c => c.nom === "CIE")
  const sucrivoire = clients.find(c => c.nom === "SUCRIVOIRE SA")
  
  // Récupérer les devis créés
  const { data: devis } = await supabase.from('devis').select('*')
  const devis1 = devis.find(d => d.numero === "DEV-CAL-2026-001")
  const devis2 = devis.find(d => d.numero === "DEV-RES-2026-002")
  
  // FACTURE 1 - GESTOCI (50% payée)
  const { data: lignesDevis1 } = await supabase.from('lignes_devis')
    .select('*').eq('devis_id', devis1.id).order('ordre')
  
  const montantTTC1 = devis1.montant_ttc
  const paiement50 = montantTTC1 * 0.50
  
  const { data: fact1 } = await supabase.from('factures').insert({
    numero: "FACT-2026-001",
    client_id: gestoci.id,
    client_nom: gestoci.nom,
    devis_id: devis1.id,
    objet: devis1.objet,
    reference: "BON DE COMMANDE GESTOCI N° GES-2026-0312",
    date_depot: "2026-03-20",
    date_echeance: "2026-05-20",
    montant_ht: devis1.montant_ht,
    montant_tva: devis1.montant_tva,
    montant_ttc: montantTTC1,
    montant_paye: paiement50,
    montant_restant: montantTTC1 - paiement50,
    taux_tva: 18,
    delai_reglement: 60,
    statut: "EN_ATTENTE",
    notes: "Facture partiellement réglée - Reste 50% à échéance",
    date_creation: "2026-03-20"
  }).select().single()
  
  await supabase.from('lignes_factures').insert(
    lignesDevis1.map((l, i) => ({
      facture_id: fact1.id,
      designation: l.designation,
      quantite: l.quantite || (l.ml + l.pt),
      unite: l.unite || "ML+PT",
      pu: l.pu,
      montant: l.montant,
      ordre: i + 1
    }))
  )
  
  await supabase.from('paiements_factures').insert({
    facture_id: fact1.id,
    date: "2026-04-05",
    montant: paiement50,
    mode: "VIREMENT",
    reference: "VIR-SGBCI-20260405-7842",
    notes: "Paiement 50% - Acompte commande"
  })
  
  // FACTURE 2 - CIE (non payée)
  const { data: lignesDevis2 } = await supabase.from('lignes_devis')
    .select('*').eq('devis_id', devis2.id).order('ordre')
  
  const { data: fact2 } = await supabase.from('factures').insert({
    numero: "FACT-2026-002",
    client_id: cie.id,
    client_nom: cie.nom,
    devis_id: devis2.id,
    objet: devis2.objet,
    reference: "BON DE COMMANDE CIE N° CIE/OP/2026/0847",
    date_depot: "2026-04-15",
    date_echeance: "2026-07-15",
    montant_ht: devis2.montant_ht_apres_remise,
    montant_tva: devis2.montant_tva,
    montant_ttc: devis2.montant_ttc,
    montant_paye: 0,
    montant_restant: devis2.montant_ttc,
    taux_tva: 18,
    delai_reglement: 90,
    statut: "EN_ATTENTE",
    notes: "Facture en attente de paiement - Échéance 90 jours",
    date_creation: "2026-04-15"
  }).select().single()
  
  await supabase.from('lignes_factures').insert(
    lignesDevis2.map((l, i) => ({
      facture_id: fact2.id,
      designation: l.designation,
      quantite: l.quantite,
      unite: l.unite,
      pu: l.pu,
      montant: l.montant,
      ordre: i + 1
    }))
  )
  
  // FACTURE 3 - SUCRIVOIRE (100% payée)
  const lignes3 = [
    { designation: "Maintenance préventive calorifugeage", quantite: 1, unite: "Forfait", pu: 4500000, montant: 4500000 },
    { designation: "Remplacement laine de roche DN100", quantite: 45, unite: "ML", pu: 18500, montant: 832500 },
    { designation: "Main d'œuvre techniciens (5j × 4 pers)", quantite: 20, unite: "J/H", pu: 95000, montant: 1900000 }
  ]
  const totalHT3 = 7232500
  const tva3 = totalHT3 * 0.18
  const ttc3 = totalHT3 + tva3
  
  const { data: fact3 } = await supabase.from('factures').insert({
    numero: "FACT-2026-003",
    client_id: sucrivoire.id,
    client_nom: sucrivoire.nom,
    objet: "Maintenance préventive calorifugeage – Contrat annuel",
    reference: "CONTRAT MAINTENANCE SV-SIKA-2026-01",
    date_depot: "2026-02-10",
    date_echeance: "2026-03-27",
    date_payement: "2026-03-20",
    montant_ht: totalHT3,
    montant_tva: tva3,
    montant_ttc: ttc3,
    montant_paye: ttc3,
    montant_restant: 0,
    taux_tva: 18,
    delai_reglement: 45,
    statut: "PAYEE",
    notes: "Facture réglée intégralement - Contrat maintenance annuel",
    date_creation: "2026-02-10"
  }).select().single()
  
  await supabase.from('lignes_factures').insert(
    lignes3.map((l, i) => ({ facture_id: fact3.id, ...l, ordre: i + 1 }))
  )
  
  await supabase.from('paiements_factures').insert({
    facture_id: fact3.id,
    date: "2026-03-20",
    montant: ttc3,
    mode: "CHEQUE",
    reference: "CHQ-N°458720",
    notes: "Paiement intégral par chèque"
  })
  
  console.log('✅ 3 factures injectées avec lignes et paiements\n')
}

async function injecterAppelsOffres() {
  console.log('📦 Injection des appels d\'offres...')
  
  const { data: clients } = await supabase.from('clients').select('*')
  const gestoci = clients.find(c => c.nom === "GESTOCI SA")
  const cie = clients.find(c => c.nom === "CIE")
  const sodemi = clients.find(c => c.nom === "SODEMI")
  
  await supabase.from('appels_offres').insert([
    {
      numero_devis: "AO-GESTOCI-2026-07",
      client: gestoci.nom,
      client_id: gestoci.id,
      objet: "Réhabilitation conduites vapeur – Terminal B",
      date_reception_ao: "2026-05-10",
      date_limite: "2026-05-25",
      montant_estime: 45000000,
      priorite: "Haute",
      statut: "A_CHIFFRER",
      notes: "AO urgent - Réponse attendue sous 15 jours",
      date_creation: "2026-05-10"
    },
    {
      numero_devis: "AO-CIE-2026-05",
      client: cie.nom,
      client_id: cie.id,
      objet: "Tuyauterie vapeur centrale thermique Ciprel",
      date_reception_ao: "2026-04-20",
      date_limite: "2026-06-15",
      montant_estime: 75000000,
      priorite: "Moyenne",
      statut: "SOUMIS",
      date_soumission: "2026-05-30",
      notes: "Devis soumis - En attente retour client",
      date_creation: "2026-04-20"
    },
    {
      numero_devis: "AO-SODEMI-2026-03",
      client: sodemi.nom,
      client_id: sodemi.id,
      objet: "Charpente métallique hangar stockage minerai",
      date_reception_ao: "2026-03-15",
      date_limite: "2026-04-30",
      montant_estime: 52000000,
      priorite: "Basse",
      statut: "PERDU",
      date_decision: "2026-05-05",
      notes: "AO perdu - Concurrent retenu pour prix inférieur",
      date_creation: "2026-03-15"
    }
  ])
  
  console.log('✅ 3 appels d\'offres injectés\n')
}

async function main() {
  try {
    await injecterDevis()
    await injecterFactures()
    await injecterAppelsOffres()
    
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('✅ INJECTION COMPLÈTE TERMINÉE AVEC SUCCÈS !')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('📊 Devis:           4 injectés (+ 20 lignes)')
    console.log('📊 Factures:        3 injectées (+ 14 lignes + 2 paiements)')
    console.log('📊 Appels d\'offres: 3 injectés')
    console.log('═══════════════════════════════════════════════════════════════\n')
    console.log('🌐 Accédez maintenant à l\'application:')
    console.log('   http://localhost:5187\n')
    console.log('📋 Pages à consulter:')
    console.log('   • Clients:          http://localhost:5187/clients')
    console.log('   • Devis:            http://localhost:5187/devis/liste')
    console.log('   • Factures:         http://localhost:5187/factures')
    console.log('   • Appels d\'offres:  http://localhost:5187/ao')
    console.log('   • Projets:          http://localhost:5187/planification')
    console.log('   • Dashboard:        http://localhost:5187/dashboard\n')
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    process.exit(1)
  }
}

main()
