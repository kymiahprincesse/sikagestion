import { useState, useRef, useCallback } from 'react';

/**
 * Bouton optimisé pour les appareils tactiles
 * - Zone tactile minimale de 44x44px
 * - Feedback visuel au toucher
 * - Prévention du double-clic
 * - Support du long-press
 */

export function TouchButton({
  children,
  onClick,
  onLongPress,
  onTouchStart,
  onTouchEnd,
  disabled = false,
  className = '',
  style = {},
  longPressDelay = 500,
  preventDoubleClick = true,
  variant = 'default', // 'default' | 'primary' | 'danger' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  ...props
}) {
  const [isPressed, setIsPressed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const longPressTimer = useRef(null);
  const lastClickTime = useRef(0);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const sizeClasses = {
    sm: 'min-h-[36px] px-3 py-2 text-sm',
    md: 'min-h-[44px] px-4 py-2.5 text-sm',
    lg: 'min-h-[48px] px-6 py-3 text-base',
  };

  const variantClasses = {
    default: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
    primary: 'bg-[#1B2A4A] text-white hover:bg-[#2a3a5e] active:bg-[#1a2340]',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  };

  const handleTouchStart = useCallback((e) => {
    if (disabled || loading || isLoading) return;

    setIsPressed(true);
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    // Démarrer le timer pour long-press
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        setIsPressed(false);
        onLongPress?.();
        // Vibration si supportée
        if (navigator.vibrate) navigator.vibrate(50);
      }, longPressDelay);
    }

    onTouchStart?.(e);
  }, [disabled, loading, isLoading, onLongPress, longPressDelay, onTouchStart]);

  const handleTouchMove = useCallback((e) => {
    if (!isPressed) return;

    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartPos.current.x);
    const diffY = Math.abs(touch.clientY - touchStartPos.current.y);

    // Annuler si déplacement trop important
    if (diffX > 10 || diffY > 10) {
      setIsPressed(false);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    }
  }, [isPressed]);

  const handleTouchEnd = useCallback(async (e) => {
    setIsPressed(false);

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    if (disabled || loading || isLoading) return;

    // Prévention du double-clic
    if (preventDoubleClick) {
      const now = Date.now();
      if (now - lastClickTime.current < 300) return;
      lastClickTime.current = now;
    }

    onTouchEnd?.(e);

    if (onClick) {
      setIsLoading(true);
      try {
        const result = onClick(e);
        if (result && typeof result.then === 'function') {
          await result;
        }
      } finally {
        setIsLoading(false);
      }
    }
  }, [disabled, loading, isLoading, preventDoubleClick, onClick, onTouchEnd]);

  const handleMouseDown = useCallback(() => {
    if (!('ontouchstart' in window)) {
      setIsPressed(true);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!('ontouchstart' in window)) {
      setIsPressed(false);
    }
  }, []);

  const combinedClassName = `
    relative inline-flex items-center justify-center gap-2
    font-medium rounded-lg transition-all duration-150
    select-none touch-manipulation
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${fullWidth ? 'w-full' : ''}
    ${isPressed ? 'scale-95' : ''}
    ${disabled || loading || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;

  const combinedStyle = {
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none',
    ...style,
  };

  const content = (
    <>
      {loading || isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4" />
      ) : null}
      
      {children}
      
      {Icon && iconPosition === 'right' && !loading && !isLoading ? (
        <Icon className="w-4 h-4" />
      ) : null}

      {/* Ripple effect */}
      {isPressed && !disabled && !loading && !isLoading && (
        <span className="absolute inset-0 bg-white/20 rounded-lg animate-pulse" />
      )}
    </>
  );

  return (
    <button
      className={combinedClassName}
      style={combinedStyle}
      onClick={(e) => {
        // Empêcher le click si c'était un touch (évite double déclenchement)
        if (e.detail === 0) return;
        handleTouchEnd(e);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsPressed(false)}
      disabled={disabled || loading || isLoading}
      {...props}
    >
      {content}
    </button>
  );
}

/**
 * Groupe de boutons tactiles avec espacement optimisé
 */
export function TouchButtonGroup({
  children,
  className = '',
  direction = 'horizontal', // 'horizontal' | 'vertical'
  spacing = 'md', // 'sm' | 'md' | 'lg'
}) {
  const spacingClasses = {
    sm: direction === 'horizontal' ? 'gap-2' : 'gap-2',
    md: direction === 'horizontal' ? 'gap-3' : 'gap-3',
    lg: direction === 'horizontal' ? 'gap-4' : 'gap-4',
  };

  const directionClasses = {
    horizontal: 'flex flex-wrap',
    vertical: 'flex flex-col',
  };

  return (
    <div className={`${directionClasses[direction]} ${spacingClasses[spacing]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Bouton flottant d'action principale (FAB) pour mobile
 */
export function FloatingActionButton({
  onClick,
  icon: Icon,
  label,
  position = 'bottom-right', // 'bottom-right' | 'bottom-left' | 'bottom-center'
  variant = 'primary',
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
  ...props
}) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  };

  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'bottom-center': 'fixed bottom-6 left-1/2 -translate-x-1/2',
  };

  return (
    <TouchButton
      onClick={onClick}
      variant={variant}
      className={`
        ${positionClasses[position]}
        ${sizeClasses[size]}
        rounded-full shadow-lg hover:shadow-xl
        z-50
        ${className}
      `}
      aria-label={label}
      {...props}
    >
      <Icon className={iconSizes[size]} />
      {label && <span className="sr-only">{label}</span>}
    </TouchButton>
  );
}

export default TouchButton;
