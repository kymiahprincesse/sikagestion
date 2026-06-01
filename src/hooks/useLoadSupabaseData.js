import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useClientsStore } from '../store/useClientsStore'
import { useFacturesStore } from '../store/useFacturesStore'
import { useDevisStore } from '../store/useDevisStore'
import { useAppelsOffresStore } from '../store/useAppelsOffresStore'
import { useFournisseursStore } from '../store/useFournisseursStore'
import { useProjetsStore } from '../store/useProjetsStore'

/**
 * Hook pour charger automatiquement toutes les données depuis Supabase
 * au démarrage de l'application
 */
export function useLoadSupabaseData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)

  const setClients = useClientsStore(state => state.setClients)
  const setFactures = useFacturesStore(state => state.setFactures)
  const setDevis = useDevisStore(state => state.setDevis)
  const setAppelsOffres = useAppelsOffresStore(state => state.setAppelsOffres)
  const setFournisseurs = useFournisseursStore(state => state.setFournisseurs)
  const setProjets = useProjetsStore(state => state.setProjets)

  useEffect(() => {
    async function loadAllData() {
      try {
        console.log('🔄 Chargement des données depuis Supabase...')
        
        // Charger toutes les données en parallèle
        const [
          clientsRes,
          facturesRes,
          devisRes,
          aoRes,
          fournisseursRes,
          projetsRes
        ] = await Promise.all([
          supabase.from('clients').select('*').order('id'),
          supabase.from('factures').select('*').order('id'),
          supabase.from('devis').select('*').order('id'),
          supabase.from('appels_offres').select('*').order('id'),
          supabase.from('fournisseurs').select('*').order('id'),
          supabase.from('projets').select('*').order('id')
        ])

        // Vérifier les erreurs
        if (clientsRes.error) throw clientsRes.error
        if (facturesRes.error) throw facturesRes.error
        if (devisRes.error) throw devisRes.error
        if (aoRes.error) throw aoRes.error
        if (fournisseursRes.error) throw fournisseursRes.error
        if (projetsRes.error) throw projetsRes.error

        // Convertir les données Supabase au format des stores
        const clients = (clientsRes.data || []).map(c => ({
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

        const factures = (facturesRes.data || []).map(f => ({
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

        const devis = (devisRes.data || []).map(d => ({
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

        const ao = (aoRes.data || []).map(a => ({
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

        const fournisseurs = (fournisseursRes.data || []).map(f => ({
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

        const projets = (projetsRes.data || []).map(p => ({
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

        // Mettre à jour les stores
        setClients(clients)
        setFactures(factures)
        setDevis(devis)
        setAppelsOffres(ao)
        setFournisseurs(fournisseurs)
        setProjets(projets)

        const loadedStats = {
          clients: clients.length,
          factures: factures.length,
          devis: devis.length,
          ao: ao.length,
          fournisseurs: fournisseurs.length,
          projets: projets.length
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
  }, [setClients, setFactures, setDevis, setAppelsOffres, setFournisseurs, setProjets])

  return { loading, error, stats }
}
