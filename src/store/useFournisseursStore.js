import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { notifyError } from '../utils/notifications';
import { logger } from '../utils/logger';
import { generateSecureId } from '../utils/format';

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
      achats: [],

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
          notifyError('Erreur de sauvegarde', `Impossible de créer le fournisseur: ${error.message}`);
        } else if (data) {
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
              notifyError('Erreur de mise à jour', `Impossible de modifier le fournisseur: ${error.message}`);
            }
          }).catch((err) => {
            logger.error('Erreur updateFournisseur:', err.message);
          });
        }
      },

      deleteFournisseur: (id) => {
        set((state) => ({ fournisseurs: state.fournisseurs.filter((f) => f.id !== id) }));
        supabase.from('fournisseurs').delete().eq('id', id).then(({ error }) => {
          if (error) {
            logger.error('Supabase deleteFournisseur:', error.message);
            notifyError('Erreur de suppression', `Impossible de supprimer le fournisseur: ${error.message}`);
          }
        }).catch((err) => {
          logger.error('Erreur deleteFournisseur:', err.message);
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

      addAchat: (achat) => {
        const nouvelAchat = {
          ...achat,
          id: generateSecureId('FRN'),
          dateAchat: achat.dateAchat || new Date().toISOString().split('T')[0],
          statut: achat.statut || 'EN_ATTENTE'
        };

        set((state) => ({
          achats: [...state.achats, nouvelAchat]
        }));

        return nouvelAchat;
      },

      updateAchat: (id, modifications) => {
        set((state) => ({
          achats: state.achats.map((a) =>
            a.id === id ? { ...a, ...modifications } : a
          )
        }));
      },

      deleteAchat: (id) => {
        set((state) => ({
          achats: state.achats.filter((a) => a.id !== id)
        }));
      },

      getAchatById: (id) => {
        const { achats } = get();
        return achats.find((a) => a.id === id);
      },

      getAchatsByFournisseur: (fournisseurId) => {
        const { achats } = get();
        return achats.filter((a) => a.fournisseurId === fournisseurId);
      },

      getAchatsByStatut: (statut) => {
        const { achats } = get();
        return achats.filter((a) => a.statut === statut);
      },

      getTotalAchats: () => {
        const { achats } = get();
        return achats.reduce((total, a) => total + (a.montantTTC || 0), 0);
      },

      getTotalImpayeFournisseur: (fournisseurId) => {
        const achats = get().getAchatsByFournisseur(fournisseurId);
        return achats
          .filter((a) => a.statut === 'EN_ATTENTE' || a.statut === 'PARTIEL')
          .reduce((total, a) => total + (a.montantTTC - (a.montantPaye || 0)), 0);
      }
,

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
      }
    }),
    {
      name: 'sika_fournisseurs'
    }
  )
);
