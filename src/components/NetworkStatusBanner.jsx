import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { connectionManager } from '../lib/connectionManager';

/**
 * Bannière de statut réseau
 * Affiche une notification quand la connexion change
 * et permet de forcer la reconnexion
 */

export function NetworkStatusBanner() {
  // Bannière désactivée - ne rien afficher
  return null;
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
