import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { isSuperAdmin, normalizeRole } from '../utils/filterSuperAdmin'
import Breadcrumb from './Breadcrumb'
import NotificationSettings from './NotificationSettings'
import ShortcutsHelp from './ShortcutsHelp'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import SikaLogo from './SikaLogo'
import DataLoader from './DataLoader'
import SearchGlobal from './SearchGlobal'
import SyncStatusIndicator from './SyncStatusIndicator'
import ToastContainer from './ToastContainer'
import InstallPWA from './InstallPWA'
import ThemeToggle from './ThemeToggle'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const utilisateurConnecte = useAuthStore((state) => state.utilisateurConnecte)
  const hasHydrated = useAuthStore((state) => state._hasHydrated)
  const deconnexion = useAuthStore((state) => state.deconnexion)
  const sessionExpirant = useAuthStore((state) => state.sessionExpirant)
  const updateActivite = useAuthStore((state) => state.updateActivite)
  const [devisExpanded, setDevisExpanded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sika_sidebar_open');
    if (saved !== null) return JSON.parse(saved);
    return window.innerWidth >= 1024;
  })

  useEffect(() => {
    localStorage.setItem('sika_sidebar_open', JSON.stringify(sidebarOpen));
  }, [sidebarOpen])

  // Activer les raccourcis clavier
  useKeyboardShortcuts()

  useEffect(() => {
    if (hasHydrated && !utilisateurConnecte) {
      navigate('/login')
    }
  }, [hasHydrated, utilisateurConnecte, navigate])

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <SikaLogo size="md" />
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}></div>
          </div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement de la session...</p>
        </div>
      </div>
    )
  }

  if (!utilisateurConnecte) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
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

  const getSidebarItemStyles = (path) => {
    if (isActive(path)) {
      return {
        backgroundColor: 'var(--color-secondary)',
        borderLeft: '4px solid #60A5FA',
      }
    }
    return { color: 'var(--color-border)' }
  }

  const canAccess = (module) => {
    if (!utilisateurConnecte) return false
    const role = normalizeRole(utilisateurConnecte.role)
    
    // SUPER_ADMIN a accès absolu à tout (fantôme)
    if (isSuperAdmin(utilisateurConnecte)) return true
    
    // UTILISATEURS et TOUR DE CONTRÔLE : uniquement ADMIN et SUPER_ADMIN
    if (module === 'UTILISATEURS') {
      return role === 'ADMIN' || role === 'SUPER_ADMIN'
    }
    
    // ADMIN a accès à tout le reste
    if (role === 'ADMIN') return true
    
    // CAISSE : interdit pour SECRETAIRE et VIEWER
    if (module === 'CAISSE' && (role === 'SECRETAIRE' || role === 'VIEWER')) return false
    
    // DEVIS : TECHNICIEN et VIEWER ne peuvent pas créer de devis
    if (module === 'DEVIS' && (role === 'TECHNICIEN' || role === 'VIEWER')) return false

    // IMPORT : interdit pour VIEWER et TECHNICIEN
    if (module === 'IMPORT' && (role === 'VIEWER' || role === 'TECHNICIEN')) return false

    // FOURNISSEURS : interdit pour VIEWER
    if (module === 'FOURNISSEURS' && role === 'VIEWER') return false
    
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
    if (path === '/rapport') items.push({ label: 'Rapport de synthèse' })
    if (path === '/import-export') items.push({ label: 'Import / Export' })
    if (path === '/utilisateurs') items.push({ label: 'Utilisateurs' })
    if (path === '/tour-de-controle') items.push({ label: 'Tour de Contrôle' })
    if (path === '/parametres') items.push({ label: 'Paramètres' })

    return items
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Charger les données Supabase */}
      <DataLoader />

      {/* OVERLAY MOBILE */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 z-30 flex flex-col h-screen transition-transform duration-300 glass-sidebar ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '280px', maxWidth: '85vw' }}
      >
        {/* HEADER SIDEBAR - Logo + Utilisateur */}
        <div className="flex-shrink-0">
          {/* Logo SIKA INDUSTRIE */}
          <div className="p-5 pb-4">
            <div className="flex flex-col items-center">
              <SikaLogo size="sm" />
            </div>
            <div className="h-[2px] mt-4 bg-gradient-to-r from-transparent via-[#2563EB] to-transparent shadow-[0_0_10px_#2563EB]"></div>
          </div>

          {/* Utilisateur connecté */}
          {utilisateurConnecte && (
            <div className="px-4 pb-3">
              <div className="px-4 py-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300 hover:bg-white/10">
                <p className="text-white font-semibold text-sm truncate">{utilisateurConnecte.nom}</p>
                <p className="text-xs mt-0.5" style={{ color: '#8BA3C7' }}>{utilisateurConnecte.role}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto scrollbar-futur">
          {/* TABLEAU DE BORD */}
          <Link
            to="/dashboard"
            onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
            className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
              isActive('/dashboard')
                ? 'text-white font-semibold'
                : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
            }`}
            style={getSidebarItemStyles('/dashboard')}
          >
            <span className="text-base">📊</span>
            <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>TABLEAU DE BORD</span>
          </Link>

          {/* RAPPORT DE SYNTHÈSE */}
          <Link
            to="/rapport"
            onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
            className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
              isActive('/rapport')
                ? 'text-white font-semibold'
                : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
            }`}
            style={getSidebarItemStyles('/rapport')}
          >
            <span className="text-base">📈</span>
            <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Rapport synthèse</span>
          </Link>

          {/* RÉFÉRENTIEL CLIENTS */}
          {canAccess('CLIENTS') && (
            <Link
              to="/clients"
              onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                isActive('/clients')
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
              }`}
              style={getSidebarItemStyles('/clients')}
            >
              <span className="text-base">👥</span>
              <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Référentiel clients</span>
            </Link>
          )}

          {/* PILOTAGE PROJETS */}
          {canAccess('PLANIFICATION') && (
            <Link
              to="/planification"
              onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                isActive('/planification')
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
              }`}
              style={getSidebarItemStyles('/planification')}
            >
              <span className="text-base">🚀</span>
              <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Pilotage Projets</span>
            </Link>
          )}

          {/* APPELS D'OFFRES */}
          {canAccess('AO') && (
            <Link
              to="/ao"
              onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                isActive('/ao')
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
              }`}
              style={getSidebarItemStyles('/ao')}
            >
              <span className="text-base">📋</span>
              <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Appels d'offres</span>
            </Link>
          )}

          {/* SÉPARATEUR DEVIS */}
          <div className="mt-5 mb-2.5 px-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-white/10"></div>
              <p className={`text-[10px] font-bold uppercase tracking-widest text-[#5A7CA8] whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0 hidden lg:block'}`}>Devis</p>
              <div className="h-px flex-1 bg-white/10"></div>
            </div>
          </div>

          {/* DEVIS - Avec sous-menu */}
          {canAccess('DEVIS') && (
            <div>
              <button
                onClick={() => setDevisExpanded(!devisExpanded)}
                className={`w-full flex items-center ${sidebarOpen ? 'justify-between px-4' : 'justify-center'} py-2.5 rounded-lg mb-1 transition-all hover:translate-x-1 hover:bg-[var(--color-secondary)] text-gray-400 hover:text-white`}
                style={{ color: 'var(--color-border)' }}
              >
                <div className={`flex items-center ${sidebarOpen ? 'gap-3' : ''}`}>
                  <span className="text-base">📄</span>
                  <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Devis</span>
                </div>
                {sidebarOpen && (devisExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </button>

              {devisExpanded && (
                <div className="ml-3 mr-1 mb-2.5 py-2 pl-3 pr-2 rounded-lg border border-white/20" style={{ backgroundColor: 'var(--color-primary)' }}>
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
                        onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
                        className={`flex items-center ${sidebarOpen ? 'gap-2.5 px-3' : 'justify-center'} py-2 rounded-md text-sm transition-all duration-300 ${
                          isActive(item.path)
                            ? 'text-white font-medium shadow-md'
                            : 'text-gray-300 hover:text-white hover:translate-x-1'
                        }`}
                        style={isActive(item.path) ? { backgroundColor: 'var(--color-secondary)' } : {}}
                      >
                        <span className="text-xs">{item.icon}</span>
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0 hidden lg:block'}`}>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <Link
                to="/devis/liste"
                onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                  isActive('/devis/liste')
                    ? 'text-white font-semibold'
                    : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
                }`}
                style={getSidebarItemStyles('/devis/liste')}
              >
                <span className="text-base">📋</span>
                <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Liste & Suivi Devis</span>
              </Link>
            </div>
          )}

          {/* SÉPARATEUR FINANCE */}
          <div className="mt-5 mb-2.5 px-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-white/10"></div>
              <p className={`text-[10px] font-bold uppercase tracking-widest text-[#5A7CA8] whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0 hidden lg:block'}`}>Finance</p>
              <div className="h-px flex-1 bg-white/10"></div>
            </div>
          </div>

          {/* FACTURES CLIENTS */}
          {canAccess('FACTURES') && (
            <Link
              to="/factures"
              onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                isActive('/factures')
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
              }`}
              style={getSidebarItemStyles('/factures')}
            >
              <span className="text-base">🧾</span>
              <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Factures clients</span>
            </Link>
          )}

          {/* ENCAISSEMENTS */}
          {canAccess('ENCAISSEMENTS') && (
            <Link
              to="/encaissements"
              onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                isActive('/encaissements')
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
              }`}
              style={getSidebarItemStyles('/encaissements')}
            >
              <span className="text-base">💰</span>
              <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Encaissements</span>
            </Link>
          )}

          {/* ENREGISTREMENT CAISSE */}
          {canAccess('CAISSE') && (
            <Link
              to="/caisse"
              onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                isActive('/caisse')
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
              }`}
              style={getSidebarItemStyles('/caisse')}
            >
              <span className="text-base">🏦</span>
              <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Enregistrement Caisse</span>
            </Link>
          )}

          {/* JOURNAL DE CAISSE */}
          {canAccess('CAISSE') && (
            <Link
              to="/journal"
              onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                isActive('/journal')
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
              }`}
              style={getSidebarItemStyles('/journal')}
            >
              <span className="text-base">📒</span>
              <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Journal de Caisse</span>
            </Link>
          )}

          {/* FOURNISSEURS */}
          {canAccess('FOURNISSEURS') && (
            <Link
              to="/fournisseurs"
              onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                isActive('/fournisseurs')
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
              }`}
              style={getSidebarItemStyles('/fournisseurs')}
            >
              <span className="text-base">🏭</span>
              <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Fournisseurs</span>
            </Link>
          )}

          {/* SÉPARATEUR OUTILS */}
          <div className="mt-5 mb-2.5 px-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-white/10"></div>
              <p className={`text-[10px] font-bold uppercase tracking-widest text-[#5A7CA8] whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0 hidden lg:block'}`}>Outils</p>
              <div className="h-px flex-1 bg-white/10"></div>
            </div>
          </div>

          {/* IMPORT / EXPORT */}
          {canAccess('IMPORT') && (
            <Link
              to="/import-export"
              onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                isActive('/import-export')
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
              }`}
              style={getSidebarItemStyles('/import-export')}
            >
              <span className="text-base">📥</span>
              <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Import / Export</span>
            </Link>
          )}

          {/* SÉPARATEUR PILOTAGE */}
          <div className="mt-5 mb-2.5 px-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-white/10"></div>
              <p className={`text-[10px] font-bold uppercase tracking-widest text-[#5A7CA8] whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0 hidden lg:block'}`}>Pilotage</p>
              <div className="h-px flex-1 bg-white/10"></div>
            </div>
          </div>

          {/* UTILISATEURS (ADMIN ONLY) */}
          {canAccess('UTILISATEURS') && (
            <Link
              to="/utilisateurs"
              onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                isActive('/utilisateurs')
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
              }`}
              style={getSidebarItemStyles('/utilisateurs')}
            >
              <span className="text-base">🔒</span>
              <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Utilisateurs</span>
            </Link>
          )}

          {/* TOUR DE CONTRÔLE (ADMIN ONLY) */}
          {canAccess('UTILISATEURS') && (
            <Link
              to="/tour-de-controle"
              className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                isActive('/tour-de-controle')
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:translate-x-1.5 hover:bg-[var(--color-secondary)]'
              }`}
              style={getSidebarItemStyles('/tour-de-controle')}
            >
              <span className="text-base">🛡️</span>
              <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Tour de Contrôle</span>
            </Link>
          )}

          {/* PARAMÈTRES (ADMIN ONLY) */}
          {canAccess('UTILISATEURS') && (
            <Link
              to="/parametres"
              className={`flex items-center ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'} py-2.5 rounded-lg mb-1.5 transition-all duration-300 ${
                isActive('/parametres')
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:translate-x-1.5'
              }`}
              style={getSidebarItemStyles('/parametres')}
            >
              <span className="text-base">⚙️</span>
              <span className={`text-sm font-semibold tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0 hidden lg:block'}`}>Paramètres</span>
            </Link>
          )}
        </nav>

        {/* FOOTER SIDEBAR - Déconnexion */}
        <div className="flex-shrink-0 p-4 border-t border-white/10">
          <button
            onClick={handleDeconnexion}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg font-bold text-white transition-all duration-300 hover:opacity-95 shadow-md shadow-red-600/10 glow-hover-red"
            style={{ background: 'linear-gradient(90deg, var(--color-accent) 0%, #B80000 100%)' }}
          >
            <LogOut size={18} />
            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0 hidden lg:block'}`}>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${sidebarOpen ? 'lg:ml-[280px]' : 'ml-0 lg:ml-[80px]'}`}>
        {/* HEADER */}
        <header className="glass-header px-4 sm:px-6 lg:px-8 py-3 sm:py-4 glow-blue sticky top-0 z-20">
          <div className="flex items-center justify-between gap-4">
            {/* Partie gauche - Menu mobile + Titre */}
            <div className={`flex items-center ${sidebarOpen ? 'gap-3' : ''}`}>
              <button
                className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
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
              <ThemeToggle />
              <InstallPWA />
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
            <div key={location.pathname} className="animate-fade-in-up">
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      {/* TOASTS ÉPHÉMÈRES */}
      <ToastContainer />

      {/* BANNIÈRE AVERTISSEMENT SESSION */}
      {sessionExpirant && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <span className="font-medium">⚠️ Votre session expire dans 5 minutes pour cause d'inactivité.</span>
          <button
            onClick={updateActivite}
            className="ml-4 px-4 py-1.5 rounded font-bold bg-surface hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--color-accent)' }}
          >
            Rester connecté
          </button>
        </div>
      )}
    </div>
  )
}
