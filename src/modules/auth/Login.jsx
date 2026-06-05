import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useUtilisateursStore } from '../../store/useUtilisateursStore';
import SikaLogo from '../../components/SikaLogo';
import BackendStatusIndicator from '../../components/BackendStatusIndicator';
import { Eye, EyeOff, ArrowLeft, Mail, KeyRound, CheckCircle, Copy, Check } from 'lucide-react';

const INPUT_STYLE = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #C8C8D0',
  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s', color: '#1B2A4A'
};

const Login = () => {
  /* ── Connexion ── */
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  /* ── Navigation entre vues ── */
  const [vue, setVue] = useState('login'); // 'login' | 'email' | 'code' | 'succes'

  /* ── Récupération MDP ── */
  const [emailRecup, setEmailRecup] = useState('');
  const [codeGenere, setCodeGenere] = useState('');
  const [nomUser, setNomUser] = useState('');
  const [codeEntre, setCodeEntre] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [showNouveauMdp, setShowNouveauMdp] = useState(false);
  const [erreurRecup, setErreurRecup] = useState('');
  const [tempsRestant, setTempsRestant] = useState(900);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const loginAction = useAuthStore(state => state.login);
  const genererCodeRecuperation = useUtilisateursStore(state => state.genererCodeRecuperation);
  const reinitialiserAvecCode = useUtilisateursStore(state => state.reinitialiserAvecCode);
  const envoyerEmailRecuperation = useUtilisateursStore(state => state.envoyerEmailRecuperation);
  const fetchUtilisateurs = useUtilisateursStore(state => state.fetchUtilisateurs);
  const navigate = useNavigate();

  const [modeEmail, setModeEmail] = useState(false);

  useEffect(() => {
    // Nettoyage sécurité: supprimer ancien mot de passe stocké si présent
    localStorage.removeItem('sika_saved_password');

    const savedLogin = localStorage.getItem('sika_saved_login');
    if (localStorage.getItem('sika_remember_me') === 'true' && savedLogin) {
      setIdentifiant(savedLogin);
      setRememberMe(true);
    }

    // Synchroniser les utilisateurs depuis Supabase
    fetchUtilisateurs();
  }, [fetchUtilisateurs]);

  useEffect(() => {
    if (vue === 'code') {
      setTempsRestant(900);
      timerRef.current = setInterval(() => {
        setTempsRestant(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setErreurRecup('⏰ Code expiré. Veuillez recommencer.');
            setVue('email');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [vue]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const progression = (tempsRestant / 900) * 100;
  const timerColor = tempsRestant < 120 ? '#E60000' : tempsRestant < 300 ? '#E8A020' : '#1A7A4A';

  const handleLogin = async (e) => {
    e.preventDefault();
    setErreur('');
    setIsLoading(true);
    try {
      const res = await loginAction(identifiant, motDePasse);
      if (res && res.success) {
        if (rememberMe) {
          localStorage.setItem('sika_saved_login', identifiant);
          localStorage.setItem('sika_remember_me', 'true');
        } else {
          localStorage.removeItem('sika_saved_login');
          localStorage.removeItem('sika_remember_me');
        }
        setTimeout(() => navigate('/dashboard'), 100);
      } else {
        setErreur(res?.message || 'Identifiants incorrects');
      }
    } catch {
      setErreur('Une erreur est survenue lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemandeCode = async (e) => {
    e.preventDefault();
    setErreurRecup('');
    const emailNorm = emailRecup.trim().toLowerCase();
    const res = genererCodeRecuperation(emailNorm);
    if (!res.success) { setErreurRecup(res.message); return; }
    setNomUser(res.nom);
    if (res.hasAuthAccount) {
      const emailRes = await envoyerEmailRecuperation(emailNorm);
      if (!emailRes.success) { setErreurRecup(emailRes.message); return; }
      setModeEmail(true);
      setVue('email-sent');
    } else {
      setModeEmail(false);
      setCodeGenere(res.code);
      setVue('code');
    }
  };

  const handleReinit = (e) => {
    e.preventDefault();
    setErreurRecup('');
    if (nouveauMdp !== confirmMdp) { setErreurRecup('Les mots de passe ne correspondent pas'); return; }
    if (nouveauMdp.length < 6) { setErreurRecup('Minimum 6 caractères requis'); return; }
    const res = reinitialiserAvecCode(emailRecup.trim().toLowerCase(), codeEntre.trim(), nouveauMdp);
    if (!res.success) { setErreurRecup(res.message); return; }
    clearInterval(timerRef.current);
    setVue('succes');
    setTimeout(() => {
      setVue('login');
      setEmailRecup(''); setCodeGenere(''); setCodeEntre('');
      setNouveauMdp(''); setConfirmMdp(''); setErreurRecup('');
    }, 3200);
  };

  const handleCopier = () => {
    navigator.clipboard.writeText(codeGenere).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const goBack = (cible) => {
    clearInterval(timerRef.current);
    setErreurRecup('');
    setVue(cible);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#06006E' }}>
      <div className="w-full max-w-md px-6">

        <div className="flex justify-center mb-8">
          <SikaLogo size="md" />
        </div>

        <div className="bg-white shadow-2xl overflow-hidden" style={{ borderRadius: '16px' }}>
          <div style={{ height: '4px', background: 'linear-gradient(90deg, #E60000 0%, #1B2A4A 100%)' }} />

          <div style={{ padding: '32px' }}>

            {/* ══════════════════════════════════════════ VUE : CONNEXION */}
            {vue === 'login' && (
              <>
                <h2 className="text-2xl font-bold text-center mb-6" style={{ color: '#1B2A4A' }}>
                  🔓 Connexion
                </h2>

                {erreur && (
                  <div className="mb-4 p-3 rounded-lg" style={{ background: '#FFE6E6', border: '1px solid #E60000' }}>
                    <p className="text-sm font-semibold" style={{ color: '#E60000' }}>⚠️ {erreur}</p>
                  </div>
                )}

                <form onSubmit={handleLogin}>
                  <div className="mb-4">
                    <label className="block text-sm font-bold mb-2" style={{ color: '#1B2A4A' }}>
                      Identifiant ou Email
                    </label>
                    <input
                      type="text"
                      value={identifiant}
                      onChange={e => setIdentifiant(e.target.value)}
                      style={INPUT_STYLE}
                      placeholder="Login ou adresse email"
                      required autoFocus
                    />
                  </div>

                  <div className="mb-1">
                    <label className="block text-sm font-bold mb-2" style={{ color: '#1B2A4A' }}>
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={motDePasse}
                        onChange={e => setMotDePasse(e.target.value)}
                        style={{ ...INPUT_STYLE, paddingRight: '46px' }}
                        placeholder="Votre mot de passe"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                        style={{ color: '#1B2A4A', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end mb-5 mt-1">
                    <button type="button" onClick={() => goBack('email')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E60000', fontSize: '13px', fontWeight: 700, padding: 0 }}>
                      Mot de passe oublié ?
                    </button>
                  </div>

                  <div className="mb-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#E60000' }} />
                      <span className="text-sm" style={{ color: '#1B2A4A' }}>Se souvenir de moi</span>
                    </label>
                  </div>

                  <button type="submit" disabled={isLoading}
                    className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#E60000', fontSize: '15px' }}>
                    {isLoading ? '⏳ Connexion...' : 'Se connecter'}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t" style={{ borderColor: '#E8ECF4' }}>
                  <div className="flex justify-center mb-2">
                    <BackendStatusIndicator variant="compact" />
                  </div>
                  <p className="text-xs text-center" style={{ color: '#1F5C99' }}>
                    SIKA INDUSTRIE — Système de Gestion
                  </p>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════ VUE : SAISIE EMAIL */}
            {vue === 'email' && (
              <>
                <button type="button" onClick={() => goBack('login')}
                  className="flex items-center gap-2 mb-5 text-sm"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0 }}>
                  <ArrowLeft size={16} /> Retour à la connexion
                </button>

                <div className="text-center mb-6">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-3"
                    style={{ background: '#E3F0FB' }}>
                    <Mail size={28} style={{ color: '#1F5C99' }} />
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: '#1B2A4A' }}>Récupération du compte</h2>
                  <p className="text-sm mt-1" style={{ color: '#888' }}>
                    Saisissez votre email pour recevoir un code
                  </p>
                </div>

                {erreurRecup && (
                  <div className="mb-4 p-3 rounded-lg" style={{ background: '#FFE6E6', border: '1px solid #E60000' }}>
                    <p className="text-sm font-semibold" style={{ color: '#E60000' }}>{erreurRecup}</p>
                  </div>
                )}

                <form onSubmit={handleDemandeCode}>
                  <div className="mb-5">
                    <label className="block text-sm font-bold mb-2" style={{ color: '#1B2A4A' }}>
                      Adresse email du compte
                    </label>
                    <input type="email" value={emailRecup} onChange={e => setEmailRecup(e.target.value)}
                      style={INPUT_STYLE} placeholder="ex: prenom.nom@sikaindustrie.ci"
                      required autoFocus />
                  </div>
                  <button type="submit"
                    className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: '#1B2A4A', fontSize: '14px' }}>
                    📨 Générer mon code de récupération
                  </button>
                </form>
              </>
            )}

            {/* ══════════════════════════════════════════ VUE : CODE + NOUVEAU MDP */}
            {vue === 'code' && (
              <>
                <button type="button" onClick={() => goBack('email')}
                  className="flex items-center gap-2 mb-4 text-sm"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0 }}>
                  <ArrowLeft size={16} /> Retour
                </button>

                <div className="text-center mb-4">
                  <KeyRound size={24} style={{ color: '#1B2A4A', margin: '0 auto 6px' }} />
                  <h2 className="text-lg font-bold" style={{ color: '#1B2A4A' }}>Code de récupération</h2>
                  <p className="text-sm" style={{ color: '#555' }}>
                    Bonjour <strong>{nomUser.split(' ')[0]}</strong>, voici votre code :
                  </p>
                </div>

                {/* ── Carte code animée ── */}
                <div className="rounded-2xl mb-2 p-4 text-center relative select-none"
                  style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #1F5C99 100%)', boxShadow: '0 8px 28px rgba(27,42,74,0.35)' }}>
                  <div className="text-xs font-bold mb-2 tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    CODE DE RÉCUPÉRATION
                  </div>
                  <div className="font-mono font-black" style={{ fontSize: '38px', color: 'white', letterSpacing: '10px', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
                    {codeGenere}
                  </div>
                  <button type="button" onClick={handleCopier}
                    className="absolute top-3 right-3 p-2 rounded-lg flex items-center gap-1 transition-all"
                    style={{ background: copied ? 'rgba(26,122,74,0.8)' : 'rgba(255,255,255,0.15)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
                    {copied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier</>}
                  </button>
                </div>

                {/* ── Timer ── */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1" style={{ color: timerColor }}>
                    <span>⏱️ Valide encore</span>
                    <span className="font-bold tabular-nums">{fmt(tempsRestant)}</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: '5px', background: '#E8ECF4' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${progression}%`, background: timerColor, transition: 'width 1s linear, background 0.3s' }} />
                  </div>
                </div>

                {erreurRecup && (
                  <div className="mb-3 p-3 rounded-lg" style={{ background: '#FFE6E6', border: '1px solid #E60000' }}>
                    <p className="text-sm font-semibold" style={{ color: '#E60000' }}>{erreurRecup}</p>
                  </div>
                )}

                <form onSubmit={handleReinit}>
                  <div className="mb-3">
                    <label className="block text-xs font-bold mb-1" style={{ color: '#1B2A4A' }}>
                      Entrez le code affiché ci-dessus <span style={{ color: '#E60000' }}>*</span>
                    </label>
                    <input type="text" value={codeEntre} onChange={e => setCodeEntre(e.target.value)}
                      maxLength={6} inputMode="numeric"
                      className="text-center font-mono font-black tracking-widest"
                      style={{ ...INPUT_STYLE, fontSize: '24px', letterSpacing: '8px', padding: '10px' }}
                      placeholder="• • • • • •" required autoFocus />
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs font-bold mb-1" style={{ color: '#1B2A4A' }}>
                      Nouveau mot de passe <span style={{ color: '#E60000' }}>*</span>
                    </label>
                    <div className="relative">
                      <input type={showNouveauMdp ? 'text' : 'password'} value={nouveauMdp}
                        onChange={e => setNouveauMdp(e.target.value)}
                        style={{ ...INPUT_STYLE, paddingRight: '46px', fontSize: '13px' }}
                        placeholder="Min. 6 caractères" required />
                      <button type="button" onClick={() => setShowNouveauMdp(!showNouveauMdp)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                        {showNouveauMdp ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {nouveauMdp.length > 0 && (
                      <div className="flex gap-3 mt-1" style={{ fontSize: '11px' }}>
                        <span style={{ color: nouveauMdp.length >= 6 ? '#1A7A4A' : '#E60000' }}>
                          {nouveauMdp.length >= 6 ? '✓' : '✗'} 6 car. min
                        </span>
                        <span style={{ color: /[A-Z]/.test(nouveauMdp) ? '#1A7A4A' : '#C8C8D0' }}>
                          {/[A-Z]/.test(nouveauMdp) ? '✓' : '○'} Majuscule
                        </span>
                        <span style={{ color: /[0-9]/.test(nouveauMdp) ? '#1A7A4A' : '#C8C8D0' }}>
                          {/[0-9]/.test(nouveauMdp) ? '✓' : '○'} Chiffre
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-bold mb-1" style={{ color: '#1B2A4A' }}>
                      Confirmer le mot de passe <span style={{ color: '#E60000' }}>*</span>
                    </label>
                    <input type="password" value={confirmMdp} onChange={e => setConfirmMdp(e.target.value)}
                      style={{ ...INPUT_STYLE, fontSize: '13px', borderColor: nouveauMdp && confirmMdp && nouveauMdp !== confirmMdp ? '#E60000' : '#C8C8D0' }}
                      placeholder="Répéter le mot de passe" required />
                    {nouveauMdp && confirmMdp && nouveauMdp !== confirmMdp && (
                      <p style={{ color: '#E60000', fontSize: '11px', marginTop: '3px' }}>⚠️ Ne correspondent pas</p>
                    )}
                  </div>

                  <button type="submit"
                    className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: '#1A7A4A', fontSize: '14px' }}>
                    ✓ Réinitialiser mon mot de passe
                  </button>
                </form>
              </>
            )}

            {/* ══════════════════════════════════════════ VUE : EMAIL ENVOYÉ */}
            {vue === 'email-sent' && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-4"
                  style={{ background: '#E3F0FB' }}>
                  <Mail size={42} style={{ color: '#1F5C99' }} />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#1B2A4A' }}>
                  Email envoyé !
                </h2>
                <p className="text-sm mb-4" style={{ color: '#555' }}>
                  Bonjour <strong>{nomUser.split(' ')[0]}</strong>, un lien de réinitialisation<br />
                  a été envoyé à <strong>{emailRecup}</strong>.
                </p>
                <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: '#E8F5E9', color: '#1A7A4A', fontWeight: 600 }}>
                  ✉️ Vérifiez votre boîte mail et cliquez sur le lien pour réinitialiser votre mot de passe.
                </div>
                <button type="button" onClick={() => goBack('login')}
                  className="w-full py-3 rounded-xl font-bold text-white"
                  style={{ backgroundColor: '#1B2A4A', fontSize: '14px' }}>
                  ← Retour à la connexion
                </button>
              </div>
            )}

            {/* ══════════════════════════════════════════ VUE : SUCCÈS */}
            {vue === 'succes' && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-4"
                  style={{ background: '#E8F5E9' }}>
                  <CheckCircle size={42} style={{ color: '#1A7A4A' }} />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#1A7A4A' }}>
                  Mot de passe réinitialisé !
                </h2>
                <p className="text-sm" style={{ color: '#555' }}>
                  Vous pouvez maintenant vous connecter<br />avec votre nouveau mot de passe.
                </p>
                <p className="text-xs mt-4" style={{ color: '#C8C8D0' }}>
                  Redirection automatique dans 3 secondes...
                </p>
              </div>
            )}

          </div>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm" style={{ color: '#C8C8D0' }}>© 2026 SIKA INDUSTRIE — Tous droits réservés</p>
          <div className="pt-2 border-t" style={{ borderColor: 'rgba(74,109,181,0.3)' }}>
            <p className="text-xs" style={{ color: '#C8C8D0' }}>
              Développé par <span style={{ color: '#E60000', fontWeight: 600 }}>Christian ANISONOK</span>
            </p>
            <p className="text-xs mt-1" style={{ color: '#C8C8D0' }}>
              Contact : <a href="tel:+2250777916407" className="hover:underline" style={{ color: '#4A6DB5' }}>+225 07 77 91 64 07</a>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
