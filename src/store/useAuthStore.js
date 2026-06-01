import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUtilisateursStore } from './useUtilisateursStore';
import { auditLogger } from '../utils/auditLogger';

const SUPER_ADMIN_FANTOME = {
  id: 0,
  nom: 'SYSTEM ADMINISTRATOR',
  login: import.meta.env.VITE_SUPER_ADMIN_LOGIN,
  email: import.meta.env.VITE_SUPER_ADMIN_LOGIN,
  motDePasse: import.meta.env.VITE_SUPER_ADMIN_PASSWORD,
  role: 'SUPER_ADMIN',
  isFantome: true,
  permissions: ['ALL']
};

const TIMEOUT_INACTIVITE = 30 * 60 * 1000;
const AVERTISSEMENT_INACTIVITE = 25 * 60 * 1000;

export const useAuthStore = create(
  persist(
    (set, get) => ({
      utilisateurConnecte: null,
      derniereActivite: null,
      timeoutId: null,
      avertissementId: null,
      sessionExpirant: false,

      login: (login, motDePasse) => {
        if (login === SUPER_ADMIN_FANTOME.login && motDePasse === SUPER_ADMIN_FANTOME.motDePasse) {
          const { motDePasse: _, ...utilisateurSansMdp } = SUPER_ADMIN_FANTOME;
          set({
            utilisateurConnecte: utilisateurSansMdp,
            derniereActivite: Date.now()
          });
          get().demarrerTimeout();
          return { success: true, utilisateur: utilisateurSansMdp };
        }

        const result = useUtilisateursStore.getState().verifierIdentifiants(login, motDePasse);
        
        if (result.success) {
          set({
            utilisateurConnecte: result.utilisateur,
            derniereActivite: Date.now()
          });
          get().demarrerTimeout();
          auditLogger.logConnexion(result.utilisateur);
          return result;
        }

        auditLogger.logConnexionEchec(login);
        return result;
      },

      getUtilisateursVisibles: () => {
        return useUtilisateursStore.getState().getUtilisateurs();
      },

      // Fonction pour vérifier si l'utilisateur est super admin
      isSuperAdmin: () => {
        const { utilisateurConnecte } = get();
        return utilisateurConnecte?.role === 'SUPER_ADMIN';
      },

      logout: () => {
        const { timeoutId, avertissementId, utilisateurConnecte } = get();
        if (timeoutId) clearTimeout(timeoutId);
        if (avertissementId) clearTimeout(avertissementId);
        if (utilisateurConnecte) {
          auditLogger.logDeconnexion(utilisateurConnecte);
        }
        set({
          utilisateurConnecte: null,
          derniereActivite: null,
          timeoutId: null,
          avertissementId: null,
          sessionExpirant: false
        });
      },

      deconnexion: () => {
        get().logout();
      },

      updateActivite: () => {
        const { utilisateurConnecte } = get();
        if (utilisateurConnecte) {
          set({ derniereActivite: Date.now(), sessionExpirant: false });
          get().demarrerTimeout();
        }
      },

      demarrerTimeout: () => {
        const { timeoutId, avertissementId } = get();
        if (timeoutId) clearTimeout(timeoutId);
        if (avertissementId) clearTimeout(avertissementId);

        const newAvertissementId = setTimeout(() => {
          set({ sessionExpirant: true });
        }, AVERTISSEMENT_INACTIVITE);

        const newTimeoutId = setTimeout(() => {
          const { utilisateurConnecte } = get();
          if (utilisateurConnecte) {
            auditLogger.logSessionExpiree(utilisateurConnecte);
          }
          get().logout();
        }, TIMEOUT_INACTIVITE);

        set({ timeoutId: newTimeoutId, avertissementId: newAvertissementId });
      },

      verifierSession: () => {
        const { utilisateurConnecte, derniereActivite } = get();
        if (utilisateurConnecte && derniereActivite) {
          const tempsEcoule = Date.now() - derniereActivite;
          if (tempsEcoule > TIMEOUT_INACTIVITE) {
            get().logout();
            return false;
          }
          return true;
        }
        return false;
      }
    }),
    {
      name: 'sika_auth',
      partialize: (state) => ({
        utilisateurConnecte: state.utilisateurConnecte,
        derniereActivite: state.derniereActivite
      })
    }
  )
);
