import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { peutAcceder } from '../utils/droits';

/**
 * HOC (Higher Order Component) pour protéger les composants selon les droits d'accès
 * 
 * @param {Component} Component - Le composant à protéger
 * @param {string} module - Le module à vérifier (ex: 'CLIENTS', 'DEVIS', etc.)
 * @param {string} action - L'action à vérifier (ex: 'LIRE', 'CREER', 'MODIFIER', etc.)
 * @returns {Component} - Le composant protégé ou une redirection
 * 
 * Utilisation :
 * export default withAuth(MesClients, 'CLIENTS', 'LIRE');
 */
export const withAuth = (Component, module, action) => {
  return (props) => {
    const utilisateurConnecte = useAuthStore((state) => state.utilisateurConnecte);
    const updateActivite = useAuthStore((state) => state.updateActivite);

    // Vérifier si l'utilisateur est connecté
    if (!utilisateurConnecte) {
      return <Navigate to="/login" replace />;
    }

    // Mettre à jour l'activité pour le timeout
    updateActivite();

    // Vérifier les droits d'accès
    const aAcces = peutAcceder(utilisateurConnecte.role, module, action);

    if (!aAcces) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#E8ECF4' }}>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center border-l-4" style={{ borderLeftColor: '#E60000' }}>
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="#E60000">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1B2A4A' }}>
              Accès refusé
            </h2>
            <p className="mb-6" style={{ color: '#1F5C99' }}>
              Vous n'avez pas les droits nécessaires pour accéder à cette page.
            </p>
            <p className="text-sm mb-4" style={{ color: '#C8C8D0' }}>
              Module : <strong>{module}</strong><br />
              Action : <strong>{action}</strong><br />
              Votre rôle : <strong>{utilisateurConnecte.role}</strong>
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 rounded font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#E60000' }}
            >
              Retour
            </button>
          </div>
        </div>
      );
    }

    // L'utilisateur a les droits, afficher le composant
    return <Component {...props} />;
  };
};

/**
 * Hook personnalisé pour vérifier les droits dans un composant
 * 
 * @param {string} module - Le module à vérifier
 * @param {string} action - L'action à vérifier
 * @returns {boolean} - true si l'utilisateur a les droits, false sinon
 * 
 * Utilisation :
 * const peutCreer = useAuth('CLIENTS', 'CREER');
 * if (peutCreer) { ... }
 */
export const useAuth = (module, action) => {
  const utilisateurConnecte = useAuthStore((state) => state.utilisateurConnecte);

  if (!utilisateurConnecte) {
    return false;
  }

  return peutAcceder(utilisateurConnecte.role, module, action);
};

/**
 * Composant pour masquer conditionnellement des éléments selon les droits
 * RÈGLE : Les éléments non autorisés sont masqués (display: none), pas grisés
 * 
 * @param {string} module - Le module à vérifier
 * @param {string} action - L'action à vérifier
 * @param {ReactNode} children - Les éléments enfants à afficher/masquer
 * @param {ReactNode} fallback - Élément à afficher si pas de droits (optionnel)
 * 
 * Utilisation :
 * <AuthGuard module="CLIENTS" action="CREER">
 *   <button>Créer un client</button>
 * </AuthGuard>
 */
export const AuthGuard = ({ module, action, children, fallback = null }) => {
  const utilisateurConnecte = useAuthStore((state) => state.utilisateurConnecte);

  if (!utilisateurConnecte) {
    return null;
  }

  const aAcces = peutAcceder(utilisateurConnecte.role, module, action);

  // RÈGLE : masquer complètement (display: none), pas griser
  if (!aAcces) {
    return fallback;
  }

  return <>{children}</>;
};

/**
 * Hook pour obtenir les informations de l'utilisateur connecté
 * 
 * @returns {object} - { utilisateur, role, nom, estConnecte }
 * 
 * Utilisation :
 * const { utilisateur, role, nom } = useUtilisateur();
 */
export const useUtilisateur = () => {
  const utilisateurConnecte = useAuthStore((state) => state.utilisateurConnecte);

  return {
    utilisateur: utilisateurConnecte,
    role: utilisateurConnecte?.role || null,
    nom: utilisateurConnecte?.nom || null,
    estConnecte: !!utilisateurConnecte
  };
};

/**
 * Composant pour afficher "Établi par : [NOM]" dans les documents
 * 
 * @param {string} className - Classes CSS additionnelles (optionnel)
 * 
 * Utilisation :
 * <EtabliPar />
 */
export const EtabliPar = ({ className = '' }) => {
  const utilisateurConnecte = useAuthStore((state) => state.utilisateurConnecte);

  if (!utilisateurConnecte) {
    return null;
  }

  return (
    <p className={className} style={{ color: '#1F5C99' }}>
      <strong>Établi par :</strong> {utilisateurConnecte.nom}
    </p>
  );
};

export default withAuth;
