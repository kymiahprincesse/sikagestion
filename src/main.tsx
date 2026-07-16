import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { logger } from './utils/logger'
import './config/envValidation'

// ── PURGE CACHE LOCAL DONNÉES FICTIVES (production reset) ──────────
const CACHE_VERSION = 'sika_prod_v2'
if (localStorage.getItem('sika_cache_version') !== CACHE_VERSION) {
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('sika_') && key !== 'sika_cache_version') {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k))
  localStorage.setItem('sika_cache_version', CACHE_VERSION)
}
// ────────────────────────────────────────────────────────────────────

// ── PWA SERVICE WORKER ───────────────────────────────────
if ('serviceWorker' in navigator) {
  let reloading = false;

  // Recharge la page dès que le nouveau SW prend le contrôle
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) {
      reloading = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      // Vérifier immédiatement les mises à jour au chargement
      reg.update().catch(() => {});

      // Vérifier les mises à jour à chaque retour sur l'application (tab focus)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(() => {});
        }
      });

      // Vérifie les mises à jour toutes les heures
      const updateInterval = setInterval(() => reg.update(), 60 * 60 * 1000);

      // Cleanup à la fermeture de la page
      window.addEventListener('beforeunload', () => {
        clearInterval(updateInterval);
      });

      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW?.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // Active immédiatement le nouveau SW (déclenche controllerchange → reload)
            newSW.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (err) {
      logger.warn('[PWA SIKA] Service Worker non enregistré:', err);
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
