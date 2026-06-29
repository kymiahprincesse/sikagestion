import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useUtilisateursStore } from '../store/useUtilisateursStore'
import { logger } from '../utils/logger'

/**
 * Hook pour la synchronisation en temps réel des utilisateurs et autres tables
 * Gère les subscriptions Supabase avec reconnexion automatique
 */
export function useRealtimeSync() {
  const subscriptionsRef = useRef([])
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    async function setupRealtimeSync() {
      try {
        // ═══════════════════════════════════════════════════════
        // SYNCHRONISATION TEMPS RÉEL - TABLE UTILISATEURS
        // ═══════════════════════════════════════════════════════
        const utilisateurChannel = supabase
          .channel('public:utilisateurs')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'utilisateurs'
            },
            (payload) => {
              logger.log('📡 Changement utilisateurs détecté:', payload.eventType)
              
              const store = useUtilisateursStore.getState()
              
              if (payload.eventType === 'INSERT') {
                store.addUtilisateurFromRealtime(payload.new)
              } else if (payload.eventType === 'UPDATE') {
                store.updateUtilisateurFromRealtime(payload.new)
              } else if (payload.eventType === 'DELETE') {
                store.deleteUtilisateurFromRealtime(payload.old.id)
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              logger.log('✅ Synchronisation temps réel utilisateurs activée')
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              logger.warn('⚠️ Synchronisation utilisateurs interrompue:', status)
              // Réessayer après un délai
              setTimeout(() => {
                setupRealtimeSync()
              }, 5000)
            }
          })

        subscriptionsRef.current.push(utilisateurChannel)

        // ═══════════════════════════════════════════════════════
        // SYNCHRONISATION TEMPS RÉEL - AUTRES TABLES
        // ═══════════════════════════════════════════════════════
        const tablesList = [
          'clients',
          'factures',
          'devis',
          'appels_offres',
          'fournisseurs',
          'projets',
          'mouvements_caisse',
          'encaissements',
          'taches'
        ]

        tablesList.forEach(tableName => {
          const channel = supabase
            .channel(`public:${tableName}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: tableName
              },
              (payload) => {
                logger.log(`📡 Changement ${tableName} détecté:`, payload.eventType)
                
                // Gérer les mises à jour par table (imports dynamiques pour éviter dépendances circulaires)
                if (tableName === 'devis') {
                  import('../store/useDevisStore.js').then(m => {
                    const store = m.useDevisStore.getState()
                    if (payload.eventType === 'INSERT') {
                      store.addDevisFromRealtime(payload.new)
                    } else if (payload.eventType === 'UPDATE') {
                      store.updateDevisFromRealtime(payload.new)
                    } else if (payload.eventType === 'DELETE') {
                      store.deleteDevisFromRealtime(payload.old.id)
                    }
                  }).catch(err => logger.error('Erreur import useDevisStore:', err))
                } else if (tableName === 'factures') {
                  import('../store/useFacturesStore.js').then(m => {
                    const store = m.useFacturesStore.getState()
                    if (payload.eventType === 'INSERT') {
                      store.addFactureFromRealtime(payload.new)
                    } else if (payload.eventType === 'UPDATE') {
                      store.updateFactureFromRealtime(payload.new)
                    } else if (payload.eventType === 'DELETE') {
                      store.deleteFactureFromRealtime(payload.old.id)
                    }
                  }).catch(err => logger.error('Erreur import useFacturesStore:', err))
                } else if (tableName === 'clients') {
                  import('../store/useClientsStore.js').then(m => {
                    const store = m.useClientsStore.getState()
                    if (payload.eventType === 'INSERT') {
                      store.addClientFromRealtime(payload.new)
                    } else if (payload.eventType === 'UPDATE') {
                      store.updateClientFromRealtime(payload.new)
                    } else if (payload.eventType === 'DELETE') {
                      store.deleteClientFromRealtime(payload.old.id)
                    }
                  }).catch(err => logger.error('Erreur import useClientsStore:', err))
                }
              }
            )
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                logger.log(`✅ Synchronisation temps réel ${tableName} activée`)
              }
            })

          subscriptionsRef.current.push(channel)
        })

        logger.log(`🔄 Synchronisation temps réel initialisée pour ${subscriptionsRef.current.length} canaux`)
      } catch (err) {
        logger.error('Erreur initialisation synchronisation temps réel:', err)
      }
    }

    setupRealtimeSync()

    // Cleanup
    return () => {
      subscriptionsRef.current.forEach(sub => {
        supabase.removeChannel(sub)
      })
      subscriptionsRef.current = []
    }
  }, [])
}

/**
 * Hook pour forcer une synchronisation complète des données
 */
export function useForceSyncAll() {
  return async () => {
    try {
      logger.log('🔄 Forçage de la synchronisation complète...')
      
      const utilisateursRes = await supabase
        .from('utilisateurs')
        .select('*')
        .order('id')

      if (!utilisateursRes.error && utilisateursRes.data?.length > 0) {
        const utilisateurs = utilisateursRes.data.map(u => ({
          id: u.id,
          nom: u.nom,
          login: u.login,
          email: u.email || '',
          role: u.role,
          actif: u.is_actif,
          auth_user_id: u.auth_user_id || null,
          permissions: u.permissions || null,
        }))
        useUtilisateursStore.setState({ utilisateurs })
        logger.log(`✅ ${utilisateurs.length} utilisateurs synchronisés`)
      }

      return { success: true, message: 'Synchronisation complète réussie' }
    } catch (err) {
      logger.error('Erreur synchronisation complète:', err)
      return { success: false, message: err.message }
    }
  }
}
