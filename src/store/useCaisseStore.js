import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';

function toSupabaseRow(mouvement) {
  return {
    date: mouvement.date || new Date().toISOString().split('T')[0],
    type: mouvement.type || 'ENTREE',
    categorie: mouvement.categorie || null,
    montant: mouvement.montant || 0,
    description: mouvement.description || mouvement.libelles || null,
    reference: mouvement.reference || null,
    beneficiaire: mouvement.beneficiaire || null,
    mode_paiement: mouvement.mode_paiement || null,
    utilisateur: mouvement.utilisateur || null,
    caisse_nom: mouvement.caisse_nom || 'Caisse Principale',
  };
}

export const useCaisseStore = create(
  persist(
    (set, get) => ({
      mouvements: [],
      soldeCaisse: 0,

      addMouvement: (mouvement) => {
        const nouveauMouvement = {
          ...mouvement,
          id: Date.now(),
          date: mouvement.date || new Date().toISOString().split('T')[0],
          type: mouvement.type || 'ENTREE',
        };

        const { soldeCaisse } = get();
        const nouveauSolde = mouvement.type === 'ENTREE'
          ? soldeCaisse + mouvement.montant
          : soldeCaisse - mouvement.montant;

        set((state) => ({
          mouvements: [...state.mouvements, nouveauMouvement],
          soldeCaisse: nouveauSolde,
        }));

        supabase.from('mouvements_caisse').insert(toSupabaseRow(nouveauMouvement)).then(({ error }) => {
          if (error) console.error('Supabase sync addMouvement:', error.message);
        });

        return nouveauMouvement;
      },

      updateMouvement: (id, modifications) => {
        const mouvementOriginal = get().getMouvementById(id);
        if (!mouvementOriginal) return;

        const { soldeCaisse } = get();
        let nouveauSolde = mouvementOriginal.type === 'ENTREE'
          ? soldeCaisse - mouvementOriginal.montant
          : soldeCaisse + mouvementOriginal.montant;

        const mouvementModifie = { ...mouvementOriginal, ...modifications };
        nouveauSolde = mouvementModifie.type === 'ENTREE'
          ? nouveauSolde + mouvementModifie.montant
          : nouveauSolde - mouvementModifie.montant;

        set((state) => ({
          mouvements: state.mouvements.map((m) =>
            m.id === id ? mouvementModifie : m
          ),
          soldeCaisse: nouveauSolde,
        }));

        if (mouvementOriginal.supabaseId) {
          supabase.from('mouvements_caisse')
            .update(toSupabaseRow(mouvementModifie))
            .eq('id', mouvementOriginal.supabaseId)
            .then(({ error }) => {
              if (error) console.error('Supabase sync updateMouvement:', error.message);
            });
        }
      },

      deleteMouvement: (id) => {
        const mouvement = get().getMouvementById(id);
        if (!mouvement) return;

        const { soldeCaisse } = get();
        const nouveauSolde = mouvement.type === 'ENTREE'
          ? soldeCaisse - mouvement.montant
          : soldeCaisse + mouvement.montant;

        set((state) => ({
          mouvements: state.mouvements.filter((m) => m.id !== id),
          soldeCaisse: nouveauSolde,
        }));

        if (mouvement.supabaseId) {
          supabase.from('mouvements_caisse')
            .delete()
            .eq('id', mouvement.supabaseId)
            .then(({ error }) => {
              if (error) console.error('Supabase sync deleteMouvement:', error.message);
            });
        }
      },

      getMouvementById: (id) => {
        const { mouvements } = get();
        return mouvements.find((m) => m.id === id);
      },

      getMouvementsByType: (type) => {
        const { mouvements } = get();
        return mouvements.filter((m) => m.type === type);
      },

      getMouvementsByPeriode: (dateDebut, dateFin) => {
        const { mouvements } = get();
        return mouvements.filter((m) => {
          const date = m.date;
          return date >= dateDebut && date <= dateFin;
        });
      },

      getTotalEntrees: () => {
        const entrees = get().getMouvementsByType('ENTREE');
        return entrees.reduce((total, m) => total + (m.montant || 0), 0);
      },

      getTotalSorties: () => {
        const sorties = get().getMouvementsByType('SORTIE');
        return sorties.reduce((total, m) => total + (m.montant || 0), 0);
      },

      setSoldeCaisse: (montant) => {
        set({ soldeCaisse: montant });
      },

      recalculerSolde: () => {
        const totalEntrees = get().getTotalEntrees();
        const totalSorties = get().getTotalSorties();
        set({ soldeCaisse: totalEntrees - totalSorties });
      },

      setMouvements: (mouvements) => {
        set({ mouvements });
        // Recalculer automatiquement le solde après chargement
        const totalEntrees = mouvements.filter(m => m.type === 'ENTREE').reduce((sum, m) => sum + (m.montant || 0), 0);
        const totalSorties = mouvements.filter(m => m.type === 'SORTIE').reduce((sum, m) => sum + (m.montant || 0), 0);
        set({ soldeCaisse: totalEntrees - totalSorties });
      }
    }),
    {
      name: 'sika_caisse'
    }
  )
);
