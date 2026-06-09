import { useSupabaseSync } from '../hooks/useSupabaseSync'
import { Database, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'

export default function BackendStatusIndicator({ variant = 'full' }) {
  const { isConnected, isChecking, lastCheck, error, refresh, isReconnecting, reconnectAttempts } = useSupabaseSync()

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <Database className="w-5 h-5 text-[#06006E]" />
          <div 
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              isChecking 
                ? 'bg-orange-400 animate-pulse' 
                : isConnected 
                  ? 'bg-[#1A7A4A]' 
                  : 'bg-[#E60000]'
            }`}
          />
        </div>
        <span className="text-xs font-medium text-[#06006E]">
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
    <div className="bg-white border-2 border-[#C8C8D0] rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Database className="w-8 h-8 text-[#06006E]" />
            <div 
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                isChecking 
                  ? 'bg-orange-400 animate-pulse' 
                  : isConnected 
                    ? 'bg-[#1A7A4A]' 
                    : 'bg-[#E60000]'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#06006E]">Backend Supabase</h3>
              {isConnected ? (
                <Wifi className="w-4 h-4 text-[#1A7A4A]" />
              ) : (
                <WifiOff className="w-4 h-4 text-[#E60000]" />
              )}
            </div>
            <p className={`text-sm font-medium ${
              isChecking
                ? 'text-orange-600'
                : isConnected
                  ? 'text-[#1A7A4A]'
                  : isReconnecting
                    ? 'text-orange-500'
                    : 'text-[#E60000]'
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
              <div className="flex items-center gap-1 mt-2 text-xs text-[#E60000]">
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
          <RefreshCw className={`w-5 h-5 text-[#06006E] ${isChecking || isReconnecting ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-[#C8C8D0]">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Serveur :</span>
            <span className="ml-2 font-medium text-[#06006E]">Supabase Cloud</span>
          </div>
          <div>
            <span className="text-gray-600">Région :</span>
            <span className="ml-2 font-medium text-[#06006E]">EU-West-1</span>
          </div>
          <div>
            <span className="text-gray-600">Base de données :</span>
            <span className="ml-2 font-medium text-[#06006E]">PostgreSQL 17</span>
          </div>
          <div>
            <span className="text-gray-600">Statut :</span>
            <span className={`ml-2 font-bold ${isConnected ? 'text-[#1A7A4A]' : 'text-[#E60000]'}`}>
              {isConnected ? 'ACTIF' : 'INACTIF'}
            </span>
          </div>
        </div>
      </div>

      {isConnected && (
        <div className="mt-4 bg-[#FFE6E6] border border-[#E60000] rounded-lg p-3">
          <p className="text-xs text-[#06006E]">
            <span className="font-bold text-[#E60000]">✓ Synchronisation active</span> - 
            Toutes les données sont sauvegardées en temps réel dans le cloud
          </p>
        </div>
      )}
    </div>
  )
}
