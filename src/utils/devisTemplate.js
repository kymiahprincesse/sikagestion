// ═══════════════════════════════════════════════════════════════
// SIKA INDUSTRIE — TEMPLATE HTML UNIFIÉ POUR TOUS LES DEVIS
// ═══════════════════════════════════════════════════════════════
import { useClientsStore } from '../store/useClientsStore';
import { useAuthStore } from '../store/useAuthStore';
import { useParametresStore } from '../store/useParametresStore';
import { useUtilisateursStore } from '../store/useUtilisateursStore';

/**
 * Génère le HTML complet d'un devis prêt à imprimer sur A4
 * Entête et pied de page SIKA images, signatures doubles, spécifications par type
 *
 * @param {Object} data
 * @param {string} data.reference      - Numéro de référence
 * @param {string} data.objet          - Objet du devis
 * @param {string} data.type           - Type (CALORIFUGE, PLIAGE, etc.)
 * @param {Object} data.client         - { nom, interlocuteur, site, adresse, telephone }
 * @param {Object} data.infos          - { date, validite, etabliPar, tel, demandePar }
 * @param {Array}  data.lignes         - [{ designation, dn, qte, pu, montant, ...specs }]
 * @param {Object} data.specifications - Spécifications techniques (optionnel)
 * @param {string} data.notes          - Notes / observations (optionnel)
 * @param {string} data.statut         - Statut du devis (BROUILLON, VALIDE, etc.)
 * @param {number} data.montantBrut
 * @param {number} data.remise
 * @param {number} data.montantHT
 * @param {number} data.tva
 * @param {number} data.ttc
 * @returns {string} HTML complet
 */
export function generateDevisHTML(data, baseUrl = '') {
  let {
    reference = '',
    objet = '',
    type = '',
    client = {},
    infos = {},
    lignes = [],
    specifications = null,
    notes = '',
    montantHT = 0,
    tva = 0,
    ttc = 0,
    remise = 0,
    montantBrut = 0
  } = data;

  let companyName = 'SIKA INDUSTRIE';
  let companyTel = '(225) 07 97 25 25 26';

  // Enrichissement automatique du client et de l'utilisateur depuis les stores
  try {
    const params = useParametresStore.getState();
    if (params) {
      companyName = params.nomEntreprise || companyName;
      companyTel = params.telephoneEntreprise || companyTel;
    }

    const clients = useClientsStore.getState().clients;
    const user = useAuthStore.getState().utilisateurConnecte;
    
    // Rechercher le client pour récupérer ses informations enregistrées complètes
    const dbClient = clients.find(c => c.nom === client.nom || c.id === client.id || c.id === data.clientId);
    if (dbClient) {
      client = {
        ...dbClient,
        ...client,
        telephone: client.telephone || dbClient.contactTelephone || dbClient.telephone || '',
        email: client.email || dbClient.contactEmail || dbClient.email || '',
        adresse: client.adresse || dbClient.adresse || '',
        ville: client.ville || dbClient.ville || '',
        pays: client.pays || dbClient.pays || 'Côte d\'Ivoire',
        raisonSociale: client.raisonSociale || dbClient.raisonSociale || ''
      };
    }

    const usersList = useUtilisateursStore.getState().utilisateurs || [];

    // Récupérer le nom de la personne connectée (qui édite le devis) si générique
    if (!infos.etabliPar || infos.etabliPar === 'SIKA INDUSTRIE' || infos.etabliPar === 'Utilisateur') {
      if (user) {
        infos.etabliPar = user.nom || companyName;
        infos.tel = user.telephone || companyTel;
      } else {
        infos.etabliPar = companyName;
        infos.tel = companyTel;
      }
    }

    // Récupérer les informations de contact à jour de l'utilisateur ayant établi le devis
    if (infos.etabliPar && infos.etabliPar !== 'SIKA INDUSTRIE' && infos.etabliPar !== 'Utilisateur') {
      const existingUser = usersList.find(u => 
        (u.nom && u.nom.toLowerCase() === infos.etabliPar.toLowerCase()) ||
        (u.login && u.login.toLowerCase() === infos.etabliPar.toLowerCase()) ||
        (u.prenomNom && u.prenomNom.toLowerCase() === infos.etabliPar.toLowerCase())
      );
      if (existingUser && existingUser.telephone) {
        // L'utilisateur existe et a un numéro, on force son numéro de téléphone
        infos.tel = existingUser.telephone;
      } else if (user && user.telephone && (user.nom === infos.etabliPar || user.prenomNom === infos.etabliPar)) {
        infos.tel = user.telephone;
      }
      
      // Override final pour Mme KOUASSI selon la requête
      if (infos.etabliPar.toLowerCase().includes('kouassi')) {
        infos.tel = '07 79 26 38 70';
      }
    }
  } catch {
    if (infos.etabliPar && infos.etabliPar.toLowerCase().includes('kouassi')) {
      infos.tel = '07 79 26 38 70';
    }
  }

  const fmt = (val) => {
    if (!val && val !== 0) return '0';
    return new Intl.NumberFormat('fr-FR').format(Math.round(val));
  };

  const fmtDate = (date) => {
    if (!date) return new Date().toLocaleDateString('fr-FR');
    try { return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
    catch { return date; }
  };

  const formattedRef = reference && (reference.startsWith('N°') || reference.startsWith('n°')) ? reference : `N° ${reference}`;

  const draftWatermark = '';

  let specsHTML = '';
  if (specifications && Object.keys(specifications).length > 0 && (!type || type.toUpperCase() !== 'PLIAGE')) {
    const items = Object.entries(specifications)
      .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 0)
      .map(([k, v]) => {
        const labels = {
          typeTole: 'Type de tôle', epaisseur: 'Épaisseur', nombrePlis: 'Nb plis',
          unitePrix: 'Unité de prix', typeTuyau: 'Type tuyau', pression: 'Pression',
          typeSoudure: 'Type soudure', materiau: 'Matériau', forme: 'Forme',
          volume: 'Volume', typeAcier: 'Type acier', portee: 'Portée',
          hauteur: 'Hauteur', typeCharpente: 'Type charpente'
        };
        return `<td style="padding:8px 14px;border-right:1px solid #dde;vertical-align:top;">
          <div style="font-size:8pt;color:#1A3A8F;font-weight:bold;text-transform:uppercase;margin-bottom:3px;">${labels[k] || k}</div>
          <div style="font-size:12pt;font-weight:bold;color:#1A3A8F;">${v}${k === 'epaisseur' ? ' mm' : ''}</div>
        </td>`;
      }).join('');
    if (items) {
      specsHTML = `
      <table width="100%" style="margin-bottom:10px;border:1px solid #1A3A8F;">
        <tr><td colspan="99" class="section-title">Spécifications techniques</td></tr>
        <tr style="background:#f8f9ff;">${items}</tr>
      </table>`;
    }
  }

  const isCalorifuge = type && type.toUpperCase() === 'CALORIFUGE';
  const hasMlOrPt = isCalorifuge || lignes.some(l => 
    (l.ml !== undefined && l.ml !== null && l.ml !== '' && parseFloat(l.ml) > 0) || 
    (l.pt !== undefined && l.pt !== null && l.pt !== '' && parseFloat(l.pt) > 0)
  );

  const lignesHTML = lignes.length > 0 ? lignes.map((ligne, i) => {
    let desig = ligne.designation || '—';
    const details = [];
    if (ligne.typeTravail) details.push(ligne.typeTravail);
    if (ligne.materiau) details.push(ligne.materiau);
    if (ligne.typeTole) details.push(ligne.typeTole);
    if (ligne.epaisseur) details.push(`Ép. ${ligne.epaisseur}mm`);
    if (ligne.typeTuyau) details.push(ligne.typeTuyau);
    if (ligne.pression) details.push(ligne.pression);
    if (ligne.longueur && ligne.longueur > 0) details.push(`L: ${ligne.longueur}m`);
    if (ligne.surface && ligne.surface > 0) details.push(`${ligne.surface}m²`);
    
    if (!hasMlOrPt) {
      const mlPtParts = [];
      if (ligne.ml && parseFloat(ligne.ml) > 0) mlPtParts.push(`ML: ${ligne.ml}`);
      if (ligne.pt && parseFloat(ligne.pt) > 0) mlPtParts.push(`PT: ${ligne.pt}`);
      if (mlPtParts.length > 0) {
        desig += ` (${mlPtParts.join(' · ')})`;
      }
    }

    if (details.length > 0) {
      desig += `<br><span style="font-size:8pt;color:#555;font-style:italic;padding-left:4px;border-left:2px solid #1A3A8F;">${details.join(' · ')}</span>`;
    }
    const bg = i % 2 === 0 ? '#ffffff' : '#f7f7f7';
    const montant = ligne.montant || (ligne.qte * ligne.pu) || 0;

    if (hasMlOrPt) {
      const valMl = (ligne.ml !== undefined && ligne.ml !== null && ligne.ml !== '') ? ligne.ml : '—';
      const valPt = (ligne.pt !== undefined && ligne.pt !== null && ligne.pt !== '') ? ligne.pt : '—';
      return `<tr style="background:${bg};">
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:9pt;text-align:center;color:#555;width:24px;">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;">${desig}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;text-align:center;font-weight:bold;color:#444;width:40px;">${valMl}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;text-align:center;font-weight:bold;color:#444;width:40px;">${valPt}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;text-align:center;font-weight:bold;color:#1A3A8F;width:45px;">${fmt(ligne.qte || 0)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;text-align:right;width:95px;">${fmt(ligne.pu || 0)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;text-align:right;font-weight:bold;color:#1A3A8F;width:105px;">${fmt(montant)}</td>
      </tr>`;
    } else {
      return `<tr style="background:${bg};">
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:9pt;text-align:center;color:#555;width:24px;">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;">${desig}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;text-align:center;font-weight:bold;color:#1A3A8F;width:45px;">${fmt(ligne.qte || 0)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;text-align:right;width:95px;">${fmt(ligne.pu || 0)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;text-align:right;font-weight:bold;color:#1A3A8F;width:105px;">${fmt(montant)}</td>
      </tr>`;
    }
  }).join('') : `<tr><td colspan="${hasMlOrPt ? 7 : 5}" style="text-align:center;color:#999;padding:20px;font-size:10pt;">Aucune ligne</td></tr>`;

  const tableHeaderHTML = hasMlOrPt ? `
      <tr style="background:#1A3A8F;color:white;">
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9pt;width:24px;text-align:center;">N°</th>
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9.5pt;text-align:left;">DÉSIGNATION</th>
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9pt;width:40px;text-align:center;">ML</th>
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9pt;width:40px;text-align:center;">PT</th>
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9pt;width:45px;text-align:center;">QTÉ</th>
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9pt;width:95px;text-align:right;">P.U. (FCFA)</th>
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9pt;width:105px;text-align:right;">MONTANT (FCFA)</th>
      </tr>` : `
      <tr style="background:#1A3A8F;color:white;">
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9pt;width:24px;text-align:center;">N°</th>
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9.5pt;text-align:left;">DÉSIGNATION</th>
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9pt;width:45px;text-align:center;">QTÉ</th>
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9pt;width:95px;text-align:right;">P.U. (FCFA)</th>
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9pt;width:105px;text-align:right;">MONTANT (FCFA)</th>
      </tr>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DEVIS ${reference}</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      color: #222;
      background: #fff;
      width: 100%;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    .page {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      background: #fff;
      position: relative;
    }
    @media screen {
      html, body { background: #b0b0b0; min-height: 100vh; padding: 24px 0; overflow-x: auto; }
      .page {
        background: #fff;
        box-shadow: 0 6px 32px rgba(0,0,0,0.28);
        width: 794px !important;
        min-height: 1123px !important;
        padding: 45px 56px 105px 56px !important;
        margin: 0 auto;
        position: relative;
        flex-shrink: 0;
        box-sizing: border-box;
      }
      .page-footer {
        position: absolute;
        bottom: 35px;
        left: 56px;
        right: 56px;
        width: calc(100% - 112px);
      }
      .no-print-bar {
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        background: #1A3A8F;
        padding: 10px 20px;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 15px;
        color: white;
        font-family: sans-serif;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        margin-bottom: 20px;
      }
      .no-print-bar button {
        background: #fff;
        border: none;
        padding: 8px 16px;
        cursor: pointer;
        font-weight: bold;
        border-radius: 4px;
      }
      .no-print-bar button.btn-blue { color: #1A3A8F; }
      .no-print-bar button.btn-green { background: #10b981; color: white; }
      .no-print-bar button.btn-red { background: #ef4444; color: white; }
    }
    @media print {
      html, body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
      .page { box-shadow: none !important; padding: 0 !important; max-width: 100% !important; }
      .no-print-bar { display: none !important; }
      .page-footer { position: fixed; bottom: 0 !important; left: 15mm !important; right: 15mm !important; width: calc(100% - 30mm) !important; z-index: 9999; }
    }
    table { border-collapse: collapse; width: 100%; }
    .section-title {
      background: #1A3A8F !important;
      color: white !important;
      font-size: 9pt;
      font-weight: bold;
      padding: 5px 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 10px;
    }
    .footer-img { width: 100%; max-width: 100%; display: block; }
    .header-img { width: 100%; max-width: 100%; display: block; margin-bottom: 0; }
    .signature-bg {
      text-align: right;
      padding-right: 10mm;
      margin-top: 5px;
      margin-bottom: 5px;
      transform: rotate(-2deg);
    }
    .signature-img { max-width: 100%; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</head>
<body>
  <div class="no-print-bar">
    <button class="btn-blue" onclick="window.print()">🖨️ Imprimer</button>
    <button class="btn-green" onclick="telechargerPDF()">📥 Télécharger PDF</button>
    <button id="btn-sig" class="btn-red" onclick="toggleSignature()">❌ Masquer la signature</button>
    <span style="margin-left:auto;font-size:9pt;opacity:0.8;">DEVIS ${reference} &mdash; ${type || 'SIKA INDUSTRIE'}</span>
  </div>

<div class="page">
  <img class="header-img" src="${baseUrl}/entete-sika.png" alt="SIKA INDUSTRIE" onerror="this.style.display='none'"/>
  <div style="background: #1A3A8F; color: white; margin-bottom: 12px; border-radius: 4px; border-left: 6px solid #E30613; padding: 8px 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="font-size: 16pt; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
      DEVIS ${formattedRef}
    </div>
  </div>
  <table width="100%" style="margin-bottom:10px;border:1px solid #e2e8f0;">
    <tr>
      <td width="52%" style="vertical-align:top;border-right:1px solid #e2e8f0;">
        <div class="section-title">Client</div>
        <table width="100%" style="padding:6px 8px;">
          <tr><td style="padding:3px 8px;font-size:12pt;font-weight:bold;color:#1A3A8F;">${client.nom || client.entreprise || '—'}</td></tr>
          ${client.raisonSociale && client.raisonSociale !== client.nom ? `<tr><td style="padding:1px 8px;font-size:8pt;color:#666;">${client.raisonSociale}</td></tr>` : ''}
          ${client.secteur ? `<tr><td style="padding:1px 8px;font-size:8pt;color:#888;">Secteur : <b>${client.secteur}</b></td></tr>` : ''}
          ${client.adresse || client.site || client.ville ? `<tr><td style="padding:2px 8px;font-size:8pt;color:#444;">&#128205; ${[client.adresse || client.site, client.ville, client.pays].filter(Boolean).join(', ')}</td></tr>` : ''}
          ${client.interlocuteur ? `<tr><td style="padding:2px 8px;font-size:8.5pt;color:#444;">&#128100; Contact : <b>${client.interlocuteur}</b></td></tr>` : ''}
          ${infos.demandePar ? `<tr><td style="padding:2px 8px;font-size:8.5pt;color:#444;">&#128100; À la demande de : <b>${infos.demandePar}</b></td></tr>` : ''}
          ${client.telephone ? `<tr><td style="padding:1px 8px;font-size:8pt;color:#444;">&#128222; ${client.telephone}</td></tr>` : ''}
          ${client.email ? `<tr><td style="padding:1px 8px;font-size:8pt;color:#444;">&#9993; ${client.email}</td></tr>` : ''}
        </table>
      </td>
      <td width="48%" style="vertical-align:top;">
        <div class="section-title">Informations du devis</div>
        <table width="100%" style="padding:6px 8px;">
          <tr><td style="padding:2px 8px;font-size:9pt;"><b style="color:#1A3A8F;display:inline-block;width:95px;">R&#233;f&#233;rence :</b> <b>${reference}</b></td></tr>
          <tr><td style="padding:2px 8px;font-size:9pt;"><b style="color:#1A3A8F;display:inline-block;width:95px;">Date :</b> ${fmtDate(infos.date)}</td></tr>
          <tr><td style="padding:2px 8px;font-size:9pt;"><b style="color:#1A3A8F;display:inline-block;width:95px;">Validit&#233; :</b> ${infos.validite || '30 jours'}</td></tr>
          <tr><td style="padding:2px 8px;font-size:9pt;"><b style="color:#1A3A8F;display:inline-block;width:95px;">&#201;tabli par :</b> ${infos.etabliPar || 'SIKA INDUSTRIE'}</td></tr>
          <tr><td style="padding:2px 8px;font-size:9pt;"><b style="color:#1A3A8F;display:inline-block;width:95px;">T&#233;l :</b> ${infos.tel || '(225) 07 97 25 25 26'}</td></tr>
        </table>
      </td>
    </tr>
  </table>
  <table width="100%" style="margin-bottom:10px;border-left:4px solid #1A3A8F;background:#f0f4ff;">
    <tr><td style="padding:4px 10px;font-size:8pt;font-weight:bold;color:#1A3A8F;text-transform:uppercase;letter-spacing:1px;">Objet du devis</td></tr>
    <tr><td style="padding:4px 10px 8px;font-size:10pt;color:#222;font-weight:bold;">${objet || '____________________________________________________________________________________'}</td></tr>
  </table>
  ${specsHTML}
  <table width="100%" style="border:1px solid #1A3A8F;margin-bottom:0;">
    <thead>${tableHeaderHTML}</thead>
    <tbody>${lignesHTML}</tbody>
  </table>
  <table width="100%" style="border:1px solid #e2e8f0;border-top:none;margin-bottom:10px;">
    ${montantBrut > 0 && remise > 0 ? `
    <tr style="background:#ffffff;">
      <td style="padding:5px 12px;border:1px solid #e2e8f0;font-size:9pt;color:#555;">Remise commerciale accord&#233;e</td>
      <td style="padding:5px 12px;border:1px solid #e2e8f0;font-size:9pt;font-weight:bold;text-align:right;color:#555;">&#8722; ${fmt(remise)} FCFA</td>
    </tr>` : ''}
    <tr style="background:#E8ECF4;">
      <td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:9pt;font-weight:bold;color:#1A3A8F;">Montant Hors Taxes (HT)</td>
      <td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:9pt;font-weight:bold;text-align:right;color:#1A3A8F;">${fmt(montantHT)} FCFA</td>
    </tr>
    ${tva > 0 ? `
    <tr style="background:#ffffff;">
      <td style="padding:5px 12px;border:1px solid #e2e8f0;font-size:9pt;color:#555;">TVA 18%</td>
      <td style="padding:5px 12px;border:1px solid #e2e8f0;font-size:9pt;font-weight:bold;text-align:right;color:#E60000;">${fmt(tva)} FCFA</td>
    </tr>` : ''}
    <tr style="background:#1A3A8F;color:white;">
      <td style="padding:8px 12px;border:1px solid #1A3A8F;font-size:11pt;font-weight:bold;">MONTANT TOTAL (TTC)</td>
      <td style="padding:8px 12px;border:1px solid #1A3A8F;font-size:12pt;font-weight:bold;text-align:right;">${fmt(ttc)} FCFA</td>
    </tr>
  </table>
  ${notes ? `
  <table width="100%" style="margin-bottom:10px;border:1px solid #e2e8f0;background:#fafafa;">
    <tr><td style="padding:4px 10px;font-size:8pt;font-weight:bold;color:#1A3A8F;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Notes / Observations</td></tr>
    <tr><td style="padding:6px 10px;font-size:9pt;color:#333;white-space:pre-wrap;">${notes}</td></tr>
  </table>` : ''}
  <div id="signature-box" style="margin-top:10px;">
    <div class="signature-bg">
      <img class="signature-img" src="${baseUrl}/signature-removebg-preview.png" alt="Signature" style="height: 210px; width: auto;" onerror="this.style.display='none'"/>
    </div>
  </div>
  <div class="page-footer" id="page-footer">
    <img class="footer-img" src="${baseUrl}/pied-sika.png" alt="SIKA INDUSTRIE" onerror="this.style.display='none'"/>
  </div>
</div>

<script>
  function telechargerPDF() {
    const element = document.querySelector('.page');
    const btnBar = document.querySelector('.no-print-bar');
    btnBar.style.display = 'none';
    const opt = {
      margin: 0,
      filename: 'Devis_${String(reference).split("/").join("_")}.pdf',
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save().then(() => { btnBar.style.display = 'flex'; });
  }
  function toggleSignature() {
    const sigBox = document.getElementById('signature-box');
    const btn = document.getElementById('btn-sig');
    if (sigBox.style.display === 'none') {
      sigBox.style.display = 'block';
      btn.innerHTML = '❌ Masquer la signature';
      btn.style.background = '#ef4444';
    } else {
      sigBox.style.display = 'none';
      btn.innerHTML = '✅ Afficher la signature';
      btn.style.background = '#10b981';
    }
  }
</script>
</body>
</html>`;
}/**
 * Génère un objet de données devis à partir des données existantes du store
 * pour n'importe quel type de devis
 */
export function prepareDevisData(devisData, clients, utilisateur = {}) {
  const client = clients.find(c => c.id === devisData.clientId) || {};
  
  // Normaliser les lignes selon le type de devis avec tous les détails
  let lignes = [];
  if (devisData.lignes && Array.isArray(devisData.lignes)) {
    lignes = devisData.lignes.map(l => ({
      designation: l.designation || '',
      unite: l.unite || '',
      qte: parseFloat(l.qte) || 0,
      pu: parseFloat(l.pu) || 0,
      montant: parseFloat(l.montant) || (parseFloat(l.qte) * parseFloat(l.pu)) || 0,
      // Détails spécifiques par type de devis
      typeTravail: l.typeTravail || '',
      materiau: l.materiau || '',
      typeTole: l.typeTole || '',
      epaisseur: l.epaisseur || 0,
      typeTuyau: l.typeTuyau || '',
      pression: l.pression || '',
      longueur: l.longueur || 0,
      ml: l.ml || 0,
      pt: l.pt || 0,
      surface: l.surface || l.dimension || 0
    }));
  } else if (devisData.lignesCommerciales && Array.isArray(devisData.lignesCommerciales)) {
    lignes = devisData.lignesCommerciales.map(l => ({
      designation: l.designation || '',
      unite: l.unite || '—',
      qte: parseFloat(l.qte) || 0,
      pu: parseFloat(l.pu) || 0,
      montant: parseFloat(l.qte) * parseFloat(l.pu) || 0,
      // Détails supplémentaires si présents
      typeTravail: l.typeTravail || '',
      materiau: l.materiau || '',
      epaisseur: l.epaisseur || 0,
      longueur: l.longueur || 0,
      surface: l.surface || 0
    }));
  }

  // Calculer les totaux
  const montantBrut = parseFloat(devisData.montantBrut) || 
    lignes.reduce((sum, l) => sum + (l.montant || 0), 0);
  const tauxRemise = parseFloat(devisData.tauxRemise) || 0;
  const remise = parseFloat(devisData.remise) || (montantBrut * (tauxRemise / 100));
  const montantHT = parseFloat(devisData.montantHT) || (montantBrut - remise);
  const tvaActive = devisData.tvaActive !== false;
  
  const savedTva = devisData.montantTVA !== undefined ? devisData.montantTVA : devisData.tva;
  const tva = (savedTva !== undefined && savedTva !== null && savedTva !== '' && !isNaN(savedTva))
    ? parseFloat(savedTva)
    : (tvaActive ? montantHT * 0.18 : 0);

  const savedTtc = devisData.montantTTC !== undefined ? devisData.montantTTC : devisData.ttc;
  const ttc = (savedTtc !== undefined && savedTtc !== null && savedTtc !== '' && !isNaN(savedTtc))
    ? parseFloat(savedTtc)
    : (montantHT + tva);

  return {
    reference: devisData.numero,
    objet: devisData.objet || `Devis ${devisData.type || ''}`,
    type: devisData.type,
    notes: devisData.notes || '',
    statut: devisData.statut || 'BROUILLON',
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
    montantBrut,
    remise,
    montantHT,
    tva,
    ttc
  };
}

/**
 * Ouvre et imprime un devis HTML via blob URL — fiable dans tous les navigateurs
 * Pas de problème de popup, pas de chemin relatif cassé
 */
export function printDevisHTML(data) {
  const baseUrl = window.location.origin;
  const html = generateDevisHTML(data, baseUrl);
  
  // Ouvrir dans une nouvelle fenêtre vide (sans URL blob) pour éviter d'afficher le lien blob:https://...
  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  } else {
    // Fallback si popup bloqué : iframe temporaire
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;z-index:-9999;';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error("Erreur lors de l'impression :", err);
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 3000);
    }, 1000);
  }
}

export default {
  generateDevisHTML,
  prepareDevisData,
  printDevisHTML
};
