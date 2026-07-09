export function normalizeDevisStatut(statut) {
  if (!statut) return 'BROUILLON';

  const normalized = String(statut).trim().toUpperCase();
  const aliases = {
    'EN ATTENTE': 'EN_ATTENTE',
    'EN_ATTENTE': 'EN_ATTENTE',
    'PENDING': 'EN_ATTENTE',
    'BROUILLON': 'BROUILLON',
    'DRAFT': 'BROUILLON',
    'VALIDÉ': 'VALIDE',
    'VALIDE': 'VALIDE',
    'VALIDÉE': 'VALIDE',
    'FACTURE': 'FACTURE',
    'FACTURÉ': 'FACTURE',
    'ANNULE': 'ANNULE',
    'ANNULÉ': 'ANNULE',
    'ANNULEE': 'ANNULE',
  };

  return aliases[normalized] || normalized;
}

export function isDevisEnAttente(statut) {
  const normalized = normalizeDevisStatut(statut);
  return normalized === 'BROUILLON' || normalized === 'EN_ATTENTE';
}

export function detecterTypeDevis(devis) {
  if (!devis) return 'TUYAUTERIE';
  const type = devis.typeDevis || devis.type || devis.type_devis;
  if (type && type !== 'INCONNU' && type !== 'null') return type;

  const objet = String(devis.objet || '').toUpperCase();
  if (objet.includes('CALORIFUGE') || objet.includes('ISOLATION')) return 'CALORIFUGE';
  if (objet.includes('PLIAGE') || objet.includes('TOLE') || objet.includes('TÔLE')) return 'PLIAGE';
  if (objet.includes('SOUDURE')) return 'SOUDURE';
  if (objet.includes('CHAUDRONNERIE')) return 'CHAUDRONNERIE';
  if (objet.includes('RESERVOIR') || objet.includes('BAC') || objet.includes('CUVE')) return 'RESERVOIR';
  if (objet.includes('CHARPENTE') || objet.includes('STRUCTURE')) return 'CHARPENTE';
  if (objet.includes('TUYAU') || objet.includes('PIPE') || objet.includes('TUYAUTERIE')) return 'TUYAUTERIE';

  return 'TUYAUTERIE';
}

export function isDevisVisibleDansListe(devis) {
  if (!devis) return false;
  return Boolean(devis.typeDevis || devis.type || devis.numero || devis.type_devis);
}

export function getDevisStatutLabel(statut) {
  switch (normalizeDevisStatut(statut)) {
    case 'EN_ATTENTE':
      return 'En attente';
    case 'BROUILLON':
      return 'Brouillon';
    case 'VALIDE':
      return 'Validé';
    case 'FACTURE':
      return 'Facturé';
    case 'ANNULE':
      return 'Annulé';
    default:
      return statut || 'Brouillon';
  }
}
