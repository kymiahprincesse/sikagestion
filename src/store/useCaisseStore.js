import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../utils/logger';
import { generateSecureId } from '../utils/format';
import { crudSuccess, crudError } from '../utils/crudNotify';
import { idbStorage } from '../lib/idbStorage';

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

      addMouvement: async (mouvement) => {
        const nouveauMouvement = {
          ...mouvement,
          id: generateSecureId('CAIS'),
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

        try {
          const { data, error } = await supabase.from('mouvements_caisse').insert(toSupabaseRow(nouveauMouvement)).select().single();
          if (error) {
            logger.error('Supabase addMouvement:', error.message);
            crudError(`Impossible d'enregistrer le mouvement : ${error.message}`);
          } else if (data) {
            crudSuccess(`Mouvement de caisse (${nouveauMouvement.type === 'ENTREE' ? 'entrée' : 'sortie'}) enregistré`);
            // Mettre à jour avec l'ID Supabase
            set((state) => ({
              mouvements: state.mouvements.map((m) =>
                m.id === nouveauMouvement.id ? { ...m, supabaseId: data.id } : m
              )
            }));
            return { ...nouveauMouvement, supabaseId: data.id };
          }
        } catch (err) {
          logger.error('Erreur addMouvement:', err.message);
          crudError(`Impossible d'enregistrer le mouvement : ${err.message}`);
        }

        return nouveauMouvement;
      },

      updateMouvement: async (id, modifications) => {
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
          try {
            const { error } = await supabase.from('mouvements_caisse')
              .update(toSupabaseRow(mouvementModifie))
              .eq('id', mouvementOriginal.supabaseId);
            if (error) {
              logger.error('Supabase updateMouvement:', error.message);
              crudError(`Impossible de modifier le mouvement : ${error.message}`);
            } else {
              crudSuccess('Mouvement de caisse modifié');
            }
          } catch (err) {
            logger.error('Erreur updateMouvement:', err.message);
            crudError(`Impossible de modifier le mouvement : ${err.message}`);
          }
        }
      },

      deleteMouvement: async (id) => {
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
          try {
            const { error } = await supabase.from('mouvements_caisse')
              .delete()
              .eq('id', mouvement.supabaseId);
            if (error) {
              logger.error('Supabase deleteMouvement:', error.message);
              crudError(`Impossible de supprimer le mouvement : ${error.message}`);
            } else {
              crudSuccess('Mouvement de caisse supprimé');
            }
          } catch (err) {
            logger.error('Erreur deleteMouvement:', err.message);
            crudError(`Impossible de supprimer le mouvement : ${err.message}`);
          }
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
        get().recalculerSoldeAvecMouvements(mouvements);
      },

      recalculerSoldeAvecMouvements: (mouvements) => {
        const totalEntrees = mouvements.filter(m => m.type === 'ENTREE').reduce((sum, m) => sum + (m.montant || 0), 0);
        const totalSorties = mouvements.filter(m => m.type === 'SORTIE').reduce((sum, m) => sum + (m.montant || 0), 0);
        set({ soldeCaisse: totalEntrees - totalSorties });
      },

      // Fonctions pour Realtime (pas d'appel Supabase pour éviter boucle)
      addMouvementFromRealtime: (mouvement) => {
        const { mouvements, soldeCaisse } = get();
        const existing = mouvements.find(m => m.id === mouvement.id);
        if (!existing) {
          const nouveauSolde = mouvement.type === 'ENTREE'
            ? soldeCaisse + mouvement.montant
            : soldeCaisse - mouvement.montant;
          set({
            mouvements: [...mouvements, mouvement],
            soldeCaisse: nouveauSolde
          });
        }
      },

      updateMouvementFromRealtime: (mouvement) => {
        set((state) => ({
          mouvements: state.mouvements.map((m) => m.id === mouvement.id ? { ...m, ...mouvement } : m)
        }));
        get().recalculerSoldeAvecMouvements(get().mouvements);
      },

      deleteMouvementFromRealtime: (id) => {
        set((state) => ({ mouvements: state.mouvements.filter((m) => m.id !== id) }));
        get().recalculerSoldeAvecMouvements(get().mouvements);
      }
    }),
    {
      name: 'sika_caisse',
      storage: createJSONStorage(() => idbStorage)
    }
  )
);
