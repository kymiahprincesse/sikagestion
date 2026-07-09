// ═══════════════════════════════════════════════════════════════
// SIKA INDUSTRIE — SYSTÈME DE DÉTECTION ET PRÉVENTION DES DOUBLONS
// ═══════════════════════════════════════════════════════════════

/**
 * Classe utilitaire pour détecter et prévenir les doublons
 * dans toutes les entités (devis, factures, clients, etc.)
 */
export class DuplicateDetector {
  constructor(options = {}) {
    this.critères = options.critères || [];
    this.délaiFenêtre = options.délaiFenêtre || 60000; // 1 minute par défaut
    this.seuilSimilarité = options.seuilSimilarité || 0.85; // 85% similarité
  }

  /**
   * Vérifie si une nouvelle entité est un doublon par rapport à une liste existante
   * @param {Object} nouvelleEntité - L'entité à vérifier
   * @param {Array} entitésExistantes - Liste des entités déjà existantes
   * @returns {Object} - { estDoublon: boolean, doublonDetecté: Object|null, raison: string }
   */
  detecterDoublon(nouvelleEntité, entitésExistantes) {
    // 1. Vérification par ID ou numéro unique
    if (nouvelleEntité.id || nouvelleEntité.numero) {
      const doublonId = entitésExistantes.find(e => 
        (nouvelleEntité.id && e.id === nouvelleEntité.id) ||
        (nouvelleEntité.numero && e.numero === nouvelleEntité.numero)
      );
      
      if (doublonId) {
        return {
          estDoublon: true,
          doublonDetecté: doublonId,
          raison: 'ID ou numéro déjà existant',
          type: 'ID_DUPLICATE'
        };
      }
    }

    // 2. Vérification par critères définis
    for (const critère of this.critères) {
      const doublon = this._verifierCritère(nouvelleEntité, entitésExistantes, critère);
      if (doublon) {
        return {
          estDoublon: true,
          doublonDetecté: doublon,
          raison: critère.message || `Doublon détecté par critère: ${critère.nom}`,
          type: critère.type || 'CRITERIA_DUPLICATE'
        };
      }
    }

    // 3. Vérification temporelle (créations rapprochées)
    const doublonTemporel = this._verifierDoublonTemporel(nouvelleEntité, entitésExistantes);
    if (doublonTemporel) {
      return {
        estDoublon: true,
        doublonDetecté: doublonTemporel,
        raison: 'Création trop rapprochée dans le temps',
        type: 'TEMPORAL_DUPLICATE'
      };
    }

    return { estDoublon: false, doublonDetecté: null, raison: null, type: null };
  }

  /**
   * Vérifie un critère spécifique
   */
  _verifierCritère(nouvelle, existantes, critère) {
    return existantes.find(existante => {
      // Vérifier tous les champs du critère
      const tousChampsCorrespondent = critère.champs.every(champ => {
        const valNouvelle = this._getValeurChamp(nouvelle, champ);
        const valExistante = this._getValeurChamp(existante, champ);
        
        if (valNouvelle === undefined || valNouvelle === null || valNouvelle === '' ||
            valExistante === undefined || valExistante === null || valExistante === '') {
          return false;
        }
        
        if (critère.comparaison === 'exact') {
          return valNouvelle === valExistante;
        } else if (critère.comparaison === 'normalisé') {
          return this._normaliser(valNouvelle) === this._normaliser(valExistante);
        } else if (critère.comparaison === 'similarité') {
          return this._calculerSimilarité(valNouvelle, valExistante) >= this.seuilSimilarité;
        }
        return valNouvelle === valExistante;
      });

      // Vérifier la fenêtre temporelle si définie
      if (tousChampsCorrespondent && critère.fenêtreTemps) {
        const dateNouvelle = new Date(nouvelle.dateCreation || nouvelle.date || Date.now());
        const dateExistante = new Date(existante.dateCreation || existante.date || Date.now());
        const diffMs = Math.abs(dateNouvelle - dateExistante);
        return diffMs < critère.fenêtreTemps;
      }

      return tousChampsCorrespondent;
    });
  }

  /**
   * Vérifie les doublons temporels (double-clic rapide)
   */
  _verifierDoublonTemporel(nouvelle, existantes) {
    const maintenant = Date.now();
    
    return existantes.find(existante => {
      const dateExistante = new Date(existante.dateCreation || existante.date || 0).getTime();
      const diffMs = maintenant - dateExistante;
      
      // Si créé dans les dernières 500ms avec données quasi-identiques (double-clic)
      if (diffMs < 500) { // 500 millisecondes seulement
        const similarité = this._calculerSimilaritéGlobale(nouvelle, existante);
        return similarité > 0.95; // 95% de similarité
      }
      return false;
    });
  }

  /**
   * Récupère la valeur d'un champ (supporte la notation pointée)
   */
  _getValeurChamp(objet, chemin) {
    return chemin.split('.').reduce((o, p) => o?.[p], objet);
  }

  /**
   * Normalise une chaîne pour comparaison
   */
  _normaliser(valeur) {
    if (typeof valeur !== 'string') return String(valeur).toLowerCase().trim();
    return valeur
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Retire les accents
      .replace(/[^a-z0-9]/g, '') // Garde seulement alphanumérique
      .trim();
  }

  /**
   * Calcule la similarité entre deux chaînes (distance de Levenshtein simplifiée)
   */
  _calculerSimilarité(str1, str2) {
    const s1 = this._normaliser(str1);
    const s2 = this._normaliser(str2);
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const plusLong = Math.max(s1.length, s2.length);
    const distance = this._distanceLevenshtein(s1, s2);
    
    return (plusLong - distance) / plusLong;
  }

  _distanceLevenshtein(s1, s2) {
    const matrix = [];
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        matrix[i][j] = Math.min(
          matrix[i-1][j] + 1,
          matrix[i][j-1] + 1,
          matrix[i-1][j-1] + (s1[j-1] === s2[i-1] ? 0 : 1)
        );
      }
    }
    return matrix[s2.length][s1.length];
  }

  /**
   * Calcule la similarité globale entre deux objets
   */
  _calculerSimilaritéGlobale(obj1, obj2) {
    const champsCommuns = Object.keys(obj1).filter(k => 
      typeof obj1[k] !== 'object' && 
      typeof obj1[k] !== 'function' &&
      k in obj2
    );
    
    if (champsCommuns.length === 0) return 0;
    
    const similarités = champsCommuns.map(champ => {
      if (typeof obj1[champ] === 'string') {
        return this._calculerSimilarité(obj1[champ], obj2[champ]);
      }
      return obj1[champ] === obj2[champ] ? 1 : 0;
    });
    
    return similarités.reduce((a, b) => a + b, 0) / similarités.length;
  }
}

// ═══ CONFIGURATIONS PRÉDÉFINIES PAR TYPE D'ENTITÉ ═══

export const DuplicateConfigs = {
  devis: {
    critères: [
      {
        nom: 'Numéro existant',
        type: 'NUMBER_DUPLICATE',
        champs: ['numero'],
        comparaison: 'exact',
        message: 'Ce numéro de devis existe déjà'
      }
    ],
    délaiFenêtre: 10000
  },

  facture: {
    critères: [
      {
        nom: 'Doublon exact',
        type: 'EXACT_DUPLICATE',
        champs: ['clientId', 'montantTTC', 'numero'],
        comparaison: 'exact',
        fenêtreTemps: 120000, // 2 minutes
        message: 'Une facture identique existe déjà'
      },
      {
        nom: 'Référence fournisseur',
        type: 'REF_DUPLICATE',
        champs: ['reference'],
        comparaison: 'exact',
        message: 'Cette référence de facture existe déjà'
      }
    ],
    délaiFenêtre: 120000
  },

  client: {
    critères: [
      {
        nom: 'Email existant',
        type: 'EMAIL_DUPLICATE',
        champs: ['contactEmail'],
        comparaison: 'normalisé',
        message: 'Un client avec cet email existe déjà'
      },
      {
        nom: 'Téléphone existant',
        type: 'PHONE_DUPLICATE',
        champs: ['contactTelephone'],
        comparaison: 'normalisé',
        message: 'Un client avec ce téléphone existe déjà'
      },
      {
        nom: 'Nom similaire',
        type: 'NAME_SIMILAR',
        champs: ['nom'],
        comparaison: 'similarité',
        message: 'Un client avec un nom similaire existe déjà'
      }
    ],
    seuilSimilarité: 0.85
  },

  fournisseur: {
    critères: [
      {
        nom: 'Email existant',
        type: 'EMAIL_DUPLICATE',
        champs: ['contactEmail'],
        comparaison: 'normalisé',
        message: 'Un fournisseur avec cet email existe déjà'
      },
      {
        nom: 'Nom similaire',
        type: 'NAME_SIMILAR',
        champs: ['nom'],
        comparaison: 'similarité',
        message: 'Un fournisseur avec un nom similaire existe déjà'
      }
    ],
    seuilSimilarité: 0.85
  },

  achat: {
    critères: [
      {
        nom: 'Doublon commande',
        type: 'ORDER_DUPLICATE',
        champs: ['fournisseurId', 'montantTTC', 'dateAchat'],
        comparaison: 'exact',
        fenêtreTemps: 300000, // 5 minutes
        message: 'Un achat similaire existe déjà pour ce fournisseur'
      }
    ],
    délaiFenêtre: 300000
  }
};

// ═══ FONCTIONS UTILITAIRES ═══

/**
 * Crée un détecteur configuré pour un type d'entité
 */
export function createDetector(type) {
  const config = DuplicateConfigs[type];
  if (!config) {
    throw new Error(`Type d'entité non supporté: ${type}`);
  }
  return new DuplicateDetector(config);
}

/**
 * Vérifie rapidement si une entité est un doublon
 */
export function quickCheck(type, nouvelleEntité, entitésExistantes) {
  const detector = createDetector(type);
  return detector.detecterDoublon(nouvelleEntité, entitésExistantes);
}

/**
 * Trouve tous les doublons dans une liste d'entités
 */
export function findAllDuplicates(entités, type = 'auto') {
  const doublons = [];
  const déjàVu = new Set();
  
  for (let i = 0; i < entités.length; i++) {
    if (déjàVu.has(i)) continue;
    
    const groupeDoublons = [entités[i]];
    
    for (let j = i + 1; j < entités.length; j++) {
      if (déjàVu.has(j)) continue;
      
      const detector = type === 'auto' 
        ? new DuplicateDetector() 
        : createDetector(type);
      
      const résultat = detector.detecterDoublon(entités[i], [entités[j]]);
      
      if (résultat.estDoublon) {
        groupeDoublons.push(entités[j]);
        déjàVu.add(j);
      }
    }
    
    if (groupeDoublons.length > 1) {
      doublons.push({
        groupe: groupeDoublons,
        indices: groupeDoublons.map(e => entités.indexOf(e))
      });
    }
  }
  
  return doublons;
}

/**
 * Fusionne les entités en double
 */
export function mergeDuplicates(entitéPrincipale, entitésDoublons, stratégie = 'garderPremier') {
  switch (stratégie) {
    case 'garderPremier':
      return entitéPrincipale;
    
    case 'fusionnerDonnées':
      return entitésDoublons.reduce((fusionnée, doublon) => ({
        ...fusionnée,
        ...doublon,
        // Garder les champs non vides
        ...Object.fromEntries(
          Object.entries(doublon).filter(([_, v]) => v !== null && v !== undefined && v !== '')
        )
      }), entitéPrincipale);
    
    case 'sommerMontants':
      return {
        ...entitéPrincipale,
        montantTotal: [entitéPrincipale, ...entitésDoublons]
          .reduce((sum, e) => sum + (e.montantTotal || e.montantTTC || 0), 0)
      };
    
    default:
      return entitéPrincipale;
  }
}

export default {
  DuplicateDetector,
  DuplicateConfigs,
  createDetector,
  quickCheck,
  findAllDuplicates,
  mergeDuplicates
};
