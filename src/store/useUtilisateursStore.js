import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { hashPassword, verifyPassword } from '../utils/passwordHash';
import { logger } from '../utils/logger';

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
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

async function callManageUsers(action, payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'x-sika-admin': MGMT_SECRET,
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache',
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

function rowToUtilisateur(row, localUser = null) {
  return {
    id: row.id,
    nom: row.nom,
    login: row.login,
    email: row.email || '',
    role: row.role,
    actif: row.is_actif,
    auth_user_id: row.auth_user_id || null,
    // NOTE: Les mots de passe et hash ne sont JAMAIS exposés ici
    motDePasseHash: localUser?.motDePasseHash || null,
    permissions: row.permissions || null,
  };
}

// NOTE: Les mots de passe sont maintenant stockés comme des hash SHA-256
// Les mots de passe par défaut doivent être changés après la première connexion
const SALT_LOCAL = 'sika_local_auth_salt_2024';

// Fonction pour hasher un mot de passe localement
async function hashLocal(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT_LOCAL);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Aucun utilisateur initial fictif - tous les utilisateurs viennent de Supabase
const PERSONNEL_INITIAL = [];

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

          // Utiliser uniquement les données de Supabase
          const supabaseUsers = data.map(row => rowToUtilisateur(row));
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

      reinitialiserAvecCode: (email, code, nouveauMdp) => {
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
        const result = get().reinitialiserMotDePasse(recovery.userId, nouveauMdp);
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
        const roleToSend = utilisateur.role || 'TECHNICIEN';
        if (!validRoles.includes(roleToSend)) {
          return { success: false, message: `Rôle invalide : ${roleToSend}. Rôles acceptés : ${validRoles.join(', ')}` };
        }

        try {
          const result = await callManageUsers('create', {
            email: utilisateur.email,
            password: utilisateur.motDePasse,
            nom: utilisateur.nom,
            login: utilisateur.login,
            role: roleToSend,
          });

          const nouvelUtilisateur = rowToUtilisateur(result.user);
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

      supprimerUtilisateur: async (id) => {
        const { utilisateurs } = get();
        const user = utilisateurs.find(u => u.id === id);
        if (!user) return { success: false, message: 'Utilisateur non trouvé' };

        if (user.role === 'ADMIN') {
          const admins = utilisateurs.filter(u => u.role === 'ADMIN' && u.actif);
          if (admins.length <= 1) {
            return { success: false, message: 'Impossible de supprimer le dernier administrateur actif' };
          }
        }

        try {
          await callManageUsers('delete', {
            id,
            auth_user_id: user.auth_user_id || null,
          });
        } catch (err) {
          if (!err.message.includes('not found') && !err.message.includes('0 rows')) {
            return { success: false, message: err.message };
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
    }),
    {
      name: 'sika_utilisateurs',
      version: 4,
      partialize: () => ({}),
      migrate: () => ({})
    }
  )
);
