import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'
import { useClientsStore } from '../store/useClientsStore'
import { useFacturesStore } from '../store/useFacturesStore'
import { useDevisStore } from '../store/useDevisStore'
import { useAOStore } from '../store/useAOStore'
import { useFournisseursStore } from '../store/useFournisseursStore'
import { usePlanificationStore } from '../store/usePlanificationStore'
import { useCaisseStore } from '../store/useCaisseStore'
import { useEncaissementsStore } from '../store/useEncaissementsStore'
import { useUtilisateursStore } from '../store/useUtilisateursStore'
import { useNotificationsStore } from '../store/useNotificationsStore'
import { useJournalStore } from '../store/useJournalStore'

import { offlineQueue } from '../services/offlineQueue'
import { logger } from '../utils/logger'

/**
 * Composant invisible qui charge toutes les données depuis Supabase au démarrage
 * ET active la synchronisation temps réel
 */
export default function DataLoader() {
  // La synchronisation temps réel est maintenant gérée par composant pour éviter de surcharger le réseau.
  // useSupabaseRealtimeEnhanced() a été retiré d'ici.

  const utilisateurConnecte = useAuthStore(state => state.utilisateurConnecte)
  const isRefreshingRef = useRef(false)
  const setClients = useClientsStore(state => state.setClients)
  const setFactures = useFacturesStore(state => state.setFactures)
  const setDevis = useDevisStore(state => state.setDevis)
  const setAppelsOffres = useAOStore(state => state.setAppelsOffres)
  const setFournisseurs = useFournisseursStore(state => state.setFournisseurs)
  const setProjets = usePlanificationStore(state => state.setProjets)
  const setTaches = usePlanificationStore(state => state.setTaches)
  const setRessourcesHebdo = usePlanificationStore(state => state.setRessourcesHebdo)
  const setEncaissements = useEncaissementsStore(state => state.setEncaissements)
  const setMouvements = useCaisseStore(state => state.setMouvements)
  const setEcritures = useJournalStore(state => state.setEcritures)
  // Utilisateurs : mis à jour directement via useUtilisateursStore.setState dans loadAllData
  const genererNotifications = useNotificationsStore(state => state.genererNotifications)

  const loadAllData = useCallback(async () => {
    if (!utilisateurConnecte) return
    if (isRefreshingRef.current) return

    isRefreshingRef.current = true

    try {
      // Charger toutes les données en parallèle
      const [clientsRes, facturesRes, devisRes, aoRes, fournisseursRes, projetsRes, caisseRes, tachesRes, ressourcesRes, encaissementsRes, utilisateursRes, lignesDevisRes, ecrituresRes] = await Promise.all([
          supabase.from('clients').select('*').order('id'),
          supabase.from('factures').select('*').order('id'),
          supabase.from('devis').select('*').order('id'),
          supabase.from('appels_offres').select('*').order('id'),
          supabase.from('fournisseurs').select('*').order('id'),
          supabase.from('projets').select('*').order('id'),
          supabase.from('mouvements_caisse').select('*').order('date', { ascending: false }),
          supabase.from('taches').select('*').order('id'),
          supabase.from('ressources_hebdo').select('*').order('id'),
          supabase.from('encaissements').select('*').order('id'),
          supabase.from('utilisateurs').select('*').order('id'),
          supabase.from('lignes_devis').select('*').order('ordre'),
          supabase.from('ecritures_journal').select('*').order('date', { ascending: false }),
        ])
        
        // CLIENTS
        if (!clientsRes.error && clientsRes.data?.length > 0) {
          const clients = clientsRes.data.map(c => ({
            id: c.id,
            nom: c.nom,
            raisonSociale: c.raison_sociale,
            ncc: c.ncc,
            secteur: c.secteur,
            adresse: c.adresse,
            ville: c.ville,
            pays: c.pays,
            contactNom: c.contact_nom,
            contactTelephone: c.contact_telephone,
            contactEmail: c.contact_email,
            conditionsPaiement: c.conditions_paiement,
            type: c.type,
            isActif: c.is_actif,
            notes: c.notes,
            dateCreation: c.date_creation
          }))
          setClients(clients)
        }
        
        // FACTURES
        if (!facturesRes.error && facturesRes.data?.length > 0) {
          const factures = facturesRes.data.map(f => ({
            id: f.id,
            numero: f.numero,
            clientId: f.client_id,
            clientNom: f.client_nom,
            devisId: f.devis_id,
            objet: f.objet,
            montantHT: parseFloat(f.montant_ht || 0),
            montantTVA: parseFloat(f.montant_tva || 0),
            montantTTC: parseFloat(f.montant_ttc || 0),
            montantPaye: parseFloat(f.montant_paye || 0),
            dateDepot: f.date_depot,
            dateEcheance: f.date_echeance,
            datePayement: f.date_payement,
            delaiReglement: f.delai_reglement,
            statut: f.statut,
            notes: f.notes,
            dateCreation: f.date_creation
          }))
          setFactures(factures)
        }
        
        // DEVIS
        if (!devisRes.error && devisRes.data?.length > 0) {
          // Construire la map lignes par devis_id
          const lignesMap = {};
          if (!lignesDevisRes.error && lignesDevisRes.data?.length > 0) {
            lignesDevisRes.data.forEach(l => {
              if (!lignesMap[l.devis_id]) lignesMap[l.devis_id] = [];
              lignesMap[l.devis_id].push({
                id: l.id,
                designation: l.designation || '',
                unite: l.unite || '',
                ml: parseFloat(l.ml || 0),
                pt: parseFloat(l.pt || 0),
                qte: parseFloat(l.quantite || 0),
                pu: parseFloat(l.pu || 0),
                montant: parseFloat(l.montant || 0),
                ordre: l.ordre || 0,
              });
            });
          }
          const devis = devisRes.data.map(d => ({
            id: d.id,
            numero: d.numero,
            clientId: d.client_id,
            clientNom: d.client_nom,
            typeDevis: d.type_devis,
            type: d.type_devis,
            objet: d.objet,
            montantHT: parseFloat(d.montant_ht || 0),
            montantTVA: parseFloat(d.montant_tva || 0),
            montantTTC: parseFloat(d.montant_ttc || 0),
            ttc: parseFloat(d.montant_ttc || 0),
            montantTotal: parseFloat(d.montant_total || 0),
            date: d.date_devis,
            dateDevis: d.date_devis,
            dateValidation: d.date_validation,
            dateAnnulation: d.date_annulation,
            dateTransformation: d.date_transformation,
            statut: d.statut,
            notes: d.notes,
            dateCreation: d.date_creation,
            lignes: (useDevisStore.getState().devis.find(ld => ld.id === d.id)?.lignes?.length > 0) 
              ? useDevisStore.getState().devis.find(ld => ld.id === d.id).lignes 
              : (lignesMap[d.id] || [])
          }))
          setDevis(devis)
        }
        
        // APPELS D'OFFRES
        if (!aoRes.error && aoRes.data?.length > 0) {
          const ao = aoRes.data.map(a => ({
            id: a.id,
            numeroDevis: a.numero_devis,
            client: a.client,
            clientId: a.client_id,
            objet: a.objet,
            dateDevis: a.date_devis,
            referenceAO: a.reference_ao,
            secteurActivite: a.secteur_activite,
            prestationSouhaitee: a.prestation_souhaitee,
            designations: a.designations,
            receptionAO: a.date_reception_ao,
            dateReceptionAO: a.date_reception_ao,
            dateVisiteChantier: a.date_visite_chantier,
            dateReponseAO: a.date_reponse_ao,
            dateLimite: a.date_limite,
            dateSoumission: a.date_soumission,
            dateDecision: a.date_decision,
            montantEstime: parseFloat(a.montant_estime || 0),
            montantRetenue: parseFloat(a.montant_retenue || 0),
            priorite: a.priorite,
            statut: a.statut,
            notes: a.notes,
            dateCreation: a.date_creation
          }))
          setAppelsOffres(ao)
        }
        
        // FOURNISSEURS
        if (!fournisseursRes.error && fournisseursRes.data?.length > 0) {
          const fournisseurs = fournisseursRes.data.map(f => ({
            id: f.id,
            nom: f.nom,
            raisonSociale: f.raison_sociale,
            type: f.type,
            secteur: f.secteur,
            contactNom: f.contact_nom,
            contactTelephone: f.contact_telephone,
            contactEmail: f.contact_email,
            adresse: f.adresse,
            ville: f.ville,
            pays: f.pays,
            banque: f.banque,
            numeroCompte: f.numero_compte,
            conditionsPaiement: f.conditions_paiement,
            isActif: f.is_actif,
            notes: f.notes,
            dateCreation: f.date_creation
          }))
          setFournisseurs(fournisseurs)
        }
        
        // PROJETS
        if (!projetsRes.error && projetsRes.data?.length > 0) {
          const projets = projetsRes.data.map(p => ({
            id: p.id,
            nom: p.nom,
            clientId: p.client_id,
            referenceProjet: p.reference_projet,
            dateDebut: p.date_debut,
            dateFinPrevue: p.date_fin_prevue,
            dateFinReelle: p.date_fin_reelle,
            budgetPrevu: parseFloat(p.budget_prevu || 0),
            coutReel: parseFloat(p.cout_reel || 0),
            statut: p.statut,
            description: p.description,
            dateCreation: p.date_creation
          }))
          setProjets(projets)
        }
        
        // TACHES
        if (!tachesRes.error && tachesRes.data?.length > 0) {
          const taches = tachesRes.data.map(t => ({
            id: t.id, projetId: t.projet_id, nom: t.nom, description: t.description,
            statut: t.statut, dateDebut: t.date_debut, dateFinPrevue: t.date_fin_prevue,
            dateFinReelle: t.date_fin_reelle, responsable: t.responsable,
            budgetPrevu: parseFloat(t.budget_prevu || 0), budgetReel: parseFloat(t.budget_reel || 0),
            nbTechniciens: t.nb_techniciens, kmSite: t.km_site, nbDeplacements: t.nb_deplacements,
            budgetMateriel: parseFloat(t.budget_materiel || 0),
            budgetSousTraitance: parseFloat(t.budget_sous_traitance || 0),
            budgetCarburant: parseFloat(t.budget_carburant || 0),
            budgetNourriture: parseFloat(t.budget_nourriture || 0),
            budgetLogistique: parseFloat(t.budget_logistique || 0),
            coutTotal: parseFloat(t.cout_total || 0), notes: t.notes, dateCreation: t.date_creation
          }))
          setTaches(taches)
        }

        // RESSOURCES HEBDO
        if (!ressourcesRes.error && ressourcesRes.data?.length > 0) {
          const ressourcesHebdo = ressourcesRes.data.map(r => ({
            id: r.id, projetId: r.projet_id, tacheId: r.tache_id, semaine: r.semaine,
            technicien: r.technicien, heuresPrevu: parseFloat(r.heures_prevu || 0),
            heuresReel: parseFloat(r.heures_reel || 0), notes: r.notes
          }))
          setRessourcesHebdo(ressourcesHebdo)
        }

        // ENCAISSEMENTS
        if (!encaissementsRes.error && encaissementsRes.data?.length > 0) {
          const encaissements = encaissementsRes.data.map(e => ({
            id: e.id, factureId: e.facture_id, clientId: e.client_id, clientNom: e.client_nom,
            montant: parseFloat(e.montant || 0), dateEncaissement: e.date_encaissement,
            modePaiement: e.mode_paiement, reference: e.reference,
            notes: e.notes, statut: e.statut, dateCreation: e.date_creation
          }))
          setEncaissements(encaissements)
        }

        // UTILISATEURS
        if (!utilisateursRes.error && utilisateursRes.data?.length > 0) {
          // Conserver les hash locaux existants pour ne pas casser l'authentification locale
          const localUsersMap = new Map(useUtilisateursStore.getState().utilisateurs.map(u => [u.id, u]));
          const utilisateurs = utilisateursRes.data.map(u => {
            const localUser = localUsersMap.get(u.id);
            return {
              id: u.id,
              nom: u.nom,
              login: u.login,
              email: u.email || '',
              role: u.role,
              actif: u.is_actif,
              auth_user_id: u.auth_user_id || null,
              permissions: u.permissions || null,
              motDePasseHash: localUser?.motDePasseHash || null,
            };
          })
          useUtilisateursStore.setState({ utilisateurs })
        }

        // MOUVEMENTS CAISSE
        if (!caisseRes.error && caisseRes.data?.length > 0) {
          const mouvements = caisseRes.data.map(m => ({
            id: m.id,
            date: m.date,
            type: m.type,
            categorie: m.categorie,
            description: m.description,
            libelles: m.description || '',
            caisse_nom: m.caisse_nom || 'Caisse Principale',
            montant: parseFloat(m.montant || 0),
            beneficiaire: m.beneficiaire,
            modePaiement: m.mode_paiement,
            pieceJustificative: m.piece_justificative,
            referenceProjet: m.reference_projet,
            utilisateur: m.utilisateur,
            dateCreation: m.date_creation
          }))
          setMouvements(mouvements)
        }

        // ECRITURES JOURNAL
        if (!ecrituresRes.error && ecrituresRes.data?.length > 0) {
          const ecritures = ecrituresRes.data.map(e => ({
            id: e.id,
            date: e.date,
            pieceComptable: e.piece_comptable,
            type: e.type,
            compteDebit: e.compte_debit,
            compteCredit: e.compte_credit,
            montantDebit: parseFloat(e.montant_debit || 0),
            montantCredit: parseFloat(e.montant_credit || 0),
            libelle: e.libelle,
            notes: e.notes,
            dateCreation: e.date_creation,
          }))
          setEcritures(ecritures)
        }

        // Relances automatiques : générer notifications après chargement complet
        const factures = useFacturesStore.getState().factures
        const devis = useDevisStore.getState().devis
        const ao = useAOStore.getState().appelsDoffres
        const projets = usePlanificationStore.getState().projets
        genererNotifications(factures, devis, ao, projets)

        // Traiter la file d'attente offline si des opérations sont en attente
        const queueStats = offlineQueue.getStats()
        if (queueStats.pending > 0 && navigator.onLine) {
          console.log(`🔄 ${queueStats.pending} opération(s) en attente - Synchronisation...`)
          offlineQueue.processQueue()
        }

        // Log du succès du chargement
        const loadedTables = [];
        if (clientsRes.data?.length > 0) loadedTables.push('clients');
        if (facturesRes.data?.length > 0) loadedTables.push('factures');
        if (devisRes.data?.length > 0) loadedTables.push('devis');
        if (aoRes.data?.length > 0) loadedTables.push('appels_offres');
        if (fournisseursRes.data?.length > 0) loadedTables.push('fournisseurs');
        logger.log(`[DataLoader] Chargé: ${loadedTables.join(', ')}`);

        // Vérifier les erreurs partielles
        const errors = [];
        if (clientsRes.error) errors.push(`clients: ${clientsRes.error.message}`);
        if (facturesRes.error) errors.push(`factures: ${facturesRes.error.message}`);
        if (devisRes.error) errors.push(`devis: ${devisRes.error.message}`);
        if (aoRes.error) errors.push(`appels_offres: ${aoRes.error.message}`);
        if (fournisseursRes.error) errors.push(`fournisseurs: ${fournisseursRes.error.message}`);
        
        if (errors.length > 0) {
          logger.warn('[DataLoader] Erreurs partielles:', errors);
          // Notification silencieuse - pas d'alerte intrusive
          if (typeof window !== 'undefined') {
            import('../store/useNotificationsStore').then(({ useNotificationsStore }) => {
              useNotificationsStore.getState().ajouterNotification({
                type: 'ATTENTION',
                icone: '⚠️',
                titre: 'SYNC PARTIELLE',
                message: `${errors.length} table(s) non chargée(s). Données locales utilisées.`,
                lien: '/tour-de-controle'
              });
            }).catch(() => {});
          }
        }

      } catch (err) {
        logger.error('[DataLoader] Erreur fatale:', err);
        // En cas d'erreur fatale, notifier l'utilisateur
        if (typeof window !== 'undefined') {
          import('../store/useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().ajouterNotification({
              type: 'URGENT',
              icone: '🔴',
              titre: 'ERREUR CHARGEMENT',
              message: 'Impossible de charger les données. Vérifiez votre connexion.',
              lien: '/tour-de-controle'
            });
          }).catch(() => {});
        }
      } finally {
        isRefreshingRef.current = false
      }
    }, [
      utilisateurConnecte,
      setClients,
      setFactures,
      setDevis,
      setAppelsOffres,
      setFournisseurs,
      setProjets,
      setTaches,
      setRessourcesHebdo,
      setEncaissements,
      setMouvements,
      setEcritures,
      genererNotifications
    ])

  useEffect(() => {
    if (!utilisateurConnecte) return
    void loadAllData('initial')
  }, [utilisateurConnecte, loadAllData])

  useEffect(() => {
    if (!utilisateurConnecte) return

    const handleOnline = () => {
      void loadAllData('online')
    }
    const handleFocus = () => {
      void loadAllData('focus')
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadAllData('visibility')
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [utilisateurConnecte, loadAllData])

  return null // Composant invisible
}
