import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { supabase } from './lib/supabaseClient'
import { useClientsStore } from './store/useClientsStore'
import { useAuthStore } from './store/useAuthStore'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { NotificationProvider } from './components/NotificationProvider'
import Login from './modules/auth/Login'
import PWAInstallBanner from './components/PWAInstallBanner'
import PWAUpdateNotice from './components/PWAUpdateNotice'

const DashboardEnhanced     = lazy(() => import('./modules/DashboardEnhanced'))
const SuiviAOModule         = lazy(() => import('./modules/ao').then(m => ({ default: m.SuiviAO })))
const SuiviFacturesModule   = lazy(() => import('./modules/factures').then(m => ({ default: m.SuiviFactures })))
const ImportExport          = lazy(() => import('./modules/importexport/ImportExport'))
const PlanificationProjet   = lazy(() => import('./modules/planification/PlanificationProjet'))
const DevisCalorifuge       = lazy(() => import('./modules/devis/DevisCalorifuge'))
const DevisPliage           = lazy(() => import('./modules/devis/DevisPliage'))
const DevisReservoir        = lazy(() => import('./modules/devis/DevisReservoir'))
const DevisSoudure          = lazy(() => import('./modules/devis/DevisSoudure'))
const DevisCharpente        = lazy(() => import('./modules/devis/DevisCharpente'))
const DevisTuyauterie       = lazy(() => import('./modules/devis/DevisTuyauterie'))
const DevisChaudronnerie    = lazy(() => import('./modules/devis/DevisChaudronnerie'))
const ListeDevis            = lazy(() => import('./modules/devis/ListeDevis'))
const EnregistrementCaisse  = lazy(() => import('./modules/caisse/EnregistrementCaisse'))
const JournalCaisse         = lazy(() => import('./modules/caisse/JournalCaisse'))
const EncaissementParClient = lazy(() => import('./modules/encaissements/EncaissementParClient'))
const Clients               = lazy(() => import('./modules/clients/Clients'))
const Utilisateurs          = lazy(() => import('./modules/auth/Utilisateurs'))
const FournisseursModule    = lazy(() => import('./modules/fournisseurs').then(m => ({ default: m.Fournisseurs })))
const AchatsModule          = lazy(() => import('./modules/achats/Achats'))
const DepensesModule        = lazy(() => import('./modules/depenses/Depenses'))
const InjectionDonnees      = lazy(() => import('./components/InjectionDonnees'))
const TourDeControle        = lazy(() => import('./components/TourDeControle'))
const Parametres            = lazy(() => import('./components/Parametres'))
const Rapport               = lazy(() => import('./modules/rapport/Rapport'))

const PageChargement = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E60000', borderTopColor: 'transparent' }}></div>
  </div>
)

function AdminRoute({ children }) {
  const utilisateurConnecte = useAuthStore(state => state.utilisateurConnecte)
  if (!utilisateurConnecte) return <Navigate to="/login" replace />
  const role = utilisateurConnecte.role
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  const [loading, setLoading] = useState(true)
  const setClients = useClientsStore(state => state.setClients)

  useEffect(() => {
    async function loadData() {
      try {
        const { data: clientsData, error } = await supabase
          .from('clients')
          .select('*')
          .order('id')
        
        if (error) throw error
        
        if (clientsData && clientsData.length > 0) {
          const clients = clientsData.map(c => ({
            id: c.id,
            nom: c.nom,
            raisonSociale: c.raison_sociale,
            ncc: c.ncc,
            secteur: c.secteur,
            adresse: c.adresse,
            ville: c.ville,
            pays: c.pays,
            contactNom: c.contact_nom,
            contactTelephone: c.contact_telephone,
            contactEmail: c.contact_email,
            conditionsPaiement: c.conditions_paiement,
            type: c.type,
            isActif: c.is_actif,
            notes: c.notes,
            dateCreation: c.date_creation
          }))
          setClients(clients)
        }
        setLoading(false)
      } catch (err) {
        console.error('Erreur chargement Supabase:', err)
        setLoading(false)
      }
    }
    loadData()
  }, [setClients])

  return (
    <ErrorBoundary>
    <NotificationProvider>
      <BrowserRouter>
        <Suspense fallback={<PageChargement />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* TABLEAU DE BORD */}
              <Route path="dashboard" element={<DashboardEnhanced />} />
              <Route path="rapport" element={<Rapport />} />

              {/* RÉFÉRENTIEL CLIENTS */}
              <Route path="clients" element={<Clients />} />

              {/* PILOTAGE PROJETS */}
              <Route path="planification" element={<ErrorBoundary><PlanificationProjet /></ErrorBoundary>} />

              {/* APPELS D'OFFRES */}
              <Route path="ao" element={<SuiviAOModule />} />

              {/* DEVIS */}
              <Route path="devis/calorifuge" element={<DevisCalorifuge />} />
              <Route path="devis/pliage" element={<DevisPliage />} />
              <Route path="devis/reservoir" element={<DevisReservoir />} />
              <Route path="devis/soudure" element={<DevisSoudure />} />
              <Route path="devis/charpente" element={<DevisCharpente />} />
              <Route path="devis/tuyauterie" element={<DevisTuyauterie />} />
              <Route path="devis/chaudronnerie" element={<DevisChaudronnerie />} />
              <Route path="devis/liste" element={<ListeDevis />} />

              {/* FINANCE */}
              <Route path="factures" element={<SuiviFacturesModule />} />
              <Route path="encaissements" element={<EncaissementParClient />} />
              <Route path="caisse" element={<EnregistrementCaisse />} />
              <Route path="journal" element={<JournalCaisse />} />
              <Route path="fournisseurs" element={<FournisseursModule />} />
              <Route path="achats" element={<AchatsModule />} />
              <Route path="depenses" element={<DepensesModule />} />

              {/* OUTILS */}
              <Route path="import-export" element={<ImportExport />} />
              <Route path="injection-donnees" element={<AdminRoute><InjectionDonnees /></AdminRoute>} />

              {/* PILOTAGE — ADMIN/SUPER_ADMIN uniquement */}
              <Route path="utilisateurs" element={<AdminRoute><Utilisateurs /></AdminRoute>} />
              <Route path="tour-de-controle" element={<AdminRoute><TourDeControle /></AdminRoute>} />
              <Route path="parametres" element={<AdminRoute><Parametres /></AdminRoute>} />
            </Route>
          </Routes>
        </Suspense>
        <PWAInstallBanner />
        <PWAUpdateNotice />
      </BrowserRouter>
    </NotificationProvider>
    </ErrorBoundary>
  )
}

export default App
