import { supabase } from '../lib/supabaseClient'
import { logger } from '../utils/logger.js'

export const syncService = {
  async syncClients(clients) {
    try {
      const clientsData = clients.map(c => ({
        id: c.id,
        nom: c.nom,
        raison_sociale: c.raisonSociale,
        ncc: c.ncc,
        secteur: c.secteur,
        adresse: c.adresse,
        ville: c.ville,
        pays: c.pays,
        contact_nom: c.contactNom,
        contact_telephone: c.contactTelephone,
        contact_email: c.contactEmail,
        conditions_paiement: c.conditionsPaiement,
        type: c.type,
        is_actif: c.isActif,
        notes: c.notes,
        date_creation: c.dateCreation
      }))

      const { error } = await supabase
        .from('clients')
        .upsert(clientsData, { onConflict: 'id' })

      if (error) throw error
      return { success: true, count: clientsData.length }
    } catch (error) {
      logger.error('Erreur sync clients:', error)
      return { success: false, error: error.message }
    }
  },

  async syncFactures(factures) {
    try {
      const facturesData = factures.map(f => ({
        id: f.id,
        numero: f.numero,
        client_id: f.clientId,
        client_nom: f.clientNom,
        devis_id: f.devisId,
        objet: f.objet,
        montant_ht: f.montantHT,
        montant_tva: f.montantTVA,
        montant_ttc: f.montantTTC,
        montant_paye: f.montantPaye || 0,
        date_depot: f.dateDepot,
        date_echeance: f.dateEcheance,
        date_payement: f.datePayement,
        date_annulation: f.dateAnnulation,
        delai_reglement: f.delaiReglement,
        statut: f.statut,
        notes: f.notes,
        date_creation: f.dateCreation
      }))

      const { error } = await supabase
        .from('factures')
        .upsert(facturesData, { onConflict: 'id' })

      if (error) throw error
      return { success: true, count: facturesData.length }
    } catch (error) {
      logger.error('Erreur sync factures:', error)
      return { success: false, error: error.message }
    }
  },

  async syncDevis(devis) {
    try {
      const devisData = devis.map(d => ({
        id: d.id,
        numero: d.numero,
        client_id: d.clientId,
        client_nom: d.clientNom,
        type_devis: d.typeDevis,
        objet: d.objet,
        montant_ht: d.montantHT,
        montant_tva: d.montantTVA,
        montant_ttc: d.montantTTC,
        montant_total: d.montantTotal,
        statut: d.statut,
        date_devis: d.dateDevis,
        date_validation: d.dateValidation,
        date_annulation: d.dateAnnulation,
        date_transformation: d.dateTransformation,
        notes: d.notes,
        date_creation: d.dateCreation
      }))

      const { error } = await supabase
        .from('devis')
        .upsert(devisData, { onConflict: 'id' })

      if (error) throw error
      return { success: true, count: devisData.length }
    } catch (error) {
      logger.error('Erreur sync devis:', error)
      return { success: false, error: error.message }
    }
  },

  async syncAppelsOffres(ao) {
    try {
      const aoData = ao.map(a => ({
        id: a.id,
        numero_devis: a.numeroDevis,
        client: a.client,
        client_id: a.clientId,
        objet: a.objet,
        date_devis: a.dateDevis,
        date_reception_ao: a.dateReceptionAO,
        date_reponse_ao: a.dateReponseAO,
        montant_estime: a.montantEstime,
        statut: a.statut,
        notes: a.notes,
        date_creation: a.dateCreation
      }))

      const { error } = await supabase
        .from('appels_offres')
        .upsert(aoData, { onConflict: 'id' })

      if (error) throw error
      return { success: true, count: aoData.length }
    } catch (error) {
      logger.error('Erreur sync AO:', error)
      return { success: false, error: error.message }
    }
  },

  async syncFournisseurs(fournisseurs) {
    try {
      const fournisseursData = fournisseurs.map(f => ({
        id: f.id,
        nom: f.nom,
        raison_sociale: f.raisonSociale,
        type: f.type,
        secteur: f.secteur,
        adresse: f.adresse,
        ville: f.ville,
        pays: f.pays,
        contact_nom: f.contactNom,
        contact_telephone: f.contactTelephone,
        contact_email: f.contactEmail,
        conditions_paiement: f.conditionsPaiement,
        numero_compte: f.numeroCompte,
        banque: f.banque,
        is_actif: f.isActif,
        notes: f.notes,
        date_creation: f.dateCreation
      }))

      const { error } = await supabase
        .from('fournisseurs')
        .upsert(fournisseursData, { onConflict: 'id' })

      if (error) throw error
      return { success: true, count: fournisseursData.length }
    } catch (error) {
      logger.error('Erreur sync fournisseurs:', error)
      return { success: false, error: error.message }
    }
  },

  async syncProjets(projets) {
    try {
      const projetsData = projets.map(p => ({
        id: p.id,
        nom: p.nom,
        client_id: p.clientId,
        devis_id: p.devisId,
        reference_projet: p.referenceProjet,
        date_debut: p.dateDebut,
        date_fin_prevue: p.dateFinPrevue,
        date_fin_reelle: p.dateFinReelle,
        budget_prevu: p.budgetPrevu,
        cout_reel: p.coutReel || 0,
        statut: p.statut,
        description: p.description,
        notes: p.notes,
        date_creation: p.dateCreation
      }))

      const { error } = await supabase
        .from('projets')
        .upsert(projetsData, { onConflict: 'id' })

      if (error) throw error
      return { success: true, count: projetsData.length }
    } catch (error) {
      logger.error('Erreur sync projets:', error)
      return { success: false, error: error.message }
    }
  },

  async syncMouvementsCaisse(mouvements) {
    try {
      const mouvementsData = mouvements.map(m => ({
        id: m.id,
        date: m.date,
        type: m.type,
        categorie: m.categorie,
        montant: m.montant,
        description: m.description,
        reference_projet: m.referenceProjet,
        beneficiaire: m.beneficiaire,
        mode_paiement: m.modePaiement,
        piece_justificative: m.pieceJustificative,
        utilisateur: m.utilisateur
      }))

      const { error } = await supabase
        .from('mouvements_caisse')
        .upsert(mouvementsData, { onConflict: 'id' })

      if (error) throw error
      return { success: true, count: mouvementsData.length }
    } catch (error) {
      logger.error('Erreur sync caisse:', error)
      return { success: false, error: error.message }
    }
  },

  async syncAll(stores) {
    const results = {
      clients: { success: false, count: 0 },
      factures: { success: false, count: 0 },
      devis: { success: false, count: 0 },
      ao: { success: false, count: 0 },
      fournisseurs: { success: false, count: 0 },
      projets: { success: false, count: 0 },
      caisse: { success: false, count: 0 }
    }

    try {
      if (stores.clients?.length > 0) {
        results.clients = await this.syncClients(stores.clients)
      }
      
      if (stores.factures?.length > 0) {
        results.factures = await this.syncFactures(stores.factures)
      }
      
      if (stores.devis?.length > 0) {
        results.devis = await this.syncDevis(stores.devis)
      }
      
      if (stores.appelsDoffres?.length > 0) {
        results.ao = await this.syncAppelsOffres(stores.appelsDoffres)
      }
      
      if (stores.fournisseurs?.length > 0) {
        results.fournisseurs = await this.syncFournisseurs(stores.fournisseurs)
      }
      
      if (stores.projets?.length > 0) {
        results.projets = await this.syncProjets(stores.projets)
      }
      
      if (stores.mouvements?.length > 0) {
        results.caisse = await this.syncMouvementsCaisse(stores.mouvements)
      }

      const totalSuccess = Object.values(results).filter(r => r.success).length
      const totalCount = Object.values(results).reduce((sum, r) => sum + (r.count || 0), 0)

      return {
        success: totalSuccess > 0,
        results,
        totalSynced: totalCount,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      logger.error('Erreur sync globale:', error)
      return {
        success: false,
        error: error.message,
        results
      }
    }
  },

  async loadFromSupabase() {
    try {
      const [clients, factures, devis, ao, fournisseurs, projets, caisse] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('factures').select('*'),
        supabase.from('devis').select('*'),
        supabase.from('appels_offres').select('*'),
        supabase.from('fournisseurs').select('*'),
        supabase.from('projets').select('*'),
        supabase.from('mouvements_caisse').select('*')
      ])

      return {
        success: true,
        data: {
          clients: clients.data || [],
          factures: factures.data || [],
          devis: devis.data || [],
          appelsDoffres: ao.data || [],
          fournisseurs: fournisseurs.data || [],
          projets: projets.data || [],
          mouvements: caisse.data || []
        }
      }
    } catch (error) {
      logger.error('Erreur chargement depuis Supabase:', error)
      return { success: false, error: error.message }
    }
  }
}
