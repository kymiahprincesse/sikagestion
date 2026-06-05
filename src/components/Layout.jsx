import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import Breadcrumb from './Breadcrumb'
import NotificationSettings from './NotificationSettings'
import ShortcutsHelp from './ShortcutsHelp'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import SikaLogo from './SikaLogo'
import DataLoader from './DataLoader'
import SearchGlobal from './SearchGlobal'
import SyncStatusIndicator from './SyncStatusIndicator'
import ToastContainer from './ToastContainer'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const utilisateurConnecte = useAuthStore((state) => state.utilisateurConnecte)
  const deconnexion = useAuthStore((state) => state.deconnexion)
  const sessionExpirant = useAuthStore((state) => state.sessionExpirant)
  const updateActivite = useAuthStore((state) => state.updateActivite)
  const [devisExpanded, setDevisExpanded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Activer les raccourcis clavier
  useKeyboardShortcuts()

  useEffect(() => {
    if (!utilisateurConnecte) {
      navigate('/login')
    }
  }, [utilisateurConnecte, navigate])

  if (!utilisateurConnecte) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1B2A4A' }}>
        <div className="text-center">
          <SikaLogo size="md" />
          <p className="mt-4 text-white">Redirection vers la connexion...</p>
        </div>
      </div>
    )
  }

  const handleDeconnexion = () => {
    deconnexion()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const canAccess = (module) => {
    if (!utilisateurConnecte) return false
    const role = utilisateurConnecte.role
    
    // SUPER_ADMIN a accès absolu à tout (fantôme)
    if (role === 'SUPER_ADMIN') return true
    
    // UTILISATEURS : uniquement ADMIN et SUPER_ADMIN
    if (module === 'UTILISATEURS') {
      return role === 'ADMIN' || role === 'SUPER_ADMIN'
    }
    
    // ADMIN a accès à tout le reste
    if (role === 'ADMIN') return true
    
    // CAISSE : interdit pour SECRETAIRE
    if (module === 'CAISSE' && role === 'SECRETAIRE') return false
    
    // DEVIS : TECHNICIEN ne peut pas créer de devis (lecture seule)
    if (module === 'DEVIS' && role === 'TECHNICIEN') return false
    
    // Tous les autres modules sont accessibles
    return true
  }

  const getBreadcrumbItems = () => {
    const path = location.pathname
    const items = [{ label: 'Accueil', path: '/dashboard' }]

    if (path === '/dashboard') return items
    if (path === '/clients') items.push({ label: 'Référentiel clients' })
    if (path === '/planification') items.push({ label: 'Pilotage Projets' })
    if (path === '/ao') items.push({ label: 'Appels d\'offres' })
    if (path.startsWith('/devis/calorifuge')) items.push({ label: 'Devis', path: '/devis/liste' }, { label: 'Calorifuge' })
    if (path.startsWith('/devis/pliage')) items.push({ label: 'Devis', path: '/devis/liste' }, { label: 'Pliage' })
    if (path.startsWith('/devis/reservoir')) items.push({ label: 'Devis', path: '/devis/liste' }, { label: 'Réservoir' })
    if (path.startsWith('/devis/soudure')) items.push({ label: 'Devis', path: '/devis/liste' }, { label: 'Soudure' })
    if (path.startsWith('/devis/charpente')) items.push({ label: 'Devis', path: '/devis/liste' }, { label: 'Charpente' })
    if (path.startsWith('/devis/tuyauterie')) items.push({ label: 'Devis', path: '/devis/liste' }, { label: 'Tuyauterie' })
    if (path.startsWith('/devis/chaudronnerie')) items.push({ label: 'Devis', path: '/devis/liste' }, { label: 'Chaudronnerie' })
    if (path === '/devis/liste') items.push({ label: 'Liste & Suivi Devis' })
    if (path === '/factures') items.push({ label: 'Factures clients' })
    if (path === '/encaissements') items.push({ label: 'Encaissements' })
    if (path === '/caisse') items.push({ label: 'Enregistrement Caisse' })
    if (path === '/journal') items.push({ label: 'Journal de Caisse' })
    if (path === '/fournisseurs') items.push({ label: 'Fournisseurs' })
    if (path === '/achats') items.push({ label: 'Achats' })
    if (path === '/depenses') items.push({ label: 'Dépenses' })
    if (path === '/rapport') items.push({ label: 'Rapport de synthèse' })
    if (path === '/import-export') items.push({ label: 'Import / Export' })
    if (path === '/utilisateurs') items.push({ label: 'Utilisateurs' })
    if (path === '/tour-de-controle') items.push({ label: 'Tour de Contrôle' })
    if (path === '/parametres') items.push({ label: 'Paramètres' })

    return items
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Charger les données Supabase */}
      <DataLoader />

      {/* OVERLAY MOBILE */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed lg:sticky lg:top-0 z-30 flex flex-col h-screen transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: '280px', maxWidth: '85vw', backgroundColor: '#1B2A4A' }}
      >
        {/* HEADER SIDEBAR - Logo + Utilisateur */}
        <div className="flex-shrink-0">
          {/* Logo SIKA INDUSTRIE */}
          <div className="p-5 pb-4">
            <div className="flex flex-col items-center">
              <SikaLogo size="sm" />
            </div>
            <div className="h-0.5 mt-4" style={{ backgroundColor: '#E60000' }}></div>
          </div>

          {/* Utilisateur connecté */}
          {utilisateurConnecte && (
            <div className="px-4 pb-3">
              <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: 'rgba(31, 92, 153, 0.25)' }}>
                <p className="text-white font-semibold text-sm truncate">{utilisateurConnecte.nom}</p>
                <p className="text-xs mt-0.5" style={{ color: '#8BA3C7' }}>{utilisateurConnecte.role}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-transparent">
          {/* TABLEAU DE BORD */}
          <Link
            to="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
              isActive('/dashboard')
                ? 'text-white font-semibold'
                : 'hover:bg-opacity-10 hover:bg-white'
            }`}
            style={isActive('/dashboard') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
          >
            <span>📊</span>
            <span className="text-sm">TABLEAU DE BORD</span>
          </Link>

          {/* RAPPORT DE SYNTHÈSE */}
          <Link
            to="/rapport"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
              isActive('/rapport')
                ? 'text-white font-semibold'
                : 'hover:bg-opacity-10 hover:bg-white'
            }`}
            style={isActive('/rapport') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
          >
            <span>📈</span>
            <span className="text-sm">Rapport synthèse</span>
          </Link>

          {/* RÉFÉRENTIEL CLIENTS */}
          {canAccess('CLIENTS') && (
            <Link
              to="/clients"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/clients')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/clients') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>👥</span>
              <span className="text-sm">Référentiel clients</span>
            </Link>
          )}

          {/* PILOTAGE PROJETS */}
          {canAccess('PLANIFICATION') && (
            <Link
              to="/planification"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/planification')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/planification') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>🚀</span>
              <span className="text-sm">Pilotage Projets</span>
            </Link>
          )}

          {/* APPELS D'OFFRES */}
          {canAccess('AO') && (
            <Link
              to="/ao"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/ao')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/ao') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>📋</span>
              <span className="text-sm">Appels d'offres</span>
            </Link>
          )}

          {/* SÉPARATEUR DEVIS */}
          <div className="mt-4 mb-2 px-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1" style={{ backgroundColor: 'rgba(31, 92, 153, 0.4)' }}></div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5A7CA8' }}>Devis</p>
              <div className="h-px flex-1" style={{ backgroundColor: 'rgba(31, 92, 153, 0.4)' }}></div>
            </div>
          </div>

          {/* DEVIS - Avec sous-menu */}
          {canAccess('DEVIS') && (
            <div>
              <button
                onClick={() => setDevisExpanded(!devisExpanded)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg mb-1 transition-all hover:bg-opacity-10 hover:bg-white"
                style={{ color: '#C8C8D0' }}
              >
                <div className="flex items-center gap-3">
                  <span>📄</span>
                  <span className="text-sm">Devis</span>
                </div>
                {devisExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {devisExpanded && (
                <div className="ml-4 mr-2 mb-2 py-2 pl-3 pr-2 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                  <div className="space-y-1">
                    {[
                      { path: '/devis/calorifuge', label: 'Calorifuge', icon: '🔥' },
                      { path: '/devis/pliage', label: 'Pliage', icon: '🔧' },
                      { path: '/devis/reservoir', label: 'Réservoir', icon: '🛢️' },
                      { path: '/devis/soudure', label: 'Soudure', icon: '⚡' },
                      { path: '/devis/charpente', label: 'Charpente', icon: '🏗️' },
                      { path: '/devis/tuyauterie', label: 'Tuyauterie', icon: '🔩' },
                      { path: '/devis/chaudronnerie', label: 'Chaudronnerie', icon: '⚙️' },
                    ].map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all ${
                          isActive(item.path)
                            ? 'text-white font-medium bg-red-600'
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="text-xs">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <Link
                to="/devis/liste"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                  isActive('/devis/liste')
                    ? 'text-white font-semibold'
                    : 'hover:bg-opacity-10 hover:bg-white'
                }`}
                style={isActive('/devis/liste') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
              >
                <span>📋</span>
                <span className="text-sm">Liste & Suivi Devis</span>
              </Link>
            </div>
          )}

          {/* SÉPARATEUR FINANCE */}
          <div className="mt-4 mb-2 px-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1" style={{ backgroundColor: 'rgba(31, 92, 153, 0.4)' }}></div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5A7CA8' }}>Finance</p>
              <div className="h-px flex-1" style={{ backgroundColor: 'rgba(31, 92, 153, 0.4)' }}></div>
            </div>
          </div>

          {/* FACTURES CLIENTS */}
          {canAccess('FACTURES') && (
            <Link
              to="/factures"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/factures')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/factures') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>🧾</span>
              <span className="text-sm">Factures clients</span>
            </Link>
          )}

          {/* ENCAISSEMENTS */}
          {canAccess('ENCAISSEMENTS') && (
            <Link
              to="/encaissements"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/encaissements')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/encaissements') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>💰</span>
              <span className="text-sm">Encaissements</span>
            </Link>
          )}

          {/* ENREGISTREMENT CAISSE */}
          {canAccess('CAISSE') && (
            <Link
              to="/caisse"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/caisse')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/caisse') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>🏦</span>
              <span className="text-sm">Enregistrement Caisse</span>
            </Link>
          )}

          {/* JOURNAL DE CAISSE */}
          {canAccess('CAISSE') && (
            <Link
              to="/journal"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/journal')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/journal') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>📒</span>
              <span className="text-sm">Journal de Caisse</span>
            </Link>
          )}

          {/* FOURNISSEURS */}
          {canAccess('FOURNISSEURS') && (
            <Link
              to="/fournisseurs"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/fournisseurs')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/fournisseurs') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>🏭</span>
              <span className="text-sm">Fournisseurs</span>
            </Link>
          )}

          {/* ACHATS */}
          {canAccess('CAISSE') && (
            <Link
              to="/achats"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/achats')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/achats') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>🛒</span>
              <span className="text-sm">Achats</span>
            </Link>
          )}

          {/* DÉPENSES */}
          {canAccess('CAISSE') && (
            <Link
              to="/depenses"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/depenses')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/depenses') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>💸</span>
              <span className="text-sm">Dépenses</span>
            </Link>
          )}

          {/* SÉPARATEUR OUTILS */}
          <div className="mt-4 mb-2 px-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1" style={{ backgroundColor: 'rgba(31, 92, 153, 0.4)' }}></div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5A7CA8' }}>Outils</p>
              <div className="h-px flex-1" style={{ backgroundColor: 'rgba(31, 92, 153, 0.4)' }}></div>
            </div>
          </div>

          {/* IMPORT / EXPORT */}
          {canAccess('IMPORT') && (
            <Link
              to="/import-export"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/import-export')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/import-export') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>📥</span>
              <span className="text-sm">Import / Export</span>
            </Link>
          )}

          {/* SÉPARATEUR PILOTAGE */}
          <div className="mt-4 mb-2 px-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1" style={{ backgroundColor: 'rgba(31, 92, 153, 0.4)' }}></div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5A7CA8' }}>Pilotage</p>
              <div className="h-px flex-1" style={{ backgroundColor: 'rgba(31, 92, 153, 0.4)' }}></div>
            </div>
          </div>

          {/* UTILISATEURS (ADMIN ONLY) */}
          {canAccess('UTILISATEURS') && (
            <Link
              to="/utilisateurs"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/utilisateurs')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/utilisateurs') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>🔒</span>
              <span className="text-sm">Utilisateurs</span>
            </Link>
          )}

          {/* TOUR DE CONTRÔLE (ADMIN ONLY) */}
          {canAccess('UTILISATEURS') && (
            <Link
              to="/tour-de-controle"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/tour-de-controle')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/tour-de-controle') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>🛡️</span>
              <span className="text-sm">Tour de Contrôle</span>
            </Link>
          )}

          {/* PARAMÈTRES (ADMIN ONLY) */}
          {canAccess('UTILISATEURS') && (
            <Link
              to="/parametres"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 transition-all ${
                isActive('/parametres')
                  ? 'text-white font-semibold'
                  : 'hover:bg-opacity-10 hover:bg-white'
              }`}
              style={isActive('/parametres') ? { backgroundColor: '#E60000' } : { color: '#C8C8D0' }}
            >
              <span>⚙️</span>
              <span className="text-sm">Paramètres</span>
            </Link>
          )}
        </nav>

        {/* FOOTER SIDEBAR - Déconnexion */}
        <div className="flex-shrink-0 p-4 border-t" style={{ borderColor: 'rgba(31, 92, 153, 0.5)' }}>
          <button
            onClick={handleDeconnexion}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
            style={{ backgroundColor: '#E60000' }}
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 shadow-sm sticky top-0 z-20">
          <div className="flex items-center justify-between gap-4">
            {/* Partie gauche - Menu mobile + Titre */}
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-700"
                onClick={() => setSidebarOpen(o => !o)}
                aria-label="Menu"
              >
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="19" y2="6" />
                  <line x1="3" y1="12" x2="19" y2="12" />
                  <line x1="3" y1="18" x2="19" y2="18" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">
                SIKA <span className="text-red-600">GESTION</span>
              </h1>
            </div>

            {/* Partie centrale - Recherche */}
            <div className="hidden sm:block flex-1 max-w-md mx-4">
              <SearchGlobal />
            </div>

            {/* Partie droite - Actions utilisateur */}
            <div className="flex items-center gap-3 sm:gap-4">
              <SyncStatusIndicator />
              {utilisateurConnecte && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="hidden sm:flex items-center gap-2">
                    <ShortcutsHelp />
                    <NotificationSettings />
                  </div>
                  <div className="hidden lg:block text-right">
                    <p className="text-sm font-medium text-gray-800">{utilisateurConnecte.nom}</p>
                    <p className="text-xs text-blue-600">{utilisateurConnecte.role}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-red-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                    {utilisateurConnecte.nom.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Barre de recherche mobile */}
          <div className="sm:hidden mt-3">
            <SearchGlobal />
          </div>
        </header>

        {/* BREADCRUMB + CONTENT */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <Breadcrumb items={getBreadcrumbItems()} />
            <Outlet />
          </div>
        </div>
      </main>

      {/* TOASTS ÉPHÉMÈRES */}
      <ToastContainer />

      {/* BANNIÈRE AVERTISSEMENT SESSION */}
      {sessionExpirant && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 text-white"
          style={{ backgroundColor: '#E60000' }}
        >
          <span className="font-medium">⚠️ Votre session expire dans 5 minutes pour cause d'inactivité.</span>
          <button
            onClick={updateActivite}
            className="ml-4 px-4 py-1.5 rounded font-bold bg-white hover:bg-gray-100 transition-colors"
            style={{ color: '#E60000' }}
          >
            Rester connecté
          </button>
        </div>
      )}
    </div>
  )
}
