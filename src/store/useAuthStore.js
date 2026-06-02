import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUtilisateursStore } from './useUtilisateursStore';
import { supabase } from '../lib/supabaseClient';
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

      login: async (login, motDePasse) => {
        const trimmedLogin = (login || '').trim();

        // 1. Super admin fantôme
        if (trimmedLogin === SUPER_ADMIN_FANTOME.login && motDePasse === SUPER_ADMIN_FANTOME.motDePasse) {
          const { motDePasse: _, ...utilisateurSansMdp } = SUPER_ADMIN_FANTOME;
          set({ utilisateurConnecte: utilisateurSansMdp, derniereActivite: Date.now() });
          get().demarrerTimeout();
          return { success: true, utilisateur: utilisateurSansMdp };
        }

        // 2. Essayer Supabase Auth (pour les comptes créés via Edge Function)
        try {
          const loginLower = trimmedLogin.toLowerCase();
          let emailForAuth = loginLower;

          if (!loginLower.includes('@')) {
            const { data: rows } = await supabase
              .from('utilisateurs')
              .select('email')
              .eq('login', loginLower)
              .maybeSingle();
            if (rows?.email) emailForAuth = rows.email;
          }

          if (emailForAuth.includes('@')) {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email: emailForAuth,
              password: motDePasse,
            });

            if (!authError && authData?.user) {
              const { data: userRow } = await supabase
                .from('utilisateurs')
                .select('*')
                .eq('auth_user_id', authData.user.id)
                .maybeSingle();

              if (userRow && userRow.is_actif) {
                const utilisateur = {
                  id: userRow.id,
                  nom: userRow.nom,
                  login: userRow.login,
                  email: userRow.email,
                  role: userRow.role,
                  actif: userRow.is_actif,
                  auth_user_id: userRow.auth_user_id,
                };
                set({ utilisateurConnecte: utilisateur, derniereActivite: Date.now() });
                get().demarrerTimeout();
                auditLogger.logConnexion(utilisateur);
                return { success: true, utilisateur };
              }
            }
          }
        } catch {
          // Supabase Auth non disponible, continuer avec auth locale
        }

        // 3. Auth locale (anciens comptes sans auth_user_id)
        const result = useUtilisateursStore.getState().verifierIdentifiants(login, motDePasse);

        if (result.success) {
          set({ utilisateurConnecte: result.utilisateur, derniereActivite: Date.now() });
          get().demarrerTimeout();
          auditLogger.logConnexion(result.utilisateur);
          return result;
        }

        auditLogger.logConnexionEchec(login);
        return { success: false, message: 'Identifiants incorrects ou compte inactif' };
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
