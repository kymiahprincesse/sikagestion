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

export function isDevisVisibleDansListe(devis) {
  if (!devis) return false;
  return Boolean(devis.typeDevis || devis.type);
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
