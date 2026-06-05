import { useState, useCallback, useRef } from 'react';
import { quickCheck } from '../utils/duplicateDetector';

/**
 * Hook personnalisé pour prévenir les doublons lors de la création d'entités
 * 
 * @param {string} type - Type d'entité ('devis', 'facture', 'client', etc.)
 * @param {Array} entitésExistantes - Liste des entités déjà existantes
 * @param {Object} options - Options de configuration
 */
export function useDuplicatePrevention(type, entitésExistantes, options = {}) {
  const {
    délaiAntiDoubleClic = 2000, // 2 secondes
    notifier = true,
    onDoublonDetecté = null,
    onValidationRéussie = null
  } = options;

  const [dernierDoublon, setDernierDoublon] = useState(null);
  const [isVérificationEnCours, setIsVérificationEnCours] = useState(false);
  const dernièreSoumission = useRef(0);
  const dernièreEntité = useRef(null);

  /**
   * Vérifie si une entité est un doublon
   */
  const vérifierDoublon = useCallback((nouvelleEntité) => {
    // 1. Vérification anti-double-clic
    const maintenant = Date.now();
    const tempsDepuisDernièreSoumission = maintenant - dernièreSoumission.current;
    
    if (tempsDepuisDernièreSoumission < délaiAntiDoubleClic) {
      // Vérifier si c'est exactement la même entité
      if (dernièreEntité.current && 
          JSON.stringify(dernièreEntité.current) === JSON.stringify(nouvelleEntité)) {
        return {
          estValide: false,
          estDoublon: true,
          raison: 'double_clic',
          message: 'Veuillez patienter quelques secondes avant de soumettre à nouveau',
          délaiAttente: délaiAntiDoubleClic - tempsDepuisDernièreSoumission
        };
      }
    }

    // 2. Vérification avec le système de détection
    const résultat = quickCheck(type, nouvelleEntité, entitésExistantes || []);
    
    if (résultat.estDoublon) {
      setDernierDoublon(résultat);
      
      if (onDoublonDetecté) {
        onDoublonDetecté(résultat);
      }

      return {
        estValide: false,
        ...résultat,
        message: résultat.raison
      };
    }

    // 3. Mise à jour des références pour anti-double-clic
    dernièreSoumission.current = maintenant;
    dernièreEntité.current = { ...nouvelleEntité };

    if (onValidationRéussie) {
      onValidationRéussie(nouvelleEntité);
    }

    return { estValide: true, estDoublon: false };
  }, [type, entitésExistantes, délaiAntiDoubleClic, onDoublonDetecté, onValidationRéussie]);

  /**
   * Valide et soumet une entité avec protection anti-doublon
   */
  const validerEtSoumettre = useCallback(async (nouvelleEntité, fonctionSoumission) => {
    setIsVérificationEnCours(true);
    
    try {
      const validation = vérifierDoublon(nouvelleEntité);
      
      if (!validation.estValide) {
        console.warn('🚫 Soumission bloquée:', validation.message);
        return { 
          succès: false, 
          erreur: validation.message,
          typeErreur: validation.raison || validation.type,
          doublon: validation.doublonDetecté 
        };
      }

      // Exécuter la fonction de soumission
      const résultat = await fonctionSoumission(nouvelleEntité);
      
      return { succès: true, données: résultat };
      
    } catch (erreur) {
      console.error('Erreur lors de la soumission:', erreur);
      return { 
        succès: false, 
        erreur: erreur.message,
        typeErreur: 'exception'
      };
    } finally {
      setIsVérificationEnCours(false);
    }
  }, [vérifierDoublon]);

  /**
   * Réinitialise l'état du hook
   */
  const réinitialiser = useCallback(() => {
    setDernierDoublon(null);
    setIsVérificationEnCours(false);
    dernièreSoumission.current = 0;
    dernièreEntité.current = null;
  }, []);

  return {
    // Méthodes
    vérifierDoublon,
    validerEtSoumettre,
    réinitialiser,
    
    // État
    dernierDoublon,
    isVérificationEnCours,
    
    // Utilitaires
    peutSoumettre: !isVérificationEnCours,
    tempsDepuisDernièreSoumission: Date.now() - dernièreSoumission.current
  };
}

/**
 * Hook pour la prévention des doublons dans les formulaires
 * avec debounce intégré
 */
export function useFormDuplicatePrevention(type, entitésExistantes, options = {}) {
  const {
    debounceMs = 500,
    ...autresOptions
  } = options;

  const [vérificationEnCours, setVérificationEnCours] = useState(false);
  const [alerteDoublon, setAlerteDoublon] = useState(null);
  const timeoutRef = useRef(null);

  const prevention = useDuplicatePrevention(type, entitésExistantes, {
    ...autresOptions,
    onDoublonDetecté: (résultat) => {
      setAlerteDoublon(résultat);
      if (autresOptions.onDoublonDetecté) {
        autresOptions.onDoublonDetecté(résultat);
      }
    },
    onValidationRéussie: (entité) => {
      setAlerteDoublon(null);
      if (autresOptions.onValidationRéussie) {
        autresOptions.onValidationRéussie(entité);
      }
    }
  });

  /**
   * Vérifie les doublons en temps réel (avec debounce)
   */
  const vérifierEnTempsRéel = useCallback((donnéesFormulaire) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setVérificationEnCours(true);

    timeoutRef.current = setTimeout(() => {
      const résultat = prevention.vérifierDoublon(donnéesFormulaire);
      
      if (résultat.estDoublon) {
        setAlerteDoublon(résultat);
      } else {
        setAlerteDoublon(null);
      }
      
      setVérificationEnCours(false);
    }, debounceMs);
  }, [prevention, debounceMs]);

  /**
   * Efface l'alerte de doublon
   */
  const effacerAlerte = useCallback(() => {
    setAlerteDoublon(null);
  }, []);

  return {
    ...prevention,
    vérifierEnTempsRéel,
    effacerAlerte,
    vérificationEnCours,
    alerteDoublon
  };
}

/**
 * Hook pour le nettoyage automatique périodique des doublons
 */
export function useAutoCleanup(store, options = {}) {
  const {
    intervalMinutes = 30,
    seuilTempsMinutes = 5,
    actif = true
  } = options;

  const [dernierNettoyage, setDernierNettoyage] = useState(null);
  const [doublonsNettoyés, setDoublonsNettoyés] = useState(0);

  useEffect(() => {
    if (!actif || !store?.nettoyerDoublonsAuto) return;

    const nettoyer = async () => {
      try {
        const résultat = store.nettoyerDoublonsAuto({
          seuilTempsMinutes,
          fusionner: false,
          notifier: true
        });

        setDernierNettoyage(new Date());
        setDoublonsNettoyés(prev => prev + (résultat.nettoyés || 0));
      } catch (erreur) {
        console.error('Erreur nettoyage auto:', erreur);
      }
    };

    // Nettoyage initial
    nettoyer();

    // Intervalle régulier
    const intervalId = setInterval(nettoyer, intervalMinutes * 60000);

    return () => clearInterval(intervalId);
  }, [store, intervalMinutes, seuilTempsMinutes, actif]);

  return {
    dernierNettoyage,
    doublonsNettoyés,
    actif
  };
}

export default useDuplicatePrevention;
