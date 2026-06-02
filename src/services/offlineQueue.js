import { useState, useEffect } from 'react'

/**
 * Service de file d'attente pour les opérations offline
 * Stocke les opérations en local et les synchronise quand la connexion revient
 */

const QUEUE_KEY = 'sika_offline_queue'
const LAST_SYNC_KEY = 'sika_last_sync'

class OfflineQueue {
  constructor() {
    this.queue = []
    this.isProcessing = false
    this.listeners = []
    this.loadQueue()
    this.initOnlineListener()
  }

  // Charger la file d'attente depuis localStorage
  loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY)
      this.queue = stored ? JSON.parse(stored) : []
    } catch (e) {
      console.error('Erreur chargement queue:', e)
      this.queue = []
    }
  }

  // Sauvegarder la file d'attente
  saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue))
    } catch (e) {
      console.error('Erreur sauvegarde queue:', e)
    }
  }

  // Ajouter une opération à la file
  enqueue(operation) {
    const queueItem = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
      status: 'pending', // pending | processing | failed | completed
      ...operation
    }

    this.queue.push(queueItem)
    this.saveQueue()
    this.notifyListeners()

    // Essayer de traiter immédiatement si online
    if (navigator.onLine) {
      this.processQueue()
    }

    return queueItem.id
  }

  // Retirer une opération de la file
  dequeue(id) {
    this.queue = this.queue.filter(item => item.id !== id)
    this.saveQueue()
    this.notifyListeners()
  }

  // Marquer une opération comme échouée
  markFailed(id, error) {
    const item = this.queue.find(i => i.id === id)
    if (item) {
      item.status = 'failed'
      item.error = error
      item.attempts++
      this.saveQueue()
      this.notifyListeners()
    }
  }

  // Marquer comme complété
  markCompleted(id) {
    this.queue = this.queue.filter(item => item.id !== id)
    this.saveQueue()
    this.notifyListeners()
  }

  // Réinitialiser les éléments en cours de traitement
  resetProcessing() {
    this.queue.forEach(item => {
      if (item.status === 'processing') {
        item.status = 'pending'
      }
    })
    this.saveQueue()
  }

  // Traiter la file d'attente
  async processQueue() {
    if (this.isProcessing || !navigator.onLine) return

    this.isProcessing = true
    this.notifyListeners()

    const pendingItems = this.queue.filter(item =>
      item.status === 'pending' && item.attempts < item.maxAttempts
    )

    for (const item of pendingItems) {
      item.status = 'processing'
      this.saveQueue()
      this.notifyListeners()

      try {
        await this.executeOperation(item)
        this.markCompleted(item.id)
      } catch (error) {
        console.error('Erreur traitement queue item:', error)
        this.markFailed(item.id, error.message)
      }
    }

    // Mettre à jour la dernière sync
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())

    this.isProcessing = false
    this.notifyListeners()
  }

  // Exécuter une opération individuelle
  async executeOperation(item) {
    const { supabase } = await import('../lib/supabaseClient.js')

    const { table, operation, data, id } = item.payload

    switch (operation) {
      case 'insert':
        const { error: insertError } = await supabase.from(table).insert(data)
        if (insertError) throw insertError
        break

      case 'update':
        const { error: updateError } = await supabase.from(table).update(data).eq('id', id)
        if (updateError) throw updateError
        break

      case 'delete':
        const { error: deleteError } = await supabase.from(table).delete().eq('id', id)
        if (deleteError) throw deleteError
        break

      default:
        throw new Error(`Opération inconnue: ${operation}`)
    }
  }

  // Écouter les changements de connexion
  initOnlineListener() {
    window.addEventListener('online', () => {
      console.log('🌐 Connexion rétablie - Traitement de la file d\'attente')
      this.resetProcessing()
      this.processQueue()
    })

    window.addEventListener('offline', () => {
      console.log('📴 Connexion perdue - Mode offline activé')
      this.notifyListeners()
    })
  }

  // Obtenir les statistiques
  getStats() {
    return {
      total: this.queue.length,
      pending: this.queue.filter(i => i.status === 'pending').length,
      processing: this.queue.filter(i => i.status === 'processing').length,
      failed: this.queue.filter(i => i.status === 'failed').length,
      isProcessing: this.isProcessing,
      isOnline: navigator.onLine,
      lastSync: localStorage.getItem(LAST_SYNC_KEY)
    }
  }

  // S'abonner aux changements
  subscribe(callback) {
    this.listeners.push(callback)
    callback(this.getStats())
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  // Notifier les abonnés
  notifyListeners() {
    const stats = this.getStats()
    this.listeners.forEach(callback => callback(stats))
  }

  // Vider la file
  clear() {
    this.queue = []
    this.saveQueue()
    this.notifyListeners()
  }
}

// Singleton
export const offlineQueue = new OfflineQueue()

// Helper pour créer une opération
export function createOfflineOperation(table, operation, data, id = null) {
  return {
    table,
    operation, // 'insert' | 'update' | 'delete'
    data,
    id
  }
}

// Hook React pour utiliser la queue
export function useOfflineQueue() {
  const [stats, setStats] = useState(offlineQueue.getStats())

  useEffect(() => {
    return offlineQueue.subscribe(setStats)
  }, [])

  return {
    ...stats,
    enqueue: (payload) => offlineQueue.enqueue({ payload }),
    processQueue: () => offlineQueue.processQueue(),
    clear: () => offlineQueue.clear()
  }
}
