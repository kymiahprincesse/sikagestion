import { useState, useEffect } from 'react';

export default function PWAUpdateNotice() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [swReg, setSwReg] = useState(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      setSwReg(reg);
      reg.addEventListener('updatefound', () => {
        reg.installing?.addEventListener('statechange', function() {
          if (this.state === 'installed' && navigator.serviceWorker.controller) {
            setShowUpdate(true);
          }
        });
      });
    });
  }, []);

  const handleUpdate = () => {
    swReg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  if (!showUpdate) return null;

  return (
    <div style={{
      position: 'fixed', top: '16px', left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--color-primary)', color: 'white',
      padding: '12px 20px', borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      zIndex: 10000, display: 'flex',
      alignItems: 'center', gap: '12px',
      fontSize: '13px', fontWeight: '500',
      animation: 'pwaSlideIn 0.4s ease',
      whiteSpace: 'nowrap',
      maxWidth: 'calc(100vw - 32px)',
    }}>
      <span>🔄</span>
      <span>Nouvelle version de SIKA GESTION disponible !</span>
      <button onClick={handleUpdate} style={{
        background: 'var(--color-accent)', color: 'white',
        border: 'none', borderRadius: '6px',
        padding: '6px 14px', cursor: 'pointer',
        fontWeight: 'bold', fontSize: '12px',
        flexShrink: 0,
        transition: 'background 0.2s',
      }}
      onMouseOver={e => e.currentTarget.style.background = '#c00000'}
      onMouseOut={e => e.currentTarget.style.background = 'var(--color-accent)'}
      >
        Mettre à jour
      </button>
      <button onClick={() => setShowUpdate(false)} style={{
        background: 'transparent', color: 'var(--color-border)',
        border: 'none', cursor: 'pointer', fontSize: '16px',
        flexShrink: 0,
        padding: '0 4px',
      }}>✕</button>
    </div>
  );
}
