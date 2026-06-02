import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';

function toSupabaseRow(f) {
  return {
    numero: f.numero,
    client_id: f.clientId || null,
    client_nom: f.clientNom || null,
    devis_id: f.devisId || null,
    objet: f.objet || null,
    montant_ht: f.montantHT || 0,
    montant_tva: f.montantTVA || 0,
    montant_ttc: f.montantTTC || 0,
    montant_paye: f.montantPaye || 0,
    date_depot: f.dateDepot || null,
    date_echeance: f.dateEcheance || null,
    date_payement: f.datePayement || null,
    delai_reglement: f.delaiReglement || null,
    statut: f.statut || 'EMISE',
    notes: f.notes || null,
  };
}

export const useFacturesStore = create(
  persist(
    (set, get) => ({
      factures: [],

      addFacture: async (facture) => {
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

        set((state) => ({ factures: [...state.factures, nouvelleFacture] }));

        const { data, error } = await supabase.from('factures').insert(toSupabaseRow(nouvelleFacture)).select().single();
        if (error) {
          console.error('Supabase addFacture:', error.message);
        } else if (data) {
          set((state) => ({
            factures: state.factures.map((f) => f.id === nouvelleFacture.id ? { ...f, id: data.id } : f)
          }));
          return { ...nouvelleFacture, id: data.id };
        }

        return nouvelleFacture;
      },

      updateFacture: (id, modifications) => {
        set((state) => ({
          factures: state.factures.map((f) => {
            if (f.id !== id) return f;
            const updated = { ...f, ...modifications };
            if ((modifications.dateDepot || modifications.delaiReglement) && updated.dateDepot && updated.delaiReglement) {
              const dateDepot = new Date(updated.dateDepot);
              dateDepot.setDate(dateDepot.getDate() + updated.delaiReglement);
              updated.dateEcheance = dateDepot.toISOString().split('T')[0];
            }
            return updated;
          })
        }));

        const factureMaj = get().factures.find((f) => f.id === id);
        if (factureMaj) {
          supabase.from('factures').update(toSupabaseRow({ ...factureMaj, ...modifications })).eq('id', id).then(({ error }) => {
            if (error) console.error('Supabase updateFacture:', error.message);
          });
        }
      },

      deleteFacture: (id) => {
        set((state) => ({ factures: state.factures.filter((f) => f.id !== id) }));
        supabase.from('factures').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteFacture:', error.message);
        });
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
