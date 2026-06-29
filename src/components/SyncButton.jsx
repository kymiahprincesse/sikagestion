import { useState, useEffect, useRef, useCallback } from 'react'
import { syncService } from '../services/supabaseSync'
import { useClientsStore } from '../store/useClientsStore'
import { useFacturesStore } from '../store/useFacturesStore'
import { useDevisStore } from '../store/useDevisStore'
import { useAOStore } from '../store/useAOStore'
import { useFournisseursStore } from '../store/useFournisseursStore'
import { usePlanificationStore } from '../store/usePlanificationStore'
import { useCaisseStore } from '../store/useCaisseStore'
import { Upload, Download, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react'

export default function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const clients = useClientsStore(state => state.clients)
  const factures = useFacturesStore(state => state.factures)
  const devis = useDevisStore(state => state.devis)
  const appelsDoffres = useAOStore(state => state.appelsDoffres)
  const fournisseurs = useFournisseursStore(state => state.fournisseurs)
  const projets = usePlanificationStore(state => state.projets)
  const mouvements = useCaisseStore(state => state.mouvements)

  // Ref toujours à jour — évite de mettre les tableaux dans les deps de l'effet
  const storeDataRef = useRef({ clients, factures, devis, appelsDoffres, fournisseurs, projets, mouvements })
  useEffect(() => {
    storeDataRef.current = { clients, factures, devis, appelsDoffres, fournisseurs, projets, mouvements }
  }, [clients, factures, devis, appelsDoffres, fournisseurs, projets, mouvements])

  const toastTimeoutRef = useRef(null)
  const isSyncingRef = useRef(false)

  useEffect(() => {
    isSyncingRef.current = isSyncing
  }, [isSyncing])

  const handleSync = useCallback(async () => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    setIsSyncing(true)
    setSyncResult(null)
    setShowResult(false)

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)

    try {
      const result = await syncService.syncAll(storeDataRef.current)
      setSyncResult(result)
      setShowResult(true)

      toastTimeoutRef.current = setTimeout(() => {
        setShowResult(false)
      }, 5000)
    } catch (error) {
      setSyncResult({ success: false, error: error.message })
      setShowResult(true)
    } finally {
      isSyncingRef.current = false
      setIsSyncing(false)
    }
  }, [])

  // Synchronisation automatique toutes les 60 secondes — stable, ne se re-déclenche pas sur chaque changement de données
  useEffect(() => {
    handleSync()
    const interval = setInterval(handleSync, 60000)
    return () => {
      clearInterval(interval)
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [handleSync])

  // Mise à jour de l'heure toutes les minutes (suffisant pour l'affichage header)
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timeInterval)
  }, [])

  const formatDateTime = (date) => {
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const jour = jours[date.getDay()]
    const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const heureStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    return { jour, dateStr, heureStr }
  }

  const { jour, dateStr, heureStr } = formatDateTime(currentTime)

  return (
    <div className="relative">
      {/* Affichage Date et Heure */}
      <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#1B2A4A] text-white shadow-xl border-2 border-[#E60000]">
        <Clock className="w-8 h-8 text-[#E60000]" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold text-[#C8C8D0] uppercase tracking-wide">{jour} {dateStr}</span>
          <span className="text-2xl font-bold text-white">{heureStr}</span>
        </div>
      </div>

      {/* Bouton de synchronisation masqué mais fonctionnel */}
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="hidden"
      >
        Sync
      </button>

    </div>
  )
}
