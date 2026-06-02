/**
 * HOC pour mémoïser automatiquement un composant
 * Évite les re-rendus quand les props ne changent pas
 * 
 * Usage:
 * const MonComposantOptimise = withMemo(MonComposant, {
 *   displayName: 'MonComposant',
 *   customComparator: (prev, next) => prev.id === next.id
 * });
 */

import React, { memo } from 'react';

// Fonction de comparaison par défaut (shallow equality)
function defaultComparator(prevProps, nextProps) {
  for (const key in nextProps) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  for (const key in prevProps) {
    if (!(key in nextProps)) {
      return false;
    }
  }
  return true;
}

export function withMemo(Component, options = {}) {
  const {
    displayName,
    customComparator,
    debug = false,
  } = options;

  // Fonction de comparaison pour React.memo
  const comparator = (prevProps, nextProps) => {
    const areEqual = customComparator
      ? customComparator(prevProps, nextProps)
      : defaultComparator(prevProps, nextProps);

    if (debug && !areEqual) {
      console.log(`[withMemo] ${displayName || Component.name} re-render détecté`);
      // Trouver les props qui ont changé
      const changed = [];
      for (const key in { ...prevProps, ...nextProps }) {
        if (prevProps[key] !== nextProps[key]) {
          changed.push(key);
        }
      }
      console.log(`[withMemo] Props modifiées: ${changed.join(', ')}`);
    }

    return areEqual;
  };

  const MemoizedComponent = memo(Component, comparator);

  // Copier les propriétés statiques
  MemoizedComponent.displayName = displayName || `Memoized(${Component.displayName || Component.name})`;
  
  // Copier les propriétés statiques du composant original
  for (const key in Component) {
    if (key !== 'displayName' && key !== 'name') {
      MemoizedComponent[key] = Component[key];
    }
  }

  return MemoizedComponent;
}

// ── HOC POUR LES DONNÉES IMMUTABLES ─────────────────────

/**
 * HOC pour les composants qui reçoivent des données immutables
 * Compare par référence d'objet (plus rapide)
 */
export function withDeepMemo(Component, options = {}) {
  return withMemo(Component, {
    ...options,
    customComparator: (prev, next) => {
      // Comparaison simple par référence pour les objets complexes
      const keys = Object.keys(next);
      for (const key of keys) {
        if (prev[key] !== next[key]) {
          return false;
        }
      }
      return Object.keys(prev).length === keys.length;
    },
  });
}

// ── UTILITAIRE POUR LES CALLBACKS ────────────────────────

/**
 * Crée un sélecteur mémoïsé pour extraire des données
 * Évite de créer de nouveaux objets à chaque render
 */
export function createMemoizedSelector(selector, displayName = 'selector') {
  let lastResult = null;
  let lastDeps = null;

  return (...args) => {
    // Vérifier si les dépendances ont changé (par référence)
    const depsChanged = !lastDeps || args.some((arg, i) => arg !== lastDeps[i]);
    
    if (depsChanged) {
      lastDeps = args;
      lastResult = selector(...args);
    }
    
    return lastResult;
  };
}

// ── EXEMPLES D'UTILISATION ───────────────────────────────

/**
 * Exemple 1: Composant simple
 * 
 * function UserCard({ user }) {
 *   return <div>{user.name}</div>;
 * }
 * export default withMemo(UserCard, { displayName: 'UserCard' });
 */

/**
 * Exemple 2: Composant avec comparaison personnalisée
 * 
 * function FactureList({ factures, onUpdate }) {
 *   return <div>{factures.map(...)}</div>;
 * }
 * 
 * export default withMemo(FactureList, {
 *   displayName: 'FactureList',
 *   customComparator: (prev, next) => {
 *     // Ne re-render que si les factures changent
 *     return prev.factures === next.factures;
 *   }
 * });
 */

/**
 * Exemple 3: Avec débogage
 * 
 * const OptimizedComponent = withMemo(HeavyComponent, {
 *   debug: true,
 *   displayName: 'HeavyComponent'
 * });
 */
