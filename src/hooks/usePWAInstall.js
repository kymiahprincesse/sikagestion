import { useState, useEffect, useCallback } from 'react';

export function usePWAInstall() {
  const [deferredPrompt,   setDeferredPrompt]   = useState(null);
  const [canInstall,       setCanInstall]        = useState(false);
  const [isInstalled,      setIsInstalled]       = useState(false);
  const [isInstalling,     setIsInstalling]      = useState(false);
  const [installSuccess,   setInstallSuccess]    = useState(false);
  const [platform,         setPlatform]          = useState('unknown');

  useEffect(() => {
    // Détecte si déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Vérifie si installée lors de la session courante (sessionStorage, pas localStorage)
    try {
      if (sessionStorage.getItem('sika_pwa_installed') === 'true') {
        setIsInstalled(true);
        return;
      }
    } catch (e) {
      // Ignorer erreur storage
    }

    // Détecte la plateforme
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua))      setPlatform('ios');
    else if (/android/.test(ua))           setPlatform('android');
    else if (/windows/.test(ua))           setPlatform('windows');
    else if (/mac/.test(ua))               setPlatform('mac');
    else                                   setPlatform('desktop');

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
      } catch (e) {
        // Ignorer erreur storage
      }
    };

    window.addEventListener('appinstalled', installedHandler);

    // Sur iOS, on peut toujours proposer la bannière manuelle
    if (/iphone|ipad|ipod/.test(ua)) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

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
    } catch (err) {
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
    } catch (e) {
      // Ignorer erreur storage
    }
  }, []);

  // Vérifie si on doit afficher (respect du délai après refus)
  const shouldShow = () => {
    try {
      const next = sessionStorage.getItem('sika_pwa_next_show');
      if (!next) return true;
      return Date.now() > parseInt(next);
    } catch (e) {
      return true;
    }
  };

  return {
    canInstall: canInstall && shouldShow(),
    isInstalled,
    isInstalling,
    installSuccess,
    platform,
    install,
    dismiss,
  };
}
