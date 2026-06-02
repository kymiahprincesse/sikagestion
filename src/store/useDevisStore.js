import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { formatFCFA, getTodayISO } from '../utils/format';

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
    date_devis: devis.dateDevis || getTodayISO(),
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

        // Vérifier les doublons par numéro
        const existant = get().devis.find((d) => d.numero === numero);
        if (existant && !devis.id) {
          console.warn('Devis avec ce numéro existe déjà:', numero);
          // Générer un nouveau numéro si doublon détecté
          const nouveauNumero = get().getNextNumero();
          devis.numero = nouveauNumero;
        }

        // Vérifier les doublons par contenu (même client, même montant, même date)
        const doublonContenu = get().devis.find((d) =>
          d.clientId === devis.clientId &&
          d.montantTTC === devis.montantTTC &&
          d.type === devis.type &&
          d.date === devis.date &&
          Math.abs(new Date(d.dateCreation || d.date).getTime() - Date.now()) < 60000 // créé dans la dernière minute
        );

        if (doublonContenu && !devis.id) {
          console.warn('Doublon de contenu détecté, devis ignoré');
          if (typeof window !== 'undefined') {
            import('./useNotificationsStore').then(({ useNotificationsStore }) => {
              useNotificationsStore.getState().ajouterNotification({
                type: 'ATTENTION',
                icone: '⚠️',
                titre: 'DOUBLON DÉTECTÉ',
                message: 'Un devis similaire vient d\'être créé. Veuillez patienter quelques secondes.',
                lien: '/devis/liste'
              });
            });
          }
          return doublonContenu;
        }

        const nouveauDevis = {
          ...devis,
          id: devis.id || Date.now(),
          numero: devis.numero || numero,
          dateCreation: devis.dateCreation || getTodayISO(),
          statut: devis.statut || 'BROUILLON'
        };

        set((state) => ({ devis: [...state.devis, nouveauDevis] }));

        // Notifier le tableau de bord de la mise à jour
        if (typeof window !== 'undefined') {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().ajouterNotification({
              id: `devis-ajoute-${nouveauDevis.id}`,
              type: 'INFO',
              icone: '📋',
              titre: 'NOUVEAU DEVIS',
              message: `Devis ${nouveauDevis.numero} créé - ${nouveauDevis.montantTTC ? formatFCFA(nouveauDevis.montantTTC) : '0 FCFA'}`,
              lien: '/devis/liste',
              donnees: { devisId: nouveauDevis.id }
            });
          });
        }

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

      updateDevis: async (id, modifications) => {
        set((state) => ({
          devis: state.devis.map((d) => d.id === id ? { ...d, ...modifications } : d)
        }));

        // Notifier le tableau de bord de la mise à jour
        const devisMaj = get().devis.find((d) => d.id === id);
        if (devisMaj && typeof window !== 'undefined') {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().ajouterNotification({
              id: `devis-modifie-${id}-${Date.now()}`,
              type: 'INFO',
              icone: '✏️',
              titre: 'DEVIS MODIFIÉ',
              message: `Devis ${devisMaj.numero} mis à jour - ${devisMaj.montantTTC ? formatFCFA(devisMaj.montantTTC) : '0 FCFA'}`,
              lien: '/devis/liste',
              donnees: { devisId: id }
            });
          });
        }

        const { error } = await supabase.from('devis').update(toSupabaseRow({ ...devisMaj, ...modifications })).eq('id', id);
        if (error) {
          console.error('Supabase updateDevis:', error.message);
        }
      },

      deleteDevis: (id) => {
        const devisSupprime = get().devis.find((d) => d.id === id);

        set((state) => ({ devis: state.devis.filter((d) => d.id !== id) }));

        // Notification de suppression
        if (devisSupprime && typeof window !== 'undefined') {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().ajouterNotification({
              type: 'INFO',
              icone: '🗑️',
              titre: 'DEVIS SUPPRIMÉ',
              message: `Le devis ${devisSupprime.numero} a été supprimé`,
              lien: '/devis/liste'
            });
          });
        }

        supabase.from('devis').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase deleteDevis:', error.message);
        });
      },

      getDevisById: (id) => get().devis.find((d) => d.id === id),
      getDevisByNumero: (numero) => get().devis.find((d) => d.numero === numero),
      getDevisByClient: (clientId) => get().devis.filter((d) => d.clientId === clientId),
      getDevisByStatut: (statut) => get().devis.filter((d) => d.statut === statut),

      validerDevis: (id) => {
        get().updateDevis(id, { statut: 'VALIDE', dateValidation: getTodayISO() });
      },

      annulerDevis: (id) => {
        get().updateDevis(id, { statut: 'ANNULE', dateAnnulation: getTodayISO() });
      },

      transformerEnFacture: (id) => {
        const devis = get().getDevisById(id);
        get().updateDevis(id, { statut: 'FACTURE', dateTransformation: getTodayISO() });
        if (typeof window !== 'undefined' && devis) {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().notifierDevisConverti(devis.numero);
          });
        }
      },

      setDevis: (devis) => { set({ devis }); },

      // Fonctions pour Realtime (pas d'appel Supabase pour éviter boucle)
      addDevisFromRealtime: (devis) => {
        const { devis: currentDevis } = get();
        const existing = currentDevis.find(d => d.id === devis.id);
        if (!existing) {
          set({ devis: [...currentDevis, devis] });
        }
      }
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
