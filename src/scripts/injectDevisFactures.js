import { supabase } from '../lib/supabaseClient.js'

// ═══════════════════════════════════════════════════════════════
// INJECTION DEVIS ET FACTURES RÉELS
// ═══════════════════════════════════════════════════════════════

export async function injecterDevis(clientsData) {
  console.log('🔄 Injection des devis réels...')
  
  const gestoci = clientsData.find(c => c.nom === "GESTOCI SA")
  const cie = clientsData.find(c => c.nom === "CIE")
  const palmci = clientsData.find(c => c.nom === "PALM CI")
  const sucrivoire = clientsData.find(c => c.nom === "SUCRIVOIRE SA")
  
  const devis = []
  
  // DEVIS 1 - CALORIFUGE pour GESTOCI
  if (gestoci) {
    const lignesDevis1 = [
      {
        designation: "CONDUITE VAPEUR DN150",
        ml: 45,
        pt: 12,
        pu: 28500,
        montant: 45 * 28500 + 12 * 28500
      },
      {
        designation: "CONDUITE VAPEUR DN100",
        ml: 30,
        pt: 8,
        pu: 21000,
        montant: 30 * 21000 + 8 * 21000
      },
      {
        designation: "ROBINETTERIE DN150",
        ml: 0,
        pt: 6,
        pu: 95000,
        montant: 6 * 95000
      },
      {
        designation: "COUDE DN150",
        ml: 0,
        pt: 14,
        pu: 35000,
        montant: 14 * 35000
      },
      {
        designation: "BRIDE DN150",
        ml: 0,
        pt: 20,
        pu: 18500,
        montant: 20 * 18500
      },
      {
        designation: "ACCESSOIRES DIVERS",
        ml: 0,
        pt: 1,
        pu: 450000,
        montant: 450000
      }
    ]
    
    const totalHT1 = lignesDevis1.reduce((sum, l) => sum + l.montant, 0)
    const tva1 = totalHT1 * 0.18
    const ttc1 = totalHT1 + tva1
    
    devis.push({
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
      lignes: lignesDevis1,
      notes: "Devis validé - En attente de facturation",
      date_creation: "2026-03-15"
    })
  }
  
  // DEVIS 2 - RESERVOIR pour CIE
  if (cie) {
    const lignesDevis2 = [
      {
        designation: "Mobilisation chantier et études",
        quantite: 1,
        unite: "Forfait",
        pu: 2500000,
        montant: 2500000
      },
      {
        designation: "Fabrication viroles et fonds",
        quantite: 1,
        unite: "Forfait",
        pu: 18500000,
        montant: 18500000
      },
      {
        designation: "Soudage et contrôle radiographique",
        quantite: 1,
        unite: "Forfait",
        pu: 6500000,
        montant: 6500000
      },
      {
        designation: "Traitement de surface et peinture époxy",
        quantite: 1,
        unite: "Forfait",
        pu: 3200000,
        montant: 3200000
      },
      {
        designation: "Transport et montage sur site",
        quantite: 1,
        unite: "Forfait",
        pu: 2800000,
        montant: 2800000
      }
    ]
    
    const totalHT2 = lignesDevis2.reduce((sum, l) => sum + l.montant, 0)
    const remise2 = totalHT2 * 0.08
    const htApresRemise2 = totalHT2 - remise2
    const tva2 = htApresRemise2 * 0.18
    const ttc2 = htApresRemise2 + tva2
    
    devis.push({
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
      lignes: lignesDevis2,
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
    })
  }
  
  // DEVIS 3 - TUYAUTERIE pour PALM CI
  if (palmci) {
    const lignesDevis3 = [
      {
        designation: "Tuyauterie acier DN80 Sch 40",
        quantite: 60,
        unite: "ML",
        pu: 32000,
        montant: 60 * 32000
      },
      {
        designation: "Tuyauterie acier DN50 Sch 40",
        quantite: 35,
        unite: "ML",
        pu: 24000,
        montant: 35 * 24000
      },
      {
        designation: "Coudes et raccords DN80",
        quantite: 18,
        unite: "Pcs",
        pu: 28000,
        montant: 18 * 28000
      },
      {
        designation: "Vannes à bille DN80",
        quantite: 8,
        unite: "Pcs",
        pu: 145000,
        montant: 8 * 145000
      },
      {
        designation: "Supports et colliers de fixation",
        quantite: 1,
        unite: "Forfait",
        pu: 850000,
        montant: 850000
      },
      {
        designation: "Main d'œuvre montage et soudure",
        quantite: 1,
        unite: "Forfait",
        pu: 3200000,
        montant: 3200000
      }
    ]
    
    const totalHT3 = lignesDevis3.reduce((sum, l) => sum + l.montant, 0)
    const tva3 = totalHT3 * 0.18
    const ttc3 = totalHT3 + tva3
    
    devis.push({
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
      lignes: lignesDevis3,
      notes: "Devis en attente de validation client",
      date_creation: "2026-05-02"
    })
  }
  
  // DEVIS 4 - PLIAGE pour SUCRIVOIRE
  if (sucrivoire) {
    const lignesDevis4 = [
      {
        designation: "Pliage tôle inox 304 - 3mm - Goulottes",
        quantite: 12,
        unite: "Pcs",
        pu: 85000,
        montant: 12 * 85000
      },
      {
        designation: "Pliage tôle inox 304 - 2mm - Capots protection",
        quantite: 8,
        unite: "Pcs",
        pu: 65000,
        montant: 8 * 65000
      },
      {
        designation: "Découpe laser tôle inox 304",
        quantite: 1,
        unite: "Forfait",
        pu: 450000,
        montant: 450000
      },
      {
        designation: "Finition et polissage",
        quantite: 1,
        unite: "Forfait",
        pu: 280000,
        montant: 280000
      }
    ]
    
    const totalHT4 = lignesDevis4.reduce((sum, l) => sum + l.montant, 0)
    const tva4 = totalHT4 * 0.18
    const ttc4 = totalHT4 + tva4
    
    devis.push({
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
      lignes: lignesDevis4,
      parametres_pliage: {
        type_tole: "Inox 304",
        epaisseurs: "2mm, 3mm",
        finition: "Poli miroir"
      },
      notes: "Devis en cours de finalisation",
      date_creation: "2026-04-25"
    })
  }
  
  try {
    const { data, error } = await supabase
      .from('devis')
      .insert(devis)
      .select()
    
    if (error) throw error
    
    console.log(`✅ ${data.length} devis injectés avec succès`)
    return { success: true, data, count: data.length }
  } catch (error) {
    console.error('❌ Erreur injection devis:', error.message)
    return { success: false, error: error.message }
  }
}

export async function injecterFactures(clientsData, devisData) {
  console.log('🔄 Injection des factures réelles...')
  
  const gestoci = clientsData.find(c => c.nom === "GESTOCI SA")
  const cie = clientsData.find(c => c.nom === "CIE")
  const sucrivoire = clientsData.find(c => c.nom === "SUCRIVOIRE SA")
  
  const devisGestoci = devisData.find(d => d.numero === "DEV-CAL-2026-001")
  const devisCie = devisData.find(d => d.numero === "DEV-RES-2026-002")
  
  const factures = []
  
  // FACTURE 1 - liée à DEVIS 1 (GESTOCI) - Paiement partiel 50%
  if (gestoci && devisGestoci) {
    const montantTTC1 = devisGestoci.montant_ttc
    const paiement50 = montantTTC1 * 0.50
    
    factures.push({
      numero: "FACT-2026-001",
      client_id: gestoci.id,
      client_nom: gestoci.nom,
      devis_id: devisGestoci.id,
      objet: devisGestoci.objet,
      reference: "BON DE COMMANDE GESTOCI N° GES-2026-0312",
      date_depot: "2026-03-20",
      date_echeance: "2026-05-20",
      montant_ht: devisGestoci.montant_ht,
      montant_tva: devisGestoci.montant_tva,
      montant_ttc: montantTTC1,
      montant_paye: paiement50,
      montant_restant: montantTTC1 - paiement50,
      delai_reglement: 60,
      statut: "EN_ATTENTE",
      lignes: devisGestoci.lignes,
      paiements: [
        {
          date: "2026-04-05",
          montant: paiement50,
          mode: "VIREMENT",
          reference: "VIR-SGBCI-20260405-7842",
          notes: "Paiement 50% - Acompte commande"
        }
      ],
      notes: "Facture partiellement réglée - Reste 50% à échéance",
      date_creation: "2026-03-20"
    })
  }
  
  // FACTURE 2 - liée à DEVIS 2 (CIE) - Non payée
  if (cie && devisCie) {
    factures.push({
      numero: "FACT-2026-002",
      client_id: cie.id,
      client_nom: cie.nom,
      devis_id: devisCie.id,
      objet: devisCie.objet,
      reference: "BON DE COMMANDE CIE N° CIE/OP/2026/0847",
      date_depot: "2026-04-15",
      date_echeance: "2026-07-15",
      montant_ht: devisCie.montant_ht_apres_remise,
      montant_tva: devisCie.montant_tva,
      montant_ttc: devisCie.montant_ttc,
      montant_paye: 0,
      montant_restant: devisCie.montant_ttc,
      delai_reglement: 90,
      statut: "EN_ATTENTE",
      lignes: devisCie.lignes,
      paiements: [],
      notes: "Facture en attente de paiement - Échéance 90 jours",
      date_creation: "2026-04-15"
    })
  }
  
  // FACTURE 3 - SUCRIVOIRE (sans devis, facturation directe) - PAYÉE
  if (sucrivoire) {
    const lignesFacture3 = [
      {
        designation: "Maintenance préventive calorifugeage",
        quantite: 1,
        unite: "Forfait",
        pu: 4500000,
        montant: 4500000
      },
      {
        designation: "Remplacement laine de roche DN100",
        quantite: 45,
        unite: "ML",
        pu: 18500,
        montant: 45 * 18500
      },
      {
        designation: "Main d'œuvre techniciens (5j × 4 pers)",
        quantite: 20,
        unite: "J/H",
        pu: 95000,
        montant: 20 * 95000
      }
    ]
    
    const totalHT3 = lignesFacture3.reduce((sum, l) => sum + l.montant, 0)
    const tva3 = totalHT3 * 0.18
    const ttc3 = totalHT3 + tva3
    
    factures.push({
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
      delai_reglement: 45,
      statut: "PAYEE",
      lignes: lignesFacture3,
      paiements: [
        {
          date: "2026-03-20",
          montant: ttc3,
          mode: "CHEQUE",
          reference: "CHQ-N°458720",
          notes: "Paiement intégral par chèque"
        }
      ],
      notes: "Facture réglée intégralement - Contrat maintenance annuel",
      date_creation: "2026-02-10"
    })
  }
  
  try {
    const { data, error } = await supabase
      .from('factures')
      .insert(factures)
      .select()
    
    if (error) throw error
    
    console.log(`✅ ${data.length} factures injectées avec succès`)
    return { success: true, data, count: data.length }
  } catch (error) {
    console.error('❌ Erreur injection factures:', error.message)
    return { success: false, error: error.message }
  }
}

export async function injecterAppelsOffres(clientsData) {
  console.log('🔄 Injection des appels d\'offres...')
  
  const gestoci = clientsData.find(c => c.nom === "GESTOCI SA")
  const cie = clientsData.find(c => c.nom === "CIE")
  const sodemi = clientsData.find(c => c.nom === "SODEMI")
  
  const ao = []
  
  if (gestoci) {
    ao.push({
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
    })
  }
  
  if (cie) {
    ao.push({
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
    })
  }
  
  if (sodemi) {
    ao.push({
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
    })
  }
  
  try {
    const { data, error } = await supabase
      .from('appels_offres')
      .insert(ao)
      .select()
    
    if (error) throw error
    
    console.log(`✅ ${data.length} appels d'offres injectés avec succès`)
    return { success: true, data, count: data.length }
  } catch (error) {
    console.error('❌ Erreur injection AO:', error.message)
    return { success: false, error: error.message }
  }
}
