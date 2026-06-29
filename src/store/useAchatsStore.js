import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { crudSuccess, crudError } from '../utils/crudNotify';
import { logger } from '../utils/logger';

function achatToRow(a) {
  return {
    fournisseur_id: a.fournisseurId || a.fournisseur_id || null,
    numero_facture: a.numeroFacture || a.numero_facture || null,
    reference: a.reference || null,
    date_achat: a.dateAchat || a.date_achat || new Date().toISOString().split('T')[0],
    categorie: a.categorie || 'AUTRE',
    type_achat: a.typeAchat || a.type_achat || 'FACTURE',
    montant_ht: parseFloat(a.montantHT || a.montant_ht || 0),
    montant_tva: parseFloat(a.montantTVA || a.montant_tva || 0),
    montant_ttc: parseFloat(a.montantTTC || a.montant_ttc || 0),
    montant_paye: parseFloat(a.montantPaye || a.montant_paye || 0),
    mode_paiement: a.modePaiement || a.mode_paiement || null,
    statut: a.statut || 'EN_ATTENTE',
    projet_id: a.projetId || a.projet_id || null,
    description: a.description || null,
    notes: a.notes || null,
  };
}

function rowToAchat(row) {
  return {
    id: row.id,
    fournisseurId: row.fournisseur_id,
    fournisseurNom: row.fournisseurs?.nom || null,
    numeroFacture: row.numero_facture,
    reference: row.reference,
    dateAchat: row.date_achat,
    categorie: row.categorie,
    typeAchat: row.type_achat,
    montantHT: parseFloat(row.montant_ht || 0),
    montantTVA: parseFloat(row.montant_tva || 0),
    montantTTC: parseFloat(row.montant_ttc || 0),
    montantPaye: parseFloat(row.montant_paye || 0),
    modePaiement: row.mode_paiement,
    statut: row.statut,
    projetId: row.projet_id,
    description: row.description,
    notes: row.notes,
    dateCreation: row.date_creation,
  };
}

export const useAchatsStore = create(
  persist(
    (set, get) => ({
      achats: [],

      setAchats: (achats) => set({ achats }),

      addAchat: async (achat) => {
        const { data, error } = await supabase
          .from('achats')
          .insert(achatToRow(achat))
          .select('*, fournisseurs(nom)')
          .single();

        if (error) {
          logger.error('Supabase addAchat:', error.message);
          crudError(`Impossible de créer l'achat : ${error.message}`);
          return null;
        }

        const nouvelAchat = rowToAchat(data);
        set((state) => ({ achats: [nouvelAchat, ...state.achats] }));
        crudSuccess(`Achat "${nouvelAchat.description || nouvelAchat.reference || ''}" créé`);
        return nouvelAchat;
      },

      updateAchat: async (id, modifications) => {
        set((state) => ({
          achats: state.achats.map((a) => a.id === id ? { ...a, ...modifications } : a),
        }));

        const aMaj = get().achats.find((a) => a.id === id);
        if (!aMaj) return;

        const { error } = await supabase
          .from('achats')
          .update(achatToRow({ ...aMaj, ...modifications }))
          .eq('id', id);

        if (error) {
          logger.error('Supabase updateAchat:', error.message);
          crudError(`Impossible de modifier l'achat : ${error.message}`);
        } else {
          crudSuccess('Achat modifié avec succès');
        }
      },

      deleteAchat: async (id) => {
        const achatSupprime = get().achats.find((a) => a.id === id);
        set((state) => ({ achats: state.achats.filter((a) => a.id !== id) }));

        const { error } = await supabase.from('achats').delete().eq('id', id);
        if (error) {
          logger.error('Supabase deleteAchat:', error.message);
          crudError(`Impossible de supprimer l'achat : ${error.message}`);
        } else {
          crudSuccess(`Achat "${achatSupprime?.description || ''}" supprimé`);
        }
      },

      getAchatById: (id) => get().achats.find((a) => a.id === id),

      getAchatsByFournisseur: (fournisseurId) =>
        get().achats.filter((a) => a.fournisseurId === fournisseurId),

      getAchatsByStatut: (statut) =>
        get().achats.filter((a) => a.statut === statut),

      getTotalAchats: () =>
        get().achats.reduce((total, a) => total + (a.montantTTC || 0), 0),

      // Realtime handlers (sans appel Supabase pour éviter boucle)
      addAchatFromRealtime: (achat) => {
        const { achats } = get();
        if (!achats.find((a) => a.id === achat.id)) {
          set({ achats: [achat, ...achats] });
        }
      },

      updateAchatFromRealtime: (achat) => {
        set((state) => ({
          achats: state.achats.map((a) => a.id === achat.id ? { ...a, ...achat } : a),
        }));
      },

      deleteAchatFromRealtime: (id) => {
        set((state) => ({ achats: state.achats.filter((a) => a.id !== id) }));
      },
    }),
    {
      name: 'sika_achats',
      partialize: () => ({}),
    }
  )
);
