import { useState } from 'react';

/**
 * Utilitaires de validation pour les formulaires SIKA GESTION
 * Validation côté client pour UX immédiate
 */

// ── MESSAGES D'ERREUR STANDARD ───────────────────────────
export const ERROR_MESSAGES = {
  required: 'Ce champ est obligatoire',
  email: 'Veuillez entrer une adresse email valide',
  telephone: 'Veuillez entrer un numéro de téléphone valide',
  minLength: (min) => `Minimum ${min} caractères requis`,
  maxLength: (max) => `Maximum ${max} caractères autorisés`,
  minValue: (min) => `La valeur minimale est ${min}`,
  maxValue: (max) => `La valeur maximale est ${max}`,
  numeric: 'Veuillez entrer un nombre valide',
  positive: 'La valeur doit être positive',
  date: 'Veuillez entrer une date valide',
  dateFuture: 'La date doit être dans le futur',
  datePast: 'La date doit être dans le passé',
  ncc: 'Le NCC doit contenir 8 chiffres',
  match: 'Les valeurs ne correspondent pas',
  url: 'Veuillez entrer une URL valide',
  fileType: (types) => `Types acceptés : ${types.join(', ')}`,
  fileSize: (maxMB) => `Taille maximale : ${maxMB} Mo`,
};

// ── RÈGLES DE VALIDATION ─────────────────────────────────

export const validators = {
  // Champ obligatoire
  required: (value) => {
    if (value === null || value === undefined || value === '') {
      return ERROR_MESSAGES.required;
    }
    if (Array.isArray(value) && value.length === 0) {
      return ERROR_MESSAGES.required;
    }
    return null;
  },

  // Email
  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : ERROR_MESSAGES.email;
  },

  // Téléphone ivoirien
  telephone: (value) => {
    if (!value) return null;
    // Formats acceptés: +225 XX XX XX XX XX ou 0X XX XX XX XX
    const phoneRegex = /^(\+225\s?)?[0-9\s]{10}$/;
    return phoneRegex.test(value.replace(/\s/g, '')) ? null : ERROR_MESSAGES.telephone;
  },

  // Longueur minimale
  minLength: (min) => (value) => {
    if (!value) return null;
    return value.length >= min ? null : ERROR_MESSAGES.minLength(min);
  },

  // Longueur maximale
  maxLength: (max) => (value) => {
    if (!value) return null;
    return value.length <= max ? null : ERROR_MESSAGES.maxLength(max);
  },

  // Valeur minimale
  minValue: (min) => (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(value);
    if (isNaN(num)) return ERROR_MESSAGES.numeric;
    return num >= min ? null : ERROR_MESSAGES.minValue(min);
  },

  // Valeur maximale
  maxValue: (max) => (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(value);
    if (isNaN(num)) return ERROR_MESSAGES.numeric;
    return num <= max ? null : ERROR_MESSAGES.maxValue(max);
  },

  // Nombre positif
  positive: (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(value);
    if (isNaN(num)) return ERROR_MESSAGES.numeric;
    return num > 0 ? null : ERROR_MESSAGES.positive;
  },

  // Nombre valide
  numeric: (value) => {
    if (value === null || value === undefined || value === '') return null;
    return !isNaN(parseFloat(value)) ? null : ERROR_MESSAGES.numeric;
  },

  // Date valide
  date: (value) => {
    if (!value) return null;
    const date = new Date(value);
    return !isNaN(date.getTime()) ? null : ERROR_MESSAGES.date;
  },

  // Date dans le futur
  futureDate: (value) => {
    if (!value) return null;
    const date = new Date(value);
    const now = new Date();
    return date > now ? null : ERROR_MESSAGES.dateFuture;
  },

  // Date dans le passé
  pastDate: (value) => {
    if (!value) return null;
    const date = new Date(value);
    const now = new Date();
    return date < now ? null : ERROR_MESSAGES.datePast;
  },

  // NCC (Numéro de Compte Contribuable) - 8 chiffres
  ncc: (value) => {
    if (!value) return null;
    const nccRegex = /^\d{8}$/;
    return nccRegex.test(value) ? null : ERROR_MESSAGES.ncc;
  },

  // Correspondance entre deux champs
  match: (fieldToMatch, fieldName) => (value, allValues) => {
    return value === allValues?.[fieldToMatch] ? null : `${ERROR_MESSAGES.match} (${fieldName})`;
  },

  // URL valide
  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return ERROR_MESSAGES.url;
    }
  },
};

// ── VALIDATION DE FORMULAIRE ─────────────────────────────

/**
 * Valide un champ avec une ou plusieurs règles
 * @param {any} value - Valeur à valider
 * @param {Array<Function>} rules - Tableau de fonctions de validation
 * @param {Object} allValues - Toutes les valeurs du formulaire (pour match)
 * @returns {string|null} Message d'erreur ou null si valide
 */
export function validateField(value, rules, allValues = {}) {
  for (const rule of rules) {
    const error = rule(value, allValues);
    if (error) return error;
  }
  return null;
}

/**
 * Valide un objet complet (formulaire)
 * @param {Object} values - Valeurs du formulaire { champ: valeur }
 * @param {Object} schema - Schema de validation { champ: [rules] }
 * @returns {Object} { isValid: boolean, errors: { champ: message } }
 */
export function validateForm(values, schema) {
  const errors = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(values[field], rules, values);
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  }

  return { isValid, errors };
}

// ── SCHEMAS PRÉDÉFINIS ──────────────────────────────────

export const schemas = {
  // Client
  client: {
    nom: [validators.required, validators.minLength(2)],
    email: [validators.email],
    telephone: [validators.telephone],
    ncc: [validators.ncc],
  },

  // Devis/Facture
  devis: {
    clientId: [validators.required],
    objet: [validators.required, validators.minLength(5)],
    montantHT: [validators.required, validators.positive],
  },

  // Projet
  projet: {
    nom: [validators.required, validators.minLength(3)],
    clientId: [validators.required],
    dateDebut: [validators.required, validators.date],
    dateFinPrevue: [validators.required, validators.date],
  },

  // Utilisateur
  utilisateur: {
    nom: [validators.required, validators.minLength(2)],
    email: [validators.required, validators.email],
    login: [validators.required, validators.minLength(3)],
    motDePasse: [validators.required, validators.minLength(8)],
    confirmMotDePasse: [validators.required, validators.match('motDePasse', 'Confirmation')],
  },

  // Paiement
  paiement: {
    montant: [validators.required, validators.positive],
    dateEncaissement: [validators.required, validators.date, validators.pastDate],
    modePaiement: [validators.required],
  },
};

// ── HOOK DE VALIDATION (pour React) ──────────────────────

/**
 * Hook personnalisé pour la validation en temps réel
 * À utiliser dans les composants de formulaire
 * 
 * Usage:
 * const { errors, validate, isValid } = useValidation(schemas.client);
 */
export function createValidationHook(schema) {
  return function useValidation() {
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validate = (values) => {
      const result = validateForm(values, schema);
      setErrors(result.errors);
      return result.isValid;
    };

    const validateField = (field, value, allValues) => {
      const rules = schema[field];
      if (!rules) return true;

      const error = validateField(value, rules, allValues);
      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
      setTouched(prev => ({ ...prev, [field]: true }));
      return !error;
    };

    const clearError = (field) => {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    };

    const clearAllErrors = () => {
      setErrors({});
      setTouched({});
    };

    const isValid = Object.keys(errors).length === 0;
    const hasErrors = Object.keys(errors).some(key => touched[key] && errors[key]);

    return {
      errors,
      touched,
      isValid,
      hasErrors,
      validate,
      validateField,
      clearError,
      clearAllErrors,
    };
  };
}

// ── UTILITAIRES D'AFFICHAGE ──────────────────────────────

/**
 * Classe CSS pour les champs en erreur
 */
export function getFieldClassName(hasError, touched, baseClass = '') {
  const classes = [baseClass];
  if (touched) {
    classes.push(hasError ? 'border-red-500 focus:ring-red-500' : 'border-green-500 focus:ring-green-500');
  }
  return classes.join(' ');
}

/**
 * Composant d'erreur simple
 */
export function ErrorMessage({ message, className = '' }) {
  if (!message) return null;
  return (
    <span className={`text-sm text-red-600 mt-1 ${className}`}>
      {message}
    </span>
  );
}
