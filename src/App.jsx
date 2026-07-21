import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { useAuthStore } from './store/useAuthStore'
import { useThemeStore } from './store/useThemeStore'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { NotificationProvider } from './components/NotificationProvider'
import Login from './modules/auth/Login'
import PWAInstallBanner from './components/PWAInstallBanner'
import PWAUpdateNotice from './components/PWAUpdateNotice'
import { NetworkStatusBanner } from './components/NetworkStatusBanner'

// Helper pour forcer le rafraîchissement si un module échoue au chargement (évite l'erreur Failed to fetch dynamically imported module)
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

const DashboardEnhanced     = lazyWithRetry(() => import('./modules/DashboardEnhanced'))
const SuiviAOModule         = lazyWithRetry(() => import('./modules/ao').then(m => ({ default: m.SuiviAO })))
const SuiviFacturesModule   = lazyWithRetry(() => import('./modules/factures').then(m => ({ default: m.SuiviFactures })))
const ImportExport          = lazyWithRetry(() => import('./modules/importexport/ImportExport'))
const PlanificationProjet   = lazyWithRetry(() => import('./modules/planification/PlanificationProjet'))
const DevisCalorifuge       = lazyWithRetry(() => import('./modules/devis/DevisCalorifuge'))
const DevisPliage           = lazyWithRetry(() => import('./modules/devis/DevisPliage'))
const DevisReservoir        = lazyWithRetry(() => import('./modules/devis/DevisReservoir'))
const DevisSoudure          = lazyWithRetry(() => import('./modules/devis/DevisSoudure'))
const DevisCharpente        = lazyWithRetry(() => import('./modules/devis/DevisCharpente'))
const DevisTuyauterie       = lazyWithRetry(() => import('./modules/devis/DevisTuyauterie'))
const DevisChaudronnerie    = lazyWithRetry(() => import('./modules/devis/DevisChaudronnerie'))
const ListeDevis            = lazyWithRetry(() => import('./modules/devis/ListeDevis'))
const EnregistrementCaisse  = lazyWithRetry(() => import('./modules/caisse/EnregistrementCaisse'))
const JournalCaisse         = lazyWithRetry(() => import('./modules/caisse/JournalCaisse'))
const EncaissementParClient = lazyWithRetry(() => import('./modules/encaissements/EncaissementParClient'))
const Clients               = lazyWithRetry(() => import('./modules/clients/Clients'))
const Utilisateurs          = lazyWithRetry(() => import('./modules/auth/Utilisateurs'))
const FournisseursModule    = lazyWithRetry(() => import('./modules/fournisseurs').then(m => ({ default: m.Fournisseurs })))
const TourDeControle        = lazyWithRetry(() => import('./components/TourDeControle'))
const Parametres            = lazyWithRetry(() => import('./components/Parametres'))
const Rapport               = lazyWithRetry(() => import('./modules/rapport/Rapport'))

const PageChargement = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}></div>
  </div>
)

function AdminRoute({ children }) {
  const utilisateurConnecte = useAuthStore(state => state.utilisateurConnecte)
  const hasHydrated = useAuthStore(state => state._hasHydrated)
  const isAdmin = useAuthStore(state => state.isAdmin)
  
  if (!hasHydrated) return <PageChargement />
  if (!utilisateurConnecte) return <Navigate to="/login" replace />
  if (!isAdmin()) return <Navigate to="/dashboard" replace />
  
  return children
}

function App() {
  const theme = useThemeStore(state => state.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

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
              <Route path="devis/calorifuge" element={<ErrorBoundary><DevisCalorifuge /></ErrorBoundary>} />
              <Route path="devis/pliage" element={<ErrorBoundary><DevisPliage /></ErrorBoundary>} />
              <Route path="devis/reservoir" element={<ErrorBoundary><DevisReservoir /></ErrorBoundary>} />
              <Route path="devis/soudure" element={<ErrorBoundary><DevisSoudure /></ErrorBoundary>} />
              <Route path="devis/charpente" element={<ErrorBoundary><DevisCharpente /></ErrorBoundary>} />
              <Route path="devis/tuyauterie" element={<ErrorBoundary><DevisTuyauterie /></ErrorBoundary>} />
              <Route path="devis/chaudronnerie" element={<ErrorBoundary><DevisChaudronnerie /></ErrorBoundary>} />
              <Route path="devis/liste" element={<ErrorBoundary><ListeDevis /></ErrorBoundary>} />

              {/* FINANCE */}
              <Route path="factures" element={<ErrorBoundary><SuiviFacturesModule /></ErrorBoundary>} />
              <Route path="encaissements" element={<ErrorBoundary><EncaissementParClient /></ErrorBoundary>} />
              <Route path="caisse" element={<ErrorBoundary><EnregistrementCaisse /></ErrorBoundary>} />
              <Route path="journal" element={<ErrorBoundary><JournalCaisse /></ErrorBoundary>} />
              <Route path="fournisseurs" element={<ErrorBoundary><FournisseursModule /></ErrorBoundary>} />

              {/* OUTILS */}
              <Route path="import-export" element={<ImportExport />} />

              {/* PILOTAGE — ADMIN/SUPER_ADMIN uniquement */}
              <Route path="utilisateurs" element={<AdminRoute><Utilisateurs /></AdminRoute>} />
              <Route path="tour-de-controle" element={<AdminRoute><TourDeControle /></AdminRoute>} />
              <Route path="parametres" element={<AdminRoute><Parametres /></AdminRoute>} />
            </Route>
          </Routes>
        </Suspense>
        <PWAInstallBanner />
        <PWAUpdateNotice />
        <NetworkStatusBanner />
      </BrowserRouter>
    </NotificationProvider>
    </ErrorBoundary>
  )
}

export default App
