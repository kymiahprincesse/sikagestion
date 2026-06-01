import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const CLIENTS_INITIAUX = [
  {
    id: 1,
    nom: 'GMCI',
    raisonSociale: 'Générale Marocaine de Construction Industrielle',
    ncc: 'NCC-001',
    secteur: 'Construction',
    adresse: 'Zone Industrielle de Yopougon',
    ville: 'Abidjan',
    pays: 'Côte d\'Ivoire',
    contactNom: 'M. Hassan BENALI',
    contactTelephone: '+225 27 21 25 36 48',
    contactEmail: 'contact@gmci.ci',
    conditionsPaiement: 30,
    type: 'CLIENT',
    isActif: true,
    notes: '',
    dateCreation: '2024-01-15'
  },
  {
    id: 2,
    nom: 'AMCC',
    raisonSociale: 'African Metal Construction Company',
    ncc: 'NCC-002',
    secteur: 'Métallurgie',
    adresse: 'Boulevard VGE, Marcory',
    ville: 'Abidjan',
    pays: 'Côte d\'Ivoire',
    contactNom: 'Mme. Fatou DIALLO',
    contactTelephone: '+225 27 21 35 47 89',
    contactEmail: 'f.diallo@amcc.ci',
    conditionsPaiement: 45,
    type: 'CLIENT',
    isActif: true,
    notes: '',
    dateCreation: '2024-02-20'
  },
  {
    id: 3,
    nom: 'LDC',
    raisonSociale: 'Les Distributeurs de Côte d\'Ivoire',
    ncc: 'NCC-003',
    secteur: 'Distribution',
    adresse: 'Rue du Commerce, Plateau',
    ville: 'Abidjan',
    pays: 'Côte d\'Ivoire',
    contactNom: 'M. Kouassi KOFFI',
    contactTelephone: '+225 27 21 45 78 96',
    contactEmail: 'k.koffi@ldc.ci',
    conditionsPaiement: 30,
    type: 'CLIENT',
    isActif: true,
    notes: '',
    dateCreation: '2024-03-10'
  }
];

export const useClientsStore = create(
  persist(
    (set, get) => ({
      clients: CLIENTS_INITIAUX,
      compteurId: 4,

      addClient: (client) => {
        const { compteurId } = get();
        const nouveauClient = {
          ...client,
          id: compteurId,
          dateCreation: new Date().toISOString().split('T')[0],
          isActif: client.isActif !== undefined ? client.isActif : true
        };

        set((state) => ({
          clients: [...state.clients, nouveauClient],
          compteurId: compteurId + 1
        }));

        return nouveauClient;
      },

      updateClient: (id, modifications) => {
        set((state) => ({
          clients: state.clients.map((client) =>
            client.id === id ? { ...client, ...modifications } : client
          )
        }));
      },

      deleteClient: (id) => {
        set((state) => ({
          clients: state.clients.filter((client) => client.id !== id)
        }));
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
        set({ clients, compteurId: Math.max(...clients.map(c => c.id), 0) + 1 });
      }
    }),
    {
      name: 'sika_clients'
    }
  )
);
