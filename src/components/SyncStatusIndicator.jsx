import { useState, useEffect } from 'react'
import { RefreshCw, Cloud, CloudOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useSupabaseSync } from '../hooks/useSupabaseSync'

/**
 * Indicateur compact de statut de synchronisation pour le header
 */
export default function SyncStatusIndicator() {
  const { isConnected, isChecking, lastCheck, error } = useSupabaseSync()
  const [showDetails, setShowDetails] = useState(false)
  const [lastSync, setLastSync] = useState(null)

  // Mettre à jour l'heure de dernière sync
  useEffect(() => {
    if (isConnected && lastCheck) {
      setLastSync(new Date())
    }
  }, [isConnected, lastCheck])

  // Formater le temps écoulé
  const getTimeAgo = () => {
    if (!lastSync) return 'Jamais'
    const seconds = Math.floor((Date.now() - lastSync.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    return `${hours}h`
  }

  const getStatusColor = () => {
    if (isChecking) return 'text-orange-500'
    if (!isConnected) return 'text-red-500'
    return 'text-green-500'
  }

  const getStatusIcon = () => {
    if (isChecking) return <RefreshCw className="w-4 h-4 animate-spin" />
    if (!isConnected) return <CloudOff className="w-4 h-4" />
    return <Cloud className="w-4 h-4" />
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
          {isChecking ? 'Sync...' : isConnected ? 'Sync' : 'Hors ligne'}
        </span>
        {isConnected && lastSync && (
          <span className="text-xs text-gray-400 hidden md:inline">
            {getTimeAgo()}
          </span>
        )}
      </button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
          <div className="flex items-center gap-2 mb-2">
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="font-medium text-sm">
              {isConnected ? 'Synchronisé' : 'Déconnecté'}
            </span>
          </div>
          
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Backend:</span>
              <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                {isConnected ? 'Supabase connecté' : 'Hors ligne'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Realtime:</span>
              <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                {isConnected ? 'Actif' : 'Inactif'}
              </span>
            </div>
            {lastCheck && (
              <div className="flex justify-between">
                <span>Dernière vérification:</span>
                <span>{new Date(lastCheck).toLocaleTimeString('fr-FR')}</span>
              </div>
            )}
            {error && (
              <div className="text-red-500 mt-2 p-2 bg-red-50 rounded text-xs">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
