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
 * Optimisé: utilise des refs pour éviter les dépendances massives
 */
export function useSupabaseRealtimeEnhanced() {
  // Les actions Zustand sont stables (ne changent jamais) - on les lit via getState()
  // pour éviter la création d'objets à chaque render qui causait la boucle infinie
  const actionsRef = useRef(null)

  if (!actionsRef.current) {
    actionsRef.current = {
      clients: {
        update: (...args) => useClientsStore.getState().updateClient(...args),
        add: (...args) => useClientsStore.getState().addClientFromRealtime(...args),
        remove: (...args) => useClientsStore.getState().deleteClient(...args)
      },
      factures: {
        update: (...args) => useFacturesStore.getState().updateFacture(...args),
        add: (...args) => useFacturesStore.getState().addFactureFromRealtime(...args),
        remove: (...args) => useFacturesStore.getState().deleteFacture(...args)
      },
      devis: {
        update: (...args) => useDevisStore.getState().updateDevis(...args),
        add: (...args) => useDevisStore.getState().addDevisFromRealtime(...args),
        remove: (...args) => useDevisStore.getState().deleteDevis(...args)
      },
      ao: {
        update: (...args) => useAOStore.getState().updateAO(...args),
        add: (...args) => useAOStore.getState().addAOFromRealtime(...args),
        remove: (...args) => useAOStore.getState().deleteAO(...args)
      },
      fournisseurs: {
        update: (...args) => useFournisseursStore.getState().updateFournisseur(...args),
        add: (...args) => useFournisseursStore.getState().addFournisseurFromRealtime(...args),
        remove: (...args) => useFournisseursStore.getState().deleteFournisseur(...args)
      },
      projets: {
        update: (...args) => usePlanificationStore.getState().updateProjet(...args),
        add: (...args) => usePlanificationStore.getState().addProjetFromRealtime(...args),
        remove: (...args) => usePlanificationStore.getState().deleteProjet(...args)
      },
      caisse: {
        update: (...args) => useCaisseStore.getState().updateMouvement(...args),
        add: (...args) => useCaisseStore.getState().addMouvementFromRealtime(...args),
        remove: (...args) => useCaisseStore.getState().deleteMouvement(...args)
      },
      encaissements: {
        update: (...args) => useEncaissementsStore.getState().updateEncaissement(...args),
        add: (...args) => useEncaissementsStore.getState().addEncaissementFromRealtime(...args),
        remove: (...args) => useEncaissementsStore.getState().deleteEncaissement(...args)
      }
    }
  }

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

  // Configuration des tables - version statique
  const tablesConfig = useRef([
    { name: 'clients', store: 'clients', idField: 'id' },
    { name: 'factures', store: 'factures', idField: 'id' },
    { name: 'devis', store: 'devis', idField: 'id' },
    { name: 'appels_offres', store: 'ao', idField: 'id', stateField: 'appelsDoffres' },
    { name: 'fournisseurs', store: 'fournisseurs', idField: 'id' },
    { name: 'projets', store: 'projets', idField: 'id' },
    { name: 'mouvements_caisse', store: 'caisse', idField: 'id', stateField: 'mouvements' },
    { name: 'encaissements', store: 'encaissements', idField: 'id' }
  ])

  useEffect(() => {
    // Enregistrer chaque canal avec le ConnectionManager
    // Utiliser une fonction stable pour éviter les recréations de callbacks
    const configs = tablesConfig.current

    configs.forEach(config => {
      const actions = actionsRef.current[config.store]
      if (!actions) return

      // Stabiliser les callbacks avec une ref
      const channelConfig = {
        table: config.name,
        onInsert: (row) => {
          const data = mapRow(config.name, row)
          // Délégation au prochain tick pour éviter les boucles de rendu
          setTimeout(() => {
            // Vérification d'existence via getState direct (pas de souscription)
            const currentActions = actionsRef.current[config.store]
            if (currentActions?.add) {
              currentActions.add(data)
            }
          }, 0)
        },
        onUpdate: (row) => {
          const data = mapRow(config.name, row)
          setTimeout(() => {
            const currentActions = actionsRef.current[config.store]
            if (currentActions?.update) {
              currentActions.update(data.id, data)
            }
          }, 0)
        },
        onDelete: (row) => {
          setTimeout(() => {
            const currentActions = actionsRef.current[config.store]
            if (currentActions?.remove) {
              currentActions.remove(row.id)
            }
          }, 0)
        }
      }

      connectionManager.registerChannel(config.name, channelConfig)
    })

    // Cleanup - ne désinscrire qu'une fois
    return () => {
      configs.forEach(config => {
        connectionManager.unregisterChannel(config.name)
      })
    }
    // Dépendance vide - exécution unique au montage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
