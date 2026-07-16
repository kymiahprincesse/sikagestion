import { createClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE

if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceRole)) {
  throw new Error('Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY ou VITE_SUPABASE_SERVICE_ROLE obligatoires')
}

// Always use the anonymous/public key in the browser client.
// The service_role key MUST NOT be exposed to client-side code — it is only for server-side scripts.
const useKey = supabaseAnonKey

export const supabase = createClient(supabaseUrl, useKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    fetch: (url, options = {}) => {
      // Avoid adding non-standard headers here to prevent CORS preflight failures
      const headers = new Headers(options.headers || {})
      return fetch(url, {
        ...options,
        cache: 'no-store',
        headers,
      })
    },
  },
})

export const checkConnection = async () => {
  if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceRole)) {
    return { connected: false, error: 'Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ou VITE_SUPABASE_SERVICE_ROLE non configurées', timestamp: new Date().toISOString() }
  }
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    // Requête légère et fiable via le client Supabase (HEAD count sur clients)
    const { error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .abortSignal(controller.signal)

    clearTimeout(timeout)
    if (error) throw error
    return { connected: true, timestamp: new Date().toISOString() }
  } catch (error) {
    const msg = error?.name === 'AbortError' ? 'Délai dépassé (timeout)' : (error?.message || 'Erreur réseau ou configuration Supabase invalide')
    logger.error('Erreur connexion Supabase:', msg)
    return { connected: false, error: msg, timestamp: new Date().toISOString() }
  }
}

export const getConnectionStatus = async () => {
  const status = await checkConnection()
  return {
    ...status,
    url: supabaseUrl,
    project: 'SIKA GESTION'
  }
}
