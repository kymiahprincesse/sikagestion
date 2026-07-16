import { supabase, checkConnection } from './supabaseClient'
import { logger } from '../utils/logger'
import Dexie from 'dexie'

// Initialiser Dexie pour la file d'attente (évite la limite de 5Mo du localStorage)
export const db = new Dexie('SikaGestionOfflineDB');
db.version(1).stores({
  offlineQueue: '++id, table, operation, payload, attempts, timestamp, status' 
});

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
    this.baseDelay = 2000 // 2 secondes
    this.maxDelay = 60000 // 60 secondes max entre deux tentatives
    this.maxReconnectAttempts = 10 // Limite les tentatives infinies
    this.heartbeatInterval = null
    this.reconnectTimeout = null
    this.isReconnecting = false
    this.isCheckingConnection = false
    this.isProcessing = false
    this.listeners = []
    this.pendingOperations = []
    this.channels = new Map()
    this.boundHandleNetworkChange = null
    this.boundHandleVisibility = null
    this._destroyed = false
    
    this.init()
  }

  init() {
    if (this._destroyed) return
    // Stabiliser les handlers pour pouvoir les retirer proprement
    this.boundHandleNetworkChange = (e) => this.handleNetworkChange(e.type === 'online')
    this.boundHandleVisibility = () => {
      if (document.visibilityState === 'visible') this.checkConnection()
    }

    window.addEventListener('online', this.boundHandleNetworkChange)
    window.addEventListener('offline', this.boundHandleNetworkChange)
    document.addEventListener('visibilitychange', this.boundHandleVisibility)
    
    this.startHeartbeat()
    this.loadPendingOperations().then(() => {
      this.checkConnection()
    })
  }

  /**
   * Nettoyage complet pour HMR, tests, ou démontage de l'application.
   */
  destroy() {
    this._destroyed = true
    if (this.boundHandleNetworkChange) {
      window.removeEventListener('online', this.boundHandleNetworkChange)
      window.removeEventListener('offline', this.boundHandleNetworkChange)
    }
    if (this.boundHandleVisibility) {
      document.removeEventListener('visibilitychange', this.boundHandleVisibility)
    }
    this.stopHeartbeat()
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
    this.channels.forEach((config) => {
      if (config?.instance) supabase.removeChannel(config.instance)
    })
    this.channels.clear()
    this.listeners = []
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
    if (!this.isOnline || this.isCheckingConnection) return this.isSupabaseConnected
    this.isCheckingConnection = true

    try {
      const status = await checkConnection()
      
      const wasConnected = this.isSupabaseConnected
      this.isSupabaseConnected = status.connected
      
      if (status.connected) {
        this.reconnectAttempts = 0
        this.isReconnecting = false
        if (!wasConnected) {
          logger.info('✅ Connexion Supabase rétablie')
          this.reconnectAllChannels()
        }
      } else {
        this.isSupabaseConnected = false
        this.scheduleReconnect()
      }
      
      this.notifyListeners()
      return this.isSupabaseConnected
    } catch {
      this.isSupabaseConnected = false
      this.notifyListeners()
      this.scheduleReconnect()
      return false
    } finally {
      this.isCheckingConnection = false
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.info('⚠️ Limite de reconnexion atteinte. Vérifiez votre connexion réseau.')
      this.isReconnecting = false
      this.notifyListeners()
      return
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxDelay
    )

    this.reconnectAttempts++
    this.isReconnecting = true
    logger.info(`⏳ Tentative de reconnexion #${this.reconnectAttempts} dans ${delay}ms`)

    this.reconnectTimeout = setTimeout(() => {
      this.checkConnection()
    }, delay)
  }

  startHeartbeat() {
    // Vérification toutes les 60 secondes (page visible uniquement)
    this.heartbeatInterval = setInterval(() => {
      if (this.isOnline && document.visibilityState === 'visible') {
        this.checkConnection()
      }
    }, 60000)
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Enregistrer un canal realtime pour reconnexion automatique.
   * Le canal est créé immédiatement car le realtime WebSocket est indépendant de l'API REST.
   */
  registerChannel(name, channelConfig) {
    this.channels.set(name, channelConfig)
    return this.createChannel(name, channelConfig)
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
      // Le statut realtime est une source de vérité plus fiable que le simple ping REST
      if (status === 'SUBSCRIBED') {
        const wasConnected = this.isSupabaseConnected
        this.isSupabaseConnected = true
        this.isReconnecting = false
        this.reconnectAttempts = 0
        if (!wasConnected) {
          logger.info('✅ Connexion realtime Supabase confirmée')
          this.notifyListeners()
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
        this.isSupabaseConnected = false
        this.notifyListeners()
        this.scheduleReconnect()
      }
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
  async queueOperation(operation) {
    const op = {
      ...operation,
      timestamp: Date.now(),
      status: 'pending',
      attempts: 0
    }
    this.pendingOperations.push(op)
    
    // Sauvegarder dans Dexie pour persistance illimitée
    try {
      const id = await db.offlineQueue.add(op)
      op.id = id // Mettre à jour l'ID local avec l'ID généré par Dexie
    } catch (e) {
      logger.error('Erreur sauvegarde Dexie:', e)
    }
    
    this.notifyListeners()
    
    if (this.isSupabaseConnected) {
      this.processPendingOperations()
    }
  }

  async savePendingOperations() {
    // La sauvegarde individuelle se fait via queueOperation, mais on peut forcer la synchro complète si besoin
  }

  async loadPendingOperations() {
    try {
      const ops = await db.offlineQueue.where('status').equals('pending').toArray()
      this.pendingOperations = ops
      this.notifyListeners()
    } catch (e) {
      logger.error('Erreur chargement opérations Dexie:', e)
    }
  }

  async processPendingOperations() {
    if (!this.isSupabaseConnected || this.pendingOperations.length === 0 || this.isProcessing) return

    this.isProcessing = true
    const operations = [...this.pendingOperations]
    this.pendingOperations = []
    
    const failed = []
    for (const op of operations) {
      const attempts = (op.attempts || 0) + 1
      try {
        await this.executeOperation(op)
        // Succès: on supprime de Dexie
        await db.offlineQueue.delete(op.id)
      } catch (err) {
        logger.error('Erreur exécution opération:', err)
        if (attempts < 5) {
          failed.push({ ...op, attempts })
          // Mettre à jour le nombre de tentatives dans Dexie
          await db.offlineQueue.update(op.id, { attempts })
        } else {
          logger.error('Opération abandonnée après 5 échecs:', op)
          await db.offlineQueue.update(op.id, { status: 'failed', attempts })
        }
      }
    }

    if (failed.length > 0) {
      this.pendingOperations = [...this.pendingOperations, ...failed]
    }
    
    this.notifyListeners()
    this.isProcessing = false
  }

  async executeOperation(op) {
    const { table, operation, data, id } = op.payload || op
    let response
    
    switch (operation) {
      case 'insert':
        response = await supabase.from(table).insert(data)
        break
      case 'update':
        response = await supabase.from(table).update(data).eq('id', id)
        break
      case 'delete':
        response = await supabase.from(table).delete().eq('id', id)
        break
      case 'upsert':
        response = await supabase.from(table).upsert(data, { onConflict: 'id' })
        break
      default:
        throw new Error(`Opération inconnue: ${operation}`)
    }

    if (response && response.error) {
      throw response.error
    }
    return response
  }

  subscribe(callback) {
    this.listeners.push(callback)
    // Envoyer l'état actuel immédiatement
    callback({
      isOnline: this.isOnline,
      isSupabaseConnected: this.isSupabaseConnected,
      pendingOperations: this.pendingOperations.length,
      reconnectAttempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting
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
      reconnectAttempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting
    }
    this.listeners.forEach(cb => cb(state))
  }

  getState() {
    return {
      isOnline: this.isOnline,
      isSupabaseConnected: this.isSupabaseConnected,
      pendingOperations: this.pendingOperations.length,
      reconnectAttempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting
    }
  }

  forceReconnect() {
    this.reconnectAttempts = 0
    this.isReconnecting = false
    this.isCheckingConnection = false
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.checkConnection()
  }
}

export const connectionManager = new ConnectionManager()
