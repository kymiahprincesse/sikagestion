import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { crudSuccess, crudError } from '../utils/crudNotify';
import { logger } from '../utils/logger';
import { generateSecureId } from '../utils/format';
import { useAchatsStore } from './useAchatsStore';

function fournisseurToRow(f) {
  return {
    nom: f.nom,
    raison_sociale: f.raisonSociale || null,
    type: f.type || null,
    secteur: f.secteur || null,
    adresse: f.adresse || null,
    ville: f.ville || null,
    pays: f.pays || 'Côte d\'Ivoire',
    contact_nom: f.contactNom || null,
    contact_telephone: f.contactTelephone || null,
    contact_email: f.contactEmail || null,
    conditions_paiement: f.conditionsPaiement || 30,
    numero_compte: f.numeroCompte || null,
    banque: f.banque || null,
    is_actif: f.isActif !== undefined ? f.isActif : true,
    notes: f.notes || null,
  };
}


export const useFournisseursStore = create(
  persist(
    (set, get) => ({
      fournisseurs: [],

      addFournisseur: async (fournisseur) => {
        const nouveauFournisseur = {
          ...fournisseur,
          id: generateSecureId('FRN'),
          dateCreation: fournisseur.dateCreation || new Date().toISOString().split('T')[0],
          isActif: fournisseur.isActif !== undefined ? fournisseur.isActif : true
        };

        set((state) => ({ fournisseurs: [...state.fournisseurs, nouveauFournisseur] }));

        const { data, error } = await supabase.from('fournisseurs').insert(fournisseurToRow(nouveauFournisseur)).select().single();
        if (error) {
          console.error('Supabase addFournisseur:', error.message);
          crudError(`Impossible de créer le fournisseur : ${error.message}`);
        } else if (data) {
          crudSuccess(`Fournisseur "${nouveauFournisseur.nom}" créé avec succès`);
          set((state) => ({
            fournisseurs: state.fournisseurs.map((f) => f.id === nouveauFournisseur.id ? { ...f, id: data.id } : f)
          }));
          return { ...nouveauFournisseur, id: data.id };
        }

        return nouveauFournisseur;
      },

      updateFournisseur: (id, modifications) => {
        set((state) => ({
          fournisseurs: state.fournisseurs.map((f) => f.id === id ? { ...f, ...modifications } : f)
        }));

        const fMaj = get().fournisseurs.find((f) => f.id === id);
        if (fMaj) {
          supabase.from('fournisseurs').update(fournisseurToRow({ ...fMaj, ...modifications })).eq('id', id).then(({ error }) => {
            if (error) {
              logger.error('Supabase updateFournisseur:', error.message);
              crudError(`Impossible de modifier le fournisseur : ${error.message}`);
            } else {
              crudSuccess(`Fournisseur "${fMaj.nom}" modifié avec succès`);
            }
          }).catch((err) => {
            logger.error('Erreur updateFournisseur:', err.message);
            crudError(`Impossible de modifier le fournisseur : ${err.message}`);
          });
        }
      },

      deleteFournisseur: (id) => {
        const fournisseurSupprime = get().fournisseurs.find((f) => f.id === id);
        set((state) => ({ fournisseurs: state.fournisseurs.filter((f) => f.id !== id) }));
        supabase.from('fournisseurs').delete().eq('id', id).then(({ error }) => {
          if (error) {
            logger.error('Supabase deleteFournisseur:', error.message);
            crudError(`Impossible de supprimer le fournisseur : ${error.message}`);
          } else {
            crudSuccess(`Fournisseur "${fournisseurSupprime?.nom || ''}" supprimé avec succès`);
          }
        }).catch((err) => {
          logger.error('Erreur deleteFournisseur:', err.message);
          crudError(`Impossible de supprimer le fournisseur : ${err.message}`);
        });
      },

      getFournisseurById: (id) => {
        const { fournisseurs } = get();
        return fournisseurs.find((f) => f.id === id);
      },

      getFournisseursActifs: () => {
        const { fournisseurs } = get();
        return fournisseurs.filter((f) => f.isActif === true);
      },

      addAchat: async (achat) => {
        return useAchatsStore.getState().addAchat(achat);
      },

      updateAchat: async (id, modifications) => {
        return useAchatsStore.getState().updateAchat(id, modifications);
      },

      deleteAchat: async (id) => {
        return useAchatsStore.getState().deleteAchat(id);
      },

      getAchatById: (id) => useAchatsStore.getState().getAchatById(id),

      getAchatsByFournisseur: (fournisseurId) =>
        useAchatsStore.getState().getAchatsByFournisseur(fournisseurId),

      getAchatsByStatut: (statut) =>
        useAchatsStore.getState().getAchatsByStatut(statut),

      getTotalAchats: () => useAchatsStore.getState().getTotalAchats(),

      getTotalImpayeFournisseur: (fournisseurId) => {
        const achats = useAchatsStore.getState().getAchatsByFournisseur(fournisseurId);
        return achats
          .filter((a) => a.statut === 'EN_ATTENTE' || a.statut === 'PARTIEL')
          .reduce((total, a) => total + (a.montantTTC - (a.montantPaye || 0)), 0);
      },


      setFournisseurs: (fournisseurs) => {
        get().updateFournisseursWithCompteur(fournisseurs);
      },

      updateFournisseursWithCompteur: (fournisseurs) => {
        set({ fournisseurs, compteurId: Math.max(...fournisseurs.map(f => f.id), 0) + 1 });
      },

      // Fonctions pour Realtime (pas d'appel Supabase pour éviter boucle)
      addFournisseurFromRealtime: (fournisseur) => {
        const { fournisseurs } = get();
        const existing = fournisseurs.find(f => f.id === fournisseur.id);
        if (!existing) {
          set({ fournisseurs: [...fournisseurs, fournisseur] });
        }
      },

      updateFournisseurFromRealtime: (fournisseur) => {
        set((state) => ({
          fournisseurs: state.fournisseurs.map((f) => f.id === fournisseur.id ? { ...f, ...fournisseur } : f)
        }));
      },

      deleteFournisseurFromRealtime: (id) => {
        set((state) => ({ fournisseurs: state.fournisseurs.filter((f) => f.id !== id) }));
      }
    }),
    {
      name: 'sika_fournisseurs',
      partialize: () => ({})
    }
  )
);
