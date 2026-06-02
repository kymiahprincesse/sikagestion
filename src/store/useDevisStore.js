import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';

function toSupabaseRow(devis) {
  return {
    numero: devis.numero,
    client_id: devis.clientId || null,
    client_nom: devis.clientNom || null,
    type_devis: devis.typeDevis || null,
    objet: devis.objet || null,
    montant_ht: devis.montantHT || 0,
    montant_tva: devis.montantTVA || 0,
    montant_ttc: devis.montantTTC || 0,
    montant_total: devis.montantTotal || devis.montantTTC || 0,
    statut: devis.statut || 'BROUILLON',
    date_devis: devis.dateDevis || new Date().toISOString().split('T')[0],
    date_validation: devis.dateValidation || null,
    date_annulation: devis.dateAnnulation || null,
    date_transformation: devis.dateTransformation || null,
    notes: devis.notes || null,
  };
}

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

      addDevis: async (devis) => {
        const numero = devis.numero || get().getNextNumero();
        const nouveauDevis = {
          ...devis,
          id: Date.now(),
          numero,
          dateCreation: devis.dateCreation || new Date().toISOString().split('T')[0],
          statut: devis.statut || 'BROUILLON'
        };

        set((state) => ({ devis: [...state.devis, nouveauDevis] }));

        const { data, error } = await supabase.from('devis').insert(toSupabaseRow(nouveauDevis)).select().single();
        if (error) {
          console.error('Supabase addDevis:', error.message);
        } else if (data) {
          set((state) => ({
            devis: state.devis.map((d) => d.id === nouveauDevis.id ? { ...d, id: data.id } : d)
          }));
          return { ...nouveauDevis, id: data.id };
        }

        return nouveauDevis;
      },

      updateDevis: (id, modifications) => {
        set((state) => ({
          devis: state.devis.map((d) => d.id === id ? { ...d, ...modifications } : d)
        }));

        const devisMaj = get().devis.find((d) => d.id === id);
        if (devisMaj) {
          supabase.from('devis').update(toSupabaseRow({ ...devisMaj, ...modifications })).eq('id', id).then(({ error }) => {
            if (error) console.error('Supabase updateDevis:', error.message);
          });
        }
      },

      deleteDevis: (id) => {
        set((state) => ({ devis: state.devis.filter((d) => d.id !== id) }));
        supabase.from('devis').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteDevis:', error.message);
        });
      },

      getDevisById: (id) => get().devis.find((d) => d.id === id),
      getDevisByNumero: (numero) => get().devis.find((d) => d.numero === numero),
      getDevisByClient: (clientId) => get().devis.filter((d) => d.clientId === clientId),
      getDevisByStatut: (statut) => get().devis.filter((d) => d.statut === statut),

      validerDevis: (id) => {
        get().updateDevis(id, { statut: 'VALIDE', dateValidation: new Date().toISOString().split('T')[0] });
      },

      annulerDevis: (id) => {
        get().updateDevis(id, { statut: 'ANNULE', dateAnnulation: new Date().toISOString().split('T')[0] });
      },

      transformerEnFacture: (id) => {
        const devis = get().getDevisById(id);
        get().updateDevis(id, { statut: 'FACTURE', dateTransformation: new Date().toISOString().split('T')[0] });
        if (typeof window !== 'undefined' && devis) {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().notifierDevisConverti(devis.numero);
          });
        }
      },

      setDevis: (devis) => { set({ devis }); }
    }),
    { name: 'sika_devis' }
  )
);

export const useCompteurDevisStore = create(
  persist(
    (set, get) => ({
      compteur: 930,
      incrementer: () => set((state) => ({ compteur: state.compteur + 1 })),
      getCompteur: () => get().compteur
    }),
    { name: 'sika_compteur_devis' }
  )
);
