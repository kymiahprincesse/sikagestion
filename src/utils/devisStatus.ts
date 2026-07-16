import { DevisStatut, TypeDevis } from '../types';

export function normalizeDevisStatut(statut?: string | null): DevisStatut {
  if (!statut) return 'BROUILLON';

  const normalized = String(statut).trim().toUpperCase();
  const aliases: Record<string, DevisStatut> = {
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

  return aliases[normalized] || (normalized as DevisStatut);
}

export function isDevisEnAttente(statut?: string | null): boolean {
  const normalized = normalizeDevisStatut(statut);
  return normalized === 'BROUILLON' || normalized === 'EN_ATTENTE';
}

export function detecterTypeDevis(devis: any): TypeDevis {
  if (!devis) return 'TUYAUTERIE';
  const type = devis.typeDevis || devis.type || devis.type_devis;
  if (type && type !== 'INCONNU' && type !== 'null') return type as TypeDevis;

  const objet = String(devis.objet || '').toUpperCase();
  if (objet.includes('CALORIFUGE') || objet.includes('ISOLATION')) return 'CALORIFUGE';
  if (objet.includes('PLIAGE') || objet.includes('TOLE') || objet.includes('TÔLE')) return 'TUYAUTERIE'; // fallback since PLIAGE is not in TypeDevis
  if (objet.includes('SOUDURE')) return 'SOUDURE';
  if (objet.includes('CHAUDRONNERIE')) return 'TUYAUTERIE';
  if (objet.includes('RESERVOIR') || objet.includes('BAC') || objet.includes('CUVE')) return 'RESERVOIR';
  if (objet.includes('CHARPENTE') || objet.includes('STRUCTURE')) return 'TUYAUTERIE';
  if (objet.includes('TUYAU') || objet.includes('PIPE') || objet.includes('TUYAUTERIE')) return 'TUYAUTERIE';

  return 'TUYAUTERIE';
}

export function isDevisVisibleDansListe(devis: any): boolean {
  if (!devis) return false;
  return Boolean(devis.typeDevis || devis.type || devis.numero || devis.type_devis);
}

export function getDevisStatutLabel(statut?: string | null): string {
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
