import { useSupabaseSync } from '../hooks/useSupabaseSync'
import { Database, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'

export default function BackendStatusIndicator({ variant = 'full' }) {
  const { isConnected, isChecking, lastCheck, error, refresh, isReconnecting, reconnectAttempts } = useSupabaseSync()

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <Database className="w-5 h-5 text-textMain" />
          <div 
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              isChecking 
                ? 'bg-rouge-400 animate-pulse' 
                : isConnected 
                  ? 'bg-success' 
                  : 'bg-accent'
            }`}
          />
        </div>
        <span className="text-xs font-medium text-textMain">
          {isChecking
            ? 'Vérification...'
            : isConnected
              ? 'Backend actif'
              : isReconnecting
                ? `Reconnexion #${reconnectAttempts}...`
                : 'Déconnecté'}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-surface border-2 border-border rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Database className="w-8 h-8 text-textMain" />
            <div 
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                isChecking 
                  ? 'bg-rouge-400 animate-pulse' 
                  : isConnected 
                    ? 'bg-success' 
                    : 'bg-accent'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-textMain">Backend Supabase</h3>
              {isConnected ? (
                <Wifi className="w-4 h-4 text-success" />
              ) : (
                <WifiOff className="w-4 h-4 text-accent" />
              )}
            </div>
            <p className={`text-sm font-medium ${
              isChecking
                ? 'text-rouge-600'
                : isConnected
                  ? 'text-success'
                  : isReconnecting
                    ? 'text-rouge-500'
                    : 'text-accent'
            }`}>
              {isChecking
                ? 'Vérification de la connexion...'
                : isConnected
                  ? '✓ Connecté et synchronisé'
                  : isReconnecting
                    ? `↻ Reconnexion automatique (tentative #${reconnectAttempts})...`
                    : '✗ Déconnecté'}
            </p>
            {lastCheck && (
              <p className="text-xs text-gray-500 mt-1">
                Dernière vérification : {new Date(lastCheck).toLocaleTimeString('fr-FR')}
              </p>
            )}
            {error && (
              <div className="flex items-center gap-1 mt-2 text-xs text-accent">
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={isChecking || isReconnecting}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title={isReconnecting ? `Reconnexion en cours (#${reconnectAttempts})` : 'Actualiser la connexion'}
        >
          <RefreshCw className={`w-5 h-5 text-textMain ${isChecking || isReconnecting ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Serveur :</span>
            <span className="ml-2 font-medium text-textMain">Supabase Cloud</span>
          </div>
          <div>
            <span className="text-gray-600">Région :</span>
            <span className="ml-2 font-medium text-textMain">EU-West-1</span>
          </div>
          <div>
            <span className="text-gray-600">Base de données :</span>
            <span className="ml-2 font-medium text-textMain">PostgreSQL 17</span>
          </div>
          <div>
            <span className="text-gray-600">Statut :</span>
            <span className={`ml-2 font-bold ${isConnected ? 'text-success' : 'text-accent'}`}>
              {isConnected ? 'ACTIF' : 'INACTIF'}
            </span>
          </div>
        </div>
      </div>

      {isConnected && (
        <div className="mt-4 bg-accentLight border border-accent rounded-lg p-3">
          <p className="text-xs text-textMain">
            <span className="font-bold text-accent">✓ Synchronisation active</span> - 
            Toutes les données sont sauvegardées en temps réel dans le cloud
          </p>
        </div>
      )}
    </div>
  )
}
