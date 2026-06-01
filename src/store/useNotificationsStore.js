import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  sendBrowserNotification, 
  notifyAlerteBudget, 
  notifyFactureImpayee,
  notifyDevisGagne,
  notifyNouveauAO,
  notifyEncaissementRecu
} from '../utils/notifications';

export const TYPES_NOTIFICATION = {
  URGENT: 'URGENT',
  ATTENTION: 'ATTENTION',
  INFO: 'INFO'
};

export const useNotificationsStore = create(
  persist(
    (set, get) => ({
      notifications: [],
      notificationsLues: [],

      genererNotifications: (factures, devis, ao, projets, fournisseurs) => {
        const nouvelles = [];
        const aujourdhui = new Date();

        factures.forEach((facture) => {
          if (facture.statut === 'EMISE' || facture.statut === 'PARTIELLE') {
            const reste = facture.montantTTC - (facture.montantPaye || 0);
            
            if (reste > 0 && facture.dateEcheance) {
              const dateEcheance = new Date(facture.dateEcheance);
              const joursRestants = Math.ceil((dateEcheance - aujourdhui) / (1000 * 60 * 60 * 24));

              if (joursRestants < 0) {
                nouvelles.push({
                  id: `facture-retard-${facture.id}`,
                  type: TYPES_NOTIFICATION.URGENT,
                  icone: '🔴',
                  titre: 'URGENT',
                  message: `Facture ${facture.numero} en retard > ${reste.toLocaleString()} FCFA`,
                  date: new Date().toISOString(),
                  lien: '/factures',
                  donnees: { factureId: facture.id }
                });
              } else if (joursRestants <= 7) {
                nouvelles.push({
                  id: `facture-echeance-${facture.id}`,
                  type: TYPES_NOTIFICATION.ATTENTION,
                  icone: '🟠',
                  titre: 'ATTENTION',
                  message: `Facture ${facture.numero} à échéance dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`,
                  date: new Date().toISOString(),
                  lien: '/factures',
                  donnees: { factureId: facture.id }
                });
              }
            }
          }
        });

        ao.forEach((appelOffre) => {
          if (appelOffre.dateReponseAO && 
              appelOffre.statut !== 'DECLINE' && 
              appelOffre.statut !== 'PERDU') {
            const dateReponse = new Date(appelOffre.dateReponseAO);
            const joursRestants = Math.ceil((dateReponse - aujourdhui) / (1000 * 60 * 60 * 24));

            if (joursRestants >= 0 && joursRestants <= 3) {
              nouvelles.push({
                id: `ao-urgent-${appelOffre.id}`,
                type: TYPES_NOTIFICATION.URGENT,
                icone: '🔴',
                titre: 'URGENT',
                message: `AO ${appelOffre.numeroDevis} réponse dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`,
                date: new Date().toISOString(),
                lien: '/appels-offres',
                donnees: { aoId: appelOffre.id }
              });
            }
          }
        });

        projets.forEach((projet) => {
          const budgetPrevu = projet.budgetPrevu || 0;
          const budgetReel = projet.budgetReel || 0;
          
          if (budgetPrevu > 0) {
            const pourcentage = (budgetReel / budgetPrevu) * 100;
            
            if (pourcentage >= 80) {
              nouvelles.push({
                id: `projet-budget-${projet.id}`,
                type: TYPES_NOTIFICATION.URGENT,
                icone: '🔴',
                titre: 'URGENT',
                message: `Projet ${projet.nom} dépasse ${Math.round(pourcentage)}% budget`,
                date: new Date().toISOString(),
                lien: '/planification',
                donnees: { projetId: projet.id }
              });
            }
          }
        });

        devis.forEach((dev) => {
          if (dev.statut === 'VALIDE' && dev.dateValidation) {
            const dateValidation = new Date(dev.dateValidation);
            const joursDepuis = Math.ceil((aujourdhui - dateValidation) / (1000 * 60 * 60 * 24));

            if (joursDepuis >= 30) {
              nouvelles.push({
                id: `devis-stagnant-${dev.id}`,
                type: TYPES_NOTIFICATION.ATTENTION,
                icone: '🟠',
                titre: 'ATTENTION',
                message: `Devis ${dev.numero} sans transformation depuis ${joursDepuis} jours`,
                date: new Date().toISOString(),
                lien: '/devis',
                donnees: { devisId: dev.id }
              });
            }
          }
        });

        fournisseurs.forEach((fournisseur) => {
          const achatsEnAttente = fournisseur.achats?.filter(
            a => a.statut === 'EN_ATTENTE' && a.dateEcheance
          ) || [];

          achatsEnAttente.forEach((achat) => {
            const dateEcheance = new Date(achat.dateEcheance);
            const joursRestants = Math.ceil((dateEcheance - aujourdhui) / (1000 * 60 * 60 * 24));

            if (joursRestants >= 0 && joursRestants <= 7) {
              nouvelles.push({
                id: `fournisseur-paiement-${achat.id}`,
                type: TYPES_NOTIFICATION.ATTENTION,
                icone: '🟠',
                titre: 'ATTENTION',
                message: `Fournisseur ${fournisseur.nom} à payer cette semaine`,
                date: new Date().toISOString(),
                lien: '/fournisseurs',
                donnees: { fournisseurId: fournisseur.id, achatId: achat.id }
              });
            }
          });
        });

        const anciennes = get().notifications;
        const notificationsIdentiques = 
          anciennes.length === nouvelles.length &&
          anciennes.every((a, i) => a.id === nouvelles[i]?.id);
        
        if (!notificationsIdentiques) {
          set({ notifications: nouvelles });
        }
        return nouvelles;
      },

      ajouterNotification: (notification) => {
        const nouvelle = {
          ...notification,
          id: notification.id || `notif-${Date.now()}`,
          date: notification.date || new Date().toISOString()
        };

        set((state) => ({
          notifications: [nouvelle, ...state.notifications]
        }));

        return nouvelle;
      },

      notifierDevisConverti: (devisNumero) => {
        get().ajouterNotification({
          id: `devis-converti-${Date.now()}`,
          type: TYPES_NOTIFICATION.INFO,
          icone: '🔵',
          titre: 'INFO',
          message: `Devis ${devisNumero} converti en facture`,
          lien: '/factures'
        });
      },

      notifierPaiementRecu: (factureNumero, montant) => {
        get().ajouterNotification({
          id: `paiement-recu-${Date.now()}`,
          type: TYPES_NOTIFICATION.INFO,
          icone: '🔵',
          titre: 'INFO',
          message: `Paiement reçu sur facture ${factureNumero} : ${montant.toLocaleString()} FCFA`,
          lien: '/factures'
        });
      },

      notifierModificationPlanning: (utilisateur, projetNom) => {
        get().ajouterNotification({
          id: `planning-modif-${Date.now()}`,
          type: TYPES_NOTIFICATION.INFO,
          icone: '🔵',
          titre: 'INFO',
          message: `Modification planning par ${utilisateur} : ${projetNom}`,
          lien: '/planification'
        });
      },

      marquerCommeLue: (notificationId) => {
        set((state) => ({
          notificationsLues: [...state.notificationsLues, notificationId]
        }));
      },

      marquerToutCommeLu: () => {
        const { notifications } = get();
        const tousLesIds = notifications.map(n => n.id);
        set({ notificationsLues: tousLesIds });
      },

      supprimerNotification: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== notificationId),
          notificationsLues: state.notificationsLues.filter(id => id !== notificationId)
        }));
      },

      supprimerTout: () => {
        set({ notifications: [], notificationsLues: [] });
      },

      getNotificationsNonLues: () => {
        const { notifications, notificationsLues } = get();
        return notifications.filter(n => !notificationsLues.includes(n.id));
      },

      getCompteurNonLues: () => {
        return get().getNotificationsNonLues().length;
      },

      estLue: (notificationId) => {
        const { notificationsLues } = get();
        return notificationsLues.includes(notificationId);
      }
    }),
    {
      name: 'sika_notifications'
    }
  )
);
