import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const STATUTS_AO = {
  A_CHIFFRER: 'A_CHIFFRER',
  DECLINE: 'DECLINE',
  EN_ATTENTE: 'EN_ATTENTE',
  SOUMIS: 'SOUMIS',
  GAGNE: 'GAGNE',
  PERDU: 'PERDU'
};

export const useAOStore = create(
  persist(
    (set, get) => ({
      appelsDoffres: [],
      compteurNumero: 1,

      addAO: (ao) => {
        const { compteurNumero } = get();
        const nouvelAO = {
          ...ao,
          id: Date.now(),
          numeroDevis: ao.numeroDevis || `AO-${String(compteurNumero).padStart(5, '0')}`,
          dateDevis: ao.dateDevis || new Date().toISOString().split('T')[0],
          statut: ao.statut || STATUTS_AO.A_CHIFFRER,
          dateCreation: new Date().toISOString().split('T')[0]
        };

        set((state) => ({
          appelsDoffres: [...state.appelsDoffres, nouvelAO],
          compteurNumero: compteurNumero + 1
        }));

        return nouvelAO;
      },

      updateAO: (id, modifications) => {
        set((state) => ({
          appelsDoffres: state.appelsDoffres.map((ao) =>
            ao.id === id ? { ...ao, ...modifications } : ao
          )
        }));
      },

      deleteAO: (id) => {
        set((state) => ({
          appelsDoffres: state.appelsDoffres.filter((ao) => ao.id !== id)
        }));
      },

      getAOById: (id) => {
        const { appelsDoffres } = get();
        return appelsDoffres.find((ao) => ao.id === id);
      },

      getAOByNumero: (numero) => {
        const { appelsDoffres } = get();
        return appelsDoffres.find((ao) => ao.numeroDevis === numero);
      },

      getAOByStatut: (statut) => {
        const { appelsDoffres } = get();
        return appelsDoffres.filter((ao) => ao.statut === statut);
      },

      getAOByClient: (clientNom) => {
        const { appelsDoffres } = get();
        return appelsDoffres.filter((ao) => ao.client === clientNom);
      },

      getAOUrgents: () => {
        const { appelsDoffres } = get();
        const aujourdhui = new Date();
        const dans3Jours = new Date();
        dans3Jours.setDate(aujourdhui.getDate() + 3);

        return appelsDoffres.filter((ao) => {
          if (!ao.dateReponseAO || ao.statut === STATUTS_AO.DECLINE || ao.statut === STATUTS_AO.PERDU) {
            return false;
          }
          const dateReponse = new Date(ao.dateReponseAO);
          return dateReponse <= dans3Jours && dateReponse >= aujourdhui;
        });
      },

      getStatistiques: () => {
        const { appelsDoffres } = get();
        return {
          aChiffrer: appelsDoffres.filter(ao => ao.statut === STATUTS_AO.A_CHIFFRER).length,
          decline: appelsDoffres.filter(ao => ao.statut === STATUTS_AO.DECLINE).length,
          enAttente: appelsDoffres.filter(ao => ao.statut === STATUTS_AO.EN_ATTENTE).length,
          soumis: appelsDoffres.filter(ao => ao.statut === STATUTS_AO.SOUMIS).length,
          gagne: appelsDoffres.filter(ao => ao.statut === STATUTS_AO.GAGNE).length,
          perdu: appelsDoffres.filter(ao => ao.statut === STATUTS_AO.PERDU).length,
          total: appelsDoffres.length
        };
      },

      getTauxReussite: () => {
        const { appelsDoffres } = get();
        const termines = appelsDoffres.filter((ao) => 
          ao.statut === STATUTS_AO.GAGNE || ao.statut === STATUTS_AO.PERDU
        );
        if (termines.length === 0) return 0;
        
        const gagnes = termines.filter((ao) => ao.statut === STATUTS_AO.GAGNE);
        return (gagnes.length / termines.length) * 100;
      },

      setAppelsOffres: (appelsDoffres) => {
        set({ appelsDoffres });
      }
    }),
    {
      name: 'sika_ao'
    }
  )
);
