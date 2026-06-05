/**
 * Utilitaires de formatage pour SIKA INDUSTRIE
 * Format ivoirien (FCFA, dates JJ/MM/AAAA)
 */

// Formatage des montants en FCFA avec points comme séparateurs
export const formatFCFA = (montant) => {
  if (montant === null || montant === undefined) return '0 FCFA';

  const formatter = new Intl.NumberFormat('fr-CI', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  // Remplacer les espaces par des points (format 1.100.000.000)
  const formatted = formatter.format(montant).replace(/\s/g, '.');

  return `${formatted} FCFA`;
};

// Formatage des dates au format JJ/MM/AAAA
export const formatDate = (dateISO) => {
  if (!dateISO) return '';
  
  const date = new Date(dateISO);
  const jour = String(date.getDate()).padStart(2, '0');
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const annee = date.getFullYear();
  
  return `${jour}/${mois}/${annee}`;
};

// Formatage des dates au format long "Abidjan, le JJ mois AAAA"
export const formatDateLong = (dateISO) => {
  if (!dateISO) return '';
  
  const date = new Date(dateISO);
  const moisNoms = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  
  const jour = date.getDate();
  const mois = moisNoms[date.getMonth()];
  const annee = date.getFullYear();
  
  return `Abidjan, le ${jour} ${mois} ${annee}`;
};

// Conversion d'une date au format JJ/MM/AAAA vers ISO
export const parseDateFR = (dateFR) => {
  if (!dateFR) return null;
  
  const parts = dateFR.split('/');
  if (parts.length !== 3) return null;
  
  const [jour, mois, annee] = parts;
  const date = new Date(annee, mois - 1, jour);
  
  return date.toISOString().split('T')[0];
};

// Calcul de la TVA (18%)
export const calcTVA = (montantHT) => {
  if (!montantHT) return 0;
  return montantHT * 0.18;
};

// Calcul du montant TTC
export const calcTTC = (montantHT) => {
  if (!montantHT) return 0;
  return montantHT * 1.18;
};

// Calcul du budget carburant
export const calcBudgetCarburant = (distanceKm, params) => {
  if (!distanceKm || !params) return 0;
  
  const { consommationMoyenne, prixCarburant } = params;
  const litresNecessaires = (distanceKm / 100) * consommationMoyenne;
  
  return litresNecessaires * prixCarburant;
};

// Calcul du budget repas
export const calcBudgetRepas = (nbTechniciens, nbJours, params) => {
  if (!nbTechniciens || !nbJours || !params) return 0;
  
  const { indemniteRepas } = params;
  return nbTechniciens * nbJours * indemniteRepas;
};

// Formatage des nombres sans devise
export const formatNumber = (nombre) => {
  if (nombre === null || nombre === undefined) return '0';

  const formatted = new Intl.NumberFormat('fr-CI', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(nombre);

  // Remplacer les espaces par des points (format 1.100.000.000)
  return formatted.replace(/\s/g, '.');
};

// Formatage des montants avec points sans devise (pour tableaux PDF, etc.)
export const formatNumberPoints = (nombre) => {
  if (nombre === null || nombre === undefined || nombre === '') return '0';
  const num = typeof nombre === 'string' ? parseFloat(nombre) : nombre;
  if (isNaN(num)) return '0';

  const formatted = new Intl.NumberFormat('fr-CI', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);

  // Remplacer les espaces par des points (format 1.100.000.000)
  return formatted.replace(/\s/g, '.');
};

// Formatage des pourcentages
export const formatPourcentage = (valeur) => {
  if (valeur === null || valeur === undefined) return '0%';
  
  return `${formatNumber(valeur)}%`;
};

// Formatage des numéros de téléphone ivoiriens
export const formatTelephone = (numero) => {
  if (!numero) return '';
  
  // Retire tous les caractères non numériques
  const chiffres = numero.replace(/\D/g, '');
  
  // Format: +225 XX XX XX XX XX
  if (chiffres.length === 10) {
    return `+225 ${chiffres.slice(0, 2)} ${chiffres.slice(2, 4)} ${chiffres.slice(4, 6)} ${chiffres.slice(6, 8)} ${chiffres.slice(8, 10)}`;
  }
  
  return numero;
};

// Extraction du montant HT depuis TTC
export const calcHT = (montantTTC) => {
  if (!montantTTC) return 0;
  return montantTTC / 1.18;
};

// Formatage d'une durée en heures
export const formatHeures = (heures) => {
  if (heures === null || heures === undefined) return '0h';
  
  const h = Math.floor(heures);
  const m = Math.round((heures - h) * 60);
  
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
};

// Date du jour au format ISO (YYYY-MM-DD)
export const getTodayISO = () => new Date().toISOString().split('T')[0];

// Parsing numérique sécurisé
export const safeParseFloat = (valeur, defaut = 0) => {
  if (valeur === null || valeur === undefined || valeur === '') return defaut;
  const parsed = parseFloat(valeur);
  return isNaN(parsed) ? defaut : parsed;
};

export const safeParseInt = (valeur, defaut = 0) => {
  if (valeur === null || valeur === undefined || valeur === '') return defaut;
  const parsed = parseInt(valeur, 10);
  return isNaN(parsed) ? defaut : parsed;
};

/**
 * Génère un ID unique cryptographiquement sécurisé
 * Remplace Date.now() + Math.random() qui peut causer des collisions
 * @param {string} prefix - Préfixe optionnel pour l'ID
 * @returns {string} ID unique
 */
export const generateSecureId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const randomValues = new Uint8Array(8);
  crypto.getRandomValues(randomValues);
  const randomPart = Array.from(randomValues)
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 9);
  return prefix ? `${prefix}-${timestamp}-${randomPart}` : `${timestamp}-${randomPart}`;
};
