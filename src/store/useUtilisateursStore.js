import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';

const MGMT_SECRET = import.meta.env.VITE_SIKA_MGMT_SECRET || 'sika_industrie_admin_2026';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

async function callManageUsers(action, payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'x-sika-admin': MGMT_SECRET,
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
    motDePasse: localUser?.motDePasse || null,
    permissions: row.permissions || null,
  };
}

const PERSONNEL_INITIAL = [
  { id: 101, nom: 'KOMLAN AMEMATCHRON', login: 'komlan', email: 'komlan.amematchron@sikaindustrie.ci', motDePasse: 'admin123',  role: 'ADMIN',      actif: true, auth_user_id: null },
  { id: 102, nom: 'ANANI ALIDA OLGA',   login: 'anani',  email: 'anani.alida@sikaindustrie.ci',        motDePasse: 'compta123', role: 'COMPTABLE',  actif: true, auth_user_id: null },
  { id: 103, nom: 'KOUASSI JULIANA',    login: 'kouassi',email: 'kouassi.juliana@sikaindustrie.ci',    motDePasse: 'sec123',    role: 'SECRETAIRE', actif: true, auth_user_id: null },
  { id: 104, nom: 'Technicien 1',       login: 'tech1',  email: 'tech1@sikaindustrie.ci',              motDePasse: 'tech123',   role: 'TECHNICIEN', actif: true, auth_user_id: null },
  { id: 105, nom: 'Technicien 2',       login: 'tech2',  email: 'tech2@sikaindustrie.ci',              motDePasse: 'tech456',   role: 'TECHNICIEN', actif: true, auth_user_id: null },
  { id: 106, nom: 'Technicien 3',       login: 'tech3',  email: 'tech3@sikaindustrie.ci',              motDePasse: 'tech789',   role: 'TECHNICIEN', actif: true, auth_user_id: null },
  { id: 107, nom: 'Technicien 4',       login: 'tech4',  email: 'tech4@sikaindustrie.ci',              motDePasse: 'tech012',   role: 'TECHNICIEN', actif: true, auth_user_id: null },
  { id: 108, nom: 'Technicien 5',       login: 'tech5',  email: 'tech5@sikaindustrie.ci',              motDePasse: 'tech345',   role: 'TECHNICIEN', actif: true, auth_user_id: null },
  { id: 109, nom: 'Technicien 6',       login: 'tech6',  email: 'tech6@sikaindustrie.ci',              motDePasse: 'tech678',   role: 'TECHNICIEN', actif: true, auth_user_id: null },
  { id: 110, nom: 'Technicien 7',       login: 'tech7',  email: 'tech7@sikaindustrie.ci',              motDePasse: 'tech901',   role: 'TECHNICIEN', actif: true, auth_user_id: null },
  { id: 111, nom: 'Technicien 8',       login: 'tech8',  email: 'tech8@sikaindustrie.ci',              motDePasse: 'tech234',   role: 'TECHNICIEN', actif: true, auth_user_id: null },
  { id: 112, nom: 'Technicien 9',       login: 'tech9',  email: 'tech9@sikaindustrie.ci',              motDePasse: 'tech567',   role: 'TECHNICIEN', actif: true, auth_user_id: null },
  { id: 113, nom: 'Technicien 10',      login: 'tech10', email: 'tech10@sikaindustrie.ci',             motDePasse: 'tech890',   role: 'TECHNICIEN', actif: true, auth_user_id: null }
];

export const useUtilisateursStore = create(
  persist(
    (set, get) => ({
      utilisateurs: PERSONNEL_INITIAL,

      fetchUtilisateurs: async () => {
        try {
          const { data, error } = await supabase
            .from('utilisateurs')
            .select('*')
            .order('id');
          if (error || !data || data.length === 0) return;

          const localUsers = get().utilisateurs;

          const supabaseLogins = new Set(data.map(r => r.login));
          const merged = localUsers
            .filter(u => !u.auth_user_id || supabaseLogins.has(u.login))
            .map(u => {
              const row = data.find(r => r.login === u.login);
              return row ? rowToUtilisateur(row, u) : u;
            });

          data.forEach(row => {
            if (!merged.find(u => u.login === row.login)) {
              merged.push(rowToUtilisateur(row));
            }
          });

          set({ utilisateurs: merged });
        } catch (err) {
          console.error('fetchUtilisateurs:', err.message);
        }
      },

      getUtilisateurs: () => get().utilisateurs,

      getUtilisateurById: (id) => get().utilisateurs.find(u => u.id === id),

      getUtilisateurByLogin: (login) => get().utilisateurs.find(u => u.login === login),

      verifierIdentifiants: (identifiant, motDePasse) => {
        const id = (identifiant || '').trim().toLowerCase();
        const utilisateur = get().utilisateurs.find(
          u => (u.login.toLowerCase() === id || (u.email && u.email.toLowerCase() === id))
               && u.motDePasse === motDePasse && u.actif
        );
        if (utilisateur) {
          const { motDePasse: _, ...utilisateurSansMdp } = utilisateur;
          return { success: true, utilisateur: utilisateurSansMdp };
        }
        return { success: false, message: 'Identifiants incorrects' };
      },

      genererCodeRecuperation: (email) => {
        const { utilisateurs } = get();
        const emailLower = (email || '').trim().toLowerCase();
        const user = utilisateurs.find(u => u.email && u.email.toLowerCase() === emailLower && u.actif);
        if (!user) return { success: false, message: 'Aucun compte actif trouvé avec cet email' };
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiry = Date.now() + 15 * 60 * 1000;
        localStorage.setItem('sika_recovery', JSON.stringify({ userId: user.id, email: emailLower, code, expiry }));
        return { success: true, code, nom: user.nom, hasAuthAccount: !!user.auth_user_id };
      },

      reinitialiserAvecCode: (email, code, nouveauMdp) => {
        const raw = localStorage.getItem('sika_recovery');
        if (!raw) return { success: false, message: 'Aucune demande de récupération active' };
        let recovery;
        try { recovery = JSON.parse(raw); } catch { return { success: false, message: 'Données corrompues, recommencez' }; }
        if (recovery.email !== (email || '').trim().toLowerCase()) return { success: false, message: 'Email incorrect' };
        if (Date.now() > recovery.expiry) {
          localStorage.removeItem('sika_recovery');
          return { success: false, message: 'Code expiré, veuillez recommencer' };
        }
        if (recovery.code !== (code || '').trim()) return { success: false, message: 'Code incorrect' };
        if ((nouveauMdp || '').length < 6) return { success: false, message: 'Minimum 6 caractères requis' };
        const result = get().reinitialiserMotDePasse(recovery.userId, nouveauMdp);
        if (result.success) localStorage.removeItem('sika_recovery');
        return result;
      },

      ajouterUtilisateur: async (utilisateur) => {
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

        try {
          const result = await callManageUsers('create', {
            email: utilisateur.email,
            password: utilisateur.motDePasse,
            nom: utilisateur.nom,
            login: utilisateur.login,
            role: utilisateur.role || 'TECHNICIEN',
          });

          const nouvelUtilisateur = rowToUtilisateur(result.user);
          set({ utilisateurs: [...utilisateurs, nouvelUtilisateur] });
          return { success: true, utilisateur: nouvelUtilisateur };
        } catch (err) {
          return { success: false, message: err.message };
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
          if (error) console.error('Supabase modifierUtilisateur:', error.message);
        });

        return { success: true, utilisateur: modifies[index] };
      },

      changerMotDePasse: async (id, ancienMotDePasse, nouveauMotDePasse) => {
        const { utilisateurs } = get();
        const index = utilisateurs.findIndex(u => u.id === id);
        if (index === -1) return { success: false, message: 'Utilisateur non trouvé' };
        if (nouveauMotDePasse.length < 6) return { success: false, message: 'Le mot de passe doit contenir au moins 6 caractères' };

        const user = utilisateurs[index];

        if (user.auth_user_id) {
          if (ancienMotDePasse && user.motDePasse && user.motDePasse !== ancienMotDePasse) {
            return { success: false, message: 'Ancien mot de passe incorrect' };
          }
          try {
            await callManageUsers('update-password', {
              auth_user_id: user.auth_user_id,
              new_password: nouveauMotDePasse,
            });
          } catch (err) {
            return { success: false, message: err.message };
          }
        } else {
          if (user.motDePasse !== ancienMotDePasse) {
            return { success: false, message: 'Ancien mot de passe incorrect' };
          }
        }

        const modifies = [...utilisateurs];
        modifies[index] = { ...modifies[index], motDePasse: nouveauMotDePasse };
        set({ utilisateurs: modifies });
        return { success: true, message: 'Mot de passe modifié avec succès' };
      },

      reinitialiserMotDePasse: async (id, nouveauMotDePasse) => {
        const { utilisateurs } = get();
        const index = utilisateurs.findIndex(u => u.id === id);
        if (index === -1) return { success: false, message: 'Utilisateur non trouvé' };
        if (nouveauMotDePasse.length < 6) return { success: false, message: 'Le mot de passe doit contenir au moins 6 caractères' };

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
        modifies[index] = { ...modifies[index], motDePasse: nouveauMotDePasse };
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
          if (error) console.error('Supabase toggleActif:', error.message);
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
      version: 3,
      migrate: (persistedState) => {
        return {
          ...persistedState,
          utilisateurs: (persistedState.utilisateurs || PERSONNEL_INITIAL).map(u => ({
            ...u,
            auth_user_id: u.auth_user_id || null,
          }))
        };
      }
    }
  )
);
