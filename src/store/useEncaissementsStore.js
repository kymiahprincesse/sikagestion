import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useEncaissementsStore = create(
  persist(
    (set, get) => ({
      encaissements: [],
      soldeInitial: 200600,

      addEncaissement: (encaissement) => {
        const nouvelEncaissement = {
          ...encaissement,
          id: Date.now(),
          dateEncaissement: encaissement.dateEncaissement || new Date().toISOString().split('T')[0]
        };

        set((state) => ({
          encaissements: [...state.encaissements, nouvelEncaissement]
        }));

        return nouvelEncaissement;
      },

      updateEncaissement: (id, modifications) => {
        set((state) => ({
          encaissements: state.encaissements.map((e) =>
            e.id === id ? { ...e, ...modifications } : e
          )
        }));
      },

      deleteEncaissement: (id) => {
        set((state) => ({
          encaissements: state.encaissements.filter((e) => e.id !== id)
        }));
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
      }
    }),
    {
      name: 'sika_encaissements'
    }
  )
);
