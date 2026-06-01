import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

export const checkConnection = async () => {
  try {
    const { data, error } = await supabase.from('clients').select('count', { count: 'exact', head: true })
    if (error) throw error
    return { connected: true, timestamp: new Date().toISOString() }
  } catch (error) {
    console.error('Erreur connexion Supabase:', error)
    return { connected: false, error: error.message, timestamp: new Date().toISOString() }
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
