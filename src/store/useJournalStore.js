import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useJournalStore = create(
  persist(
    (set, get) => ({
      ecritures: [],

      addEcriture: (ecriture) => {
        const nouvelleEcriture = {
          ...ecriture,
          id: Date.now(),
          date: ecriture.date || new Date().toISOString().split('T')[0],
          pieceComptable: ecriture.pieceComptable || `PC-${Date.now()}`
        };

        set((state) => ({
          ecritures: [...state.ecritures, nouvelleEcriture]
        }));

        return nouvelleEcriture;
      },

      updateEcriture: (id, modifications) => {
        set((state) => ({
          ecritures: state.ecritures.map((e) =>
            e.id === id ? { ...e, ...modifications } : e
          )
        }));
      },

      deleteEcriture: (id) => {
        set((state) => ({
          ecritures: state.ecritures.filter((e) => e.id !== id)
        }));
      },

      getEcritureById: (id) => {
        const { ecritures } = get();
        return ecritures.find((e) => e.id === id);
      },

      getEcrituresByPeriode: (dateDebut, dateFin) => {
        const { ecritures } = get();
        return ecritures.filter((e) => {
          const date = e.date;
          return date >= dateDebut && date <= dateFin;
        });
      },

      getEcrituresByCompte: (numeroCompte) => {
        const { ecritures } = get();
        return ecritures.filter((e) => 
          e.compteDebit === numeroCompte || e.compteCredit === numeroCompte
        );
      },

      getEcrituresByType: (type) => {
        const { ecritures } = get();
        return ecritures.filter((e) => e.type === type);
      },

      getTotalDebit: () => {
        const { ecritures } = get();
        return ecritures.reduce((total, e) => total + (e.montantDebit || 0), 0);
      },

      getTotalCredit: () => {
        const { ecritures } = get();
        return ecritures.reduce((total, e) => total + (e.montantCredit || 0), 0);
      },

      getSoldeCompte: (numeroCompte) => {
        const ecritures = get().getEcrituresByCompte(numeroCompte);
        const debit = ecritures.reduce((total, e) => 
          e.compteDebit === numeroCompte ? total + (e.montantDebit || 0) : total, 0
        );
        const credit = ecritures.reduce((total, e) => 
          e.compteCredit === numeroCompte ? total + (e.montantCredit || 0) : total, 0
        );
        return debit - credit;
      },

      verifierEquilibre: () => {
        const totalDebit = get().getTotalDebit();
        const totalCredit = get().getTotalCredit();
        return Math.abs(totalDebit - totalCredit) < 0.01; // Tolérance pour erreurs d'arrondi
      }
    }),
    {
      name: 'sika_journal'
    }
  )
);
