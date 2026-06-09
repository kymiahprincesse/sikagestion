import { createClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
    fetch: (url, options = {}) => fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        ...options.headers,
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
    }),
  },
})

const isPlaceholder = supabaseUrl.includes('placeholder') || supabaseAnonKey === 'placeholder-key'

export const checkConnection = async () => {
  if (isPlaceholder) {
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
