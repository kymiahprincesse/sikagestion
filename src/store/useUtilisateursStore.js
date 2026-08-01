import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../utils/logger';
import { normalizeRole } from '../utils/filterSuperAdmin';
import { idbStorage } from '../lib/idbStorage';

// OBLIGATOIRE: Variable d'environnement - pas de fallback pour la sécurité
const MGMT_SECRET = import.meta.env.VITE_SIKA_MGMT_SECRET;
if (!MGMT_SECRET) {
  console.error('[SIKA SECURITY] VITE_SIKA_MGMT_SECRET manquant. La gestion des utilisateurs ne fonctionnera pas.');
}

// Fonction pour générer un code aléatoire cryptographiquement sécurisé
function generateSecureCode(length = 6) {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += array[i] % 10;
  }
  return code;
}
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE = import.meta.env.VITE_SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('[SIKA SECURITY] VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis pour la gestion des utilisateurs.')
}

async function callManageUsers(action, payload) {
  const keyToUse = (import.meta.env.DEV && SUPABASE_SERVICE_ROLE) ? SUPABASE_SERVICE_ROLE : SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'apikey': keyToUse,
      'Authorization': `Bearer ${keyToUse}`,
      'x-sika-admin': MGMT_SECRET,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : { raw: await res.text() };
  if (!res.ok) throw new Error(data?.error || data?.message || 'Erreur serveur');
  return data;
}

function rowToUtilisateur(row, localUser = null) {
  return {
    id: row.id,
    nom: row.nom,
    login: row.login,
    email: row.email || '',
    telephone: row.telephone || '',
    role: normalizeRole(row.role) || row.role,
    actif: row.is_actif,
    auth_user_id: row.auth_user_id || null,
    // NOTE: Les mots de passe et hash ne sont JAMAIS exposés ici
    motDePasseHash: localUser?.motDePasseHash || null,
    permissions: row.permissions || null,
  };
}

// NOTE: Les mots de passe sont maintenant stockés comme des hash SHA-256
// Les mots de passe par défaut doivent être changés après la première connexion
const SALT_LOCAL = import.meta.env.VITE_SIKA_SALT || 'sika_local_auth_salt_2024';

// Fonction pour hasher un mot de passe localement
async function hashLocal(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT_LOCAL);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Aucun utilisateur initial fictif - tous les utilisateurs viennent de Supabase


export const useUtilisateursStore = create(
  persist(
    (set, get) => ({
      utilisateurs: [],

      fetchUtilisateurs: async () => {
        try {
          const { data, error } = await supabase
            .from('utilisateurs')
            .select('*')
            .order('id');
          if (error) {
            logger.error('fetchUtilisateurs error:', error.message);
            return;
          }

          // Filtrer les utilisateurs fictifs (IDs 101-113) qui pourraient être en cache
          const localUsers = get().utilisateurs.filter(u => u.id < 100 || u.id > 113);

          if (!data || data.length === 0) {
            // Si Supabase est vide, garder seulement les utilisateurs locaux valides
            set({ utilisateurs: localUsers });
            return;
          }

          // Utiliser les données de Supabase tout en conservant les hash locaux
          const localUsersMap = new Map(get().utilisateurs.map(u => [u.id, u]));
          const supabaseUsers = data.map(row => rowToUtilisateur(row, localUsersMap.get(row.id)));
          set({ utilisateurs: supabaseUsers });
        } catch (err) {
          logger.error('fetchUtilisateurs:', err.message);
        }
      },

      getUtilisateurs: () => get().utilisateurs,

      getUtilisateurById: (id) => get().utilisateurs.find(u => u.id === id),

      getUtilisateurByLogin: (login) => get().utilisateurs.find(u => u.login === login),

      verifierIdentifiants: async (identifiant, motDePasse) => {
        const id = (identifiant || '').trim().toLowerCase();
        const utilisateur = get().utilisateurs.find(
          u => (u.login.toLowerCase() === id || (u.email && u.email.toLowerCase() === id)) && u.actif
        );
        
        if (!utilisateur) {
          return { success: false, message: 'Identifiants incorrects' };
        }
        
        // Vérifier le hash du mot de passe
        const motDePasseHash = await hashLocal(motDePasse);
        
        // Pour la migration: si l'utilisateur n'a pas encore de hash, créer un message d'erreur spécial
        if (!utilisateur.motDePasseHash) {
          if (utilisateur.auth_user_id) {
            return { success: false, message: 'Mot de passe incorrect. Vérifiez votre mot de passe.' };
          }
          return { success: false, message: 'Mot de passe incorrect. Contactez l\'administrateur.' };
        }
        
        if (motDePasseHash !== utilisateur.motDePasseHash) {
          return { success: false, message: 'Identifiants incorrects' };
        }
        
        // Ne jamais retourner le mot de passe ou le hash
        const { motDePasseHash: _, motDePasse: __, ...utilisateurSansMdp } = utilisateur;
        return { success: true, utilisateur: utilisateurSansMdp };
      },

      genererCodeRecuperation: (email) => {
        const { utilisateurs } = get();
        const emailLower = (email || '').trim().toLowerCase();
        const user = utilisateurs.find(u => u.email && u.email.toLowerCase() === emailLower && u.actif);
        if (!user) return { success: false, message: 'Aucun compte actif trouvé avec cet email' };
        const code = generateSecureCode(6);
        const expiry = Date.now() + 15 * 60 * 1000;
        sessionStorage.setItem('sika_recovery', JSON.stringify({ userId: user.id, email: emailLower, code, expiry }));
        return { success: true, code, nom: user.nom, hasAuthAccount: !!user.auth_user_id };
      },

      reinitialiserAvecCode: async (email, code, nouveauMdp) => {
        const raw = sessionStorage.getItem('sika_recovery');
        if (!raw) return { success: false, message: 'Aucune demande de récupération active' };
        let recovery;
        try { recovery = JSON.parse(raw); } catch { return { success: false, message: 'Données corrompues, recommencez' }; }
        if (recovery.email !== (email || '').trim().toLowerCase()) return { success: false, message: 'Email incorrect' };
        if (Date.now() > recovery.expiry) {
          sessionStorage.removeItem('sika_recovery');
          return { success: false, message: 'Code expiré, veuillez recommencer' };
        }
        if (recovery.code !== (code || '').trim()) return { success: false, message: 'Code incorrect' };
        if ((nouveauMdp || '').length < 6) return { success: false, message: 'Minimum 6 caractères requis' };
        const result = await get().reinitialiserMotDePasse(recovery.userId, nouveauMdp);
        if (result.success) sessionStorage.removeItem('sika_recovery');
        return result;
      },

      ajouterUtilisateur: async (utilisateur, currentUserRole) => {
        // Vérification des permissions : seuls ADMIN et SUPER_ADMIN peuvent ajouter des utilisateurs
        if (currentUserRole !== 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
          return { success: false, message: `Permission refusée : rôle '${currentUserRole}' non autorisé. Seuls ADMIN et SUPER_ADMIN peuvent ajouter des utilisateurs.` };
        }

        const { utilisateurs } = get();
        if (utilisateurs.find(u => u.login === utilisateur.login)) {
          return { success: false, message: 'Ce login existe déjà' };
        }
        if (utilisateur.email && utilisateurs.find(u => u.email && u.email.toLowerCase() === utilisateur.email.toLowerCase())) {
          return { success: false, message: 'Cet email est déjà utilisé par un autre compte' };
        }
        if (!utilisateur.email) {
          return { success: false, message: 'Un email est requis pour créer le compte de connexion' };
        }

        // Validation du rôle
        const validRoles = ['ADMIN', 'COMPTABLE', 'SECRETAIRE', 'TECHNICIEN', 'USER', 'VIEWER', 'SUPER_ADMIN'];
        const roleToSend = normalizeRole(utilisateur.role) || 'TECHNICIEN';
        if (!validRoles.includes(roleToSend)) {
          return { success: false, message: `Rôle invalide : ${roleToSend}. Rôles acceptés : ${validRoles.join(', ')}` };
        }

        try {
          let response;
          try {
            response = await callManageUsers('create', {
              email: utilisateur.email,
              password: utilisateur.motDePasse,
              nom: utilisateur.nom,
              login: utilisateur.login,
              role: roleToSend,
              telephone: utilisateur.telephone || null,
            });
          } catch (err) {
            logger.warn('manage-users echoué, tentative fallback local', err);
            // Fallback: Insertion locale avec mot de passe haché
            const nouveauHash = await hashLocal(utilisateur.motDePasse);
            
            const localUser = {
              nom: utilisateur.nom,
              login: utilisateur.login,
              email: utilisateur.email || null,
              role: roleToSend,
              telephone: utilisateur.telephone || null,
              is_actif: true
            };
            
            const { data, error } = await supabase.from('utilisateurs').insert(localUser).select().single();
            if (error) throw error;
            
            const newUser = rowToUtilisateur(data, { motDePasseHash: nouveauHash });
            // On ajoute le telephone localement si besoin, même s'il n'est pas en BDD
            newUser.telephone = utilisateur.telephone || null;
            
            set({ utilisateurs: [...utilisateurs, newUser] });
            return { success: true, utilisateur: newUser, message: 'Utilisateur créé localement avec succès' };
          }

          const nouvelUtilisateur = rowToUtilisateur(response.user);
          set({ utilisateurs: [...utilisateurs, nouvelUtilisateur] });
          return { success: true, utilisateur: nouvelUtilisateur };
        } catch (err) {
          logger.error('ajouterUtilisateur error:', err);
          return { success: false, message: err.message || 'Erreur lors de la création de l\'utilisateur' };
        }
      },

      modifierUtilisateur: (id, modifications) => {
        const { utilisateurs } = get();
        const index = utilisateurs.findIndex(u => u.id === id);
        if (index === -1) return { success: false, message: 'Utilisateur non trouvé' };
        if (modifications.login && modifications.login !== utilisateurs[index].login) {
          if (utilisateurs.find(u => u.login === modifications.login && u.id !== id)) {
            return { success: false, message: 'Ce login existe déjà' };
          }
        }
        if (modifications.email && modifications.email !== utilisateurs[index].email) {
          if (utilisateurs.find(u => u.email && u.email.toLowerCase() === modifications.email.toLowerCase() && u.id !== id)) {
            return { success: false, message: 'Cet email est déjà utilisé par un autre compte' };
          }
        }
        const modifies = [...utilisateurs];
        modifies[index] = { ...modifies[index], ...modifications };
        set({ utilisateurs: modifies });

        supabase.from('utilisateurs').update({
          nom: modifies[index].nom,
          login: modifies[index].login,
          email: modifies[index].email || null,
          telephone: modifies[index].telephone || null,
          role: modifies[index].role,
          is_actif: modifies[index].actif,
          permissions: modifies[index].permissions || null,
        }).eq('id', id).then(({ error }) => {
          if (error) logger.error('Supabase modifierUtilisateur:', error.message);
        }).catch((err) => {
          logger.error('Erreur modifierUtilisateur:', err.message);
        });

        return { success: true, utilisateur: modifies[index] };
      },

      changerMotDePasse: async (id, ancienMotDePasse, nouveauMotDePasse) => {
        const { utilisateurs } = get();
        const index = utilisateurs.findIndex(u => u.id === id);
        if (index === -1) return { success: false, message: 'Utilisateur non trouvé' };
        if (nouveauMotDePasse.length < 8) return { success: false, message: 'Le mot de passe doit contenir au moins 8 caractères avec majuscule, minuscule et chiffre' };

        const user = utilisateurs[index];

        // Vérifier l'ancien mot de passe avec hash
        if (user.motDePasseHash) {
          const ancienHash = await hashLocal(ancienMotDePasse);
          if (ancienHash !== user.motDePasseHash) {
            return { success: false, message: 'Ancien mot de passe incorrect' };
          }
        } else if (ancienMotDePasse && user.motDePasse && user.motDePasse !== ancienMotDePasse) {
          // Fallback pour utilisateurs non migrés (à retirer après migration complète)
          return { success: false, message: 'Ancien mot de passe incorrect' };
        }

        // Si utilisateur lié à Supabase Auth, mettre à jour aussi là-bas
        if (user.auth_user_id) {
          try {
            await callManageUsers('update-password', {
              auth_user_id: user.auth_user_id,
              new_password: nouveauMotDePasse,
            });
          } catch (err) {
            return { success: false, message: err.message };
          }
        }

        const modifies = [...utilisateurs];
        const nouveauHash = await hashLocal(nouveauMotDePasse);
        modifies[index] = { ...modifies[index], motDePasseHash: nouveauHash, motDePasse: null };
        set({ utilisateurs: modifies });
        return { success: true, message: 'Mot de passe modifié avec succès' };
      },

      reinitialiserMotDePasse: async (id, nouveauMotDePasse) => {
        const { utilisateurs } = get();
        const index = utilisateurs.findIndex(u => u.id === id);
        if (index === -1) return { success: false, message: 'Utilisateur non trouvé' };
        if (nouveauMotDePasse.length < 8) return { success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };

        const user = utilisateurs[index];

        if (user.auth_user_id) {
          try {
            await callManageUsers('update-password', {
              auth_user_id: user.auth_user_id,
              new_password: nouveauMotDePasse,
            });
          } catch (err) {
            return { success: false, message: err.message };
          }
        }

        const modifies = [...utilisateurs];
        // Hasher le nouveau mot de passe avant stockage
        const nouveauHash = await hashLocal(nouveauMotDePasse);
        modifies[index] = { ...modifies[index], motDePasseHash: nouveauHash, motDePasse: null };
        set({ utilisateurs: modifies });
        return { success: true, message: 'Mot de passe réinitialisé avec succès' };
      },

      toggleActif: (id) => {
        const { utilisateurs } = get();
        const index = utilisateurs.findIndex(u => u.id === id);
        if (index === -1) return { success: false, message: 'Utilisateur non trouvé' };
        const modifies = [...utilisateurs];
        modifies[index] = { ...modifies[index], actif: !modifies[index].actif };
        set({ utilisateurs: modifies });

        supabase.from('utilisateurs').update({ is_actif: modifies[index].actif }).eq('id', id).then(({ error }) => {
          if (error) logger.error('Supabase toggleActif:', error.message);
        }).catch((err) => {
          logger.error('Erreur toggleActif:', err.message);
        });

        return { success: true, utilisateur: modifies[index] };
      },

      supprimerUtilisateur: async (id, currentUserRole) => {
        if (currentUserRole !== 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
          return { success: false, message: 'Non autorisé : seuls les administrateurs peuvent supprimer.' };
        }

        const { utilisateurs } = get();
        const user = utilisateurs.find(u => u.id === id);
        if (!user) return { success: false, message: 'Utilisateur non trouvé' };

        if (user.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
          return { success: false, message: 'Non autorisé : impossible de supprimer le SUPER_ADMIN.' };
        }

        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          const admins = utilisateurs.filter(u => (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') && u.actif);
          if (admins.length <= 1) {
            return { success: false, message: 'Impossible de supprimer le dernier administrateur actif' };
          }
        }

        try {
          if (MGMT_SECRET) {
            await callManageUsers('delete', {
              id,
              auth_user_id: user.auth_user_id || null,
            });
          } else {
            throw new Error("No edge function");
          }
        } catch (err) {
          logger.warn('manage-users delete échoué, fallback local', err.message);
          // Fallback : on supprime localement dans la table utilisateurs
          const { error } = await supabase.from('utilisateurs').delete().eq('id', id);
          if (error) {
            return { success: false, message: error.message || 'Erreur lors de la suppression' };
          }
          // Si l'utilisateur a un compte Auth (et qu'on a la clé de service), on essaie de le supprimer de l'Auth
          if (user.auth_user_id && import.meta.env.DEV && import.meta.env.VITE_SUPABASE_SERVICE_ROLE) {
             await supabase.auth.admin.deleteUser(user.auth_user_id).catch(() => {});
          }
        }

        set({ utilisateurs: utilisateurs.filter(u => u.id !== id) });
        return { success: true, message: `${user.nom} supprimé définitivement` };
      },

      lierAuthSupabase: async (id, password) => {
        const { utilisateurs } = get();
        const user = utilisateurs.find(u => u.id === id);
        if (!user) return { success: false, message: 'Utilisateur non trouvé' };
        if (user.auth_user_id) return { success: false, message: 'Déjà lié à Supabase Auth' };
        if (!user.email) return { success: false, message: 'Email manquant — modifiez d\'abord l\'utilisateur' };

        try {
          const result = await callManageUsers('link-auth', {
            id,
            email: user.email,
            password,
          });
          const index = utilisateurs.findIndex(u => u.id === id);
          const modifies = [...utilisateurs];
          modifies[index] = { ...modifies[index], auth_user_id: result.user.auth_user_id };
          set({ utilisateurs: modifies });
          return { success: true, message: 'Compte lié à Supabase Auth avec succès' };
        } catch (err) {
          return { success: false, message: err.message };
        }
      },

      envoyerEmailRecuperation: async (email) => {
        try {
          await callManageUsers('send-reset-email', { email });
          return { success: true, message: 'Email de récupération envoyé' };
        } catch (err) {
          return { success: false, message: err.message };
        }
      },

      // ─── SYNCHRONISATION TEMPS RÉEL SUPABASE ───
      addUtilisateurFromRealtime: (row) => {
        const nouvelUtilisateur = rowToUtilisateur(row);
        const { utilisateurs } = get();
        if (!utilisateurs.find(u => u.id === nouvelUtilisateur.id)) {
          set({ utilisateurs: [...utilisateurs, nouvelUtilisateur] });
        }
      },

      updateUtilisateurFromRealtime: (row) => {
        const utilisateurMaj = rowToUtilisateur(row);
        const { utilisateurs } = get();
        const index = utilisateurs.findIndex(u => u.id === utilisateurMaj.id);
        if (index !== -1) {
          const updated = [...utilisateurs];
          updated[index] = { ...updated[index], ...utilisateurMaj };
          set({ utilisateurs: updated });
        } else {
          set({ utilisateurs: [...utilisateurs, utilisateurMaj] });
        }
      },

      deleteUtilisateurFromRealtime: (id) => {
        const { utilisateurs } = get();
        set({ utilisateurs: utilisateurs.filter(u => u.id !== id) });
      },
    }),
    {
      name: 'sika_utilisateurs',
      storage: createJSONStorage(() => idbStorage),
      version: 4,
      migrate: () => ({})
    }
  )
);
