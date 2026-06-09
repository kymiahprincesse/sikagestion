import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../utils/logger';

function toSupabaseRow(c) {
  return {
    nom: c.nom,
    raison_sociale: c.raisonSociale || null,
    ncc: c.ncc || null,
    secteur: c.secteur || null,
    adresse: c.adresse || null,
    ville: c.ville || null,
    pays: c.pays || 'Côte d\'Ivoire',
    contact_nom: c.contactNom || null,
    contact_telephone: c.contactTelephone || null,
    contact_email: c.contactEmail || null,
    conditions_paiement: c.conditionsPaiement || 30,
    type: c.type || 'CLIENT',
    is_actif: c.isActif !== undefined ? c.isActif : true,
    notes: c.notes || null,
  };
}


export const useClientsStore = create(
  persist(
    (set, get) => ({
      clients: [],
      compteurId: 1,

      addClient: async (client) => {
        const { compteurId } = get();
        const nouveauClient = {
          ...client,
          id: compteurId,
          dateCreation: new Date().toISOString().split('T')[0],
          isActif: client.isActif !== undefined ? client.isActif : true
        };

        set((state) => ({ clients: [...state.clients, nouveauClient], compteurId: compteurId + 1 }));

        const { data, error } = await supabase.from('clients').insert(toSupabaseRow(nouveauClient)).select().single();
        if (error) {
          console.error('Supabase addClient:', error.message);
        } else if (data) {
          set((state) => ({
            clients: state.clients.map((c) => c.id === nouveauClient.id ? { ...c, id: data.id } : c)
          }));
          return { ...nouveauClient, id: data.id };
        }

        return nouveauClient;
      },

      updateClient: (id, modifications) => {
        set((state) => ({
          clients: state.clients.map((client) => client.id === id ? { ...client, ...modifications } : client)
        }));

        const clientMaj = get().clients.find((c) => c.id === id);
        if (clientMaj) {
          supabase.from('clients').update(toSupabaseRow({ ...clientMaj, ...modifications })).eq('id', id).then(({ error }) => {
            if (error) logger.error('Supabase updateClient:', error.message);
          }).catch((err) => {
            logger.error('Erreur updateClient:', err.message);
          });
        }
      },

      deleteClient: (id) => {
        set((state) => ({ clients: state.clients.filter((client) => client.id !== id) }));
        supabase.from('clients').delete().eq('id', id).then(({ error }) => {
          if (error) logger.error('Supabase deleteClient:', error.message);
        }).catch((err) => {
          logger.error('Erreur deleteClient:', err.message);
        });
      },

      getClientByNom: (nom) => {
        const { clients } = get();
        return clients.find(
          (client) => client.nom.toLowerCase() === nom.toLowerCase()
        );
      },

      getClientById: (id) => {
        const { clients } = get();
        return clients.find((client) => client.id === id);
      },

      getClientsActifs: () => {
        const { clients } = get();
        return clients.filter((client) => client.isActif === true);
      },

      desactiverClient: (id) => {
        get().updateClient(id, { isActif: false });
      },

      activerClient: (id) => {
        get().updateClient(id, { isActif: true });
      },

      setClients: (clients) => {
        get().updateClientsWithCompteur(clients);
      },

      updateClientsWithCompteur: (clients) => {
        const maxId = clients.length > 0 ? Math.max(...clients.map(c => c.id)) : 0;
        set({ clients, compteurId: maxId + 1 });
      },

      // Fonctions pour Realtime (ne pas appeler Supabase pour éviter boucle)
      addClientFromRealtime: (client) => {
        const { clients, compteurId } = get();
        const existing = clients.find(c => c.id === client.id);
        if (!existing) {
          set({
            clients: [...clients, client],
            compteurId: Math.max(compteurId, client.id + 1)
          });
        }
      }
    }),
    {
      name: 'sika_clients',
      version: 2,
      partialize: (state) => ({ compteurId: state.compteurId }),
      migrate: () => ({ compteurId: 1 })
    }
  )
);
