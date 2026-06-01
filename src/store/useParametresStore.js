import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useParametresStore = create(
  persist(
    (set, get) => ({
      // Paramètres fiscaux
      tvaRate: 0.18,

      // Paramètres de frais
      indemniteRepas: 5000, // FCFA par technicien par jour
      prixCarburant: 700, // FCFA par litre
      consommationMoyenne: 8, // litres pour 100 km

      // Paramètres RH
      tauxHoraireTechnicien: 15000, // FCFA par heure

      // Paramètres financiers
      soldeInitialEncaissements: 200600, // FCFA

      // Paramètres entreprise
      nomEntreprise: 'SIKA INDUSTRIE',
      adresseEntreprise: 'Port-Bouët Anani, Rond-Point Carrefour',
      telephoneEntreprise: '07 97 25 25 26',
      emailEntreprise: 'infosikaindustrie@gmail.com',
      telephone2: '01 02 31 29 81',
      siteWeb: 'www.sika-industrie.com',
      capital: '1.000.000 FCFA',
      cc: '',
      rcm: '',
      rccm: '',

      // Paramètres financiers étendus
      devise: 'FCFA',
      tauxRemiseDefaut: 10,
      delaiPaiementDefaut: 30,
      plafondAlerteCredit: 5000000,

      // Sécurité
      timeoutSession: 30,
      maxTentativesConnexion: 3,
      filigraneActif: true,
      auditActif: true,

      // Notifications
      notifBudgetDepasse: true,
      notifFacturesImpayees: true,
      notifDevisGagnes: true,
      notifNouveauxAO: true,
      notifEncaissements: true,
      notifTachesRetard: true,

      // Méthodes de mise à jour
      setTvaRate: (rate) => {
        if (rate >= 0 && rate <= 1) {
          set({ tvaRate: rate });
        }
      },

      setIndemniteRepas: (montant) => {
        if (montant >= 0) {
          set({ indemniteRepas: montant });
        }
      },

      setPrixCarburant: (prix) => {
        if (prix >= 0) {
          set({ prixCarburant: prix });
        }
      },

      setConsommationMoyenne: (consommation) => {
        if (consommation > 0) {
          set({ consommationMoyenne: consommation });
        }
      },

      setTauxHoraireTechnicien: (taux) => {
        if (taux >= 0) {
          set({ tauxHoraireTechnicien: taux });
        }
      },

      setSoldeInitialEncaissements: (solde) => {
        set({ soldeInitialEncaissements: solde });
      },

      setDevise: (v) => set({ devise: v }),
      setTauxRemiseDefaut: (v) => set({ tauxRemiseDefaut: v }),
      setDelaiPaiementDefaut: (v) => set({ delaiPaiementDefaut: v }),
      setPlafondAlerteCredit: (v) => set({ plafondAlerteCredit: v }),
      setTimeoutSession: (v) => set({ timeoutSession: v }),
      setMaxTentativesConnexion: (v) => set({ maxTentativesConnexion: v }),
      setFiligraneActif: (v) => set({ filigraneActif: v }),
      setNotifications: (notifs) => set(notifs),

      updateInfosEntreprise: (infos) => {
        set({
          nomEntreprise: infos.nomEntreprise || get().nomEntreprise,
          adresseEntreprise: infos.adresseEntreprise || get().adresseEntreprise,
          telephoneEntreprise: infos.telephoneEntreprise || get().telephoneEntreprise,
          emailEntreprise: infos.emailEntreprise || get().emailEntreprise,
          telephone2: infos.telephone2 !== undefined ? infos.telephone2 : get().telephone2,
          siteWeb: infos.siteWeb !== undefined ? infos.siteWeb : get().siteWeb,
          capital: infos.capital !== undefined ? infos.capital : get().capital,
          cc: infos.cc !== undefined ? infos.cc : get().cc,
          rcm: infos.rcm !== undefined ? infos.rcm : get().rcm,
          rccm: infos.rccm !== undefined ? infos.rccm : get().rccm,
        });
      },

      // Méthodes de calcul
      calculerTVA: (montantHT) => {
        const { tvaRate } = get();
        return montantHT * tvaRate;
      },

      calculerTTC: (montantHT) => {
        const { tvaRate } = get();
        return montantHT * (1 + tvaRate);
      },

      calculerBudgetCarburant: (distanceKm) => {
        const { prixCarburant, consommationMoyenne } = get();
        const litresNecessaires = (distanceKm / 100) * consommationMoyenne;
        return litresNecessaires * prixCarburant;
      },

      calculerBudgetRepas: (nbTechniciens, nbJours) => {
        const { indemniteRepas } = get();
        return nbTechniciens * nbJours * indemniteRepas;
      },

      calculerCoutMainOeuvre: (nbHeures) => {
        const { tauxHoraireTechnicien } = get();
        return nbHeures * tauxHoraireTechnicien;
      },

      // Export des paramètres
      exportParametres: () => {
        return {
          tvaRate: get().tvaRate,
          indemniteRepas: get().indemniteRepas,
          prixCarburant: get().prixCarburant,
          consommationMoyenne: get().consommationMoyenne,
          tauxHoraireTechnicien: get().tauxHoraireTechnicien,
          soldeInitialEncaissements: get().soldeInitialEncaissements,
          nomEntreprise: get().nomEntreprise,
          adresseEntreprise: get().adresseEntreprise,
          telephoneEntreprise: get().telephoneEntreprise,
          emailEntreprise: get().emailEntreprise
        };
      },

      // Import des paramètres
      importParametres: (parametres) => {
        set({
          tvaRate: parametres.tvaRate || get().tvaRate,
          indemniteRepas: parametres.indemniteRepas || get().indemniteRepas,
          prixCarburant: parametres.prixCarburant || get().prixCarburant,
          consommationMoyenne: parametres.consommationMoyenne || get().consommationMoyenne,
          tauxHoraireTechnicien: parametres.tauxHoraireTechnicien || get().tauxHoraireTechnicien,
          soldeInitialEncaissements: parametres.soldeInitialEncaissements || get().soldeInitialEncaissements,
          nomEntreprise: parametres.nomEntreprise || get().nomEntreprise,
          adresseEntreprise: parametres.adresseEntreprise || get().adresseEntreprise,
          telephoneEntreprise: parametres.telephoneEntreprise || get().telephoneEntreprise,
          emailEntreprise: parametres.emailEntreprise || get().emailEntreprise
        });
      },

      // Réinitialisation aux valeurs par défaut
      resetParametres: () => {
        set({
          tvaRate: 0.18,
          indemniteRepas: 5000,
          prixCarburant: 700,
          consommationMoyenne: 8,
          tauxHoraireTechnicien: 15000,
          soldeInitialEncaissements: 200600,
          nomEntreprise: 'SIKA INDUSTRIE',
          adresseEntreprise: 'Port-Bouët Anani, Rond-Point Carrefour',
          telephoneEntreprise: '07 97 25 25 26',
          emailEntreprise: 'infosikaindustrie@gmail.com',
          telephone2: '01 02 31 29 81',
          siteWeb: 'www.sika-industrie.com',
          capital: '1.000.000 FCFA',
          cc: '', rcm: '', rccm: '',
          devise: 'FCFA',
          tauxRemiseDefaut: 10,
          delaiPaiementDefaut: 30,
          plafondAlerteCredit: 5000000,
          timeoutSession: 30,
          maxTentativesConnexion: 3,
          filigraneActif: true,
          auditActif: true,
          notifBudgetDepasse: true,
          notifFacturesImpayees: true,
          notifDevisGagnes: true,
          notifNouveauxAO: true,
          notifEncaissements: true,
          notifTachesRetard: true,
        });
      }
    }),
    {
      name: 'sika_parametres'
    }
  )
);
