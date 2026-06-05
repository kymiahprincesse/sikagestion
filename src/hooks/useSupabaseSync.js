import { useEffect, useState } from 'react'
import { supabase, checkConnection } from '../lib/supabaseClient'
import { connectionManager } from '../lib/connectionManager'

export const useSupabaseSync = () => {
  const [state, setState] = useState({
    isConnected: false,
    isChecking: true,
    lastCheck: null,
    error: null,
    isOnline: navigator.onLine,
    pendingOperations: 0,
    reconnectAttempts: 0
  })

  const verifyConnection = async () => {
    setState(s => ({ ...s, isChecking: true }))
    try {
      const status = await checkConnection()
      setState(s => ({
        ...s,
        isConnected: status.connected,
        lastCheck: status.timestamp,
        error: status.error || null,
        isChecking: false
      }))
      return status.connected
    } catch (err) {
      setState(s => ({
        ...s,
        isConnected: false,
        error: err.message,
        isChecking: false
      }))
      return false
    }
  }

  useEffect(() => {
    // Vérification initiale
    verifyConnection()

    // S'abonner au connectionManager pour les mises à jour en temps réel
    const unsubscribe = connectionManager.subscribe((managerState) => {
      setState(s => ({
        ...s,
        isConnected: managerState.isSupabaseConnected,
        isOnline: managerState.isOnline,
        pendingOperations: managerState.pendingOperations,
        reconnectAttempts: managerState.reconnectAttempts,
        lastCheck: new Date().toISOString()
      }))
    })

    // Vérification périodique de secours
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        verifyConnection()
      }
    }, 30000)

    // Gérer la reconnexion quand la page redevient visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        verifyConnection()
        connectionManager.forceReconnect()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      unsubscribe()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return {
    ...state,
    refresh: verifyConnection,
    forceReconnect: () => connectionManager.forceReconnect(),
    supabase
  }
}
