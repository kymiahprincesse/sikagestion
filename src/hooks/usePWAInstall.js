import { useState, useEffect, useCallback } from 'react';

export function usePWAInstall() {
  const [deferredPrompt,   setDeferredPrompt]   = useState(null);
  const [canInstall,       setCanInstall]        = useState(false);
  const [isInstalled,      setIsInstalled]       = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return true;
      try { if (sessionStorage.getItem('sika_pwa_installed') === 'true') return true; } catch { /* ignore */ }
    }
    return false;
  });
  const [isInstalling,     setIsInstalling]      = useState(false);
  const [installSuccess,   setInstallSuccess]    = useState(false);
  const [platform]          = useState(() => {
    if (typeof window === 'undefined') return 'unknown';
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'desktop';
  });
  const [shouldShow] = useState(() => {
    try {
      const next = sessionStorage.getItem('sika_pwa_next_show');
      return !next || Date.now() > parseInt(next);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (isInstalled) return;

    // Capture l'événement beforeinstallprompt (Chrome/Edge/Android)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Détecte si l'installation est complète
    const installedHandler = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      try {
        sessionStorage.setItem('sika_pwa_installed', 'true');
      } catch {
        // Ignorer erreur storage
      }
    };

    window.addEventListener('appinstalled', installedHandler);

    // Sur iOS, on peut toujours proposer la bannière manuelle (initialisation différée via timeout)
    let iosTimeout = null;
    if (platform === 'ios') {
      iosTimeout = setTimeout(() => setCanInstall(true), 0);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      if (iosTimeout) clearTimeout(iosTimeout);
    };
  }, [isInstalled, platform]);

  // Lance l'installation
  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    setIsInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setInstallSuccess(true);
        setIsInstalled(true);
        setCanInstall(false);
        return true;
      }
    } catch {
      // Erreur silencieuse - l'installation a échoué ou été annulée
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
    return false;
  }, [deferredPrompt]);

  // L'utilisateur a refusé ou fermé
  const dismiss = useCallback(() => {
    setCanInstall(false);
    // Réaffiche dans 3 jours si refusé (sessionStorage, pas localStorage)
    const nextShow = Date.now() + 3 * 24 * 60 * 60 * 1000;
    try {
      sessionStorage.setItem('sika_pwa_next_show', nextShow.toString());
    } catch {
      // Ignorer erreur storage
    }
  }, []);



  return {
    canInstall: canInstall && shouldShow,
    isInstalled,
    isInstalling,
    installSuccess,
    platform,
    install,
    dismiss,
  };
}
