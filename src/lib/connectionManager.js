import { supabase } from './supabaseClient'
import { logger } from '../utils/logger'

/**
 * Gestionnaire de connexion Supabase robuste
 * - Reconnexion automatique avec backoff exponentiel
 * - Heartbeat pour détecter les déconnexions silencieuses
 * - Gestion des changements de réseau
 * - File d'attente des opérations pendant la déconnexion
 */

class ConnectionManager {
  constructor() {
    this.isOnline = navigator.onLine
    this.isSupabaseConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.baseDelay = 1000 // 1 seconde
    this.maxDelay = 30000 // 30 secondes
    this.heartbeatInterval = null
    this.reconnectTimeout = null
    this.listeners = []
    this.pendingOperations = []
    this.channels = new Map()
    
    this.init()
  }

  init() {
    // Écouter les changements de connexion réseau
    window.addEventListener('online', () => this.handleNetworkChange(true))
    window.addEventListener('offline', () => this.handleNetworkChange(false))
    
    // Écouter la visibilité de la page (retour après inactivité)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkConnection()
      }
    })
    
    // Démarrer le heartbeat
    this.startHeartbeat()
    
    // Vérification initiale
    this.checkConnection()
  }

  handleNetworkChange(online) {
    this.isOnline = online
    logger.info(`🌐 Réseau ${online ? 'connecté' : 'déconnecté'}`)
    
    if (online) {
      this.reconnectAttempts = 0
      this.checkConnection()
      this.processPendingOperations()
    } else {
      this.isSupabaseConnected = false
      this.notifyListeners()
    }
  }

  async checkConnection() {
    if (!this.isOnline) {
      this.isSupabaseConnected = false
      this.notifyListeners()
      return false
    }

    try {
      const { error } = await supabase.from('clients').select('count', { count: 'exact', head: true })
      
      if (error) throw error
      
      const wasConnected = this.isSupabaseConnected
      this.isSupabaseConnected = true
      this.reconnectAttempts = 0
      
      if (!wasConnected) {
        logger.info('✅ Connexion Supabase rétablie')
        this.reconnectAllChannels()
      }
      
      this.notifyListeners()
      return true
    } catch (err) {
      this.isSupabaseConnected = false
      this.notifyListeners()
      this.scheduleReconnect()
      return false
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('❌ Nombre maximal de tentatives de reconnexion atteint')
      return
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxDelay
    )

    this.reconnectAttempts++
    logger.info(`⏳ Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms`)

    this.reconnectTimeout = setTimeout(() => {
      this.checkConnection()
    }, delay)
  }

  startHeartbeat() {
    // Vérification toutes les 15 secondes
    this.heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && this.isOnline) {
        this.checkConnection()
      }
    }, 15000)
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Enregistrer un canal realtime pour reconnexion automatique
   */
  registerChannel(name, channelConfig) {
    this.channels.set(name, channelConfig)
    
    if (this.isSupabaseConnected) {
      return this.createChannel(name, channelConfig)
    }
    return null
  }

  unregisterChannel(name) {
    const channel = this.channels.get(name)
    if (channel?.instance) {
      supabase.removeChannel(channel.instance)
    }
    this.channels.delete(name)
  }

  createChannel(name, config) {
    const { table, onInsert, onUpdate, onDelete, filter } = config
    
    let channel = supabase.channel(`realtime-${name}`)
    
    const changesConfig = { event: '*', schema: 'public', table }
    if (filter) changesConfig.filter = filter
    
    channel = channel.on('postgres_changes', changesConfig, (payload) => {
      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload.new)
          break
        case 'UPDATE':
          onUpdate?.(payload.new)
          break
        case 'DELETE':
          onDelete?.(payload.old)
          break
      }
    })
    
    channel.subscribe((status) => {
      logger.info(`📡 Canal ${name}: ${status}`)
    })
    
    // Mettre à jour l'instance dans la config
    const config2 = this.channels.get(name)
    if (config2) {
      config2.instance = channel
    }
    
    return channel
  }

  reconnectAllChannels() {
    this.channels.forEach((config, name) => {
      if (config.instance) {
        supabase.removeChannel(config.instance)
      }
      this.createChannel(name, config)
    })
  }

  /**
   * Queue une opération pour exécution quand la connexion revient
   */
  queueOperation(operation) {
    this.pendingOperations.push({
      ...operation,
      timestamp: Date.now(),
      id: `${Date.now()}-${Math.random()}`
    })
    
    // Sauvegarder dans localStorage pour persistance
    this.savePendingOperations()
    
    if (this.isSupabaseConnected) {
      this.processPendingOperations()
    }
  }

  savePendingOperations() {
    try {
      localStorage.setItem('sika_pending_ops', JSON.stringify(this.pendingOperations))
    } catch (e) {
      logger.error('Erreur sauvegarde opérations:', e)
    }
  }

  loadPendingOperations() {
    try {
      const stored = localStorage.getItem('sika_pending_ops')
      if (stored) {
        this.pendingOperations = JSON.parse(stored)
      }
    } catch (e) {
      logger.error('Erreur chargement opérations:', e)
    }
  }

  async processPendingOperations() {
    if (!this.isSupabaseConnected || this.pendingOperations.length === 0) return

    const operations = [...this.pendingOperations]
    this.pendingOperations = []
    this.savePendingOperations()

    for (const op of operations) {
      try {
        await this.executeOperation(op)
      } catch (err) {
        logger.error('Erreur exécution opération:', err)
        // Remettre en file si échec
        this.pendingOperations.push(op)
      }
    }
    
    this.savePendingOperations()
  }

  async executeOperation(op) {
    const { table, operation, data, id } = op.payload || op
    
    switch (operation) {
      case 'insert':
        return supabase.from(table).insert(data)
      case 'update':
        return supabase.from(table).update(data).eq('id', id)
      case 'delete':
        return supabase.from(table).delete().eq('id', id)
      case 'upsert':
        return supabase.from(table).upsert(data, { onConflict: 'id' })
      default:
        throw new Error(`Opération inconnue: ${operation}`)
    }
  }

  subscribe(callback) {
    this.listeners.push(callback)
    // Envoyer l'état actuel immédiatement
    callback({
      isOnline: this.isOnline,
      isSupabaseConnected: this.isSupabaseConnected,
      pendingOperations: this.pendingOperations.length,
      reconnectAttempts: this.reconnectAttempts
    })
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  notifyListeners() {
    const state = {
      isOnline: this.isOnline,
      isSupabaseConnected: this.isSupabaseConnected,
      pendingOperations: this.pendingOperations.length,
      reconnectAttempts: this.reconnectAttempts
    }
    this.listeners.forEach(cb => cb(state))
  }

  getState() {
    return {
      isOnline: this.isOnline,
      isSupabaseConnected: this.isSupabaseConnected,
      pendingOperations: this.pendingOperations.length,
      reconnectAttempts: this.reconnectAttempts
    }
  }

  forceReconnect() {
    this.reconnectAttempts = 0
    this.checkConnection()
  }
}

export const connectionManager = new ConnectionManager()
