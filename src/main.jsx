import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { logger } from './utils/logger'

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
