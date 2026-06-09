import { useState, useEffect } from 'react'
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

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncResult(null)
    setShowResult(false)

    try {
      const result = await syncService.syncAll({
        clients,
        factures,
        devis,
        appelsDoffres,
        fournisseurs,
        projets,
        mouvements
      })

      setSyncResult(result)
      setShowResult(true)

      setTimeout(() => {
        setShowResult(false)
      }, 5000)
    } catch (error) {
      setSyncResult({ success: false, error: error.message })
      setShowResult(true)
    } finally {
      setIsSyncing(false)
    }
  }

  // Synchronisation automatique toutes les 30 secondes (optimisé)
  useEffect(() => {
    handleSync()
    const interval = setInterval(() => {
      handleSync()
    }, 30000)
    return () => clearInterval(interval)
  }, [clients, factures, devis, appelsDoffres, fournisseurs, projets, mouvements])

  // Mise à jour de l'heure toutes les secondes
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
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
