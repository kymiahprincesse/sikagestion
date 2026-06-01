import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useFacturesStore = create(
  persist(
    (set, get) => ({
      factures: [],

      addFacture: (facture) => {
        // Calcul automatique DATE ECHEANCE = DATE FACT. + DELAI PAIEMENT
        let dateEcheance = null;
        if (facture.dateDepot && facture.delaiReglement) {
          const dateDepot = new Date(facture.dateDepot);
          dateDepot.setDate(dateDepot.getDate() + facture.delaiReglement);
          dateEcheance = dateDepot.toISOString().split('T')[0];
        }

        const nouvelleFacture = {
          ...facture,
          id: Date.now(),
          dateCreation: facture.dateCreation || new Date().toISOString().split('T')[0],
          dateEcheance: dateEcheance,
          statut: facture.statut || 'EMISE'
        };

        set((state) => ({
          factures: [...state.factures, nouvelleFacture]
        }));

        return nouvelleFacture;
      },

      updateFacture: (id, modifications) => {
        set((state) => ({
          factures: state.factures.map((f) => {
            if (f.id !== id) return f;
            
            const updated = { ...f, ...modifications };
            
            // Recalcul automatique DATE ECHEANCE si DATE FACT. ou DELAI changent
            if ((modifications.dateDepot || modifications.delaiReglement) && updated.dateDepot && updated.delaiReglement) {
              const dateDepot = new Date(updated.dateDepot);
              dateDepot.setDate(dateDepot.getDate() + updated.delaiReglement);
              updated.dateEcheance = dateDepot.toISOString().split('T')[0];
            }
            
            return updated;
          })
        }));
      },

      deleteFacture: (id) => {
        set((state) => ({
          factures: state.factures.filter((f) => f.id !== id)
        }));
      },

      getFactureById: (id) => {
        const { factures } = get();
        return factures.find((f) => f.id === id);
      },

      getFactureByNumero: (numero) => {
        const { factures } = get();
        return factures.find((f) => f.numero === numero);
      },

      getFacturesByClient: (clientId) => {
        const { factures } = get();
        return factures.filter((f) => f.clientId === clientId);
      },

      getFacturesByStatut: (statut) => {
        const { factures } = get();
        return factures.filter((f) => f.statut === statut);
      },

      marquerPayee: (id, datePayement) => {
        const facture = get().getFactureById(id);
        get().updateFacture(id, {
          statut: 'PAYEE',
          datePayement: datePayement || new Date().toISOString().split('T')[0]
        });
        
        if (typeof window !== 'undefined' && facture) {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().notifierPaiementRecu(
              facture.numero, 
              facture.montantTTC
            );
          });
        }
      },

      marquerPartielle: (id, montantPaye) => {
        get().updateFacture(id, {
          statut: 'PARTIELLE',
          montantPaye: montantPaye
        });
      },

      annulerFacture: (id) => {
        get().updateFacture(id, {
          statut: 'ANNULEE',
          dateAnnulation: new Date().toISOString().split('T')[0]
        });
      },

      getFacturesImpayees: () => {
        const { factures } = get();
        return factures.filter((f) => f.statut === 'EMISE' || f.statut === 'PARTIELLE');
      },

      getTotalImpaye: () => {
        const impayees = get().getFacturesImpayees();
        return impayees.reduce((total, f) => {
          const reste = f.montantTTC - (f.montantPaye || 0);
          return total + reste;
        }, 0);
      },

      setFactures: (factures) => {
        set({ factures });
      }
    }),
    {
      name: 'sika_factures'
    }
  )
);
