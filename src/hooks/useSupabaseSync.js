import { useEffect, useState, useCallback, useRef } from 'react'
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
    reconnectAttempts: 0,
    isReconnecting: false
  })

  const isMountedRef = useRef(true)
  const safeSetState = useCallback((updater) => {
    if (isMountedRef.current) setState(updater)
  }, [])

  const verifyConnection = useCallback(async () => {
    safeSetState(s => ({ ...s, isChecking: true }))
    try {
      const status = await checkConnection()
      safeSetState(s => ({
        ...s,
        isConnected: status.connected,
        lastCheck: status.timestamp,
        error: status.error || null,
        isChecking: false
      }))
      return status.connected
    } catch (err) {
      safeSetState(s => ({
        ...s,
        isConnected: false,
        error: err.message,
        isChecking: false
      }))
      return false
    }
  }, [safeSetState])

  useEffect(() => {
    isMountedRef.current = true
    verifyConnection()

    const unsubscribe = connectionManager.subscribe((managerState) => {
      safeSetState(s => ({
        ...s,
        isConnected: managerState.isSupabaseConnected,
        isOnline: managerState.isOnline,
        pendingOperations: managerState.pendingOperations,
        reconnectAttempts: managerState.reconnectAttempts,
        isReconnecting: managerState.isReconnecting,
        lastCheck: new Date().toISOString()
      }))
    })

    let interval = null
    let visibilityHandler = null

    const startIntervals = () => {
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') verifyConnection()
      }, 30000)

      visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          verifyConnection()
          connectionManager.forceReconnect()
        }
      }
      document.addEventListener('visibilitychange', visibilityHandler)
    }

    // Délai avant de démarrer les vérifications périodiques pour éviter le flood au montage
    const startupDelay = setTimeout(startIntervals, 1000)

    return () => {
      isMountedRef.current = false
      unsubscribe()
      clearTimeout(startupDelay)
      if (interval) clearInterval(interval)
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
    }
  }, [verifyConnection, safeSetState])

  return {
    ...state,
    refresh: verifyConnection,
    forceReconnect: useCallback(() => connectionManager.forceReconnect(), []),
    supabase
  }
}
