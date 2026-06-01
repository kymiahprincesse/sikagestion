import { useState } from 'react'
import { syncService } from '../services/supabaseSync'
import { useClientsStore } from '../store/useClientsStore'
import { useFacturesStore } from '../store/useFacturesStore'
import { useDevisStore } from '../store/useDevisStore'
import { useAOStore } from '../store/useAOStore'
import { useFournisseursStore } from '../store/useFournisseursStore'
import { usePlanificationStore } from '../store/usePlanificationStore'
import { useCaisseStore } from '../store/useCaisseStore'
import { Upload, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

export default function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [showResult, setShowResult] = useState(false)

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

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#E60000' }}
      >
        {isSyncing ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Synchronisation...</span>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            <span>Synchroniser avec Supabase</span>
          </>
        )}
      </button>

      {showResult && syncResult && (
        <div
          className={`absolute top-full mt-2 right-0 w-80 p-4 rounded-lg shadow-lg border-2 ${
            syncResult.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
          }`}
        >
          <div className="flex items-start gap-3">
            {syncResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h4 className={`font-bold ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {syncResult.success ? 'Synchronisation réussie !' : 'Erreur de synchronisation'}
              </h4>
              {syncResult.success && (
                <p className="text-sm text-green-700 mt-1">
                  {syncResult.totalSynced} enregistrement(s) synchronisé(s)
                </p>
              )}
              {syncResult.error && (
                <p className="text-sm text-red-700 mt-1">{syncResult.error}</p>
              )}
              {syncResult.results && (
                <div className="mt-2 text-xs space-y-1">
                  {syncResult.results.clients?.success && (
                    <div className="text-green-700">✓ Clients: {syncResult.results.clients.count}</div>
                  )}
                  {syncResult.results.factures?.success && (
                    <div className="text-green-700">✓ Factures: {syncResult.results.factures.count}</div>
                  )}
                  {syncResult.results.devis?.success && (
                    <div className="text-green-700">✓ Devis: {syncResult.results.devis.count}</div>
                  )}
                  {syncResult.results.ao?.success && (
                    <div className="text-green-700">✓ Appels d'offres: {syncResult.results.ao.count}</div>
                  )}
                  {syncResult.results.fournisseurs?.success && (
                    <div className="text-green-700">✓ Fournisseurs: {syncResult.results.fournisseurs.count}</div>
                  )}
                  {syncResult.results.projets?.success && (
                    <div className="text-green-700">✓ Projets: {syncResult.results.projets.count}</div>
                  )}
                  {syncResult.results.caisse?.success && (
                    <div className="text-green-700">✓ Caisse: {syncResult.results.caisse.count}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
