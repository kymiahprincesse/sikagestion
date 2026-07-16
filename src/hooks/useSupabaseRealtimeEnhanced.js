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
import { useUtilisateursStore } from '../store/useUtilisateursStore'
import { useAchatsStore } from '../store/useAchatsStore'
import { useJournalStore } from '../store/useJournalStore'

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
        update: (...args) => useClientsStore.getState().updateClientFromRealtime(...args),
        add: (...args) => useClientsStore.getState().addClientFromRealtime(...args),
        remove: (...args) => useClientsStore.getState().deleteClientFromRealtime(...args)
      },
      factures: {
        update: (...args) => useFacturesStore.getState().updateFactureFromRealtime(...args),
        add: (...args) => useFacturesStore.getState().addFactureFromRealtime(...args),
        remove: (...args) => useFacturesStore.getState().deleteFactureFromRealtime(...args)
      },
      devis: {
        update: (...args) => useDevisStore.getState().updateDevisFromRealtime(...args),
        add: (...args) => useDevisStore.getState().addDevisFromRealtime(...args),
        remove: (...args) => useDevisStore.getState().deleteDevisFromRealtime(...args)
      },
      ao: {
        update: (...args) => useAOStore.getState().updateAOFromRealtime(...args),
        add: (...args) => useAOStore.getState().addAOFromRealtime(...args),
        remove: (...args) => useAOStore.getState().deleteAOFromRealtime(...args)
      },
      fournisseurs: {
        update: (...args) => useFournisseursStore.getState().updateFournisseurFromRealtime(...args),
        add: (...args) => useFournisseursStore.getState().addFournisseurFromRealtime(...args),
        remove: (...args) => useFournisseursStore.getState().deleteFournisseurFromRealtime(...args)
      },
      projets: {
        update: (...args) => usePlanificationStore.getState().updateProjetFromRealtime(...args),
        add: (...args) => usePlanificationStore.getState().addProjetFromRealtime(...args),
        remove: (...args) => usePlanificationStore.getState().deleteProjetFromRealtime(...args)
      },
      caisse: {
        update: (...args) => useCaisseStore.getState().updateMouvementFromRealtime(...args),
        add: (...args) => useCaisseStore.getState().addMouvementFromRealtime(...args),
        remove: (...args) => useCaisseStore.getState().deleteMouvementFromRealtime(...args)
      },
      encaissements: {
        update: (...args) => useEncaissementsStore.getState().updateEncaissementFromRealtime(...args),
        add: (...args) => useEncaissementsStore.getState().addEncaissementFromRealtime(...args),
        remove: (...args) => useEncaissementsStore.getState().deleteEncaissementFromRealtime(...args)
      },
      utilisateurs: {
        update: (...args) => useUtilisateursStore.getState().updateUtilisateurFromRealtime(...args),
        add: (...args) => useUtilisateursStore.getState().addUtilisateurFromRealtime(...args),
        remove: (...args) => useUtilisateursStore.getState().deleteUtilisateurFromRealtime(...args)
      },
      achats: {
        update: (...args) => useAchatsStore.getState().updateAchatFromRealtime(...args),
        add: (...args) => useAchatsStore.getState().addAchatFromRealtime(...args),
        remove: (...args) => useAchatsStore.getState().deleteAchatFromRealtime(...args)
      },
      journal: {
        update: (...args) => useJournalStore.getState().updateEcritureFromRealtime(...args),
        add: (...args) => useJournalStore.getState().addEcritureFromRealtime(...args),
        remove: (...args) => useJournalStore.getState().deleteEcritureFromRealtime(...args)
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
      case 'utilisateurs':
        return {
          id: row.id, nom: row.nom, login: row.login, email: row.email || '',
          role: row.role, actif: row.is_actif, auth_user_id: row.auth_user_id || null,
          permissions: row.permissions || null
        }
      case 'achats':
        return {
          id: row.id,
          fournisseurId: row.fournisseur_id,
          numeroFacture: row.numero_facture,
          reference: row.reference,
          dateAchat: row.date_achat,
          categorie: row.categorie,
          typeAchat: row.type_achat,
          montantHT: parseFloat(row.montant_ht || 0),
          montantTVA: parseFloat(row.montant_tva || 0),
          montantTTC: parseFloat(row.montant_ttc || 0),
          montantPaye: parseFloat(row.montant_paye || 0),
          modePaiement: row.mode_paiement,
          statut: row.statut,
          projetId: row.projet_id,
          description: row.description,
          notes: row.notes,
          dateCreation: row.date_creation,
        }
      case 'ecritures_journal':
        return {
          id: row.id,
          date: row.date,
          pieceComptable: row.piece_comptable,
          type: row.type,
          compteDebit: row.compte_debit,
          compteCredit: row.compte_credit,
          montantDebit: parseFloat(row.montant_debit || 0),
          montantCredit: parseFloat(row.montant_credit || 0),
          libelle: row.libelle,
          notes: row.notes,
          dateCreation: row.date_creation,
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
    { name: 'encaissements', store: 'encaissements', idField: 'id' },
    { name: 'utilisateurs', store: 'utilisateurs', idField: 'id' },
    { name: 'achats', store: 'achats', idField: 'id' },
    { name: 'ecritures_journal', store: 'journal', idField: 'id' }
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
              currentActions.update(data)
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
  }, [mapRow])
}
