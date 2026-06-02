import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useClientsStore } from '../store/useClientsStore'
import { useFacturesStore } from '../store/useFacturesStore'
import { useDevisStore } from '../store/useDevisStore'
import { useAOStore } from '../store/useAOStore'
import { useFournisseursStore } from '../store/useFournisseursStore'
import { usePlanificationStore } from '../store/usePlanificationStore'
import { useCaisseStore } from '../store/useCaisseStore'
import { useEncaissementsStore } from '../store/useEncaissementsStore'

/**
 * Hook qui écoute les changements Supabase en temps réel
 * Met à jour les stores Zustand automatiquement quand une donnée change
 */
export function useSupabaseRealtime() {
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

  useEffect(() => {
    // Mapper les tables vers leurs fonctions de mise à jour
    const tables = [
      {
        name: 'clients',
        mapRow: (c) => ({
          id: c.id, nom: c.nom, raisonSociale: c.raison_sociale, ncc: c.ncc,
          secteur: c.secteur, adresse: c.adresse, ville: c.ville, pays: c.pays,
          contactNom: c.contact_nom, contactTelephone: c.contact_telephone,
          contactEmail: c.contact_email, conditionsPaiement: c.conditions_paiement,
          type: c.type, isActif: c.is_actif, notes: c.notes, dateCreation: c.date_creation
        }),
        onInsert: (data) => {
          const existing = useClientsStore.getState().clients.find(c => c.id === data.id)
          if (!existing) addClient(data)
        },
        onUpdate: (data) => updateClient(data.id, data),
        onDelete: (data) => deleteClient(data.id)
      },
      {
        name: 'factures',
        mapRow: (f) => ({
          id: f.id, numero: f.numero, clientId: f.client_id, clientNom: f.client_nom,
          devisId: f.devis_id, objet: f.objet,
          montantHT: parseFloat(f.montant_ht || 0), montantTVA: parseFloat(f.montant_tva || 0),
          montantTTC: parseFloat(f.montant_ttc || 0), montantPaye: parseFloat(f.montant_paye || 0),
          dateDepot: f.date_depot, dateEcheance: f.date_echeance, datePayement: f.date_payement,
          delaiReglement: f.delai_reglement, statut: f.statut, notes: f.notes, dateCreation: f.date_creation
        }),
        onInsert: (data) => {
          const existing = useFacturesStore.getState().factures.find(f => f.id === data.id)
          if (!existing) addFacture(data)
        },
        onUpdate: (data) => updateFacture(data.id, data),
        onDelete: (data) => deleteFacture(data.id)
      },
      {
        name: 'devis',
        mapRow: (d) => ({
          id: d.id, numero: d.numero, clientId: d.client_id, clientNom: d.client_nom,
          typeDevis: d.type_devis, objet: d.objet,
          montantHT: parseFloat(d.montant_ht || 0), montantTVA: parseFloat(d.montant_tva || 0),
          montantTTC: parseFloat(d.montant_ttc || 0), montantTotal: parseFloat(d.montant_total || 0),
          dateDevis: d.date_devis, dateValidation: d.date_validation,
          dateAnnulation: d.date_annulation, dateTransformation: d.date_transformation,
          statut: d.statut, notes: d.notes, dateCreation: d.date_creation
        }),
        onInsert: (data) => {
          const existing = useDevisStore.getState().devis.find(d => d.id === data.id)
          if (!existing) addDevis(data)
        },
        onUpdate: (data) => updateDevis(data.id, data),
        onDelete: (data) => deleteDevis(data.id)
      },
      {
        name: 'appels_offres',
        mapRow: (a) => ({
          id: a.id, numeroDevis: a.numero_devis, client: a.client, clientId: a.client_id,
          objet: a.objet, dateDevis: a.date_devis,
          dateReceptionAO: a.date_reception_ao, dateReponseAO: a.date_reponse_ao,
          dateLimite: a.date_limite, dateSoumission: a.date_soumission, dateDecision: a.date_decision,
          montantEstime: parseFloat(a.montant_estime || 0), priorite: a.priorite,
          statut: a.statut, notes: a.notes, dateCreation: a.date_creation
        }),
        onInsert: (data) => {
          const existing = useAOStore.getState().appelsDoffres.find(a => a.id === data.id)
          if (!existing) addAO(data)
        },
        onUpdate: (data) => updateAO(data.id, data),
        onDelete: (data) => deleteAO(data.id)
      },
      {
        name: 'fournisseurs',
        mapRow: (f) => ({
          id: f.id, nom: f.nom, raisonSociale: f.raison_sociale, type: f.type,
          secteur: f.secteur, adresse: f.adresse, ville: f.ville, pays: f.pays,
          contactNom: f.contact_nom, contactTelephone: f.contact_telephone,
          contactEmail: f.contact_email, conditionsPaiement: f.conditions_paiement,
          banque: f.banque, numeroCompte: f.numero_compte,
          isActif: f.is_actif, notes: f.notes, dateCreation: f.date_creation
        }),
        onInsert: (data) => {
          const existing = useFournisseursStore.getState().fournisseurs.find(f => f.id === data.id)
          if (!existing) addFournisseur(data)
        },
        onUpdate: (data) => updateFournisseur(data.id, data),
        onDelete: (data) => deleteFournisseur(data.id)
      },
      {
        name: 'projets',
        mapRow: (p) => ({
          id: p.id, nom: p.nom, clientId: p.client_id, referenceProjet: p.reference_projet,
          dateDebut: p.date_debut, dateFinPrevue: p.date_fin_prevue, dateFinReelle: p.date_fin_reelle,
          budgetPrevu: parseFloat(p.budget_prevu || 0), coutReel: parseFloat(p.cout_reel || 0),
          statut: p.statut, description: p.description, dateCreation: p.date_creation
        }),
        onInsert: (data) => {
          const existing = usePlanificationStore.getState().projets.find(p => p.id === data.id)
          if (!existing) addProjet(data)
        },
        onUpdate: (data) => updateProjet(data.id, data),
        onDelete: (data) => deleteProjet(data.id)
      },
      {
        name: 'mouvements_caisse',
        mapRow: (m) => ({
          id: m.id, date: m.date, type: m.type, categorie: m.categorie,
          description: m.description, montant: parseFloat(m.montant || 0),
          beneficiaire: m.beneficiaire, modePaiement: m.mode_paiement,
          pieceJustificative: m.piece_justificative, referenceProjet: m.reference_projet,
          utilisateur: m.utilisateur, dateCreation: m.date_creation
        }),
        onInsert: (data) => {
          const existing = useCaisseStore.getState().mouvements.find(m => m.id === data.id)
          if (!existing) addMouvement(data)
        },
        onUpdate: (data) => updateMouvement(data.id, data),
        onDelete: (data) => deleteMouvement(data.id)
      },
      {
        name: 'encaissements',
        mapRow: (e) => ({
          id: e.id, factureId: e.facture_id, clientId: e.client_id, clientNom: e.client_nom,
          montant: parseFloat(e.montant || 0), dateEncaissement: e.date_encaissement,
          modePaiement: e.mode_paiement, reference: e.reference,
          notes: e.notes, statut: e.statut, dateCreation: e.date_creation
        }),
        onInsert: (data) => {
          const existing = useEncaissementsStore.getState().encaissements.find(e => e.id === data.id)
          if (!existing) addEncaissement(data)
        },
        onUpdate: (data) => updateEncaissement(data.id, data),
        onDelete: (data) => deleteEncaissement(data.id)
      }
    ]

    // Créer un canal pour chaque table
    tables.forEach(table => {
      const channel = supabase
        .channel(`realtime-${table.name}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: table.name },
          (payload) => {
            console.log(`🔄 Realtime ${table.name}:`, payload.eventType, payload.new?.id || payload.old?.id)
            
            const data = payload.new ? table.mapRow(payload.new) : payload.old
            
            switch (payload.eventType) {
              case 'INSERT':
                setTimeout(() => table.onInsert(data), 0)
                break
              case 'UPDATE':
                setTimeout(() => table.onUpdate(data), 0)
                break
              case 'DELETE':
                setTimeout(() => table.onDelete(payload.old), 0)
                break
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 Canal ${table.name}:`, status)
        })

      channelsRef.current.push(channel)
    })

    // Cleanup
    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      channelsRef.current = []
    }
  }, [
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
