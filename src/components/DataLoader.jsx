import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useClientsStore } from '../store/useClientsStore'
import { useFacturesStore } from '../store/useFacturesStore'
import { useDevisStore } from '../store/useDevisStore'
import { useAOStore } from '../store/useAOStore'
import { useFournisseursStore } from '../store/useFournisseursStore'
import { usePlanificationStore } from '../store/usePlanificationStore'
import { useCaisseStore } from '../store/useCaisseStore'
import { useEncaissementsStore } from '../store/useEncaissementsStore'
import { useNotificationsStore } from '../store/useNotificationsStore'
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime'
import { offlineQueue } from '../services/offlineQueue'

/**
 * Composant invisible qui charge toutes les données depuis Supabase au démarrage
 * ET active la synchronisation temps réel
 */
export default function DataLoader() {
  // Activer la sync temps réel
  useSupabaseRealtime()

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
  const genererNotifications = useNotificationsStore(state => state.genererNotifications)

  useEffect(() => {
    async function loadAllData() {
      try {
        
        // Charger toutes les données en parallèle
        const [clientsRes, facturesRes, devisRes, aoRes, fournisseursRes, projetsRes, caisseRes, tachesRes, ressourcesRes, encaissementsRes] = await Promise.all([
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
          const devis = devisRes.data.map(d => ({
            id: d.id,
            numero: d.numero,
            clientId: d.client_id,
            clientNom: d.client_nom,
            typeDevis: d.type_devis,
            objet: d.objet,
            montantHT: parseFloat(d.montant_ht || 0),
            montantTVA: parseFloat(d.montant_tva || 0),
            montantTTC: parseFloat(d.montant_ttc || 0),
            montantTotal: parseFloat(d.montant_total || 0),
            dateDevis: d.date_devis,
            dateValidation: d.date_validation,
            statut: d.statut,
            notes: d.notes,
            dateCreation: d.date_creation
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
            dateReceptionAO: a.date_reception_ao,
            dateLimite: a.date_limite,
            montantEstime: parseFloat(a.montant_estime || 0),
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

        // MOUVEMENTS CAISSE
        if (!caisseRes.error && caisseRes.data?.length > 0) {
          const mouvements = caisseRes.data.map(m => ({
            id: m.id,
            date: m.date,
            type: m.type,
            categorie: m.categorie,
            description: m.description,
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

        // Relances automatiques : générer notifications après chargement complet
        const factures = useFacturesStore.getState().factures
        const devis = useDevisStore.getState().devis
        const ao = useAOStore.getState().appelsDoffres
        const projets = usePlanificationStore.getState().projets
        const fournisseurs = useFournisseursStore.getState().fournisseurs
        genererNotifications(factures, devis, ao, projets, fournisseurs)

        // Traiter la file d'attente offline si des opérations sont en attente
        const queueStats = offlineQueue.getStats()
        if (queueStats.pending > 0 && navigator.onLine) {
          console.log(`🔄 ${queueStats.pending} opération(s) en attente - Synchronisation...`)
          offlineQueue.processQueue()
        }

      } catch (err) {
        console.error('Erreur DataLoader:', err)
      }
    }

    loadAllData()
  }, [setClients, setFactures, setDevis, setAppelsOffres, setFournisseurs, setProjets, setTaches, setRessourcesHebdo, setEncaissements, setMouvements])

  return null // Composant invisible
}
