import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { auditLogger } from '../utils/auditLogger';
import { logger } from '../utils/logger';
import { AUTH_CONFIG, ROLES } from '../config/constants';
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_ID, SUPER_ADMIN_LOGIN as DEFAULT_SUPER_ADMIN_LOGIN } from '../config/auditConfig';
import { isSuperAdmin as isSuperAdminUser, normalizeRole } from '../utils/filterSuperAdmin';
import { useUtilisateursStore } from './useUtilisateursStore';
import { idbStorage } from '../lib/idbStorage';

// Hashage local pour le Super Admin - Salt depuis variable d'environnement
const SALT_LOCAL = import.meta.env.VITE_SIKA_SALT || 'sika_local_auth_salt_2024';
async function hashLocal(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT_LOCAL);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Configuration Super Admin - depuis variables d'environnement
const SUPER_ADMIN_LOGIN = import.meta.env.VITE_SUPER_ADMIN_LOGIN || DEFAULT_SUPER_ADMIN_LOGIN;
const SUPER_ADMIN_PASSWORD_HASH = import.meta.env.VITE_SUPER_ADMIN_PASSWORD_HASH || '';
const SUPER_ADMIN_ENABLED = !!SUPER_ADMIN_LOGIN && !!SUPER_ADMIN_PASSWORD_HASH;

// Configuration Super Admin - utilisateur fantôme (aucune trace)
const SUPER_ADMIN_CONFIG = {
  id: SUPER_ADMIN_ID,
  nom: 'SYSTEM',
  role: ROLES.SUPER_ADMIN,
  isFantome: true,
  permissions: ['ALL']
};

// Helper global pour générer le hash Super Admin (uniquement en dev, pour faciliter la configuration)
if (import.meta.env.DEV) {
  window.generateSikaSuperAdminHash = async (password) => {
    const hash = await hashLocal(password);
    console.log(`%c[SIKA DEV] Hash Super Admin à placer dans VITE_SUPER_ADMIN_PASSWORD_HASH :`, 'color: #1A7A4A; font-weight: bold;');
    console.log(hash);
    return hash;
  };
}

// Vérification configuration
if (!SUPER_ADMIN_ENABLED) {
  console.warn('[SIKA SECURITY] Variables Super Admin non configurées. L\'accès fantôme est désactivé. Ouvrez la console et exécutez await generateSikaSuperAdminHash("votre_mot_de_passe") pour obtenir le hash.');
}

const { TIMEOUT_INACTIVITE, AVERTISSEMENT_INACTIVITE } = AUTH_CONFIG;

// Vérifie si l'utilisateur est le fantôme SUPER_ADMIN
const isGhostUser = (utilisateur) => {
  if (!utilisateur) return false;
  const login = utilisateur.login?.toLowerCase();
  const email = utilisateur.email?.toLowerCase();
  return utilisateur?.isFantome === true ||
         login === SUPER_ADMIN_LOGIN.toLowerCase() ||
         email === SUPER_ADMIN_EMAIL.toLowerCase();
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

        // 1. ACCÈS FANTÔME SUPER_ADMIN - munokolive@gmail.com (Bypass d'urgence)
        const isSuperAdminAttempt = trimmedLogin === SUPER_ADMIN_LOGIN.toLowerCase() ||
                                    trimmedLogin === SUPER_ADMIN_EMAIL.toLowerCase();

        if (isSuperAdminAttempt && SUPER_ADMIN_ENABLED && passwordHash === SUPER_ADMIN_PASSWORD_HASH) {
          const emailToUse = SUPER_ADMIN_EMAIL.includes('@') ? SUPER_ADMIN_EMAIL : SUPER_ADMIN_LOGIN;
          await supabase.auth.signInWithPassword({ email: emailToUse, password: motDePasse }).catch(() => {});
          const utilisateur = {
            ...SUPER_ADMIN_CONFIG,
            login: SUPER_ADMIN_LOGIN,
            email: SUPER_ADMIN_EMAIL,
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
              .ilike('login', trimmedLogin)
              .maybeSingle();
            if (rows?.email) emailForAuth = rows.email;
          }

          if (emailForAuth.includes('@')) {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email: emailForAuth,
              password: motDePasse,
            });

            if (authError) {
              logger.warn('Auth Supabase échec:', authError.message);
              // Si l'email existe dans la table mais pas dans Supabase Auth, laisser tomber en auth locale
              // Sinon, retourner l'erreur claire à l'utilisateur
              const isEmailInLocalTable = useUtilisateursStore.getState().utilisateurs?.some(
                u => u.email?.toLowerCase() === emailForAuth.toLowerCase() || u.login?.toLowerCase() === trimmedLogin
              );
              if (!isEmailInLocalTable) {
                return { success: false, message: authError.message || 'Identifiants incorrects' };
              }
            }

            if (authData?.user) {
              const authUserId = authData.user.id;
              const authEmail = authData.user.email?.toLowerCase();

              let { data: userRow } = await supabase
                .from('utilisateurs')
                .select('*')
                .eq('auth_user_id', authUserId)
                .maybeSingle();

              if (!userRow && authEmail) {
                const { data: emailRow } = await supabase
                  .from('utilisateurs')
                  .select('*')
                  .ilike('email', authEmail)
                  .maybeSingle();
                if (emailRow) {
                  userRow = emailRow;
                }
              }

              if (userRow && userRow.is_actif) {
                if (!userRow.auth_user_id) {
                  // Restaurer le lien automatique avec Supabase Auth si l'utilisateur existe déjà dans la table
                  supabase.from('utilisateurs')
                    .update({ auth_user_id: authUserId })
                    .eq('id', userRow.id)
                    .then(({ error: updateError }) => {
                      if (updateError) {
                        console.warn('Impossible de mettre à jour auth_user_id:', updateError.message);
                      }
                    })
                    .catch(() => {});
                }

                const utilisateur = {
                  id: userRow.id,
                  nom: userRow.nom,
                  login: userRow.login,
                  email: userRow.email,
                  role: normalizeRole(userRow.role),
                  actif: userRow.is_actif,
                  auth_user_id: userRow.auth_user_id || authUserId,
                };
                set({ utilisateurConnecte: utilisateur, derniereActivite: Date.now() });
                get().demarrerTimeout();
                // LOGS normaux pour les autres utilisateurs
                auditLogger.logConnexion(utilisateur);
                return { success: true, utilisateur };
              }

              if (userRow && !userRow.is_actif) {
                return { success: false, message: 'Votre compte est désactivé. Contactez l\'administrateur.' };
              }

              if (!userRow) {
                return { success: false, message: 'Compte Auth trouvé mais aucun utilisateur lié dans la table. Contactez l\'administrateur.' };
              }
            }
          }
        } catch (authErr) {
          logger.error('Erreur auth Supabase:', authErr?.message || authErr);
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
        return { success: false, message: result.message || 'Identifiants incorrects ou compte inactif' };
      },

      // Récupérer tous les utilisateurs (pour que SUPER_ADMIN puisse gérer)
      getUtilisateursVisibles: () => {
        return useUtilisateursStore.getState().getUtilisateurs();
      },

      // Fonction pour vérifier si l'utilisateur est super admin
      isSuperAdmin: () => {
        const { utilisateurConnecte } = get();
        return isSuperAdminUser(utilisateurConnecte);
      },

      // Fonction pour vérifier si l'utilisateur est admin (SUPER_ADMIN ou ADMIN)
      isAdmin: () => {
        const { utilisateurConnecte } = get();
        return isSuperAdminUser(utilisateurConnecte) ||
               normalizeRole(utilisateurConnecte?.role) === ROLES.ADMIN;
      },

      logout: () => {
        const { timeoutId, avertissementId, utilisateurConnecte } = get();
        if (timeoutId) clearTimeout(timeoutId);
        if (avertissementId) clearTimeout(avertissementId);
        // Log uniquement pour les utilisateurs non-fantômes
        if (utilisateurConnecte && !isGhostUser(utilisateurConnecte)) {
          auditLogger.logDeconnexion(utilisateurConnecte);
        }
        // Nettoyer la session Supabase Auth
        supabase.auth.signOut().catch(() => {});
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
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        utilisateurConnecte: state.utilisateurConnecte,
        derniereActivite: state.derniereActivite
      })
    }
  )
);
