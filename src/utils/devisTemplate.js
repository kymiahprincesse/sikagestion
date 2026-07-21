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
        (u.login && u.login.toLowerCase() === infos.etabliPar.toLowerCase())
      );
      if (existingUser) {
        // L'utilisateur existe, on met à jour son numéro de téléphone en temps réel
        infos.tel = existingUser.telephone || companyTel;
      } else {
        // L'utilisateur n'existe pas (supprimé ou autre), on repasse sur le numéro de l'entreprise
        infos.tel = companyTel;
      }
    }
  } catch {
    // Silencieusement ignoré hors du contexte React (ex: tests unitaires)
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

  // ── Badge couleur par type ──
  const typeBadge = type ? `<span style="display:inline-block;border:1.5px solid #1A3A8F;color:#1A3A8F;font-size:8.5pt;font-weight:bold;padding:2px 12px;border-radius:20px;letter-spacing:1px;text-transform:uppercase;background:transparent;">${type}</span>` : '';

  // ── Badge statut ── (Désactivé à la demande pour l'impression)
  const statutBadge = '';

  const formattedRef = reference && (reference.startsWith('N°') || reference.startsWith('n°')) ? reference : `N° ${reference}`;

  // ── Watermark brouillon ── (Désactivé à la demande pour l'impression)
  const draftWatermark = '';

  // ── Spécifications techniques (bloc gris) ──
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

  // ── Lignes du tableau ──
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
    
    // We no longer append ML and PT inline if they have their own columns
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
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:9pt;text-align:center;width:40px;">${ligne.unite || '—'}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;text-align:center;font-weight:bold;color:#1A3A8F;width:45px;">${fmt(ligne.qte || 0)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;text-align:right;width:95px;">${fmt(ligne.pu || 0)}</td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10pt;text-align:right;font-weight:bold;color:#1A3A8F;width:105px;">${fmt(montant)}</td>
      </tr>`;
    }
  }).join('') : `<tr><td colspan="${hasMlOrPt ? 7 : 6}" style="text-align:center;color:#999;padding:20px;font-size:10pt;">Aucune ligne</td></tr>`;

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
        <th style="padding:6px 8px;border:1px solid #1A3A8F;font-size:9pt;width:40px;text-align:center;">U</th>
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
    /* ── Reset ── */
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    /* ── Forcer couleurs impression ── */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    /* ── Body ── */
    html, body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      color: #222;
      background: #fff;
      width: 100%;
    }

    /* ── Page A4 ── */
    @page {
      size: A4 portrait;
      margin: 10mm 10mm 10mm 10mm;
    }

    /* ── Conteneur ── */
    .page {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      background: #fff;
    }

    /* ── Aperçu écran : feuille blanche sur fond gris ── */
    @media screen {
      html, body { background: #b0b0b0; min-height: 100vh; padding: 24px 0; }
      .page {
        background: #fff;
        box-shadow: 0 6px 32px rgba(0,0,0,0.28);
        padding: 10mm 10mm 10mm 10mm;
        margin: 0 auto;
      }
      .no-print-bar {
        position: sticky;
        top: 0;
        z-index: 999;
        background: #1A3A8F;
        color: white;
        padding: 10px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
    }

    /* ── Impression ── */
    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm 15mm 28mm 15mm;
      }
      html, body {
        background: #fff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .page {
        box-shadow: none !important;
        padding: 0 !important; /* Marges gérées proprement par @page */
        max-width: 100% !important;
      }
      .no-print-bar { display: none !important; }
      
      .page-footer {
        display: block !important;
        position: fixed;
        bottom: 0 !important; /* Position fixée au bord inférieur (gérée avec @page margin) */
        left: 15mm !important;  /* Aligné avec les marges gauche/droite */
        right: 15mm !important;
        width: calc(100% - 30mm) !important;
        background: #fff;
        z-index: 9999;
      }
    }

    /* ── Tables ── */
    table { border-collapse: collapse; width: 100%; }

    /* ── Titres de section ── */
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

    /* ── Espace signature ── */
    .sig-space { height: 55px; border-bottom: 2px solid #1A3A8F; }

    /* ── Sauts de page propres ── */
    tr { page-break-inside: avoid; break-inside: avoid; }
    thead { display: table-header-group; }

    /* ── Watermark brouillon ── */
    .draft-watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      z-index: 1000;
      color: #dc3545;
      font-size: 60pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 8px;
      opacity: 0.14;
      pointer-events: none;
      text-align: center;
      white-space: nowrap;
      border: 6px solid #dc3545;
      padding: 20px 50px;
      border-radius: 20px;
    }

    /* ── Numéros de page ── */
    .page-number::after { content: counter(page); }
    .page-number-total::after { content: counter(pages); }

    /* ── Pied de page (Écran & Impression) ── */
    .page-footer {
      width: 100%;
      margin-top: 30px;
    }
    

    
    .footer-img {
      width: 100%;
      display: block;
    }

    /* ── Image entête ── */
    .header-img { width: 100%; display: block; margin-bottom: 0; }
  </style>
</head>
<body>

  <!-- ══ BARRE BOUTON (écran seulement) ══ -->
  <div class="no-print-bar">
    <button onclick="window.print()" style="background:#1A3A8F;color:white;border:none;padding:8px 28px;font-size:10pt;font-weight:bold;border-radius:5px;cursor:pointer;">
      &#128424; Imprimer / Enregistrer PDF
    </button>
    <span style="font-size:9pt;opacity:0.85;">Raccourci clavier : Ctrl + P</span>
    <span style="margin-left:auto;font-size:9pt;opacity:0.7;">DEVIS ${reference} &mdash; ${type || 'SIKA INDUSTRIE'}</span>
  </div>

${draftWatermark}

<div class="page">
  <table style="width: 100%; border: none; margin: 0; padding: 0;">
    <thead><tr><td style="border: none; height: 0;"></td></tr></thead>
    <tbody><tr><td style="border: none; padding: 0;">
  <!-- ══ ENTÊTE IMAGE SIKA — page 1 uniquement ══ -->
  <img class="header-img" src="${baseUrl}/entete-sika.png" alt="SIKA INDUSTRIE" onerror="this.style.display='none'"/>

  <!-- ══ BANDEAU DEVIS ══ -->
  <table width="100%" style="background:#1A3A8F;color:white;margin-bottom:10px;">
    <tr>
      <td width="30%" style="padding:8px 14px;font-size:20pt;font-weight:bold;letter-spacing:2px;vertical-align:middle;">DEVIS</td>
      <td width="40%" style="padding:8px 14px;font-size:16pt;font-weight:bold;text-align:center;letter-spacing:1px;vertical-align:middle;white-space:nowrap;">
        ${formattedRef}
      </td>
      <td width="30%" style="padding:8px 14px;text-align:right;font-size:9pt;vertical-align:middle;line-height:1.4;">
        ${typeBadge}${statutBadge}<br/>
        <span style="opacity:0.9;">Abidjan, le ${fmtDate(infos.date)}</span><br/>
        <span style="opacity:0.8;">Validité : ${infos.validite || '30 jours'}</span>
      </td>
    </tr>
  </table>

  <!-- ══ BLOCS CLIENT + INFOS ══ -->
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
          ${infos.demandePar ? `<tr><td style="padding:2px 8px;font-size:9pt;"><b style="color:#1A3A8F;display:inline-block;width:95px;">À la demande de :</b> ${infos.demandePar}</td></tr>` : ''}
        </table>
      </td>
    </tr>
  </table>

  <!-- ══ OBJET ══ -->
  <table width="100%" style="margin-bottom:10px;border-left:4px solid #1A3A8F;background:#f0f4ff;">
    <tr><td style="padding:4px 10px;font-size:8pt;font-weight:bold;color:#1A3A8F;text-transform:uppercase;letter-spacing:1px;">Objet du devis</td></tr>
    <tr><td style="padding:4px 10px 8px;font-size:10pt;color:#222;font-weight:bold;">${objet || '____________________________________________________________________________________'}</td></tr>
  </table>

  <!-- ══ SPÉCIFICATIONS TECHNIQUES ══ -->
  ${specsHTML}

  <!-- ══ TABLEAU DES PRESTATIONS ══ -->
  <table width="100%" style="border:1px solid #1A3A8F;margin-bottom:0;">
    <thead>
      ${tableHeaderHTML}
    </thead>
    <tbody>${lignesHTML}</tbody>
  </table>

  <!-- ══ RÉCAPITULATIF FINANCIER ══ -->
  <table width="100%" style="border:1px solid #e2e8f0;border-top:none;margin-bottom:10px;">
    ${montantBrut > 0 && remise > 0 ? `
    <tr style="background:#ffffff;">
      <td style="padding:5px 12px;border:1px solid #e2e8f0;font-size:9pt;color:#555;">
        Remise commerciale accord&#233;e
      </td>
      <td style="padding:5px 12px;border:1px solid #e2e8f0;font-size:9pt;font-weight:bold;text-align:right;color:#555;">&#8722; ${fmt(remise)} FCFA</td>
    </tr>` : ''}
    <tr style="background:#E8ECF4;">
      <td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:9pt;font-weight:bold;color:#1A3A8F;">
        Montant Hors Taxes (HT) <span style="font-size:8pt;font-weight:normal;color:#666;">&#8212; base imposable</span>
      </td>
      <td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:9pt;font-weight:bold;text-align:right;color:#1A3A8F;">${fmt(montantHT)} FCFA</td>
    </tr>
    ${tva > 0 ? `
    <tr style="background:#ffffff;">
      <td style="padding:5px 12px;border:1px solid #e2e8f0;font-size:9pt;color:#555;">
        TVA appliqu&#233;e &#8212; taux 18% <span style="font-size:8pt;color:#aaa;">(taxe sur la valeur ajout&#233;e)</span>
      </td>
      <td style="padding:5px 12px;border:1px solid #e2e8f0;font-size:9pt;font-weight:bold;text-align:right;color:#555;">${fmt(tva)} FCFA</td>
    </tr>` : ''}
    <tr style="background:#1A3A8F;color:white;">
      <td style="padding:8px 12px;border:1px solid #1A3A8F;font-size:11pt;font-weight:bold;">
        MONTANT TOTAL &#192; PAYER (TTC)
        <div style="font-size:8pt;font-weight:normal;opacity:0.75;margin-top:2px;">Toutes taxes comprises &#8212; net &#224; r&#233;gler</div>
      </td>
      <td style="padding:8px 12px;border:1px solid #1A3A8F;font-size:12pt;font-weight:bold;text-align:right;">${fmt(ttc)} FCFA</td>
    </tr>

  </table>

  <!-- ══ NOTES / OBSERVATIONS ══ -->
  ${notes ? `
  <table width="100%" style="margin-bottom:10px;border:1px solid #e2e8f0;background:#fafafa;">
    <tr><td style="padding:4px 10px;font-size:8pt;font-weight:bold;color:#1A3A8F;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">Notes / Observations</td></tr>
    <tr><td style="padding:6px 10px;font-size:9pt;color:#333;line-height:1.6;">${notes}</td></tr>
  </table>` : ''}



  <!-- Fermeture du wrapper global pour l'impression -->
    </td></tr></tbody>
    <tfoot><tr><td style="border: none;">
      <div style="height: 35mm;"></div> <!-- Espace réservé pour le pied de page -->
    </td></tr></tfoot>
  </table>

  <!-- ══ PIED DE PAGE UNIQUE ET AUTOMATIQUE ══ -->
  <div class="page-footer" id="page-footer">
    <img class="footer-img" src="${baseUrl}/pied-sika.png" alt="SIKA INDUSTRIE" onerror="this.style.display='none'"/>
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
