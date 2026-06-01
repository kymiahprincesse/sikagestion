import { useNotificationsStore } from '../store/useNotificationsStore';

export function useNotifications() {
  const {
    notifications,
    notificationsLues,
    genererNotifications,
    ajouterNotification,
    notifierDevisConverti,
    notifierPaiementRecu,
    notifierModificationPlanning,
    marquerCommeLue,
    marquerToutCommeLu,
    supprimerNotification,
    supprimerTout,
    getNotificationsNonLues,
    getCompteurNonLues,
    estLue
  } = useNotificationsStore();

  const notifierSucces = (message, lien = null) => {
    ajouterNotification({
      type: 'INFO',
      icone: '🔵',
      titre: 'INFO',
      message,
      lien
    });
  };

  const notifierAttention = (message, lien = null) => {
    ajouterNotification({
      type: 'ATTENTION',
      icone: '🟠',
      titre: 'ATTENTION',
      message,
      lien
    });
  };

  const notifierUrgent = (message, lien = null) => {
    ajouterNotification({
      type: 'URGENT',
      icone: '🔴',
      titre: 'URGENT',
      message,
      lien
    });
  };

  return {
    notifications,
    notificationsLues,
    genererNotifications,
    ajouterNotification,
    notifierDevisConverti,
    notifierPaiementRecu,
    notifierModificationPlanning,
    notifierSucces,
    notifierAttention,
    notifierUrgent,
    marquerCommeLue,
    marquerToutCommeLu,
    supprimerNotification,
    supprimerTout,
    getNotificationsNonLues,
    getCompteurNonLues,
    estLue
  };
}
