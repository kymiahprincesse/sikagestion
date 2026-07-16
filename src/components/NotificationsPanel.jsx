import { useState } from 'react';
import { useNotificationsStore } from '../store/useNotificationsStore';


export default function NotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    notifications,

    marquerCommeLue,
    marquerToutCommeLu,
    supprimerNotification,
    supprimerTout,
    getCompteurNonLues,
    estLue
  } = useNotificationsStore();



  const compteurNonLues = getCompteurNonLues();

  const handleNotificationClick = (notification) => {
    marquerCommeLue(notification.id);
  };

  const getStyleParType = (type) => {
    switch (type) {
      case 'URGENT':
        return 'border-l-4 border-rouge bg-red-50';
      case 'ATTENTION':
        return 'border-l-4 border-rouge bg-rouge-50';
      case 'INFO':
        return 'border-l-4 border-bleu bg-blue-50';
      default:
        return 'border-l-4 border-argent bg-background';
    }
  };

  const formaterDate = (dateISO) => {
    const date = new Date(dateISO);
    const maintenant = new Date();
    const diffMs = maintenant - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHeures = Math.floor(diffMs / 3600000);
    const diffJours = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHeures < 24) return `Il y a ${diffHeures}h`;
    if (diffJours < 7) return `Il y a ${diffJours}j`;
    
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-navy-light rounded-lg transition-colors"
        title="Notifications"
      >
        <span className="text-2xl">🔔</span>
        {compteurNonLues > 0 && (
          <span className="absolute -top-1 -right-1 bg-rouge text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {compteurNonLues > 9 ? '9+' : compteurNonLues}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 top-full mt-2 w-96 bg-surface rounded-lg shadow-2xl border border-argent z-50 max-h-[600px] flex flex-col">
            <div className="bg-navy text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
              <h3 className="font-bold text-lg">
                Notifications {compteurNonLues > 0 && `(${compteurNonLues})`}
              </h3>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={marquerToutCommeLu}
                      className="text-xs bg-bleu hover:bg-bleu/80 px-3 py-1 rounded transition-colors"
                      title="Tout marquer comme lu"
                    >
                      ✓ Tout lire
                    </button>
                    <button
                      onClick={supprimerTout}
                      className="text-xs bg-rouge hover:bg-rouge/80 px-3 py-1 rounded transition-colors"
                      title="Supprimer tout"
                    >
                      🗑️ Effacer
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">🔕</div>
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-argent">
                  {notifications.map((notif) => {
                    const lue = estLue(notif.id);
                    
                    return (
                      <div
                        key={notif.id}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          getStyleParType(notif.type)
                        } ${lue ? 'opacity-60' : ''}`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl flex-shrink-0">
                            {notif.icone}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold ${
                                notif.type === 'URGENT' ? 'text-rouge' :
                                notif.type === 'ATTENTION' ? 'text-rouge' :
                                'text-bleu'
                              }`}>
                                {notif.titre}
                              </span>
                              {!lue && (
                                <span className="w-2 h-2 bg-rouge rounded-full flex-shrink-0" />
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-800 mb-2 leading-tight">
                              {notif.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {formaterDate(notif.date)}
                              </span>
                              
                              {notif.lien && (
                                <a
                                  href={notif.lien}
                                  className="text-xs text-bleu hover:text-bleu/80 font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Voir →
                                </a>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              supprimerNotification(notif.id);
                            }}
                            className="text-gray-400 hover:text-rouge transition-colors flex-shrink-0"
                            title="Supprimer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="bg-background px-4 py-2 rounded-b-lg border-t border-argent text-center">
                <p className="text-xs text-gray-500">
                  {notifications.length} notification{notifications.length > 1 ? 's' : ''} au total
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
