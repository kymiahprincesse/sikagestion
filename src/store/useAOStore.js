import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { generateSecureId } from '../utils/format';

function toSupabaseRow(ao) {
  return {
    numero_devis: ao.numeroDevis,
    client: ao.client || null,
    client_id: ao.clientId || null,
    objet: ao.objet || null,
    date_devis: ao.dateDevis || new Date().toISOString().split('T')[0],
    date_reception_ao: ao.receptionAO || ao.dateReceptionAO || null,
    date_reponse_ao: ao.dateReponseAO || null,
    date_limite: ao.dateLimite || null,
    date_soumission: ao.dateSoumission || null,
    date_decision: ao.dateDecision || null,
    date_visite_chantier: ao.dateVisiteChantier || null,
    montant_estime: ao.montantEstime || ao.montantRetenue || null,
    montant_retenue: ao.montantRetenue || null,
    priorite: ao.priorite || null,
    statut: ao.statut || 'A_CHIFFRER',
    reference_ao: ao.referenceAO || null,
    secteur_activite: ao.secteurActivite || null,
    prestation_souhaitee: ao.prestationSouhaitee || null,
    designations: ao.designations || null,
    notes: ao.notes || null,
  };
}

export const STATUTS_AO = {
  A_CHIFFRER: 'A_CHIFFRER',
  DECLINE: 'DECLINE',
  EN_ATTENTE: 'EN_ATTENTE',
  SOUMIS: 'SOUMIS',
  GAGNE: 'GAGNE',
  PERDU: 'PERDU'
};

export const useAOStore = create(
  persist(
    (set, get) => ({
      appelsDoffres: [], // Toujours chargé depuis Supabase, non persisté localement
      compteurNumero: 1,

      addAO: async (ao) => {
        const { compteurNumero } = get();
        const nouvelAO = {
          ...ao,
          id: generateSecureId('AO'),
          numeroDevis: ao.numeroDevis || `AO-${String(compteurNumero).padStart(5, '0')}`,
          dateDevis: ao.dateDevis || new Date().toISOString().split('T')[0],
          statut: ao.statut || STATUTS_AO.A_CHIFFRER,
          dateCreation: new Date().toISOString().split('T')[0]
        };

        set((state) => ({
          appelsDoffres: [...state.appelsDoffres, nouvelAO],
          compteurNumero: compteurNumero + 1
        }));

        const { data, error } = await supabase.from('appels_offres').insert(toSupabaseRow(nouvelAO)).select().single();
        if (error) {
          console.error('Supabase addAO:', error.message);
        } else if (data) {
          set((state) => ({
            appelsDoffres: state.appelsDoffres.map((a) => a.id === nouvelAO.id ? { ...a, id: data.id } : a)
          }));
          return { ...nouvelAO, id: data.id };
        }

        return nouvelAO;
      },

      updateAO: async (id, modifications) => {
        set((state) => ({
          appelsDoffres: state.appelsDoffres.map((ao) => ao.id === id ? { ...ao, ...modifications } : ao)
        }));

        const aoMaj = get().appelsDoffres.find((ao) => ao.id === id);
        if (aoMaj) {
          try {
            const { error } = await supabase.from('appels_offres')
              .update(toSupabaseRow({ ...aoMaj, ...modifications }))
              .eq('id', id);
            if (error) console.error('Supabase updateAO:', error.message);
          } catch (err) {
            console.error('Erreur updateAO:', err.message);
          }
        }
      },

      deleteAO: async (id) => {
        set((state) => ({ appelsDoffres: state.appelsDoffres.filter((ao) => ao.id !== id) }));
        try {
          const { error } = await supabase.from('appels_offres').delete().eq('id', id);
          if (error) console.error('Supabase deleteAO:', error.message);
        } catch (err) {
          console.error('Erreur deleteAO:', err.message);
        }
      },

      getAOById: (id) => {
        const { appelsDoffres } = get();
        return appelsDoffres.find((ao) => ao.id === id);
      },

      getAOByNumero: (numero) => {
        const { appelsDoffres } = get();
        return appelsDoffres.find((ao) => ao.numeroDevis === numero);
      },

      getAOByStatut: (statut) => {
        const { appelsDoffres } = get();
        return appelsDoffres.filter((ao) => ao.statut === statut);
      },

      getAOByClient: (clientNom) => {
        const { appelsDoffres } = get();
        return appelsDoffres.filter((ao) => ao.client === clientNom);
      },

      getAOUrgents: () => {
        const { appelsDoffres } = get();
        const aujourdhui = new Date();
        const dans3Jours = new Date();
        dans3Jours.setDate(aujourdhui.getDate() + 3);

        return appelsDoffres.filter((ao) => {
          if (!ao.dateReponseAO || ao.statut === STATUTS_AO.DECLINE || ao.statut === STATUTS_AO.PERDU) {
            return false;
          }
          const dateReponse = new Date(ao.dateReponseAO);
          return dateReponse <= dans3Jours && dateReponse >= aujourdhui;
        });
      },

      getStatistiques: () => {
        const { appelsDoffres } = get();
        return {
          aChiffrer: appelsDoffres.filter(ao => ao.statut === STATUTS_AO.A_CHIFFRER).length,
          decline: appelsDoffres.filter(ao => ao.statut === STATUTS_AO.DECLINE).length,
          enAttente: appelsDoffres.filter(ao => ao.statut === STATUTS_AO.EN_ATTENTE).length,
          soumis: appelsDoffres.filter(ao => ao.statut === STATUTS_AO.SOUMIS).length,
          gagne: appelsDoffres.filter(ao => ao.statut === STATUTS_AO.GAGNE).length,
          perdu: appelsDoffres.filter(ao => ao.statut === STATUTS_AO.PERDU).length,
          total: appelsDoffres.length
        };
      },

      getTauxReussite: () => {
        const { appelsDoffres } = get();
        const termines = appelsDoffres.filter((ao) => 
          ao.statut === STATUTS_AO.GAGNE || ao.statut === STATUTS_AO.PERDU
        );
        if (termines.length === 0) return 0;
        
        const gagnes = termines.filter((ao) => ao.statut === STATUTS_AO.GAGNE);
        return (gagnes.length / termines.length) * 100;
      },

      setAppelsOffres: (appelsDoffres) => {
        set({ appelsDoffres });
      },

      // Fonctions pour Realtime (pas d'appel Supabase pour éviter boucle)
      addAOFromRealtime: (ao) => {
        const { appelsDoffres } = get();
        const existing = appelsDoffres.find(a => a.id === ao.id);
        if (!existing) {
          set({ appelsDoffres: [...appelsDoffres, ao] });
        }
      },

      updateAOFromRealtime: (ao) => {
        set((state) => ({
          appelsDoffres: state.appelsDoffres.map((a) => a.id === ao.id ? { ...a, ...ao } : a)
        }));
      },

      deleteAOFromRealtime: (id) => {
        set((state) => ({ appelsDoffres: state.appelsDoffres.filter((a) => a.id !== id) }));
      }
    }),
    {
      name: 'sika_ao',
      partialize: (state) => ({ compteurNumero: state.compteurNumero })
    }
  )
);
