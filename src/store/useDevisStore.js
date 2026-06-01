import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useDevisStore = create(
  persist(
    (set, get) => ({
      devis: [],
      compteurGlobal: 930,

      getNextNumero: () => {
        const { compteurGlobal } = get();
        const annee = new Date().getFullYear();
        const numero = `N°${compteurGlobal}/SIKA/${annee}`;
        
        set({ compteurGlobal: compteurGlobal + 1 });
        
        return numero;
      },

      addDevis: (devis) => {
        const nouveauDevis = {
          ...devis,
          id: Date.now(),
          numero: devis.numero || get().getNextNumero(),
          dateCreation: devis.dateCreation || new Date().toISOString().split('T')[0],
          statut: devis.statut || 'BROUILLON'
        };

        set((state) => ({
          devis: [...state.devis, nouveauDevis]
        }));

        return nouveauDevis;
      },

      updateDevis: (id, modifications) => {
        set((state) => ({
          devis: state.devis.map((d) =>
            d.id === id ? { ...d, ...modifications } : d
          )
        }));
      },

      deleteDevis: (id) => {
        set((state) => ({
          devis: state.devis.filter((d) => d.id !== id)
        }));
      },

      getDevisById: (id) => {
        const { devis } = get();
        return devis.find((d) => d.id === id);
      },

      getDevisByNumero: (numero) => {
        const { devis } = get();
        return devis.find((d) => d.numero === numero);
      },

      getDevisByClient: (clientId) => {
        const { devis } = get();
        return devis.filter((d) => d.clientId === clientId);
      },

      getDevisByStatut: (statut) => {
        const { devis } = get();
        return devis.filter((d) => d.statut === statut);
      },

      validerDevis: (id) => {
        get().updateDevis(id, { 
          statut: 'VALIDE',
          dateValidation: new Date().toISOString().split('T')[0]
        });
      },

      annulerDevis: (id) => {
        get().updateDevis(id, { 
          statut: 'ANNULE',
          dateAnnulation: new Date().toISOString().split('T')[0]
        });
      },

      transformerEnFacture: (id) => {
        const devis = get().getDevisById(id);
        get().updateDevis(id, { 
          statut: 'FACTURE',
          dateTransformation: new Date().toISOString().split('T')[0]
        });
        
        if (typeof window !== 'undefined' && devis) {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().notifierDevisConverti(devis.numero);
          });
        }
      },

      setDevis: (devis) => {
        set({ devis });
      }
    }),
    {
      name: 'sika_devis'
    }
  )
);

// Persist séparé pour le compteur
export const useCompteurDevisStore = create(
  persist(
    (set, get) => ({
      compteur: 930,
      incrementer: () => set((state) => ({ compteur: state.compteur + 1 })),
      getCompteur: () => get().compteur
    }),
    {
      name: 'sika_compteur_devis'
    }
  )
);
