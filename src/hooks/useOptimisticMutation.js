import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Hook pour gérer les mutations avec Optimistic UI
 * - Affiche immédiatement le résultat
 * - Gère le rollback en cas d'erreur
 * - Affiche des notifications
 */
export function useOptimisticMutation() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async ({
    operation,           // 'add' | 'update' | 'delete'
    optimisticUpdate,    // Fonction pour mise à jour optimiste
    supabaseCall,        // Fonction async qui appelle Supabase
    rollback,           // Fonction pour annuler en cas d'erreur
    onSuccess,          // Callback succès
    onError,            // Callback erreur
    toast               // Fonction pour afficher toast
  }) => {
    setPending(true)
    setError(null)

    // 1. Sauvegarder l'état actuel pour rollback
    const rollbackData = rollback ? null : undefined

    try {
      // 2. Mise à jour optimiste (affichage immédiat)
      if (optimisticUpdate) {
        optimisticUpdate()
      }

      // 3. Appel Supabase
      const result = await supabaseCall()

      // 4. Succès
      if (onSuccess) {
        onSuccess(result)
      }

      if (toast) {
        toast({
          type: 'success',
          message: operation === 'delete' ? 'Supprimé avec succès' :
                   operation === 'update' ? 'Modifié avec succès' :
                   'Créé avec succès'
        })
      }

      return { success: true, data: result }

    } catch (err) {
      // 5. Erreur - Rollback
      setError(err.message)

      if (rollback) {
        rollback()
      }

      if (onError) {
        onError(err)
      }

      if (toast) {
        toast({
          type: 'error',
          message: `Erreur: ${err.message}`
        })
      }

      return { success: false, error: err }

    } finally {
      setPending(false)
    }
  }, [])

  return { mutate, pending, error }
}

/**
 * Crée une opération optimiste pour un store Zustand
 */
export function createOptimisticOperation({
  store,
  table,
  toSupabaseRow,
  fromSupabaseRow,
  setItems,
  addItem,
  updateItem,
  deleteItem
}) {
  return {
    // Ajouter avec optimistic UI
    async add(item, toast) {
      const tempId = Date.now()
      const newItem = { ...item, id: tempId, _pending: true }

      // Optimistic update
      addItem(newItem)

      try {
        const { data, error } = await supabase
          .from(table)
          .insert(toSupabaseRow(item))
          .select()
          .single()

        if (error) throw error

        // Remplacer le tempId par le vrai ID
        updateItem(tempId, { id: data.id, _pending: false, ...fromSupabaseRow(data) })

        if (toast) {
          toast({ type: 'success', message: 'Créé avec succès' })
        }

        return { success: true, data }

      } catch (err) {
        // Rollback
        deleteItem(tempId)

        if (toast) {
          toast({ type: 'error', message: `Erreur: ${err.message}` })
        }

        return { success: false, error: err }
      }
    },

    // Mettre à jour avec optimistic UI
    async update(id, modifications, toast) {
      const previousItem = store.getState()[table].find(i => i.id === id)

      // Optimistic update
      updateItem(id, { ...modifications, _pending: true })

      try {
        const { data, error } = await supabase
          .from(table)
          .update(toSupabaseRow({ ...previousItem, ...modifications }))
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        updateItem(id, { _pending: false })

        if (toast) {
          toast({ type: 'success', message: 'Modifié avec succès' })
        }

        return { success: true, data }

      } catch (err) {
        // Rollback
        updateItem(id, { ...previousItem, _pending: false })

        if (toast) {
          toast({ type: 'error', message: `Erreur: ${err.message}` })
        }

        return { success: false, error: err }
      }
    },

    // Supprimer avec optimistic UI
    async delete(id, toast) {
      const deletedItem = store.getState()[table].find(i => i.id === id)

      // Optimistic update
      deleteItem(id)

      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id)

        if (error) throw error

        if (toast) {
          toast({ type: 'success', message: 'Supprimé avec succès' })
        }

        return { success: true }

      } catch (err) {
        // Rollback
        addItem(deletedItem)

        if (toast) {
          toast({ type: 'error', message: `Erreur: ${err.message}` })
        }

        return { success: false, error: err }
      }
    }
  }
}
