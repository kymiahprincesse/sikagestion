import { useEffect } from 'react';

/**
 * Hook pour fermer une modal/élément avec la touche Escape
 * @param {boolean} isOpen - État d'ouverture
 * @param {function} onClose - Fonction à appeler pour fermer
 * @param {boolean} enabled - Activer/désactiver le hook (défaut: true)
 */
export function useEscapeKey(isOpen, onClose, enabled = true) {
  useEffect(() => {
    if (!enabled || !isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, enabled]);
}

export default useEscapeKey;
