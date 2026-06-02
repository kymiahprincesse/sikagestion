/**
 * Hook pour debouncer un callback (fonction)
 * Utile pour les recherches, les sauvegardes auto, etc.
 * 
 * Usage:
 * const debouncedSearch = useDebouncedCallback((query) => {
 *   searchAPI(query);
 * }, 500);
 */

import { useCallback, useRef, useState } from 'react';

export function useDebouncedCallback(callback, delay = 500) {
  const timeoutRef = useRef(null);

  const debouncedFn = useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  // Fonction pour annuler le debounce en cours
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Fonction pour exécuter immédiatement
  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      callback();
    }
  }, [callback]);

  return { debouncedFn, cancel, flush };
}

/**
 * Hook combinant useDebounce + useDebouncedCallback
 * Retourne la valeur debouncée ET le contrôle du debounce
 */
export function useDebounceWithControl(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);

  const setValue = useCallback((newValue) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(newValue);
    }, delay);
  }, [delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    value: debouncedValue,
    setValue,
    cancel,
    flush,
    isPending: !!timeoutRef.current
  };
}
