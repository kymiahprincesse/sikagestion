import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { connectionManager } from '../lib/connectionManager';

/**
 * Bannière de statut réseau
 * Affiche une notification quand la connexion change
 * et permet de forcer la reconnexion
 */

export function NetworkStatusBanner() {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    isSupabaseConnected: false,
    showBanner: false,
    message: '',
    type: 'info', // 'info' | 'success' | 'error' | 'warning'
  });

  useEffect(() => {
    let hideTimeout;

    const handleConnectionChange = (state) => {
      clearTimeout(hideTimeout);

      if (!state.isOnline) {
        setStatus({
          isOnline: false,
          isSupabaseConnected: false,
          showBanner: true,
          message: 'Connexion internet perdue',
          type: 'error',
        });
      } else if (state.isOnline && !state.isSupabaseConnected) {
        setStatus({
          isOnline: true,
          isSupabaseConnected: false,
          showBanner: true,
          message: 'Connexion Supabase en cours...',
          type: 'warning',
        });
      } else {
        // Connexion rétablie
        setStatus({
          isOnline: true,
          isSupabaseConnected: true,
          showBanner: true,
          message: 'Connexion rétablie',
          type: 'success',
        });

        // Masquer automatiquement après 3 secondes
        hideTimeout = setTimeout(() => {
          setStatus(s => ({ ...s, showBanner: false }));
        }, 3000);
      }
    };

    // S'abonner au connectionManager
    const unsubscribe = connectionManager.subscribe(handleConnectionChange);

    // Écouter les événements navigateur aussi
    const handleOnline = () => {
      handleConnectionChange({ isOnline: true, isSupabaseConnected: status.isSupabaseConnected });
    };

    const handleOffline = () => {
      handleConnectionChange({ isOnline: false, isSupabaseConnected: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(hideTimeout);
    };
  }, [status.isSupabaseConnected]);

  const handleReconnect = () => {
    connectionManager.forceReconnect();
    setStatus(s => ({
      ...s,
      message: 'Reconnexion en cours...',
      type: 'warning',
    }));
  };

  if (!status.showBanner) return null;

  const colors = {
    error: 'bg-red-500 text-white',
    warning: 'bg-orange-500 text-white',
    success: 'bg-green-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  const icons = {
    error: <WifiOff className="w-4 h-4" />,
    warning: <RefreshCw className="w-4 h-4 animate-spin" />,
    success: <Wifi className="w-4 h-4" />,
    info: <Wifi className="w-4 h-4" />,
  };

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-[9999] 
        ${colors[status.type]}
        transition-all duration-300 ease-out
        animate-slide-down
      `}
    >
      <div className="flex items-center justify-between px-4 py-2 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icons[status.type]}
          <span>{status.message}</span>
        </div>

        <div className="flex items-center gap-3">
          {(status.type === 'error' || status.type === 'warning') && (
            <button
              onClick={handleReconnect}
              className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
            >
              Reconnecter
            </button>
          )}
          
          <button
            onClick={() => setStatus(s => ({ ...s, showBanner: false }))}
            className="text-lg leading-none hover:opacity-70 transition-opacity"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Composant simple pour afficher le statut réseau dans une carte
 */
export function NetworkStatusCard({ className = '' }) {
  const [status, setStatus] = useState(connectionManager.getState());

  useEffect(() => {
    return connectionManager.subscribe(setStatus);
  }, []);

  const getStatusColor = () => {
    if (!status.isOnline) return 'text-gray-400 bg-gray-50';
    if (!status.isSupabaseConnected) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusText = () => {
    if (!status.isOnline) return 'Hors réseau';
    if (!status.isSupabaseConnected) return 'Connexion instable';
    return 'Connecté';
  };

  const getStatusIcon = () => {
    if (!status.isOnline) return <WifiOff className="w-4 h-4" />;
    if (!status.isSupabaseConnected) return <RefreshCw className="w-4 h-4 animate-spin" />;
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor()} ${className}`}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      {status.pendingOperations > 0 && (
        <span className="bg-white/50 px-1.5 py-0.5 rounded-full">
          {status.pendingOperations} en attente
        </span>
      )}
    </div>
  );
}

export default NetworkStatusBanner;
