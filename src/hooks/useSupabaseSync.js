import { useEffect, useState } from 'react'
import { supabase, checkConnection } from '../lib/supabaseClient'

export const useSupabaseSync = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [lastCheck, setLastCheck] = useState(null)
  const [error, setError] = useState(null)

  const verifyConnection = async () => {
    setIsChecking(true)
    try {
      const status = await checkConnection()
      setIsConnected(status.connected)
      setLastCheck(status.timestamp)
      setError(status.error || null)
    } catch (err) {
      setIsConnected(false)
      setError(err.message)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    verifyConnection()
    
    const interval = setInterval(() => {
      verifyConnection()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return {
    isConnected,
    isChecking,
    lastCheck,
    error,
    refresh: verifyConnection,
    supabase
  }
}
