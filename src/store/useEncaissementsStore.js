import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { notifyError } from '../utils/notifications';

function toSupabaseRow(e) {
  return {
    facture_id: e.factureId || null,
    client_id: e.clientId || null,
    client_nom: e.clientNom || null,
    montant: e.montant || 0,
    date_encaissement: e.dateEncaissement || new Date().toISOString().split('T')[0],
    mode_paiement: e.modePaiement || null,
    reference: e.reference || null,
    notes: e.notes || null,
    statut: e.statut || 'VALIDE',
  };
}

export const useEncaissementsStore = create(
  persist(
    (set, get) => ({
      encaissements: [],
      soldeInitial: 200600,

      addEncaissement: async (encaissement) => {
        const nouvelEncaissement = {
          ...encaissement,
          id: Date.now(),
          dateEncaissement: encaissement.dateEncaissement || new Date().toISOString().split('T')[0]
        };

        set((state) => ({ encaissements: [...state.encaissements, nouvelEncaissement] }));

        const { data, error } = await supabase.from('encaissements').insert(toSupabaseRow(nouvelEncaissement)).select().single();
        if (error) {
          console.error('Supabase addEncaissement:', error.message);
          notifyError('Erreur de sauvegarde', `Impossible de créer l'encaissement: ${error.message}`);
        } else if (data) {
          set((state) => ({
            encaissements: state.encaissements.map((e) => e.id === nouvelEncaissement.id ? { ...e, id: data.id } : e)
          }));
          return { ...nouvelEncaissement, id: data.id };
        }

        return nouvelEncaissement;
      },

      updateEncaissement: (id, modifications) => {
        set((state) => ({
          encaissements: state.encaissements.map((e) => e.id === id ? { ...e, ...modifications } : e)
        }));

        const encMaj = get().encaissements.find((e) => e.id === id);
        if (encMaj) {
          supabase.from('encaissements').update(toSupabaseRow({ ...encMaj, ...modifications })).eq('id', id).then(({ error }) => {
            if (error) {
              console.error('Supabase updateEncaissement:', error.message);
              notifyError('Erreur de mise à jour', `Impossible de modifier l'encaissement: ${error.message}`);
            }
          });
        }
      },

      deleteEncaissement: (id) => {
        set((state) => ({ encaissements: state.encaissements.filter((e) => e.id !== id) }));
        supabase.from('encaissements').delete().eq('id', id).then(({ error }) => {
          if (error) {
            console.error('Supabase deleteEncaissement:', error.message);
            notifyError('Erreur de suppression', `Impossible de supprimer l'encaissement: ${error.message}`);
          }
        });
      },

      getEncaissementById: (id) => {
        const { encaissements } = get();
        return encaissements.find((e) => e.id === id);
      },

      getEncaissementsByFacture: (factureId) => {
        const { encaissements } = get();
        return encaissements.filter((e) => e.factureId === factureId);
      },

      getEncaissementsByClient: (clientId) => {
        const { encaissements } = get();
        return encaissements.filter((e) => e.clientId === clientId);
      },

      getEncaissementsByPeriode: (dateDebut, dateFin) => {
        const { encaissements } = get();
        return encaissements.filter((e) => {
          const date = e.dateEncaissement;
          return date >= dateDebut && date <= dateFin;
        });
      },

      getEncaissementsByModePaiement: (modePaiement) => {
        const { encaissements } = get();
        return encaissements.filter((e) => e.modePaiement === modePaiement);
      },

      getTotalEncaissements: () => {
        const { encaissements } = get();
        return encaissements.reduce((total, e) => total + (e.montant || 0), 0);
      },

      getSoldeTotal: () => {
        const { soldeInitial } = get();
        const totalEncaissements = get().getTotalEncaissements();
        return soldeInitial + totalEncaissements;
      },

      setSoldeInitial: (montant) => {
        set({ soldeInitial: montant });
      },

      setEncaissements: (encaissements) => { set({ encaissements }); },

      // Fonctions pour Realtime (pas d'appel Supabase pour éviter boucle)
      addEncaissementFromRealtime: (encaissement) => {
        const { encaissements } = get();
        const existing = encaissements.find(e => e.id === encaissement.id);
        if (!existing) {
          set({ encaissements: [...encaissements, encaissement] });
        }
      }
    }),
    {
      name: 'sika_encaissements'
    }
  )
);
