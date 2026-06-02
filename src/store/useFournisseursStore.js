import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { notifyError } from '../utils/notifications';

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

const FOURNISSEURS_INITIAUX = [
  {
    id: 1,
    nom: 'ACIER CÔTE D\'IVOIRE',
    raisonSociale: 'Société Ivoirienne de l\'Acier',
    type: 'MATIERE_PREMIERE',
    secteur: 'Métallurgie',
    adresse: 'Zone Industrielle de Vridi',
    ville: 'Abidjan',
    pays: 'Côte d\'Ivoire',
    contactNom: 'M. TRAORE Moussa',
    contactTelephone: '+225 27 21 45 67 89',
    contactEmail: 'contact@acierci.com',
    conditionsPaiement: 45,
    numeroCompte: 'CI93 CI 01234567890123456789',
    banque: 'SGBCI',
    isActif: true,
    notes: 'Fournisseur principal pour tôles et profilés acier',
    dateCreation: '2024-01-10'
  },
  {
    id: 2,
    nom: 'EQUIPEMENTS INDUSTRIELS SA',
    raisonSociale: 'Equipements Industriels Société Anonyme',
    type: 'MATERIEL',
    secteur: 'Équipements',
    adresse: 'Boulevard Latrille, Cocody',
    ville: 'Abidjan',
    pays: 'Côte d\'Ivoire',
    contactNom: 'Mme. KONE Aminata',
    contactTelephone: '+225 27 22 48 56 78',
    contactEmail: 'a.kone@equipind.ci',
    conditionsPaiement: 30,
    numeroCompte: 'CI93 CI 98765432109876543210',
    banque: 'BICICI',
    isActif: true,
    notes: 'Machines et outils de soudure',
    dateCreation: '2024-02-15'
  },
  {
    id: 3,
    nom: 'TRANSPORT LOGISTIQUE EXPRESS',
    raisonSociale: 'TLE SARL',
    type: 'TRANSPORT',
    secteur: 'Transport',
    adresse: 'Rue du Port, Treichville',
    ville: 'Abidjan',
    pays: 'Côte d\'Ivoire',
    contactNom: 'M. BAMBA Sekou',
    contactTelephone: '+225 07 08 09 10 11',
    contactEmail: 'contact@tle-ci.com',
    conditionsPaiement: 15,
    numeroCompte: '',
    banque: 'ECOBANK',
    isActif: true,
    notes: 'Livraisons urgentes et transport de matériaux lourds',
    dateCreation: '2024-03-20'
  }
];

export const useFournisseursStore = create(
  persist(
    (set, get) => ({
      fournisseurs: FOURNISSEURS_INITIAUX,
      achats: [],

      addFournisseur: async (fournisseur) => {
        const nouveauFournisseur = {
          ...fournisseur,
          id: Date.now(),
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
              console.error('Supabase updateFournisseur:', error.message);
              notifyError('Erreur de mise à jour', `Impossible de modifier le fournisseur: ${error.message}`);
            }
          });
        }
      },

      deleteFournisseur: (id) => {
        set((state) => ({ fournisseurs: state.fournisseurs.filter((f) => f.id !== id) }));
        supabase.from('fournisseurs').delete().eq('id', id).then(({ error }) => {
          if (error) {
            console.error('Supabase deleteFournisseur:', error.message);
            notifyError('Erreur de suppression', `Impossible de supprimer le fournisseur: ${error.message}`);
          }
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
          id: Date.now(),
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
