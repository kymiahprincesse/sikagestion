import { useState, useEffect } from 'react';
import { MATRIX_DROITS } from '../../utils/droits';
import { useAuthStore } from '../../store/useAuthStore';
import { useUtilisateursStore } from '../../store/useUtilisateursStore';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAudit } from '../../hooks/useAudit';
import { filtrerSuperAdmin, isSuperAdmin, normalizeRole } from '../../utils/filterSuperAdmin';

const ROLE_CONFIG = {
  ADMIN:      { couleur: '#E60000', fond: '#FFE6E6', label: 'Administrateur', icone: '👑', desc: 'Accès complet à tous les modules. Gère les utilisateurs et les paramètres système.' },
  COMPTABLE:  { couleur: '#1B2A4A', fond: '#E8ECF4', label: 'Comptable',       icone: '📊', desc: 'Factures, encaissements, caisse, journal, fournisseurs. Export financier.' },
  SECRETAIRE: { couleur: '#1A7A4A', fond: '#E8F5E9', label: 'Secrétaire',      icone: '📋', desc: 'Clients, devis, factures (lecture), appels d\'offres, planification.' },
  TECHNICIEN: { couleur: '#1F5C99', fond: '#E3F0FB', label: 'Technicien',      icone: '🔧', desc: 'Planification et appels d\'offres en lecture seule. Peut modifier les tâches.' }
};

const MODULES_TABLE = [
  { key: 'DASHBOARD',    label: 'Dashboard' },
  { key: 'CLIENTS',      label: 'Clients' },
  { key: 'APPELS_OFFRES',label: 'Appels d\'offres' },
  { key: 'DEVIS',        label: 'Devis' },
  { key: 'FACTURES',     label: 'Factures' },
  { key: 'ENCAISSEMENTS',label: 'Encaissements' },
  { key: 'CAISSE',       label: 'Caisse' },
  { key: 'JOURNAL',      label: 'Journal caisse' },
  { key: 'FOURNISSEURS', label: 'Fournisseurs' },
  { key: 'PLANIFICATION',label: 'Planification' },
  { key: 'PARAMETRES',   label: 'Paramètres / Users' },
  { key: 'AUDIT',        label: 'Tour de Contrôle' },
];

const ACTIONS_PERM = ['LIRE', 'CREER', 'MODIFIER', 'SUPPRIMER', 'VALIDER', 'EXPORTER'];
const ACTIONS_LABELS = { LIRE: 'L', CREER: 'C', MODIFIER: 'M', SUPPRIMER: 'S', VALIDER: 'V', EXPORTER: 'E' };
const ACTIONS_FULL  = { LIRE: 'Lire', CREER: 'Créer', MODIFIER: 'Modifier', SUPPRIMER: 'Supprimer', VALIDER: 'Valider', EXPORTER: 'Exporter' };

const getInitiales = (nom) => {
  if (!nom) return '?';
  return nom.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
};

const PermBadge = ({ allowed, label }) => (
  <span
    title={ACTIONS_FULL[label] || label}
    style={{
      background: allowed ? '#E8F5E9' : '#F5F5F5',
      color: allowed ? '#1A7A4A' : '#C8C8D0',
      border: `1px solid ${allowed ? '#1A7A4A' : '#E0E0E0'}`,
      fontSize: '10px', fontWeight: 700,
      padding: '1px 5px', borderRadius: '4px',
      display: 'inline-block', minWidth: '20px', textAlign: 'center'
    }}
  >
    {ACTIONS_LABELS[label] || label}
  </span>
);

const BTN = ({ onClick, color, bg, border, children, title, disabled }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    style={{
      background: bg || color, color: bg ? color : 'white',
      border: border ? `1px solid ${color}` : 'none',
      padding: '5px 12px', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      opacity: disabled ? 0.5 : 1
    }}
  >
    {children}
  </button>
);

const InputField = ({ label, type = 'text', value, onChange, placeholder, required, autoComplete = 'on' }) => (
  <div>
    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#1B2A4A' }}>
      {label}{required && <span style={{ color: '#E60000' }}> *</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      style={{
        width: '100%', padding: '8px 12px', border: '1.5px solid #C8C8D0',
        borderRadius: '6px', fontSize: '13px', outline: 'none',
        boxSizing: 'border-box'
      }}
    />
  </div>
);

const Utilisateurs = () => {
  const navigate = useNavigate();
  const utilisateurConnecte = useAuthStore((state) => state.utilisateurConnecte);
  const { enregistrerAction } = useAudit();

  const utilisateurs = useUtilisateursStore((state) => state.utilisateurs);
  const fetchUtilisateurs = useUtilisateursStore((state) => state.fetchUtilisateurs);
  const modifierUtilisateur = useUtilisateursStore((state) => state.modifierUtilisateur);
  const changerMotDePasse = useUtilisateursStore((state) => state.changerMotDePasse);
  const reinitialiserMotDePasse = useUtilisateursStore((state) => state.reinitialiserMotDePasse);
  const ajouterUtilisateur = useUtilisateursStore((state) => state.ajouterUtilisateur);
  const toggleActif = useUtilisateursStore((state) => state.toggleActif);
  const supprimerUtilisateur = useUtilisateursStore((state) => state.supprimerUtilisateur);
  const lierAuthSupabase = useUtilisateursStore((state) => state.lierAuthSupabase);
  const envoyerEmailRecuperation = useUtilisateursStore((state) => state.envoyerEmailRecuperation);

  const [onglet, setOnglet] = useState('liste');
  const [filtreRole, setFiltreRole] = useState('TOUS');
  const [recherche, setRecherche] = useState('');
  const [modeEdition, setModeEdition] = useState(null);
  const [modeMotDePasse, setModeMotDePasse] = useState(null);
  const [modeAjout, setModeAjout] = useState(false);
  const [formData, setFormData] = useState({});
  const [passwordData, setPasswordData] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [message, setMessage] = useState(null);
  const [modalDelete, setModalDelete] = useState({ open: false, user: null });
  const [modalReinit, setModalReinit] = useState({ open: false, user: null, mdp: '', mdpConfirm: '' });
  const [modalLierAuth, setModalLierAuth] = useState({ open: false, user: null, mdp: '' });
  const [showPwd, setShowPwd] = useState({ ancien: false, nouveau: false, conf: false, reinit: false, reinitConf: false, ajout: false, lier: false });
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingReinit, setLoadingReinit] = useState(false);
  const [loadingLier, setLoadingLier] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchUtilisateurs();
  }, []);

  const connectedRole = normalizeRole(utilisateurConnecte?.role);
  const isAdminUser = utilisateurConnecte && (connectedRole === 'ADMIN' || isSuperAdmin(utilisateurConnecte));

  if (!utilisateurConnecte || !isAdminUser) {
    return <Navigate to="/dashboard" replace />;
  }

  // SUPER_ADMIN voit TOUS les utilisateurs (y compris lui-même)
  // Les autres admins ne voient pas le SUPER_ADMIN
  const tousUtilisateurs = isSuperAdmin(utilisateurConnecte)
    ? utilisateurs
    : filtrerSuperAdmin(utilisateurs);

  const utilisateursFiltres = tousUtilisateurs
    .filter(u => filtreRole === 'TOUS' || u.role === filtreRole)
    .filter(u => {
      if (!recherche.trim()) return true;
      const q = recherche.toLowerCase();
      return u.nom.toLowerCase().includes(q) || u.login.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
    });

  const stats = {
    total: tousUtilisateurs.length,
    actifs: tousUtilisateurs.filter(u => u.actif).length,
    inactifs: tousUtilisateurs.filter(u => !u.actif).length,
    parRole: Object.keys(ROLE_CONFIG).reduce((acc, r) => { acc[r] = tousUtilisateurs.filter(u => u.role === r).length; return acc; }, {})
  };

  const afficherMessage = (type, texte) => {
    setMessage({ type, texte });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleEditer = (user) => {
    setModeEdition(user.id);
    setModeMotDePasse(null);
    setFormData({ nom: user.nom, login: user.login, email: user.email || '', role: user.role });
  };

  const handleSauvegarderEdition = () => {
    if (!formData.nom || !formData.login) { afficherMessage('error', 'Nom et login obligatoires'); return; }
    const result = modifierUtilisateur(modeEdition, formData);
    if (result.success) {
      enregistrerAction('UTILISATEUR', 'MODIFICATION', `Utilisateur ${formData.nom} modifié`);
      afficherMessage('success', 'Utilisateur modifié avec succès');
      setModeEdition(null); setFormData({});
    } else { afficherMessage('error', result.message); }
  };

  const handleChangerMotDePasse = (userId) => {
    setModeMotDePasse(userId);
    setModeEdition(null);
    setPasswordData({ ancien: '', nouveau: '', confirmation: '' });
  };

  const handleSauvegarderMotDePasse = async () => {
    if (passwordData.nouveau !== passwordData.confirmation) { afficherMessage('error', 'Les mots de passe ne correspondent pas'); return; }
    if (passwordData.nouveau.length < 6) { afficherMessage('error', 'Minimum 6 caractères'); return; }
    const result = await changerMotDePasse(modeMotDePasse, passwordData.ancien, passwordData.nouveau);
    if (result.success) {
      const user = utilisateurs.find(u => u.id === modeMotDePasse);
      enregistrerAction('UTILISATEUR', 'MOT_DE_PASSE', `Mot de passe changé pour ${user?.nom}`);
      afficherMessage('success', result.message);
      setModeMotDePasse(null);
    } else { afficherMessage('error', result.message); }
  };

  const handleConfirmReinit = async () => {
    if (modalReinit.mdp !== modalReinit.mdpConfirm) { afficherMessage('error', 'Les mots de passe ne correspondent pas'); return; }
    if (modalReinit.mdp.length < 6) { afficherMessage('error', 'Minimum 6 caractères'); return; }
    setLoadingReinit(true);
    try {
      const result = await reinitialiserMotDePasse(modalReinit.user.id, modalReinit.mdp);
      if (result.success) {
        enregistrerAction('UTILISATEUR', 'REINIT_MDP', `Mot de passe réinitialisé pour ${modalReinit.user.nom}`);
        afficherMessage('success', result.message);
        setModalReinit({ open: false, user: null, mdp: '', mdpConfirm: '' });
      } else { afficherMessage('error', result.message); }
    } finally { setLoadingReinit(false); }
  };

  const handleToggleActif = (userId) => {
    const result = toggleActif(userId);
    if (result.success) {
      const user = result.utilisateur;
      enregistrerAction('UTILISATEUR', user.actif ? 'ACTIVATION' : 'DESACTIVATION', `Utilisateur ${user.nom}`);
      afficherMessage('success', `Utilisateur ${user.actif ? 'activé' : 'désactivé'}`);
    } else { afficherMessage('error', result.message); }
  };

  const handleSauvegarderAjout = async () => {
    if (!formData.nom || !formData.login || !formData.motDePasse) { afficherMessage('error', 'Tous les champs sont obligatoires'); return; }
    if (!formData.email) { afficherMessage('error', 'L\'email est obligatoire pour créer un compte Supabase'); return; }
    if (formData.motDePasse.length < 6) { afficherMessage('error', 'Minimum 6 caractères pour le mot de passe'); return; }

    // Vérifier que l'utilisateur est connecté et a un rôle
    const currentRole = normalizeRole(utilisateurConnecte?.role);

    if (!currentRole) {
      afficherMessage('error', 'Erreur: Votre session semble expirée. Reconnectez-vous.');
      return;
    }
    if (currentRole !== 'ADMIN' && currentRole !== 'SUPER_ADMIN') {
      afficherMessage('error', `Permission refusée: votre rôle '${currentRole}' ne permet pas d'ajouter des utilisateurs.`);
      return;
    }

    setLoadingCreate(true);
    try {
      const result = await ajouterUtilisateur(formData, currentRole);
      if (result.success) {
        enregistrerAction('UTILISATEUR', 'CREATION', `Nouvel utilisateur ${formData.nom} créé avec rôle ${formData.role}`);
        afficherMessage('success', `✅ ${formData.nom} créé — peut maintenant se connecter avec son email`);
        setModeAjout(false); setFormData({});
      } else { afficherMessage('error', result.message); }
    } finally { setLoadingCreate(false); }
  };

  const handleConfirmDelete = async () => {
    if (!modalDelete.user) return;
    setLoadingDelete(true);
    try {
      const result = await supprimerUtilisateur(modalDelete.user.id);
      if (result.success) {
        enregistrerAction('UTILISATEUR', 'SUPPRESSION', `Utilisateur ${modalDelete.user.nom} supprimé définitivement`);
        afficherMessage('success', `🗑️ ${result.message}`);
        setModalDelete({ open: false, user: null });
      } else { afficherMessage('error', result.message); }
    } finally { setLoadingDelete(false); }
  };

  const handleLierAuth = async () => {
    if (!modalLierAuth.mdp || modalLierAuth.mdp.length < 6) { afficherMessage('error', 'Mot de passe: minimum 6 caractères'); return; }
    setLoadingLier(true);
    try {
      const result = await lierAuthSupabase(modalLierAuth.user.id, modalLierAuth.mdp);
      if (result.success) {
        enregistrerAction('UTILISATEUR', 'LIAISON_AUTH', `${modalLierAuth.user.nom} lié à Supabase Auth`);
        afficherMessage('success', `🔗 ${result.message}`);
        setModalLierAuth({ open: false, user: null, mdp: '' });
      } else { afficherMessage('error', result.message); }
    } finally { setLoadingLier(false); }
  };

  const handleEnvoyerEmailRecup = async (user) => {
    if (!user.email) { afficherMessage('error', 'Cet utilisateur n\'a pas d\'email'); return; }
    const result = await envoyerEmailRecuperation(user.email);
    if (result.success) {
      afficherMessage('success', `📧 Email de récupération envoyé à ${user.email}`);
    } else { afficherMessage('error', result.message); }
  };

  const handleSyncSupabase = async () => {
    setSyncing(true);
    try {
      await fetchUtilisateurs();
      afficherMessage('success', '🔄 Synchronisation avec Supabase effectuée');
    } finally { setSyncing(false); }
  };


  const roleColor = (role) => ROLE_CONFIG[role]?.couleur || '#C8C8D0';
  const roleFond = (role) => ROLE_CONFIG[role]?.fond || '#F5F5F5';

  const tabStyle = (t) => ({
    padding: '10px 20px', borderRadius: '8px 8px 0 0', fontWeight: 700,
    fontSize: '14px', cursor: 'pointer', border: 'none',
    background: onglet === t ? 'white' : 'transparent',
    color: onglet === t ? '#1B2A4A' : 'rgba(255,255,255,0.75)',
    borderBottom: onglet === t ? '3px solid #E60000' : '3px solid transparent',
    transition: 'all 0.15s'
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#E8ECF4' }}>

      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div style={{ background: '#1B2A4A', padding: '20px 28px 0' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 800, margin: 0 }}>🔐 Gestion des Utilisateurs</h1>
              <p style={{ color: '#C8C8D0', fontSize: '13px', margin: '4px 0 0' }}>Administration du personnel SIKA INDUSTRIE — droits et rôles</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSyncSupabase}
                disabled={syncing}
                style={{ background: syncing ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '9px 16px', fontWeight: 700, cursor: syncing ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {syncing ? '⏳' : '🔄'} {syncing ? 'Sync...' : 'Synchroniser'}
              </button>
              <button
                onClick={() => navigate('/parametres')}
                style={{ background: '#E60000', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
              >
                ⚙️ Paramètres
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Total', value: stats.total, color: 'white', bg: 'rgba(255,255,255,0.12)', icon: '👥' },
              { label: 'Actifs', value: stats.actifs, color: '#4ADE80', bg: 'rgba(74,222,128,0.15)', icon: '✅' },
              { label: 'Inactifs', value: stats.inactifs, color: '#FCA5A5', bg: 'rgba(252,165,165,0.15)', icon: '⊘' },
              { label: 'Admin', value: stats.parRole.ADMIN || 0, color: '#FCA5A5', bg: 'rgba(230,0,0,0.15)', icon: '👑' },
              { label: 'Comptable', value: stats.parRole.COMPTABLE || 0, color: '#93C5FD', bg: 'rgba(147,197,253,0.15)', icon: '📊' },
              { label: 'Technicien', value: stats.parRole.TECHNICIEN || 0, color: '#BAE6FD', bg: 'rgba(186,230,253,0.15)', icon: '🔧' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px' }}>{s.icon}</div>
                <div style={{ color: s.color, fontSize: '22px', fontWeight: 800 }}>{s.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button style={tabStyle('liste')} onClick={() => setOnglet('liste')}>👥 Utilisateurs</button>
            <button style={tabStyle('permissions')} onClick={() => setOnglet('permissions')}>🔐 Matrice des droits</button>
            <button style={tabStyle('roles')} onClick={() => setOnglet('roles')}>🎭 Rôles & Accès</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '24px 28px' }}>

        {/* ─── TOAST NOTIFICATION ──────────────────────────────────── */}
        {message && (
          <div style={{
            position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
            minWidth: '320px', maxWidth: '480px',
            padding: '14px 18px', borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            background: message.type === 'success' ? '#1A7A4A' : '#E60000',
            color: 'white',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontWeight: 700, fontSize: '14px',
            animation: 'slideInRight 0.3s ease-out',
          }}>
            <style>{`@keyframes slideInRight { from { transform: translateX(110%); opacity:0 } to { transform: translateX(0); opacity:1 } }`}</style>
            <span>{message.texte}</span>
            <button onClick={() => setMessage(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '12px', flexShrink: 0 }}>✕</button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB : LISTE UTILISATEURS                                  */}
        {/* ══════════════════════════════════════════════════════════ */}
        {onglet === 'liste' && (
          <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#C8C8D0' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Rechercher par nom, login ou rôle..."
                  value={recherche}
                  onChange={e => setRecherche(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #C8C8D0', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['TOUS', 'ADMIN', 'COMPTABLE', 'SECRETAIRE', 'TECHNICIEN'].map(r => (
                  <button key={r} onClick={() => setFiltreRole(r)} style={{
                    padding: '7px 14px', borderRadius: '6px', border: `1.5px solid ${filtreRole === r ? '#E60000' : '#C8C8D0'}`,
                    background: filtreRole === r ? '#E60000' : 'white', color: filtreRole === r ? 'white' : '#1B2A4A',
                    fontWeight: 600, fontSize: '12px', cursor: 'pointer'
                  }}>
                    {r === 'TOUS' ? 'Tous' : `${ROLE_CONFIG[r]?.icone} ${r}`}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setModeAjout(!modeAjout); setFormData({ nom: '', login: '', motDePasse: '', role: 'TECHNICIEN' }); setModeEdition(null); setModeMotDePasse(null); }}
                style={{ background: '#E60000', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}
              >
                ➕ Nouvel utilisateur
              </button>
            </div>

            {/* ── FORMULAIRE AJOUT ── */}
            {modeAjout && (
              <div style={{ background: 'white', borderRadius: '10px', border: '2px solid #E60000', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 16px rgba(230,0,0,0.1)' }}>
                <h3 style={{ color: '#1B2A4A', fontWeight: 800, fontSize: '15px', margin: '0 0 8px' }}>➕ Créer un nouvel utilisateur</h3>
                <div style={{ background: '#E3F0FB', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#1F5C99', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔗 Un compte Supabase Auth sera créé — l'utilisateur pourra se connecter et récupérer son mot de passe par email.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <InputField label="Nom complet" value={formData.nom || ''} onChange={e => setFormData({ ...formData, nom: e.target.value })} placeholder="Ex: KOUASSI Jean" required autoComplete="off" />
                  <InputField label="Login" value={formData.login || ''} onChange={e => setFormData({ ...formData, login: e.target.value })} placeholder="Ex: kouassi.j" required autoComplete="off" />
                  <InputField label="Email" type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Ex: nom@sikaindustrie.ci" required autoComplete="off" />
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#1B2A4A' }}>
                      Mot de passe <span style={{ color: '#E60000' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPwd.ajout ? 'text' : 'password'}
                        value={formData.motDePasse || ''}
                        onChange={e => setFormData({ ...formData, motDePasse: e.target.value })}
                        placeholder="Min. 6 caractères"
                        style={{ width: '100%', padding: '8px 36px 8px 12px', border: '1.5px solid #C8C8D0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                      <button type="button" onClick={() => setShowPwd(p => ({ ...p, ajout: !p.ajout }))}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                        {showPwd.ajout ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#1B2A4A' }}>Rôle <span style={{ color: '#E60000' }}>*</span></label>
                    <select value={formData.role || 'TECHNICIEN'} onChange={e => setFormData({ ...formData, role: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #C8C8D0', borderRadius: '6px', fontSize: '13px' }}>
                      {Object.entries(ROLE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icone} {v.label}</option>)}
                    </select>
                  </div>
                </div>
                {formData.role && (
                  <div style={{ background: roleFond(formData.role), borderRadius: '6px', padding: '8px 12px', marginBottom: '12px', fontSize: '12px', color: roleColor(formData.role), fontWeight: 500 }}>
                    {ROLE_CONFIG[formData.role]?.icone} <strong>{ROLE_CONFIG[formData.role]?.label}</strong> — {ROLE_CONFIG[formData.role]?.desc}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <BTN onClick={handleSauvegarderAjout} color="#1A7A4A" disabled={loadingCreate}>{loadingCreate ? '⏳ Création Supabase...' : '✓ Créer l\'utilisateur'}</BTN>
                  <BTN onClick={() => { setModeAjout(false); setFormData({}); }} color="#C8C8D0" bg="#F5F5F5" disabled={loadingCreate}>✕ Annuler</BTN>
                </div>
              </div>
            )}

            {/* ── LISTE ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {utilisateursFiltres.length === 0 && (
                <div style={{ background: 'white', borderRadius: '10px', padding: '32px', textAlign: 'center', color: '#C8C8D0' }}>
                  Aucun utilisateur trouvé
                </div>
              )}
              {utilisateursFiltres.map(user => {
                const rc = ROLE_CONFIG[user.role] || {};
                return (
                  <div key={user.id} style={{
                    background: 'white', borderRadius: '10px', overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: `1px solid ${user.actif ? '#E8ECF4' : '#F5F5F5'}`,
                    opacity: user.actif ? 1 : 0.65
                  }}>
                    {/* Card Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderLeft: `4px solid ${rc.couleur || '#C8C8D0'}` }}>
                      {/* Avatar */}
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                        background: rc.fond || '#F5F5F5', color: rc.couleur || '#666',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '15px', border: `2px solid ${rc.couleur || '#C8C8D0'}`
                      }}>
                        {getInitiales(user.nom)}
                      </div>

                      {modeEdition === user.id ? (
                        /* ── Formulaire édition inline ── */
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                            <InputField label="Nom" value={formData.nom || ''} onChange={e => setFormData({ ...formData, nom: e.target.value })} required autoComplete="off" />
                            <InputField label="Login" value={formData.login || ''} onChange={e => setFormData({ ...formData, login: e.target.value })} required autoComplete="off" />
                            <InputField label="Email" type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="adresse@sikaindustrie.ci" autoComplete="off" />
                            <div>
                              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#1B2A4A' }}>Rôle</label>
                              <select value={formData.role || ''} onChange={e => setFormData({ ...formData, role: e.target.value })}
                                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #C8C8D0', borderRadius: '6px', fontSize: '13px' }}>
                                {Object.entries(ROLE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icone} {v.label}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <BTN onClick={handleSauvegarderEdition} color="#1A7A4A">✓ Sauvegarder</BTN>
                            <BTN onClick={() => { setModeEdition(null); setFormData({}); }} color="#C8C8D0" bg="#F5F5F5">✕ Annuler</BTN>
                          </div>
                        </div>
                      ) : modeMotDePasse === user.id ? (
                        /* ── Formulaire changement MDP inline ── */
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 10px', fontWeight: 700, color: '#1B2A4A', fontSize: '13px' }}>🔑 Changer le mot de passe — {user.nom}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                            {[
                              { key: 'ancien', label: 'Ancien MDP', showKey: 'ancien' },
                              { key: 'nouveau', label: 'Nouveau MDP', showKey: 'nouveau' },
                              { key: 'confirmation', label: 'Confirmer', showKey: 'conf' }
                            ].map(f => (
                              <div key={f.key}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#1B2A4A' }}>{f.label}</label>
                                <div style={{ position: 'relative' }}>
                                  <input type={showPwd[f.showKey] ? 'text' : 'password'}
                                    value={passwordData[f.key]}
                                    onChange={e => setPasswordData({ ...passwordData, [f.key]: e.target.value })}
                                    style={{ width: '100%', padding: '7px 30px 7px 10px', border: '1.5px solid #C8C8D0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                                  />
                                  <button type="button" onClick={() => setShowPwd(p => ({ ...p, [f.showKey]: !p[f.showKey] }))}
                                    style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                                    {showPwd[f.showKey] ? '🙈' : '👁️'}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          {passwordData.nouveau && passwordData.confirmation && passwordData.nouveau !== passwordData.confirmation && (
                            <p style={{ color: '#E60000', fontSize: '12px', margin: '0 0 8px' }}>⚠️ Les mots de passe ne correspondent pas</p>
                          )}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <BTN onClick={handleSauvegarderMotDePasse} color="#1A7A4A">✓ Confirmer</BTN>
                            <BTN onClick={() => { setModeMotDePasse(null); setPasswordData({ ancien: '', nouveau: '', confirmation: '' }); }} color="#C8C8D0" bg="#F5F5F5">✕ Annuler</BTN>
                          </div>
                        </div>
                      ) : (
                        /* ── Affichage normal ── */
                        <>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, color: '#1B2A4A', fontSize: '15px' }}>{user.nom}</span>
                              <span style={{ background: rc.fond, color: rc.couleur, border: `1px solid ${rc.couleur}`, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
                                {rc.icone} {rc.label || user.role}
                              </span>
                              <span style={{ background: user.actif ? '#E8F5E9' : '#F5F5F5', color: user.actif ? '#1A7A4A' : '#C8C8D0', border: `1px solid ${user.actif ? '#1A7A4A' : '#C8C8D0'}`, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
                                {user.actif ? '● Actif' : '○ Inactif'}
                              </span>
                              {user.auth_user_id ? (
                                <span title="Compte Supabase Auth actif — connexion et récupération par email disponibles" style={{ background: '#E3F0FB', color: '#1F5C99', border: '1px solid #1F5C99', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, cursor: 'default' }}>
                                  🔗 Supabase Auth
                                </span>
                              ) : (
                                <span title="Compte local uniquement — pas de récupération email" style={{ background: '#F5F5F5', color: '#888', border: '1px solid #C8C8D0', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, cursor: 'default' }}>
                                  💾 Local
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>
                              Login : <strong>{user.login}</strong> &nbsp;|&nbsp; ID : #{String(user.id).padStart(3, '0')}
                            </div>
                            {user.email && (
                              <div style={{ fontSize: '11px', color: '#1F5C99', marginTop: '2px' }}>
                                ✉️ {user.email}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <BTN onClick={() => handleEditer(user)} color="#1F5C99">✏️ Modifier</BTN>
                            <BTN onClick={() => handleChangerMotDePasse(user.id)} color="#1B2A4A">🔑 MDP</BTN>
                            <BTN onClick={() => setModalReinit({ open: true, user, mdp: '', mdpConfirm: '' })} color="#E60000" bg="#FFE6E6" border>🔄 Réinit</BTN>
                            {!user.auth_user_id && user.email && (
                              <BTN onClick={() => setModalLierAuth({ open: true, user, mdp: '' })} color="#1F5C99" bg="#E3F0FB" border>🔗 Lier Auth</BTN>
                            )}
                            {user.auth_user_id && user.email && (
                              <BTN onClick={() => handleEnvoyerEmailRecup(user)} color="#6B7280" bg="#F3F4F6" border>📧 Email récup</BTN>
                            )}
                            <BTN onClick={() => handleToggleActif(user.id)} color={user.actif ? '#E60000' : '#1A7A4A'} bg={user.actif ? '#FFE6E6' : '#E8F5E9'} border>
                              {user.actif ? '⊘ Désactiver' : '✓ Activer'}
                            </BTN>
                            <BTN onClick={() => setModalDelete({ open: true, user })} color="#E60000">🗑️ Supprimer</BTN>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {utilisateursFiltres.length > 0 && (
              <p style={{ color: '#888', fontSize: '12px', marginTop: '12px', textAlign: 'right' }}>
                {utilisateursFiltres.length} utilisateur{utilisateursFiltres.length > 1 ? 's' : ''} affiché{utilisateursFiltres.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB : MATRICE DES PERMISSIONS                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {onglet === 'permissions' && (
          <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ background: '#1B2A4A', padding: '16px 24px', borderBottom: '3px solid #E60000' }}>
              <h2 style={{ color: 'white', margin: 0, fontSize: '17px', fontWeight: 800 }}>🔐 Matrice complète des droits d'accès</h2>
              <p style={{ color: '#C8C8D0', fontSize: '12px', margin: '4px 0 0' }}>Permissions par module et par rôle — L=Lire C=Créer M=Modifier S=Supprimer V=Valider E=Exporter</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#E8ECF4' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#1B2A4A', fontSize: '13px', borderBottom: '2px solid #C8C8D0', minWidth: '160px' }}>
                      Module
                    </th>
                    {Object.entries(ROLE_CONFIG).map(([role, rc]) => (
                      <th key={role} style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #C8C8D0', minWidth: '170px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: rc.fond, color: rc.couleur, borderRadius: '20px', padding: '4px 12px', fontWeight: 700, fontSize: '12px', border: `1px solid ${rc.couleur}` }}>
                          {rc.icone} {rc.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES_TABLE.map((mod, idx) => (
                    <tr key={mod.key} style={{ background: idx % 2 === 0 ? 'white' : '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1B2A4A', fontSize: '13px' }}>
                        {mod.label}
                      </td>
                      {Object.keys(ROLE_CONFIG).map(role => {
                        const perms = MATRIX_DROITS[role]?.[mod.key] || {};
                        return (
                          <td key={role} style={{ padding: '8px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {ACTIONS_PERM.map(action => (
                                <PermBadge key={action} allowed={!!perms[action]} label={action} />
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Légende */}
            <div style={{ padding: '16px 24px', background: '#F8F9FA', borderTop: '1px solid #E8ECF4' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <strong style={{ color: '#1B2A4A', fontSize: '13px' }}>Légende :</strong>
                {[
                  { label: 'L — Lire', allowed: true },
                  { label: 'C — Créer', allowed: true },
                  { label: 'M — Modifier', allowed: true },
                  { label: 'S — Supprimer', allowed: true },
                  { label: 'V — Valider', allowed: true },
                  { label: 'E — Exporter', allowed: true },
                ].map(item => (
                  <span key={item.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#555' }}>
                    <PermBadge allowed={item.allowed} label={item.label.split(' ')[0]} />
                    {item.label}
                  </span>
                ))}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#555' }}>
                  <PermBadge allowed={false} label="X" />
                  Non autorisé
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB : RÔLES & ACCÈS                                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        {onglet === 'roles' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {Object.entries(ROLE_CONFIG).map(([role, rc]) => {
                const count = tousUtilisateurs.filter(u => u.role === role).length;
                const actifs = tousUtilisateurs.filter(u => u.role === role && u.actif).length;
                const moduleCount = Object.entries(MATRIX_DROITS[role] || {}).filter(([, p]) => Object.values(p).some(Boolean)).length;
                return (
                  <div key={role} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: `1px solid ${rc.fond}` }}>
                    <div style={{ background: rc.couleur, padding: '16px 20px', color: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '28px', marginBottom: '6px' }}>{rc.icone}</div>
                          <div style={{ fontWeight: 800, fontSize: '17px' }}>{rc.label}</div>
                          <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>Code : {role}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '4px 12px', fontSize: '20px', fontWeight: 800 }}>{count}</div>
                          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '3px' }}>utilisateur{count > 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      <p style={{ fontSize: '13px', color: '#555', margin: '0 0 12px', lineHeight: '1.5' }}>{rc.desc}</p>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        <span style={{ background: '#E8F5E9', color: '#1A7A4A', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                          {actifs} actif{actifs > 1 ? 's' : ''}
                        </span>
                        <span style={{ background: '#E3F0FB', color: '#1F5C99', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                          {moduleCount} modules
                        </span>
                        {count - actifs > 0 && (
                          <span style={{ background: '#FFE6E6', color: '#E60000', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                            {count - actifs} inactif{count - actifs > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div style={{ borderTop: '1px solid #F0F0F0', paddingTop: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#888', marginBottom: '8px' }}>ACCÈS AUX MODULES :</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {MODULES_TABLE.map(mod => {
                            const perms = MATRIX_DROITS[role]?.[mod.key] || {};
                            const hasAccess = Object.values(perms).some(Boolean);
                            const fullAccess = perms.CREER && perms.MODIFIER && perms.SUPPRIMER;
                            return (
                              <span key={mod.key} style={{
                                fontSize: '10px', padding: '2px 7px', borderRadius: '4px', fontWeight: 600,
                                background: !hasAccess ? '#F5F5F5' : fullAccess ? '#E8F5E9' : '#E3F0FB',
                                color: !hasAccess ? '#C8C8D0' : fullAccess ? '#1A7A4A' : '#1F5C99',
                                border: `1px solid ${!hasAccess ? '#E0E0E0' : fullAccess ? '#1A7A4A' : '#1F5C99'}`
                              }}>
                                {!hasAccess ? '✗' : fullAccess ? '✓' : '◐'} {mod.label}
                              </span>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', fontSize: '10px', color: '#888' }}>
                          <span>✓ = Accès total</span>
                          <span>◐ = Accès partiel</span>
                          <span>✗ = Aucun accès</span>
                        </div>
                      </div>

                      {/* Personnel de ce rôle */}
                      {tousUtilisateurs.filter(u => u.role === role).length > 0 && (
                        <div style={{ borderTop: '1px solid #F0F0F0', paddingTop: '12px', marginTop: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#888', marginBottom: '8px' }}>PERSONNEL :</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {tousUtilisateurs.filter(u => u.role === role).map(u => (
                              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: rc.fond, borderRadius: '20px', padding: '3px 10px 3px 4px', border: `1px solid ${rc.couleur}20` }}>
                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: rc.couleur, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>
                                  {getInitiales(u.nom)}
                                </div>
                                <span style={{ fontSize: '11px', color: '#1B2A4A', fontWeight: 600 }}>{u.nom.split(' ')[0]}</span>
                                {!u.actif && <span style={{ fontSize: '9px', color: '#E60000' }}>⊘</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Règles de sécurité */}
            <div style={{ background: 'white', borderRadius: '10px', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid #E60000' }}>
              <h3 style={{ color: '#1B2A4A', fontWeight: 800, fontSize: '15px', margin: '0 0 14px' }}>🛡️ Règles de sécurité du système</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                {[
                  { icon: '🔒', text: 'Les boutons non autorisés sont masqués, jamais seulement grisés' },
                  { icon: '📝', text: 'Toutes les actions sont tracées dans le journal d\'audit' },
                  { icon: '👤', text: 'Chaque document enregistre "Établi par : [NOM PRÉNOM]"' },
                  { icon: '⏱️', text: 'Déconnexion automatique après 30 minutes d\'inactivité' },
                  { icon: '🛡️', text: 'Le dernier administrateur actif ne peut pas être supprimé' },
                  { icon: '🔑', text: 'Les mots de passe doivent contenir au minimum 6 caractères' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 14px', background: '#F8F9FA', borderRadius: '8px', fontSize: '13px', color: '#444' }}>
                    <span>{r.icon}</span>
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL : CONFIRMATION SUPPRESSION ───────────────────── */}
      {modalDelete.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModalDelete({ open: false, user: null })}>
          <div style={{ background: 'white', borderRadius: '12px', width: '420px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: '#E60000', padding: '16px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '15px' }}>🗑️ Confirmer la suppression</span>
              <button onClick={() => setModalDelete({ open: false, user: null })} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '24px 20px' }}>
              <p style={{ color: '#1B2A4A', fontWeight: 600, fontSize: '14px', margin: '0 0 8px' }}>
                Voulez-vous vraiment supprimer cet utilisateur ?
              </p>
              <div style={{ background: '#FFE6E6', borderRadius: '8px', padding: '12px 14px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E60000', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                    {getInitiales(modalDelete.user?.nom)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#1B2A4A' }}>{modalDelete.user?.nom}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Login : {modalDelete.user?.login} — {ROLE_CONFIG[modalDelete.user?.role]?.label}</div>
                  </div>
                </div>
              </div>
              <p style={{ color: '#E60000', fontSize: '12px', marginTop: '12px' }}>⚠️ Cette action est irréversible.</p>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E8ECF4', display: 'flex', gap: '8px', justifyContent: 'flex-end', background: '#F8F9FA' }}>
              <BTN onClick={() => setModalDelete({ open: false, user: null })} color="#888" bg="#F0F0F0" disabled={loadingDelete}>Annuler</BTN>
              <BTN onClick={handleConfirmDelete} color="#E60000" disabled={loadingDelete}>{loadingDelete ? '⏳ Suppression...' : '🗑️ Supprimer définitivement'}</BTN>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL : RÉINITIALISATION MDP ────────────────────────── */}
      {modalReinit.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModalReinit({ open: false, user: null, mdp: '', mdpConfirm: '' })}>
          <div style={{ background: 'white', borderRadius: '12px', width: '440px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: '#1B2A4A', padding: '16px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '15px' }}>🔄 Réinitialiser le mot de passe</span>
              <button onClick={() => setModalReinit({ open: false, user: null, mdp: '', mdpConfirm: '' })} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ color: '#555', fontSize: '13px', margin: '0 0 16px' }}>
                Définir un nouveau mot de passe pour <strong style={{ color: '#1B2A4A' }}>{modalReinit.user?.nom}</strong>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#1B2A4A' }}>
                    Nouveau mot de passe <span style={{ color: '#E60000' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPwd.reinit ? 'text' : 'password'} value={modalReinit.mdp}
                      onChange={e => setModalReinit(m => ({ ...m, mdp: e.target.value }))}
                      placeholder="Minimum 6 caractères"
                      style={{ width: '100%', padding: '9px 36px 9px 12px', border: '1.5px solid #C8C8D0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                    <button type="button" onClick={() => setShowPwd(p => ({ ...p, reinit: !p.reinit }))}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                      {showPwd.reinit ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#1B2A4A' }}>
                    Confirmer le mot de passe <span style={{ color: '#E60000' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPwd.reinitConf ? 'text' : 'password'} value={modalReinit.mdpConfirm}
                      onChange={e => setModalReinit(m => ({ ...m, mdpConfirm: e.target.value }))}
                      placeholder="Répéter le mot de passe"
                      style={{ width: '100%', padding: '9px 36px 9px 12px', border: `1.5px solid ${modalReinit.mdp && modalReinit.mdpConfirm && modalReinit.mdp !== modalReinit.mdpConfirm ? '#E60000' : '#C8C8D0'}`, borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                    <button type="button" onClick={() => setShowPwd(p => ({ ...p, reinitConf: !p.reinitConf }))}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                      {showPwd.reinitConf ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {modalReinit.mdp && modalReinit.mdpConfirm && modalReinit.mdp !== modalReinit.mdpConfirm && (
                    <p style={{ color: '#E60000', fontSize: '11px', margin: '4px 0 0' }}>⚠️ Les mots de passe ne correspondent pas</p>
                  )}
                </div>
                {modalReinit.mdp.length > 0 && (
                  <div style={{ background: '#F8F9FA', borderRadius: '6px', padding: '8px 12px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ color: modalReinit.mdp.length >= 6 ? '#1A7A4A' : '#E60000' }}>
                        {modalReinit.mdp.length >= 6 ? '✓' : '✗'} Min. 6 caractères
                      </span>
                      <span style={{ color: /[A-Z]/.test(modalReinit.mdp) ? '#1A7A4A' : '#C8C8D0' }}>
                        {/[A-Z]/.test(modalReinit.mdp) ? '✓' : '○'} Majuscule
                      </span>
                      <span style={{ color: /[0-9]/.test(modalReinit.mdp) ? '#1A7A4A' : '#C8C8D0' }}>
                        {/[0-9]/.test(modalReinit.mdp) ? '✓' : '○'} Chiffre
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E8ECF4', display: 'flex', gap: '8px', justifyContent: 'flex-end', background: '#F8F9FA' }}>
              <BTN onClick={() => setModalReinit({ open: false, user: null, mdp: '', mdpConfirm: '' })} color="#888" bg="#F0F0F0" disabled={loadingReinit}>Annuler</BTN>
              <BTN onClick={handleConfirmReinit} color="#1B2A4A" disabled={loadingReinit}>{loadingReinit ? '⏳ En cours...' : '🔄 Réinitialiser'}</BTN>
            </div>
          </div>
        </div>
      )}
      {/* ─── MODAL : LIER AUTH SUPABASE ─────────────────────────── */}
      {modalLierAuth.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModalLierAuth({ open: false, user: null, mdp: '' })}>
          <div style={{ background: 'white', borderRadius: '12px', width: '440px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: '#1F5C99', padding: '16px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '15px' }}>🔗 Lier à Supabase Auth</span>
              <button onClick={() => setModalLierAuth({ open: false, user: null, mdp: '' })} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ background: '#E3F0FB', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#1F5C99', fontWeight: 600 }}>
                🔗 <strong>{modalLierAuth.user?.nom}</strong> pourra se connecter avec son email et récupérer son mot de passe.
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
                Email : <strong>{modalLierAuth.user?.email}</strong>
              </div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#1B2A4A' }}>
                Définir un mot de passe <span style={{ color: '#E60000' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPwd.lier ? 'text' : 'password'} value={modalLierAuth.mdp}
                  onChange={e => setModalLierAuth(m => ({ ...m, mdp: e.target.value }))}
                  placeholder="Minimum 6 caractères"
                  style={{ width: '100%', padding: '9px 36px 9px 12px', border: '1.5px solid #C8C8D0', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowPwd(p => ({ ...p, lier: !p.lier }))}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  {showPwd.lier ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E8ECF4', display: 'flex', gap: '8px', justifyContent: 'flex-end', background: '#F8F9FA' }}>
              <BTN onClick={() => setModalLierAuth({ open: false, user: null, mdp: '' })} color="#888" bg="#F0F0F0" disabled={loadingLier}>Annuler</BTN>
              <BTN onClick={handleLierAuth} color="#1F5C99" disabled={loadingLier}>{loadingLier ? '⏳ Liaison...' : '🔗 Lier le compte'}</BTN>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Utilisateurs;
