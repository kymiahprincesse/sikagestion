export type DevisStatut = 'BROUILLON' | 'EN_ATTENTE' | 'VALIDE' | 'FACTURE' | 'ANNULE';
export type FactureStatut = 'BROUILLON' | 'EN_ATTENTE' | 'PAYEE' | 'PARTIELLE' | 'RETARD' | 'ANNULEE';
export type TypeDevis = 'SOUDURE' | 'TUYAUTERIE' | 'CALORIFUGE' | 'RESERVOIR' | 'ECHAFAUDAGE' | 'PEINTURE';

export interface LigneDevis {
  id?: string;
  devis_id?: string;
  designation: string;
  quantite: number;
  unite?: string;
  pu?: number;
  montant?: number;
  ml?: number;
  pt?: number;
  ordre?: number;
}

export interface Client {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  rccm?: string;
  nui?: string;
  date_creation?: string;
}

export interface Devis {
  id: string;
  numero: string;
  client_id?: string;
  client_nom?: string;
  type_devis: TypeDevis;
  objet?: string;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  montant_total: number;
  statut: DevisStatut;
  date_devis: string;
  date_validation?: string;
  date_annulation?: string;
  date_transformation?: string;
  notes?: string;
  lignes?: LigneDevis[];
  tvaActive?: boolean;
}

export interface Facture {
  id: string;
  numero: string;
  devis_id?: string;
  client_id?: string;
  client_nom?: string;
  objet?: string;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  montant_paye?: number;
  reste_a_payer?: number;
  statut: FactureStatut;
  date_facture: string;
  date_echeance?: string;
  notes?: string;
}
