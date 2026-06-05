import { useEffect, useRef, useCallback } from 'react'
import { connectionManager } from '../lib/connectionManager'
import { useClientsStore } from '../store/useClientsStore'
import { useFacturesStore } from '../store/useFacturesStore'
import { useDevisStore } from '../store/useDevisStore'
import { useAOStore } from '../store/useAOStore'
import { useFournisseursStore } from '../store/useFournisseursStore'
import { usePlanificationStore } from '../store/usePlanificationStore'
import { useCaisseStore } from '../store/useCaisseStore'
import { useEncaissementsStore } from '../store/useEncaissementsStore'

/**
 * Hook amélioré pour la synchronisation temps réel Supabase
 * Utilise le ConnectionManager pour une reconnexion automatique robuste
 */
export function useSupabaseRealtimeEnhanced() {
  const channelsRef = useRef([])

  const updateClient = useClientsStore(state => state.updateClient)
  const addClient = useClientsStore(state => state.addClientFromRealtime)
  const deleteClient = useClientsStore(state => state.deleteClient)
  const setClients = useClientsStore(state => state.setClients)

  const updateFacture = useFacturesStore(state => state.updateFacture)
  const addFacture = useFacturesStore(state => state.addFactureFromRealtime)
  const deleteFacture = useFacturesStore(state => state.deleteFacture)

  const updateDevis = useDevisStore(state => state.updateDevis)
  const addDevis = useDevisStore(state => state.addDevisFromRealtime)
  const deleteDevis = useDevisStore(state => state.deleteDevis)

  const updateAO = useAOStore(state => state.updateAO)
  const addAO = useAOStore(state => state.addAOFromRealtime)
  const deleteAO = useAOStore(state => state.deleteAO)

  const updateFournisseur = useFournisseursStore(state => state.updateFournisseur)
  const addFournisseur = useFournisseursStore(state => state.addFournisseurFromRealtime)
  const deleteFournisseur = useFournisseursStore(state => state.deleteFournisseur)

  const updateProjet = usePlanificationStore(state => state.updateProjet)
  const addProjet = usePlanificationStore(state => state.addProjetFromRealtime)
  const deleteProjet = usePlanificationStore(state => state.deleteProjet)

  const updateMouvement = useCaisseStore(state => state.updateMouvement)
  const addMouvement = useCaisseStore(state => state.addMouvementFromRealtime)
  const deleteMouvement = useCaisseStore(state => state.deleteMouvement)

  const updateEncaissement = useEncaissementsStore(state => state.updateEncaissement)
  const addEncaissement = useEncaissementsStore(state => state.addEncaissementFromRealtime)
  const deleteEncaissement = useEncaissementsStore(state => state.deleteEncaissement)

  // Fonction pour mapper les données reçues du realtime
  const mapRow = useCallback((table, row) => {
    switch (table) {
      case 'clients':
        return {
          id: row.id, nom: row.nom, raisonSociale: row.raison_sociale, ncc: row.ncc,
          secteur: row.secteur, adresse: row.adresse, ville: row.ville, pays: row.pays,
          contactNom: row.contact_nom, contactTelephone: row.contact_telephone,
          contactEmail: row.contact_email, conditionsPaiement: row.conditions_paiement,
          type: row.type, isActif: row.is_actif, notes: row.notes, dateCreation: row.date_creation
        }
      case 'factures':
        return {
          id: row.id, numero: row.numero, clientId: row.client_id, clientNom: row.client_nom,
          devisId: row.devis_id, objet: row.objet,
          montantHT: parseFloat(row.montant_ht || 0), montantTVA: parseFloat(row.montant_tva || 0),
          montantTTC: parseFloat(row.montant_ttc || 0), montantPaye: parseFloat(row.montant_paye || 0),
          dateDepot: row.date_depot, dateEcheance: row.date_echeance, datePayement: row.date_payement,
          delaiReglement: row.delai_reglement, statut: row.statut, notes: row.notes, dateCreation: row.date_creation
        }
      case 'devis':
        return {
          id: row.id, numero: row.numero, clientId: row.client_id, clientNom: row.client_nom,
          typeDevis: row.type_devis, objet: row.objet,
          montantHT: parseFloat(row.montant_ht || 0), montantTVA: parseFloat(row.montant_tva || 0),
          montantTTC: parseFloat(row.montant_ttc || 0), montantTotal: parseFloat(row.montant_total || 0),
          dateDevis: row.date_devis, dateValidation: row.date_validation,
          dateAnnulation: row.date_annulation, dateTransformation: row.date_transformation,
          statut: row.statut, notes: row.notes, dateCreation: row.date_creation
        }
      case 'appels_offres':
        return {
          id: row.id, numeroDevis: row.numero_devis, client: row.client, clientId: row.client_id,
          objet: row.objet, dateDevis: row.date_devis,
          dateReceptionAO: row.date_reception_ao, dateReponseAO: row.date_reponse_ao,
          dateLimite: row.date_limite, dateSoumission: row.date_soumission, dateDecision: row.date_decision,
          montantEstime: parseFloat(row.montant_estime || 0), priorite: row.priorite,
          statut: row.statut, notes: row.notes, dateCreation: row.date_creation
        }
      case 'fournisseurs':
        return {
          id: row.id, nom: row.nom, raisonSociale: row.raison_sociale, type: row.type,
          secteur: row.secteur, adresse: row.adresse, ville: row.ville, pays: row.pays,
          contactNom: row.contact_nom, contactTelephone: row.contact_telephone,
          contactEmail: row.contact_email, conditionsPaiement: row.conditions_paiement,
          banque: row.banque, numeroCompte: row.numero_compte,
          isActif: row.is_actif, notes: row.notes, dateCreation: row.date_creation
        }
      case 'projets':
        return {
          id: row.id, nom: row.nom, clientId: row.client_id, referenceProjet: row.reference_projet,
          dateDebut: row.date_debut, dateFinPrevue: row.date_fin_prevue, dateFinReelle: row.date_fin_reelle,
          budgetPrevu: parseFloat(row.budget_prevu || 0), coutReel: parseFloat(row.cout_reel || 0),
          statut: row.statut, description: row.description, dateCreation: row.date_creation
        }
      case 'mouvements_caisse':
        return {
          id: row.id, date: row.date, type: row.type, categorie: row.categorie,
          description: row.description, montant: parseFloat(row.montant || 0),
          beneficiaire: row.beneficiaire, modePaiement: row.mode_paiement,
          pieceJustificative: row.piece_justificative, referenceProjet: row.reference_projet,
          utilisateur: row.utilisateur, dateCreation: row.date_creation
        }
      case 'encaissements':
        return {
          id: row.id, factureId: row.facture_id, clientId: row.client_id, clientNom: row.client_nom,
          montant: parseFloat(row.montant || 0), dateEncaissement: row.date_encaissement,
          modePaiement: row.mode_paiement, reference: row.reference,
          notes: row.notes, statut: row.statut, dateCreation: row.date_creation
        }
      default:
        return row
    }
  }, [])

  // Configuration des tables et leurs callbacks
  const tablesConfig = [
    {
      name: 'clients',
      onInsert: (data) => {
        const existing = useClientsStore.getState().clients.find(c => c.id === data.id)
        if (!existing) addClient(data)
      },
      onUpdate: (data) => updateClient(data.id, data),
      onDelete: (data) => deleteClient(data.id)
    },
    {
      name: 'factures',
      onInsert: (data) => {
        const existing = useFacturesStore.getState().factures.find(f => f.id === data.id)
        if (!existing) addFacture(data)
      },
      onUpdate: (data) => updateFacture(data.id, data),
      onDelete: (data) => deleteFacture(data.id)
    },
    {
      name: 'devis',
      onInsert: (data) => {
        const existing = useDevisStore.getState().devis.find(d => d.id === data.id)
        if (!existing) addDevis(data)
      },
      onUpdate: (data) => updateDevis(data.id, data),
      onDelete: (data) => deleteDevis(data.id)
    },
    {
      name: 'appels_offres',
      onInsert: (data) => {
        const existing = useAOStore.getState().appelsDoffres.find(a => a.id === data.id)
        if (!existing) addAO(data)
      },
      onUpdate: (data) => updateAO(data.id, data),
      onDelete: (data) => deleteAO(data.id)
    },
    {
      name: 'fournisseurs',
      onInsert: (data) => {
        const existing = useFournisseursStore.getState().fournisseurs.find(f => f.id === data.id)
        if (!existing) addFournisseur(data)
      },
      onUpdate: (data) => updateFournisseur(data.id, data),
      onDelete: (data) => deleteFournisseur(data.id)
    },
    {
      name: 'projets',
      onInsert: (data) => {
        const existing = usePlanificationStore.getState().projets.find(p => p.id === data.id)
        if (!existing) addProjet(data)
      },
      onUpdate: (data) => updateProjet(data.id, data),
      onDelete: (data) => deleteProjet(data.id)
    },
    {
      name: 'mouvements_caisse',
      onInsert: (data) => {
        const existing = useCaisseStore.getState().mouvements.find(m => m.id === data.id)
        if (!existing) addMouvement(data)
      },
      onUpdate: (data) => updateMouvement(data.id, data),
      onDelete: (data) => deleteMouvement(data.id)
    },
    {
      name: 'encaissements',
      onInsert: (data) => {
        const existing = useEncaissementsStore.getState().encaissements.find(e => e.id === data.id)
        if (!existing) addEncaissement(data)
      },
      onUpdate: (data) => updateEncaissement(data.id, data),
      onDelete: (data) => deleteEncaissement(data.id)
    }
  ]

  useEffect(() => {
    // Enregistrer chaque canal avec le ConnectionManager
    tablesConfig.forEach(config => {
      connectionManager.registerChannel(config.name, {
        table: config.name,
        onInsert: (row) => {
          const data = mapRow(config.name, row)
          setTimeout(() => config.onInsert(data), 0)
        },
        onUpdate: (row) => {
          const data = mapRow(config.name, row)
          setTimeout(() => config.onUpdate(data), 0)
        },
        onDelete: (row) => {
          setTimeout(() => config.onDelete(row), 0)
        }
      })
    })

    // Cleanup
    return () => {
      tablesConfig.forEach(config => {
        connectionManager.unregisterChannel(config.name)
      })
    }
  }, [
    mapRow,
    updateClient, addClient, deleteClient,
    updateFacture, addFacture, deleteFacture,
    updateDevis, addDevis, deleteDevis,
    updateAO, addAO, deleteAO,
    updateFournisseur, addFournisseur, deleteFournisseur,
    updateProjet, addProjet, deleteProjet,
    updateMouvement, addMouvement, deleteMouvement,
    updateEncaissement, addEncaissement, deleteEncaissement
  ])
}
