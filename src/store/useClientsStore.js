import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../utils/logger';
import { checkSupabaseResponse } from '../utils/supabaseErrors';

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
        const { compteurId, clients } = get();
        const nouveauClient = {
          ...client,
          id: compteurId,
          dateCreation: new Date().toISOString().split('T')[0],
          isActif: client.isActif !== undefined ? client.isActif : true
        };

        try {
          const response = await supabase.from('clients').insert(toSupabaseRow(nouveauClient)).select().single();
          const result = checkSupabaseResponse(response, 'addClient');
          if (!result.success) {
            return { success: false, message: result.message || 'Erreur lors de l\'enregistrement du client' };
          }

          const createdClient = {
            ...nouveauClient,
            id: result.data.id,
            dateCreation: result.data.date_creation || nouveauClient.dateCreation,
          };

          set({
            clients: [...clients, createdClient],
            compteurId: compteurId + 1,
          });

          return { success: true, client: createdClient };
        } catch (err) {
          console.error('Supabase addClient exception:', err.message || err);
          return { success: false, message: err.message || 'Erreur lors de la création du client' };
        }
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
      },

      updateClientFromRealtime: (client) => {
        set((state) => ({
          clients: state.clients.map((c) => c.id === client.id ? { ...c, ...client } : c)
        }));
      },

      deleteClientFromRealtime: (id) => {
        set((state) => ({ clients: state.clients.filter((c) => c.id !== id) }));
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
