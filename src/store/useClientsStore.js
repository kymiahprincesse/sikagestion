import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../utils/logger';
import { checkSupabaseResponse } from '../utils/supabaseErrors';
import { crudSuccess, crudError } from '../utils/crudNotify';
import { idbStorage } from '../lib/idbStorage';

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
            crudError(`Impossible de créer le client : ${result.message || 'erreur Supabase'}`);
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

          crudSuccess(`Client "${createdClient.nom}" créé avec succès`);
          return { success: true, client: createdClient };
        } catch (err) {
          console.error('Supabase addClient exception:', err.message || err);
          crudError(`Impossible de créer le client : ${err.message || 'erreur inconnue'}`);
          return { success: false, message: err.message || 'Erreur lors de la création du client' };
        }
      },

      updateClient: async (id, modifications) => {
        const { clients } = get();
        const clientMaj = clients.find((c) => c.id === id);
        if (!clientMaj) return { success: false, message: 'Client non trouvé' };

        const updatedClientLocal = { ...clientMaj, ...modifications };

        try {
          const { error } = await supabase
            .from('clients')
            .update(toSupabaseRow(updatedClientLocal))
            .eq('id', id);

          if (error) {
            logger.error('Supabase updateClient:', error.message);
            crudError(`Impossible de modifier le client : ${error.message}`);
            return { success: false, message: error.message };
          }

          set((state) => ({
            clients: state.clients.map((client) => client.id === id ? updatedClientLocal : client)
          }));

          crudSuccess(`Client "${updatedClientLocal.nom}" modifié avec succès`);
          return { success: true };
        } catch (err) {
          logger.error('Erreur updateClient:', err.message || err);
          crudError(`Impossible de modifier le client : ${err.message || 'erreur inconnue'}`);
          return { success: false, message: err.message || 'Erreur inconnue' };
        }
      },

      deleteClient: async (id) => {
        const { clients } = get();
        const clientSupprime = clients.find((c) => c.id === id);
        if (!clientSupprime) return { success: false, message: 'Client non trouvé' };

        try {
          const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

          if (error) {
            logger.error('Supabase deleteClient:', error.message);
            crudError(`Impossible de supprimer le client : ${error.message}`);
            return { success: false, message: error.message };
          }

          set((state) => ({
            clients: state.clients.filter((client) => client.id !== id)
          }));

          crudSuccess(`Client "${clientSupprime.nom}" supprimé avec succès`);
          return { success: true };
        } catch (err) {
          logger.error('Erreur deleteClient:', err.message || err);
          crudError(`Impossible de supprimer le client : ${err.message || 'erreur inconnue'}`);
          return { success: false, message: err.message || 'Erreur inconnue' };
        }
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
      storage: createJSONStorage(() => idbStorage),
      version: 2,
      partialize: (state) => ({ compteurId: state.compteurId }),
      migrate: () => ({ compteurId: 1 })
    }
  )
);
