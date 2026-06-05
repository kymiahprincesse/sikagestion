import React, { useState } from 'react'
import { injecterToutesDonnees } from '../scripts/injectDonneesReelles'
import { injecterDevis, injecterFactures, injecterAppelsOffres } from '../scripts/injectDevisFacturesV2'
import { supabase } from '../lib/supabaseClient'
import { useNotificationsStore } from '../store/useNotificationsStore'

export default function InjectionDonnees() {
  const [loading, setLoading] = useState(false)
  const [rapport, setRapport] = useState(null)
  const [error, setError] = useState(null)
  const { ajouterNotification } = useNotificationsStore()

  const executerInjectionComplete = async () => {
    setLoading(true)
    setError(null)
    setRapport(null)

    try {
      console.log('🚀 Début injection complète...')
      
      // Étape 1: Injection base (clients, fournisseurs, utilisateurs, projets)
      const rapportBase = await injecterToutesDonnees()
      
      // Étape 2: Récupérer les clients injectés pour les devis/factures
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .in('nom', ['GESTOCI SA', 'SUCRIVOIRE SA', 'CIE', 'PALM CI', 'SODEMI'])
      
      if (clientsError) throw clientsError
      
      // Étape 3: Injection devis
      const rapportDevis = await injecterDevis(clientsData)
      
      // Étape 4: Récupérer les devis pour les factures
      const { data: devisData, error: devisError } = await supabase
        .from('devis')
        .select('*')
        .in('numero', ['DEV-CAL-2026-001', 'DEV-RES-2026-002'])
      
      if (devisError) throw devisError
      
      // Étape 5: Injection factures
      const rapportFactures = await injecterFactures(clientsData, devisData)
      
      // Étape 6: Injection appels d'offres
      const rapportAO = await injecterAppelsOffres(clientsData)
      
      const rapportFinal = {
        ...rapportBase,
        devis: rapportDevis,
        factures: rapportFactures,
        appelsDoffres: rapportAO,
        timestamp: new Date().toISOString()
      }
      
      setRapport(rapportFinal)
      console.log('✅ Injection complète terminée avec succès')
      
    } catch (err) {
      console.error('❌ Erreur lors de l\'injection:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const nettoyerDonnees = async () => {
    if (!window.confirm('⚠️ ATTENTION: Cela va supprimer TOUTES les données injectées. Continuer ?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Supprimer dans l'ordre inverse des dépendances
      await supabase.from('factures').delete().in('numero', ['FACT-2026-001', 'FACT-2026-002', 'FACT-2026-003'])
      await supabase.from('devis').delete().in('numero', ['DEV-CAL-2026-001', 'DEV-RES-2026-002', 'DEV-TUY-2026-003', 'DEV-PLI-2026-004'])
      await supabase.from('appels_offres').delete().in('numero_devis', ['AO-GESTOCI-2026-07', 'AO-CIE-2026-05', 'AO-SODEMI-2026-03'])
      await supabase.from('projets').delete().like('reference_projet', 'PROJ-%')
      await supabase.from('utilisateurs').delete().in('login', ['assande', 'aminata', 'rodrigue'])
      await supabase.from('fournisseurs').delete().in('nom', ['METALTECH SOUDURE CI', 'ISOTHERM AFRIQUE', 'TRANS-CI LOGISTIQUE', 'ACIER DISTRIBUTION CI'])
      await supabase.from('clients').delete().in('nom', ['GESTOCI SA', 'SUCRIVOIRE SA', 'CIE', 'PALM CI', 'SODEMI'])
      
      setRapport(null)
      ajouterNotification({
        type: 'INFO',
        icone: '✅',
        titre: 'NETTOYAGE',
        message: 'Toutes les données injectées ont été supprimées'
      })
    } catch (err) {
      console.error('❌ Erreur nettoyage:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-navy mb-6">
          🚀 Injection Données Réelles SIKAGESTION
        </h1>

        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <h3 className="font-bold text-blue-900 mb-2">📋 Ce qui sera injecté :</h3>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li>5 Clients réels (GESTOCI, SUCRIVOIRE, CIE, PALM CI, SODEMI)</li>
            <li>4 Fournisseurs/Sous-traitants</li>
            <li>3 Utilisateurs (ASSANDE, AMINATA, RODRIGUE)</li>
            <li>15 Projets réels (3 par client)</li>
            <li>4 Devis (Calorifuge, Réservoir, Tuyauterie, Pliage)</li>
            <li>3 Factures (1 partielle, 1 en attente, 1 payée)</li>
            <li>3 Appels d'offres (différents statuts)</li>
          </ul>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={executerInjectionComplete}
            disabled={loading}
            className="flex-1 bg-accent hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳ Injection en cours...' : '✨ Injecter les données'}
          </button>

          <button
            onClick={nettoyerDonnees}
            disabled={loading}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            🗑️ Nettoyer
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <h3 className="font-bold text-red-900 mb-2">❌ Erreur</h3>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {rapport && (
          <div className="bg-green-50 border-l-4 border-green-500 rounded p-4">
            <h3 className="font-bold text-green-900 mb-4">✅ Rapport d'injection</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-semibold text-gray-700">Clients</div>
                <div className={rapport.clients.success ? 'text-green-600' : 'text-red-600'}>
                  {rapport.clients.success ? '✅' : '❌'} {rapport.clients.count} injectés
                </div>
              </div>

              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-semibold text-gray-700">Fournisseurs</div>
                <div className={rapport.fournisseurs.success ? 'text-green-600' : 'text-red-600'}>
                  {rapport.fournisseurs.success ? '✅' : '❌'} {rapport.fournisseurs.count} injectés
                </div>
              </div>

              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-semibold text-gray-700">Utilisateurs</div>
                <div className={rapport.utilisateurs.success ? 'text-green-600' : 'text-red-600'}>
                  {rapport.utilisateurs.success ? '✅' : '❌'} {rapport.utilisateurs.count} injectés
                </div>
              </div>

              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-semibold text-gray-700">Projets</div>
                <div className={rapport.projets.success ? 'text-green-600' : 'text-red-600'}>
                  {rapport.projets.success ? '✅' : '❌'} {rapport.projets.count} injectés
                </div>
              </div>

              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-semibold text-gray-700">Devis</div>
                <div className={rapport.devis?.success ? 'text-green-600' : 'text-red-600'}>
                  {rapport.devis?.success ? '✅' : '❌'} {rapport.devis?.count || 0} injectés
                </div>
              </div>

              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-semibold text-gray-700">Factures</div>
                <div className={rapport.factures?.success ? 'text-green-600' : 'text-red-600'}>
                  {rapport.factures?.success ? '✅' : '❌'} {rapport.factures?.count || 0} injectées
                </div>
              </div>

              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-semibold text-gray-700">Appels d'offres</div>
                <div className={rapport.appelsDoffres?.success ? 'text-green-600' : 'text-red-600'}>
                  {rapport.appelsDoffres?.success ? '✅' : '❌'} {rapport.appelsDoffres?.count || 0} injectés
                </div>
              </div>

              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-semibold text-gray-700">Horodatage</div>
                <div className="text-gray-600 text-xs">
                  {rapport.timestamp ? new Date(rapport.timestamp).toLocaleString('fr-FR') : '-'}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-100 rounded">
              <p className="text-sm text-blue-900">
                💡 <strong>Prochaine étape :</strong> Vérifiez dans Supabase Dashboard que toutes les données sont bien présentes, puis testez chaque module de l'application.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
