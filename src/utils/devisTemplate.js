// ═══════════════════════════════════════════════════════════════
// SIKA INDUSTRIE — TEMPLATE HTML UNIFIÉ POUR TOUS LES DEVIS
// ═══════════════════════════════════════════════════════════════

/**
 * Génère le HTML complet d'un devis prêt à imprimer sur A4
 * L'en-tête et le pied de page sont gérés séparément par les images SIKA
 * 
 * @param {Object} data - Données du devis
 * @param {string} data.reference - Numéro de référence du devis
 * @param {string} data.objet - Objet du devis
 * @param {Object} data.client - Informations client { nom, interlocuteur, site }
 * @param {Object} data.infos - Informations du devis { date, validite, etabliPar, tel }
 * @param {Array} data.lignes - Lignes du devis [{ designation, dn, qte, pu, montant }]
 * @param {number} data.montantHT - Montant HT
 * @param {number} data.tva - Montant TVA
 * @param {number} data.ttc - Montant TTC
 * @param {string} data.type - Type de devis (optionnel, affiché dans le bandeau)
 * @returns {string} HTML complet du devis
 */
export function generateDevisHTML(data) {
  const {
    reference,
    objet,
    client = {},
    infos = {},
    lignes = [],
    montantHT = 0,
    tva = 0,
    ttc = 0,
    type = ''
  } = data;

  // Formater les montants avec séparateur de milliers
  const formatMontant = (val) => {
    if (!val && val !== 0) return '0';
    return new Intl.NumberFormat('fr-FR').format(val);
  };

  // Formater la date
  const formatDate = (date) => {
    if (!date) return new Date().toLocaleDateString('fr-FR');
    return new Date(date).toLocaleDateString('fr-FR');
  };

  // Générer les lignes du tableau
  const lignesHTML = lignes.map((ligne, index) => `
    <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-alterne'}">
      <td class="col-designation">${ligne.designation || ''}</td>
      <td class="col-dn">${ligne.dn || ligne.unite || '—'}</td>
      <td class="col-qte">${formatMontant(ligne.qte || 0)}</td>
      <td class="col-pu">${formatMontant(ligne.pu || 0)}</td>
      <td class="col-montant">${formatMontant(ligne.montant || (ligne.qte * ligne.pu) || 0)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DEVIS ${reference || ''}</title>
  <style>
    /* ═══ RESET & BASE ═══ */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #1a3a6b;
    }
    
    /* ═══ PAGE A4 ═══ */
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 8mm 10mm;
      margin: 0 auto;
      background: white;
    }
    
    /* ═══ BANDEAU TITRE ═══ */
    .bandeau-titre {
      background: #1a3a6b;
      color: white;
      text-align: center;
      padding: 12px 20px;
      margin: 15px 0 20px 0;
      border-radius: 4px;
    }
    
    .bandeau-titre .ref {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .bandeau-titre .objet {
      font-size: 11pt;
      font-weight: normal;
    }
    
    /* ═══ BLOCS INFO ═══ */
    .blocs-container {
      display: flex;
      gap: 15px;
      margin-bottom: 25px;
    }
    
    .bloc-info {
      flex: 1;
      border: 2px solid #c8d4e8;
      border-radius: 4px;
      padding: 12px 15px;
    }
    
    .bloc-info .titre {
      background: #1a3a6b;
      color: white;
      font-size: 10pt;
      font-weight: bold;
      padding: 6px 12px;
      margin: -12px -15px 12px -15px;
      border-radius: 2px 2px 0 0;
    }
    
    .bloc-info .ligne {
      display: flex;
      margin-bottom: 6px;
      font-size: 10pt;
    }
    
    .bloc-info .label {
      font-weight: bold;
      min-width: 110px;
      color: #1a3a6b;
    }
    
    .bloc-info .valeur {
      flex: 1;
      color: #333;
    }
    
    /* ═══ SECTIONS ═══ */
    .section {
      margin-bottom: 25px;
    }
    
    .section-titre {
      font-size: 12pt;
      font-weight: bold;
      color: #1a3a6b;
      border-bottom: 2px solid #1a3a6b;
      padding-bottom: 5px;
      margin-bottom: 12px;
    }
    
    /* ═══ TABLEAU ═══ */
    .table-container {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }
    
    .table-container th {
      background: #1a3a6b;
      color: white;
      font-size: 9pt;
      font-weight: bold;
      padding: 8px 6px;
      text-align: center;
      border: 1px solid #1a3a6b;
    }
    
    .table-container th.col-designation {
      text-align: left;
      width: 45%;
    }
    
    .table-container th.col-dn {
      width: 12%;
    }
    
    .table-container th.col-qte,
    .table-container th.col-pu,
    .table-container th.col-montant {
      width: 14%;
    }
    
    .table-container td {
      padding: 6px;
      border: 1px solid #c8d4e8;
      font-size: 10pt;
    }
    
    .table-container td.col-designation {
      text-align: left;
    }
    
    .table-container td.col-dn,
    .table-container td.col-qte,
    .table-container td.col-pu,
    .table-container td.col-montant {
      text-align: center;
    }
    
    .table-container td.col-pu,
    .table-container td.col-montant {
      text-align: right;
    }
    
    .bg-white {
      background: white;
    }
    
    .bg-alterne {
      background: #f0f4f9;
    }
    
    /* ═══ TOTAUX ═══ */
    .totaux-container {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0;
    }
    
    .totaux-container td {
      padding: 8px 12px;
      font-size: 10pt;
      font-weight: bold;
      border: 1px solid #c8d4e8;
    }
    
    .ligne-ht {
      background: #dce6f1;
      color: #1a3a6b;
    }
    
    .ligne-tva {
      background: #dce6f1;
      color: #1a3a6b;
    }
    
    .ligne-ttc {
      background: #1a3a6b;
      color: white;
    }
    
    .totaux-container .libelle {
      text-align: right;
      width: 71%;
    }
    
    .totaux-container .montant {
      text-align: right;
      width: 29%;
    }
    
    /* ═══ VALIDITÉ ═══ */
    .validite-texte {
      font-size: 10pt;
      text-align: justify;
      margin-bottom: 20px;
      line-height: 1.5;
      padding: 10px;
      background: #f8fafc;
      border-left: 3px solid #1a3a6b;
    }
    
    /* ═══ SIGNATURES ═══ */
    .signatures-container {
      display: flex;
      gap: 30px;
      margin-top: 20px;
    }
    
    .signature-box {
      flex: 1;
      border: 2px solid #1a3a6b;
      height: 90px;
      border-radius: 4px;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    
    .signature-label {
      text-align: center;
      font-size: 9pt;
      font-weight: bold;
      color: #1a3a6b;
      padding: 5px;
      background: rgba(26, 58, 107, 0.05);
      border-top: 1px solid #1a3a6b;
    }
    
    /* ═══ PRINT ═══ */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .page {
        width: 210mm;
        padding: 8mm 10mm;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- BANDEAU TITRE -->
    <div class="bandeau-titre">
      <div class="ref">DEVIS N° ${reference || '—'}</div>
      <div class="objet">${objet || ''}</div>
    </div>
    
    <!-- BLOCS INFO -->
    <div class="blocs-container">
      <!-- BLOC CLIENT -->
      <div class="bloc-info">
        <div class="titre">CLIENT</div>
        <div class="ligne">
          <span class="label">Entreprise :</span>
          <span class="valeur">${client.nom || client.entreprise || '—'}</span>
        </div>
        <div class="ligne">
          <span class="label">Interlocuteur :</span>
          <span class="valeur">${client.interlocuteur || client.contact || '—'}</span>
        </div>
        <div class="ligne">
          <span class="label">Site :</span>
          <span class="valeur">${client.site || client.adresse || '—'}</span>
        </div>
      </div>
      
      <!-- BLOC INFORMATIONS -->
      <div class="bloc-info">
        <div class="titre">INFORMATIONS DU DEVIS</div>
        <div class="ligne">
          <span class="label">Référence :</span>
          <span class="valeur">${reference || '—'}</span>
        </div>
        <div class="ligne">
          <span class="label">Date :</span>
          <span class="valeur">${formatDate(infos.date)}</span>
        </div>
        <div class="ligne">
          <span class="label">Validité :</span>
          <span class="valeur">${infos.validite || '30 jours'}</span>
        </div>
        <div class="ligne">
          <span class="label">Établi par :</span>
          <span class="valeur">${infos.etabliPar || '—'}</span>
        </div>
        <div class="ligne">
          <span class="label">Tél :</span>
          <span class="valeur">${infos.tel || '—'}</span>
        </div>
      </div>
    </div>
    
    <!-- SECTION I: DÉTAIL DU DEVIS -->
    <div class="section">
      <div class="section-titre">I. DÉTAIL DU DEVIS</div>
      
      <table class="table-container">
        <thead>
          <tr>
            <th class="col-designation">DÉSIGNATION</th>
            <th class="col-dn">DN</th>
            <th class="col-qte">QTÉ</th>
            <th class="col-pu">PRIX UNITAIRE (FCFA)</th>
            <th class="col-montant">MONTANT (FCFA)</th>
          </tr>
        </thead>
        <tbody>
          ${lignesHTML || `
            <tr class="bg-white">
              <td colspan="5" style="text-align: center; color: #999; padding: 20px;">
                Aucune ligne dans ce devis
              </td>
            </tr>
          `}
        </tbody>
      </table>
      
      <!-- TOTAUX -->
      <table class="totaux-container">
        <tr class="ligne-ht">
          <td class="libelle">MONTANT HT</td>
          <td class="montant">${formatMontant(montantHT)} FCFA</td>
        </tr>
        <tr class="ligne-tva">
          <td class="libelle">TVA 18%</td>
          <td class="montant">${formatMontant(tva)} FCFA</td>
        </tr>
        <tr class="ligne-ttc">
          <td class="libelle">MONTANT TOTAL TTC</td>
          <td class="montant">${formatMontant(ttc)} FCFA</td>
        </tr>
      </table>
    </div>
    
    <!-- SECTION II: VALIDITÉ ET SIGNATURES -->
    <div class="section">
      <div class="section-titre">II. VALIDITÉ ET SIGNATURES</div>
      
      <div class="validite-texte">
        Ce devis est valable trente (30) jours à compter de sa date d'émission. 
        Pour toute acceptation, veuillez retourner ce document signé et revêtu de votre 
        cachet officiel, accompagné du versement de l'acompte de commande.
      </div>
      
      <div class="signatures-container">
        <div class="signature-box">
          <div class="signature-label">Signature du Client et cachet</div>
        </div>
        <div class="signature-box">
          <div class="signature-label">Signature du Gérant — SIKA INDUSTRIE</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Génère un objet de données devis à partir des données existantes du store
 * pour n'importe quel type de devis
 */
export function prepareDevisData(devisData, clients, utilisateur = {}) {
  const client = clients.find(c => c.id === devisData.clientId) || {};
  
  // Normaliser les lignes selon le type de devis
  let lignes = [];
  if (devisData.lignes && Array.isArray(devisData.lignes)) {
    lignes = devisData.lignes.map(l => ({
      designation: l.designation || '',
      dn: l.dn || l.unite || '',
      qte: parseFloat(l.qte) || 0,
      pu: parseFloat(l.pu) || 0,
      montant: parseFloat(l.montant) || (parseFloat(l.qte) * parseFloat(l.pu)) || 0
    }));
  } else if (devisData.lignesCommerciales && Array.isArray(devisData.lignesCommerciales)) {
    lignes = devisData.lignesCommerciales.map(l => ({
      designation: l.designation || '',
      dn: l.unite || 'U',
      qte: parseFloat(l.qte) || 0,
      pu: parseFloat(l.pu) || 0,
      montant: parseFloat(l.qte) * parseFloat(l.pu) || 0
    }));
  }

  // Calculer les totaux
  const montantHT = parseFloat(devisData.montantHT) || 
    lignes.reduce((sum, l) => sum + (l.montant || 0), 0);
  const tvaActive = devisData.tvaActive !== false;
  const tva = tvaActive ? montantHT * 0.18 : 0;
  const ttc = montantHT + tva;

  return {
    reference: devisData.numero,
    objet: devisData.objet || `Devis ${devisData.type || ''}`,
    type: devisData.type,
    client: {
      nom: client.nom || client.entreprise,
      interlocuteur: client.contactNom || client.interlocuteur || devisData.demandePar,
      site: client.ville || client.site || client.adresse
    },
    infos: {
      date: devisData.date,
      validite: '30 jours',
      etabliPar: utilisateur.nom || utilisateur.prenomNom || 'SIKA INDUSTRIE',
      tel: utilisateur.telephone || '(225) 07 97 25 25 26'
    },
    lignes,
    montantHT,
    tva,
    ttc
  };
}

export default { generateDevisHTML, prepareDevisData };
