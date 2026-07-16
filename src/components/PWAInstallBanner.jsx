import { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import sikaLogo from '../assets/logo.png';

export default function PWAInstallBanner() {
  const {
    canInstall, isInstalled, isInstalling,
    installSuccess, platform, install, dismiss
  } = usePWAInstall();

  const [visible,   setVisible]   = useState(false);
  const [animOut,   setAnimOut]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  // Apparaît après 3 secondes
  useEffect(() => {
    if (canInstall && !isInstalled) {
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled]);

  // Barre de progression simulée pendant l'installation
  useEffect(() => {
    let interval;
    if (isInstalling) {
      setTimeout(() => setProgress(0), 0);
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 95) { clearInterval(interval); return 95; }
          return p + Math.random() * 15;
        });
      }, 200);
    } else if (installSuccess) {
      setTimeout(() => setProgress(100), 0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInstalling, installSuccess]);

  const handleClose = () => {
    setAnimOut(true);
    setTimeout(() => { setVisible(false); dismiss(); }, 400);
  };

  const handleInstall = async () => {
    if (platform === 'ios') {
      setShowGuide(true);
      return;
    }
    const ok = await install();
    if (ok) {
      setProgress(100);
      setTimeout(handleClose, 2000);
    }
  };

  if (!visible || isInstalled) return null;

  return (
    <>
      {/* ── OVERLAY SOMBRE ─────────────────────────────── */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 9998,
        animation: animOut ? 'pwaFadeOut 0.4s forwards' : 'pwaFadeIn 0.3s forwards',
      }} onClick={handleClose} />

      {/* ── BANNIÈRE PRINCIPALE ────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '380px',
        maxWidth: 'calc(100vw - 48px)',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 4px 20px rgba(27,42,74,0.15)',
        zIndex: 9999,
        overflow: 'hidden',
        animation: animOut
          ? 'pwaSlideOut 0.4s cubic-bezier(0.4,0,0.6,1) forwards'
          : 'pwaSlideIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>

        {/* Barre colorée en haut */}
        <div style={{
          height: '4px',
          background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 50%, var(--color-success) 100%)',
        }} />

        {/* ── EN-TÊTE ──────────────────────────────────── */}
        <div style={{
          background: 'var(--color-primary)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* Icône app */}
          <div style={{
            width: '52px', height: '52px',
            borderRadius: '12px',
            background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}>
            <img src={sikaLogo} alt="SIKA"
              style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px' }}>
              Installer l'application
            </div>
            <div style={{ color: 'var(--color-border)', fontSize: '12px', marginTop: '2px' }}>
              Accès rapide depuis votre bureau
            </div>
          </div>

          {/* Bouton fermer */}
          <button onClick={handleClose} style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none', color: 'white',
            width: '28px', height: '28px',
            borderRadius: '50%', cursor: 'pointer',
            fontSize: '16px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >✕</button>
        </div>

        {/* ── CORPS ────────────────────────────────────── */}
        <div style={{ padding: '20px' }}>

          {/* Titre */}
          <div style={{
            fontSize: '13px', color: '#444',
            marginBottom: '16px', lineHeight: '1.5',
          }}>
            Installez <strong style={{ color: 'var(--color-primary)' }}>SIKA GESTION</strong> sur
            votre appareil pour :
          </div>

          {/* Avantages */}
          {[
            { icon: '⚡', text: 'Accès instantané depuis votre bureau' },
            { icon: '📶', text: 'Fonctionnement hors ligne possible' },
            { icon: '📱', text: 'Expérience application native' },
            { icon: '🔔', text: 'Notifications en temps réel' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '10px',
            }}>
              <span style={{
                width: '28px', height: '28px',
                background: '#E8F5E9',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', flexShrink: 0,
              }}>{item.icon}</span>
              <span style={{ fontSize: '13px', color: '#333' }}>{item.text}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--color-success)', fontSize: '16px', fontWeight: 'bold' }}>✓</span>
            </div>
          ))}

          {/* Barre de progression (visible pendant installation) */}
          {isInstalling && (
            <div style={{ marginTop: '16px' }}>
              <div style={{
                height: '6px', background: 'var(--color-surface-muted)',
                borderRadius: '3px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{
                textAlign: 'center', fontSize: '12px',
                color: '#666', marginTop: '8px',
              }}>
                Installation en cours... {Math.round(progress)}%
              </div>
            </div>
          )}

          {/* Succès */}
          {installSuccess && (
            <div style={{
              background: '#E8F5E9', borderRadius: '10px',
              padding: '12px', textAlign: 'center',
              color: 'var(--color-success)', fontWeight: 'bold',
              marginTop: '12px',
            }}>
              🎉 Application installée avec succès !
            </div>
          )}

          {/* Guide iOS */}
          {showGuide && platform === 'ios' && (
            <div style={{
              background: 'var(--color-accent-light)', borderRadius: '10px',
              padding: '14px', marginTop: '12px',
              border: '1px solid var(--color-accent)',
            }}>
              <div style={{ fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: '8px' }}>
                📱 Installation sur iPhone/iPad :
              </div>
              <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.8' }}>
                1. Appuyez sur <strong>⬆️ Partager</strong> en bas de Safari<br/>
                2. Faites défiler et appuyez sur <strong>"Sur l'écran d'accueil"</strong><br/>
                3. Confirmez en appuyant sur <strong>"Ajouter"</strong>
              </div>
            </div>
          )}

          {/* ── BOUTONS ──────────────────────────────────── */}
          {!isInstalling && !installSuccess && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>

              {/* Bouton principal : Installer */}
              <button onClick={handleInstall} style={{
                flex: 1,
                padding: '12px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 4px 12px rgba(27,42,74,0.3)',
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(27,42,74,0.4)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(27,42,74,0.3)';
              }}>
                <span>⬇️</span>
                <span>Installer maintenant</span>
              </button>

              {/* Bouton secondaire : Plus tard */}
              <button onClick={handleClose} style={{
                padding: '12px 16px',
                background: '#F0F0F0',
                color: '#666',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '500',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#E0E0E0'}
              onMouseOut={e => e.currentTarget.style.background = '#F0F0F0'}
              >
                Plus tard
              </button>
            </div>
          )}

          {/* Mentions */}
          <div style={{
            textAlign: 'center',
            fontSize: '10px',
            color: '#AAA',
            marginTop: '12px',
          }}>
            Gratuit • Aucune donnée collectée • Désinstallable à tout moment
          </div>
        </div>
      </div>

      {/* ── ANIMATIONS CSS ───────────────────────────────── */}
      <style>{`
        @keyframes pwaSlideIn {
          from { transform: translateY(120%) scale(0.9); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes pwaSlideOut {
          from { transform: translateY(0) scale(1); opacity: 1; }
          to   { transform: translateY(120%) scale(0.9); opacity: 0; }
        }
        @keyframes pwaFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pwaFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>
    </>
  );
}
