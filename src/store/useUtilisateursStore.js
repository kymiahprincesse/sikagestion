import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';

function utilisateurToRow(u) {
  return {
    nom: u.nom,
    login: u.login,
    email: u.email || null,
    role: u.role || 'TECHNICIEN',
    is_actif: u.actif !== undefined ? u.actif : true,
    permissions: u.permissions || null,
  };
}

const PERSONNEL_INITIAL = [
  { id: 1,  nom: 'KOMLAN AMEMATCHRON', login: 'komlan', email: 'komlan.amematchron@sikaindustrie.ci', motDePasse: 'admin123',  role: 'ADMIN',      actif: true },
  { id: 2,  nom: 'ANANI ALIDA OLGA',   login: 'anani',  email: 'anani.alida@sikaindustrie.ci',        motDePasse: 'compta123', role: 'COMPTABLE',  actif: true },
  { id: 3,  nom: 'KOUASSI JULIANA',    login: 'kouassi',email: 'kouassi.juliana@sikaindustrie.ci',    motDePasse: 'sec123',    role: 'SECRETAIRE', actif: true },
  { id: 4,  nom: 'Technicien 1',       login: 'tech1',  email: 'tech1@sikaindustrie.ci',              motDePasse: 'tech123',   role: 'TECHNICIEN', actif: true },
  { id: 5,  nom: 'Technicien 2',       login: 'tech2',  email: 'tech2@sikaindustrie.ci',              motDePasse: 'tech456',   role: 'TECHNICIEN', actif: true },
  { id: 6,  nom: 'Technicien 3',       login: 'tech3',  email: 'tech3@sikaindustrie.ci',              motDePasse: 'tech789',   role: 'TECHNICIEN', actif: true },
  { id: 7,  nom: 'Technicien 4',       login: 'tech4',  email: 'tech4@sikaindustrie.ci',              motDePasse: 'tech012',   role: 'TECHNICIEN', actif: true },
  { id: 8,  nom: 'Technicien 5',       login: 'tech5',  email: 'tech5@sikaindustrie.ci',              motDePasse: 'tech345',   role: 'TECHNICIEN', actif: true },
  { id: 9,  nom: 'Technicien 6',       login: 'tech6',  email: 'tech6@sikaindustrie.ci',              motDePasse: 'tech678',   role: 'TECHNICIEN', actif: true },
  { id: 10, nom: 'Technicien 7',       login: 'tech7',  email: 'tech7@sikaindustrie.ci',              motDePasse: 'tech901',   role: 'TECHNICIEN', actif: true },
  { id: 11, nom: 'Technicien 8',       login: 'tech8',  email: 'tech8@sikaindustrie.ci',              motDePasse: 'tech234',   role: 'TECHNICIEN', actif: true },
  { id: 12, nom: 'Technicien 9',       login: 'tech9',  email: 'tech9@sikaindustrie.ci',              motDePasse: 'tech567',   role: 'TECHNICIEN', actif: true },
  { id: 13, nom: 'Technicien 10',      login: 'tech10', email: 'tech10@sikaindustrie.ci',             motDePasse: 'tech890',   role: 'TECHNICIEN', actif: true }
];

const EMAIL_PAR_ID = PERSONNEL_INITIAL.reduce((acc, u) => { acc[u.id] = u.email; return acc; }, {});

export const useUtilisateursStore = create(
  persist(
    (set, get) => ({
      utilisateurs: PERSONNEL_INITIAL,

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
        return { success: true, code, nom: user.nom };
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
        const nouvelId = Math.max(...utilisateurs.map(u => u.id), 0) + 1;
        const nouvelUtilisateur = { ...utilisateur, id: nouvelId, actif: true };
        set({ utilisateurs: [...utilisateurs, nouvelUtilisateur] });

        const { data, error } = await supabase.from('utilisateurs').insert(utilisateurToRow(nouvelUtilisateur)).select().single();
        if (error) {
          console.error('Supabase ajouterUtilisateur:', error.message);
        } else if (data) {
          set((state) => ({
            utilisateurs: state.utilisateurs.map((u) => u.id === nouvelUtilisateur.id ? { ...u, id: data.id } : u)
          }));
          return { success: true, utilisateur: { ...nouvelUtilisateur, id: data.id } };
        }

        return { success: true, utilisateur: nouvelUtilisateur };
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
        const utilisateursModifies = [...utilisateurs];
        utilisateursModifies[index] = { ...utilisateursModifies[index], ...modifications };
        set({ utilisateurs: utilisateursModifies });

        supabase.from('utilisateurs').update(utilisateurToRow(utilisateursModifies[index])).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase modifierUtilisateur:', error.message);
        });

        return { success: true, utilisateur: utilisateursModifies[index] };
      },

      changerMotDePasse: (id, ancienMotDePasse, nouveauMotDePasse) => {
        const { utilisateurs } = get();
        const index = utilisateurs.findIndex(u => u.id === id);
        if (index === -1) return { success: false, message: 'Utilisateur non trouvé' };
        if (utilisateurs[index].motDePasse !== ancienMotDePasse) return { success: false, message: 'Ancien mot de passe incorrect' };
        if (nouveauMotDePasse.length < 6) return { success: false, message: 'Le mot de passe doit contenir au moins 6 caractères' };
        const utilisateursModifies = [...utilisateurs];
        utilisateursModifies[index] = { ...utilisateursModifies[index], motDePasse: nouveauMotDePasse };
        set({ utilisateurs: utilisateursModifies });
        return { success: true, message: 'Mot de passe modifié avec succès' };
      },

      reinitialiserMotDePasse: (id, nouveauMotDePasse) => {
        const { utilisateurs } = get();
        const index = utilisateurs.findIndex(u => u.id === id);
        if (index === -1) return { success: false, message: 'Utilisateur non trouvé' };
        if (nouveauMotDePasse.length < 6) return { success: false, message: 'Le mot de passe doit contenir au moins 6 caractères' };
        const utilisateursModifies = [...utilisateurs];
        utilisateursModifies[index] = { ...utilisateursModifies[index], motDePasse: nouveauMotDePasse };
        set({ utilisateurs: utilisateursModifies });
        return { success: true, message: 'Mot de passe réinitialisé avec succès' };
      },

      toggleActif: (id) => {
        const { utilisateurs } = get();
        const index = utilisateurs.findIndex(u => u.id === id);
        if (index === -1) return { success: false, message: 'Utilisateur non trouvé' };
        const utilisateursModifies = [...utilisateurs];
        utilisateursModifies[index] = { ...utilisateursModifies[index], actif: !utilisateursModifies[index].actif };
        set({ utilisateurs: utilisateursModifies });

        supabase.from('utilisateurs').update({ is_actif: utilisateursModifies[index].actif }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggleActif:', error.message);
        });

        return { success: true, utilisateur: utilisateursModifies[index] };
      },

      supprimerUtilisateur: (id) => {
        const { utilisateurs } = get();
        if (utilisateurs.find(u => u.id === id && u.role === 'ADMIN')) {
          const admins = utilisateurs.filter(u => u.role === 'ADMIN' && u.actif);
          if (admins.length <= 1) {
            return { success: false, message: 'Impossible de supprimer le dernier administrateur actif' };
          }
        }
        set({ utilisateurs: utilisateurs.filter(u => u.id !== id) });
        supabase.from('utilisateurs').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase supprimerUtilisateur:', error.message);
        });
        return { success: true, message: 'Utilisateur supprimé avec succès' };
      },

      setUtilisateurs: (utilisateursSupabase) => {
        const { utilisateurs } = get();
        const utilisateursLocaux = utilisateurs;
        utilisateursSupabase.forEach(su => {
          const idx = utilisateursLocaux.findIndex(u => u.login === su.login);
          if (idx >= 0) {
            utilisateursLocaux[idx] = { ...utilisateursLocaux[idx], id: su.id, email: su.email, role: su.role, actif: su.is_actif };
          }
        });
        set({ utilisateurs: [...utilisateursLocaux] });
      }
    }),
    {
      name: 'sika_utilisateurs',
      version: 2,
      migrate: (persistedState, version) => {
        if (version < 2) {
          return {
            ...persistedState,
            utilisateurs: (persistedState.utilisateurs || PERSONNEL_INITIAL).map(u => ({
              ...u,
              email: u.email || EMAIL_PAR_ID[u.id] || `${u.login}@sikaindustrie.ci`
            }))
          };
        }
        return persistedState;
      }
    }
  )
);
