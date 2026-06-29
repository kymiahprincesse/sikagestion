import { useState, useEffect } from 'react'
import { RefreshCw, Cloud, CloudOff, AlertCircle, CheckCircle2, Wifi, WifiOff } from 'lucide-react'
import { useSupabaseSync } from '../hooks/useSupabaseSync'

/**
 * Indicateur compact de statut de synchronisation pour le header
 * Amélioré avec reconnexion manuelle et plus de détails
 */
export default function SyncStatusIndicator() {
  const { isConnected, isChecking, lastCheck, error, isOnline, pendingOperations, reconnectAttempts, forceReconnect } = useSupabaseSync()
  const [showDetails, setShowDetails] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [now, setNow] = useState(Date.now())

  // Mise à jour du timestamp de dernière sync lorsque la connexion est confirmée
  useEffect(() => {
    if (isConnected && lastCheck) {
      setLastSync(new Date())
    }
  }, [isConnected, lastCheck])

  // Rafraîchir l'affichage "il y a Xs" toutes les 10 secondes
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(interval)
  }, [])

  // Formater le temps écoulé
  const getTimeAgo = () => {
    if (!lastSync) return 'Jamais'
    const seconds = Math.floor((now - lastSync.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    return `${hours}h`
  }

  const getStatusColor = () => {
    if (!isOnline) return 'text-gray-400'
    if (isChecking) return 'text-orange-500'
    if (!isConnected) return 'text-red-500'
    return 'text-green-500'
  }

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />
    if (isChecking) return <RefreshCw className="w-4 h-4 animate-spin" />
    if (!isConnected) return <CloudOff className="w-4 h-4" />
    return <Cloud className="w-4 h-4" />
  }

  const getStatusText = () => {
    if (!isOnline) return 'Sans réseau'
    if (isChecking) return 'Sync...'
    if (!isConnected) return 'Hors ligne'
    return 'Sync'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-gray-100 ${getStatusColor()}`}
        title="Statut de synchronisation"
      >
        {getStatusIcon()}
        <span className="text-xs font-medium hidden sm:inline">
          {getStatusText()}
        </span>
        {pendingOperations > 0 && (
          <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
            {pendingOperations}
          </span>
        )}
        {isConnected && lastSync && (
          <span className="text-xs text-gray-400 hidden md:inline">
            {getTimeAgo()}
          </span>
        )}
      </button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50">
          <div className="flex items-center gap-2 mb-3">
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="font-medium text-sm">
              {isConnected ? 'Synchronisé' : isOnline ? 'Connexion perdue' : 'Hors réseau'}
            </span>
          </div>
          
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Réseau:
              </span>
              <span className={isOnline ? 'text-green-600' : 'text-gray-400'}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                Supabase:
              </span>
              <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                {isConnected ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
            {reconnectAttempts > 0 && (
              <div className="flex justify-between items-center text-orange-600">
                <span>Tentatives:</span>
                <span>{reconnectAttempts}/10</span>
              </div>
            )}
            {pendingOperations > 0 && (
              <div className="flex justify-between items-center text-orange-600">
                <span>Opérations en attente:</span>
                <span>{pendingOperations}</span>
              </div>
            )}
            {lastCheck && (
              <div className="flex justify-between">
                <span>Dernière vérif:</span>
                <span>{new Date(lastCheck).toLocaleTimeString('fr-FR')}</span>
              </div>
            )}
            {error && (
              <div className="text-red-500 mt-2 p-2 bg-red-50 rounded text-xs">
                {error}
              </div>
            )}
            
            {/* Bouton de reconnexion forcée */}
            {!isConnected && (
              <button
                onClick={() => {
                  forceReconnect()
                  setShowDetails(false)
                }}
                className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                Forcer la reconnexion
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
