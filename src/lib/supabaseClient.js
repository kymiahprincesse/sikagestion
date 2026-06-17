import { createClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE

if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceRole)) {
  throw new Error('Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY ou VITE_SUPABASE_SERVICE_ROLE obligatoires')
}

// In development only, prefer service_role token if available (allows full read/write during local testing).
const useKey = (import.meta.env.DEV && supabaseServiceRole) ? supabaseServiceRole : supabaseAnonKey

// Debug: indicate which key type is used (do NOT log the key itself)
if (import.meta.env.DEV) {
  try {
    /* eslint-disable no-console */
    console.info('[SUPABASE DEBUG] Using', (import.meta.env.DEV && supabaseServiceRole) ? 'service_role (DEV)' : 'anon key');
    /* eslint-enable no-console */
  } catch (e) { /* ignore */ }
}

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
      const headers = new Headers(options.headers || {})
      headers.set('Cache-Control', 'no-cache, no-store')
      headers.set('Pragma', 'no-cache')
      return fetch(url, {
        ...options,
        cache: 'no-store',
        headers,
      })
    },
  },
})

const isPlaceholder = false

export const checkConnection = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { connected: false, error: 'Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY non configurées', timestamp: new Date().toISOString() }
  }
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (res.status >= 200 && res.status < 500) {
      return { connected: true, timestamp: new Date().toISOString() }
    }
    throw new Error(`HTTP ${res.status}`)
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
