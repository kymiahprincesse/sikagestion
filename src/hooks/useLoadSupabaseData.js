import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useClientsStore } from '../store/useClientsStore'
import { useFacturesStore } from '../store/useFacturesStore'
import { useDevisStore } from '../store/useDevisStore'
import { useAOStore } from '../store/useAOStore'
import { useFournisseursStore } from '../store/useFournisseursStore'
import { usePlanificationStore } from '../store/usePlanificationStore'
import { useEncaissementsStore } from '../store/useEncaissementsStore'
import { useUtilisateursStore } from '../store/useUtilisateursStore'
import { useJournalStore } from '../store/useJournalStore'

export function useLoadSupabaseData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)

  const setClients = useClientsStore(state => state.setClients)
  const setFactures = useFacturesStore(state => state.setFactures)
  const setDevis = useDevisStore(state => state.setDevis)
  const setAppelsOffres = useAOStore(state => state.setAppelsOffres)
  const setFournisseurs = useFournisseursStore(state => state.setFournisseurs)
  const setProjets = usePlanificationStore(state => state.setProjets)
  const setTaches = usePlanificationStore(state => state.setTaches)
  const setRessourcesHebdo = usePlanificationStore(state => state.setRessourcesHebdo)
  const setEncaissements = useEncaissementsStore(state => state.setEncaissements)
  const setUtilisateurs = useUtilisateursStore(state => state.setUtilisateurs)
  const setEcritures = useJournalStore(state => state.setEcritures)

  useEffect(() => {
    async function loadAllData() {
      try {
        console.log('🔄 Chargement des données depuis Supabase...')

        const [
          clientsRes, facturesRes, devisRes, aoRes, fournisseursRes,
          projetsRes, tachesRes, ressourcesRes, encaissementsRes, utilisateursRes, ecrituresRes
        ] = await Promise.all([
          supabase.from('clients').select('*').order('id'),
          supabase.from('factures').select('*').order('id'),
          supabase.from('devis').select('*').order('id'),
          supabase.from('appels_offres').select('*').order('id'),
          supabase.from('fournisseurs').select('*').order('id'),
          supabase.from('projets').select('*').order('id'),
          supabase.from('taches').select('*').order('id'),
          supabase.from('ressources_hebdo').select('*').order('id'),
          supabase.from('encaissements').select('*').order('id'),
          supabase.from('utilisateurs').select('*').order('id'),
          supabase.from('ecritures_journal').select('*').order('id'),
        ])

        if (clientsRes.error) throw clientsRes.error
        if (facturesRes.error) throw facturesRes.error
        if (devisRes.error) throw devisRes.error
        if (aoRes.error) throw aoRes.error
        if (fournisseursRes.error) throw fournisseursRes.error
        if (projetsRes.error) throw projetsRes.error
        if (tachesRes.error) console.warn('taches:', tachesRes.error.message)
        if (ressourcesRes.error) console.warn('ressources_hebdo:', ressourcesRes.error.message)
        if (encaissementsRes.error) console.warn('encaissements:', encaissementsRes.error.message)
        if (utilisateursRes.error) console.warn('utilisateurs:', utilisateursRes.error.message)
        if (ecrituresRes.error) console.warn('ecritures_journal:', ecrituresRes.error.message)

        const clients = (clientsRes.data || []).map(c => ({
          id: c.id, nom: c.nom, raisonSociale: c.raison_sociale, ncc: c.ncc,
          secteur: c.secteur, adresse: c.adresse, ville: c.ville, pays: c.pays,
          contactNom: c.contact_nom, contactTelephone: c.contact_telephone,
          contactEmail: c.contact_email, conditionsPaiement: c.conditions_paiement,
          type: c.type, isActif: c.is_actif, notes: c.notes, dateCreation: c.date_creation
        }))

        const factures = (facturesRes.data || []).map(f => ({
          id: f.id, numero: f.numero, clientId: f.client_id, clientNom: f.client_nom,
          devisId: f.devis_id, objet: f.objet,
          montantHT: parseFloat(f.montant_ht || 0), montantTVA: parseFloat(f.montant_tva || 0),
          montantTTC: parseFloat(f.montant_ttc || 0), montantPaye: parseFloat(f.montant_paye || 0),
          dateDepot: f.date_depot, dateEcheance: f.date_echeance, datePayement: f.date_payement,
          delaiReglement: f.delai_reglement, statut: f.statut, notes: f.notes, dateCreation: f.date_creation
        }))

        const devis = (devisRes.data || []).map(d => ({
          id: d.id, numero: d.numero, clientId: d.client_id, clientNom: d.client_nom,
          typeDevis: d.type_devis, objet: d.objet,
          montantHT: parseFloat(d.montant_ht || 0), montantTVA: parseFloat(d.montant_tva || 0),
          montantTTC: parseFloat(d.montant_ttc || 0), montantTotal: parseFloat(d.montant_total || 0),
          dateDevis: d.date_devis, dateValidation: d.date_validation,
          dateAnnulation: d.date_annulation, dateTransformation: d.date_transformation,
          statut: d.statut, notes: d.notes, dateCreation: d.date_creation
        }))

        const ao = (aoRes.data || []).map(a => ({
          id: a.id, numeroDevis: a.numero_devis, client: a.client, clientId: a.client_id,
          objet: a.objet, dateDevis: a.date_devis,
          dateReceptionAO: a.date_reception_ao, dateReponseAO: a.date_reponse_ao,
          dateLimite: a.date_limite, dateSoumission: a.date_soumission, dateDecision: a.date_decision,
          montantEstime: parseFloat(a.montant_estime || 0), priorite: a.priorite,
          statut: a.statut, notes: a.notes, dateCreation: a.date_creation
        }))

        const fournisseurs = (fournisseursRes.data || []).map(f => ({
          id: f.id, nom: f.nom, raisonSociale: f.raison_sociale, type: f.type,
          secteur: f.secteur, adresse: f.adresse, ville: f.ville, pays: f.pays,
          contactNom: f.contact_nom, contactTelephone: f.contact_telephone,
          contactEmail: f.contact_email, conditionsPaiement: f.conditions_paiement,
          banque: f.banque, numeroCompte: f.numero_compte,
          isActif: f.is_actif, notes: f.notes, dateCreation: f.date_creation
        }))

        const projets = (projetsRes.data || []).map(p => ({
          id: p.id, nom: p.nom, clientId: p.client_id, referenceProjet: p.reference_projet,
          dateDebut: p.date_debut, dateFinPrevue: p.date_fin_prevue, dateFinReelle: p.date_fin_reelle,
          budgetPrevu: parseFloat(p.budget_prevu || 0), coutReel: parseFloat(p.cout_reel || 0),
          statut: p.statut, description: p.description, dateCreation: p.date_creation
        }))

        const taches = (tachesRes.data || []).map(t => ({
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

        const ressourcesHebdo = (ressourcesRes.data || []).map(r => ({
          id: r.id, projetId: r.projet_id, tacheId: r.tache_id, semaine: r.semaine,
          technicien: r.technicien, heuresPrevu: parseFloat(r.heures_prevu || 0),
          heuresReel: parseFloat(r.heures_reel || 0), notes: r.notes
        }))

        const encaissements = (encaissementsRes.data || []).map(e => ({
          id: e.id, factureId: e.facture_id, clientId: e.client_id, clientNom: e.client_nom,
          montant: parseFloat(e.montant || 0), dateEncaissement: e.date_encaissement,
          modePaiement: e.mode_paiement, reference: e.reference,
          notes: e.notes, statut: e.statut, dateCreation: e.date_creation
        }))

        setClients(clients)
        setFactures(factures)
        setDevis(devis)
        setAppelsOffres(ao)
        setFournisseurs(fournisseurs)
        setProjets(projets)
        setTaches(taches)
        setRessourcesHebdo(ressourcesHebdo)
        setEncaissements(encaissements)
        if (utilisateursRes.data) setUtilisateurs(utilisateursRes.data)

        const ecritures = (ecrituresRes.data || []).map(e => ({
          id: e.id, date: e.date, pieceComptable: e.piece_comptable,
          type: e.type, compteDebit: e.compte_debit, compteCredit: e.compte_credit,
          montantDebit: parseFloat(e.montant_debit || 0),
          montantCredit: parseFloat(e.montant_credit || 0),
          libelle: e.libelle, notes: e.notes, dateCreation: e.date_creation
        }))
        setEcritures(ecritures)

        const loadedStats = {
          clients: clients.length, factures: factures.length, devis: devis.length,
          ao: ao.length, fournisseurs: fournisseurs.length, projets: projets.length,
          taches: taches.length, encaissements: encaissements.length,
          ecritures: ecritures.length
        }

        setStats(loadedStats)
        setLoading(false)
        console.log('✅ Données chargées depuis Supabase:', loadedStats)
      } catch (err) {
        console.error('❌ Erreur chargement Supabase:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    loadAllData()
  }, [])

  return { loading, error, stats }
}
