import { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Composant Pull-to-Refresh pour mobile
 * Permet de recharger les données en tirant vers le bas
 */

const PULL_THRESHOLD = 80; // Distance en pixels pour déclencher le refresh
const MAX_PULL = 150;

export function PullToRefresh({ onRefresh, children, enabled = true }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  // Vérifier si on est en haut de la page
  const isAtTop = () => {
    return window.scrollY === 0;
  };

  const handleTouchStart = useCallback((e) => {
    if (!enabled || !isAtTop() || isRefreshing) return;
    
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = startYRef.current;
    setIsPulling(true);
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || !enabled) return;

    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;

    // Seulement si on tire vers le bas et qu'on est en haut
    if (diff > 0 && isAtTop()) {
      // Empêcher le scroll normal
      e.preventDefault();
      
      // Calcul avec résistance
      const resistance = 0.4;
      const newDistance = Math.min(diff * resistance, MAX_PULL);
      setPullDistance(newDistance);
    }
  }, [isPulling, enabled]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);

      try {
        await onRefresh?.();
      } catch (err) {
        console.error('Erreur refresh:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Retour à la position initiale
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, onRefresh]);


  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calcul de la rotation de l'icône
  const rotation = Math.min((pullDistance / PULL_THRESHOLD) * 360, 360);
  const opacity = Math.min(pullDistance / (PULL_THRESHOLD * 0.5), 1);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {/* Indicateur de pull */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center"
        style={{
          top: '10px',
          opacity: opacity,
          transition: isPulling ? 'none' : 'opacity 0.3s ease-out',
        }}
      >
        <div
          className={`
            w-10 h-10 rounded-full bg-surface shadow-lg flex items-center justify-center
            ${isRefreshing ? 'animate-spin' : ''}
            ${pullDistance >= PULL_THRESHOLD ? 'bg-blue-500 text-white' : 'text-gray-500'}
          `}
          style={{
            transform: isRefreshing ? 'none' : `rotate(${rotation}deg)`,
          }}
        >
          <RefreshCw className="w-5 h-5" />
        </div>
        <span className="text-xs text-gray-500 mt-1 font-medium bg-white/80 px-2 py-0.5 rounded">
          {isRefreshing ? 'Actualisation...' : pullDistance >= PULL_THRESHOLD ? 'Relâchez pour actualiser' : 'Tirez pour actualiser'}
        </span>
      </div>

      {/* Contenu */}
      <div className={isRefreshing ? 'opacity-70' : ''}>
        {children}
      </div>
    </div>
  );
}

export default PullToRefresh;
