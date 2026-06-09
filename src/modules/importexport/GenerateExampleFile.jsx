import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

const COLORS = {
  navy: '#06006E',
  orange: '#E60000',
  blue: '#06006E',
  green: '#1A7A4A'
};

const GenerateExampleFile = () => {
  const generateExampleFile = () => {
    const wb = XLSX.utils.book_new();
    
    const clientsData = [
      ['code', 'nom', 'contact', 'telephone', 'email', 'adresse', 'ville', 'pays', 'typeClient', 'conditionsPaiement', 'delaiPaiement', 'plafondCredit', 'solde', 'statut'],
      ['CLI001', 'SOLIBRA', 'M. Jean KOUASSI', '+225 27 21 25 36 48', 'contact@solibra.ci', 'Zone Industrielle Yopougon', 'Abidjan', 'Côte d\'Ivoire', 'Entreprise', 'Net 30', '30', '500000', '0', 'Actif'],
      ['CLI002', 'SOBEBRA', 'Mme. Awa KONE', '+225 27 21 35 47 89', 'contact@sobebra.ci', 'Boulevard VGE, Marcory', 'Abidjan', 'Côte d\'Ivoire', 'Entreprise', 'Net 45', '45', '750000', '0', 'Actif']
    ];
    
    const fournisseursData = [
      ['code', 'nom', 'contact', 'telephone', 'email', 'adresse', 'ville', 'pays', 'categorie', 'conditionsPaiement', 'delaiPaiement', 'solde', 'statut'],
      ['FRN001', 'ACIER CI', 'M. Koné Yao', '+225 07 08 09 10 11', 'acier@ci.com', 'Zone 4C', 'Abidjan', 'Côte d\'Ivoire', 'Matériaux', 'Net 45', '45', '0', 'Actif'],
      ['FRN002', 'METAL AFRIQUE', 'M. Traoré', '+225 05 06 07 08 09', 'metal@afrique.com', 'Zone Industrielle', 'Abidjan', 'Côte d\'Ivoire', 'Métallurgie', 'Net 60', '60', '0', 'Actif']
    ];
    
    const devisData = [
      ['numero', 'date', 'clientId', 'clientNom', 'montantHT', 'tva', 'montantTTC', 'validiteJours', 'statut', 'lignes'],
      ['DEV-2026-001', '2026-01-15', '1', 'SOLIBRA', '1000000', '180000', '1180000', '30', 'En attente', '[]'],
      ['DEV-2026-002', '2026-01-20', '2', 'SOBEBRA', '750000', '135000', '885000', '30', 'Accepté', '[]']
    ];
    
    const facturesData = [
      ['numero', 'date', 'dateEcheance', 'clientId', 'clientNom', 'montantHT', 'tva', 'montantTTC', 'montantPaye', 'solde', 'statut', 'lignes'],
      ['FAC-2026-001', '2026-01-20', '2026-02-20', '1', 'SOLIBRA', '1000000', '180000', '1180000', '500000', '680000', 'Partiel', '[]'],
      ['FAC-2026-002', '2026-01-25', '2026-02-25', '2', 'SOBEBRA', '750000', '135000', '885000', '885000', '0', 'Payé', '[]']
    ];
    
    const encaissementsData = [
      ['numero', 'date', 'factureId', 'factureNumero', 'clientId', 'clientNom', 'montant', 'modePaiement', 'reference', 'notes'],
      ['ENC-2026-001', '2026-01-22', '1', 'FAC-2026-001', '1', 'SOLIBRA', '500000', 'Virement', 'VIR-001', 'Acompte 50%'],
      ['ENC-2026-002', '2026-01-26', '2', 'FAC-2026-002', '2', 'SOBEBRA', '885000', 'Chèque', 'CHQ-001', 'Paiement complet']
    ];
    
    const aoData = [
      ['numero', 'reference', 'titre', 'client', 'datePublication', 'dateLimite', 'montantEstime', 'statut', 'priorite'],
      ['AO-2026-001', 'REF-AO-001', 'Construction hangar métallique', 'SOLIBRA', '2026-01-10', '2026-02-10', '5000000', 'En cours', 'Haute'],
      ['AO-2026-002', 'REF-AO-002', 'Fourniture équipements industriels', 'SOBEBRA', '2026-01-15', '2026-02-15', '3000000', 'Soumis', 'Moyenne']
    ];
    
    const caisseData = [
      ['date', 'type', 'categorie', 'montant', 'modePaiement', 'reference', 'description', 'beneficiaire'],
      ['2026-01-15', 'Entrée', 'Vente', '500000', 'Espèces', 'REF-001', 'Vente produit A', 'SOLIBRA'],
      ['2026-01-16', 'Sortie', 'Achat', '200000', 'Virement', 'REF-002', 'Achat matières premières', 'ACIER CI'],
      ['2026-01-17', 'Entrée', 'Vente', '750000', 'Chèque', 'REF-003', 'Vente produit B', 'SOBEBRA']
    ];
    
    const journalData = [
      ['date', 'libelle', 'entrees', 'sorties', 'solde', 'modePaiement', 'reference'],
      ['2026-01-15', 'Vente produit A', '500000', '0', '500000', 'Espèces', 'REF-001'],
      ['2026-01-16', 'Achat matières premières', '0', '200000', '300000', 'Virement', 'REF-002'],
      ['2026-01-17', 'Vente produit B', '750000', '0', '1050000', 'Chèque', 'REF-003']
    ];
    
    const planificationData = [
      ['titre', 'description', 'dateDebut', 'dateFin', 'statut', 'priorite', 'responsable', 'progression'],
      ['Projet SOLIBRA', 'Installation équipements industriels', '2026-02-01', '2026-04-30', 'En cours', 'Haute', 'M. AMEMATCHRON', '25'],
      ['Livraison SOBEBRA', 'Fourniture équipements brasserie', '2026-02-15', '2026-03-15', 'Planifié', 'Moyenne', 'M. KOUASSI', '0']
    ];
    
    const wsClients = XLSX.utils.aoa_to_sheet(clientsData);
    const wsFournisseurs = XLSX.utils.aoa_to_sheet(fournisseursData);
    const wsDevis = XLSX.utils.aoa_to_sheet(devisData);
    const wsFactures = XLSX.utils.aoa_to_sheet(facturesData);
    const wsEncaissements = XLSX.utils.aoa_to_sheet(encaissementsData);
    const wsAO = XLSX.utils.aoa_to_sheet(aoData);
    const wsCaisse = XLSX.utils.aoa_to_sheet(caisseData);
    const wsJournal = XLSX.utils.aoa_to_sheet(journalData);
    const wsPlanification = XLSX.utils.aoa_to_sheet(planificationData);
    
    XLSX.utils.book_append_sheet(wb, wsClients, 'Clients');
    XLSX.utils.book_append_sheet(wb, wsFournisseurs, 'Fournisseurs');
    XLSX.utils.book_append_sheet(wb, wsDevis, 'Devis');
    XLSX.utils.book_append_sheet(wb, wsFactures, 'Factures');
    XLSX.utils.book_append_sheet(wb, wsEncaissements, 'Encaissements');
    XLSX.utils.book_append_sheet(wb, wsAO, 'AO');
    XLSX.utils.book_append_sheet(wb, wsCaisse, 'Caisse');
    XLSX.utils.book_append_sheet(wb, wsJournal, 'Journal');
    XLSX.utils.book_append_sheet(wb, wsPlanification, 'Planification');
    
    XLSX.writeFile(wb, 'LES_FICHIERS_POUR_LOGICIEL_2026_EXEMPLE.xlsx');
  };

  return (
    <div className="mt-6 p-4 rounded-lg border-2 border-dashed" style={{ borderColor: COLORS.blue, backgroundColor: '#F0F4FF' }}>
      <h3 className="font-bold mb-2" style={{ color: COLORS.navy }}>
        Fichier d'exemple pour test
      </h3>
      <p className="text-sm mb-4" style={{ color: COLORS.navy }}>
        Téléchargez un fichier Excel pré-rempli avec des données d'exemple pour tester l'import.
      </p>
      <button
        onClick={generateExampleFile}
        className="px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2"
        style={{ backgroundColor: COLORS.green }}
      >
        <Download className="w-4 h-4" />
        Télécharger le fichier d'exemple
      </button>
    </div>
  );
};

export default GenerateExampleFile;
