// ═══════════════════════════════════════════════════════════════
// SIKA INDUSTRIE — UTILITAIRE CENTRAL D'IMPRESSION ET PDF
// ═══════════════════════════════════════════════════════════════
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import enteteImg from '../assets/ENTETE SIKApng1.png';
import piedImg from '../assets/ENTETE SIKA pied 1.png';
import signatureImg from '../assets/signature-removebg-preview.png';
import { logger } from './logger.js';

// ─── DIMENSIONS PAGE A4 ─────────────────────────────────────
const PAGE_W = 210;   // mm
const PAGE_H = 297;   // mm
const MARGE_G = 15;   // mm gauche
const MARGE_D = 15;   // mm droite
const CONTENT_W = PAGE_W - MARGE_G - MARGE_D;

/**
 * Charge une image en base64 depuis son chemin
 */
async function loadImageAsBase64(imgSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve({
        data: canvas.toDataURL('image/png'),
        w: img.naturalWidth,
        h: img.naturalHeight,
      });
    };
    img.onerror = () => reject(new Error(`Impossible de charger l'image`));
    img.src = imgSrc;
  });
}

/**
 * Crée un nouveau document jsPDF A4 portrait avec :
 * - En-tête SIKA officiel en haut
 * - Pied de page SIKA officiel en bas
 * - Numérotation des pages
 * Retourne { doc, startY, endY, ... } où startY = Y de début du contenu
 */
export async function createSikaPDF(titre = '') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Charge les deux images
  let entete, pied, signature;
  try {
    [entete, pied, signature] = await Promise.all([
      loadImageAsBase64(enteteImg),
      loadImageAsBase64(piedImg),
      loadImageAsBase64(signatureImg).catch(() => null),
    ]);
  } catch (error) {
    logger.error('Erreur chargement images SIKA:', error);
    // Fallback: bandeau de couleur
    entete = null;
    pied = null;
    signature = null;
  }

  const totalPages = () => doc.internal.getNumberOfPages();

  // Fonction appliquée à CHAQUE page
  function applyHeaderFooter(pageNum) {
    doc.setPage(pageNum);

    // ── EN-TÊTE ──────────────────────────────────────────────
    if (entete) {
      const enteteRatio = entete.w / entete.h;
      const enteteW = CONTENT_W;
      const enteteH = enteteW / enteteRatio;
      doc.addImage(entete.data, 'PNG', MARGE_G, 5, enteteW, enteteH);

      // Ligne de séparation bleue sous l'en-tête
      doc.setDrawColor(27, 42, 74);
      doc.setLineWidth(0.8);
      doc.line(MARGE_G, 5 + enteteH + 1, PAGE_W - MARGE_D, 5 + enteteH + 1);
    } else {
      // Fallback: bandeau navy
      doc.setFillColor(27, 42, 74);
      doc.rect(0, 0, PAGE_W, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SIKA INDUSTRIE', PAGE_W / 2, 15, { align: 'center' });
    }

    // Titre du document (centré, sous l'en-tête)
    if (titre && pageNum === 1) {
      const enteteRenderedH = entete ? (CONTENT_W / (entete.w / entete.h)) : 25;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(27, 42, 74); // navy #1B2A4A
      doc.text(titre.toUpperCase(), PAGE_W / 2, 5 + enteteRenderedH + 7, { align: 'center' });
    }

    // ── PIED DE PAGE ─────────────────────────────────────────
    if (pied) {
      const piedRatio = pied.w / pied.h;
      const piedW = CONTENT_W;
      const piedH = piedW / piedRatio;
      const piedY = PAGE_H - piedH - 5;

      // Signature uniquement sur la dernière page pour éviter les doublons
      if (signature && pageNum === totalPages()) {
        const sigW = 145; 
        const sigH = sigW / (signature.w / signature.h);
        const sigX = PAGE_W - MARGE_D - sigW;
        const sigY = piedY - sigH + 5; // Ajustement naturel
        doc.addImage(signature.data, 'PNG', sigX, sigY, sigW, sigH);
      }

      doc.addImage(pied.data, 'PNG', MARGE_G, piedY, piedW, piedH);
    } else {
      // Fallback: ligne + texte
      const piedY = PAGE_H - 15;
      doc.setDrawColor(230, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(MARGE_G, piedY, PAGE_W - MARGE_D, piedY);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('SIKA INDUSTRIE — Confidentiel', MARGE_G, piedY + 5);
    }

    // Numéro de page
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Page ${pageNum} / ${totalPages()}`,
      PAGE_W - MARGE_D,
      PAGE_H - 3,
      { align: 'right' }
    );
  }

  // startY = là où commence le contenu (sous l'en-tête + titre)
  const enteteRatio = entete ? (entete.w / entete.h) : 1;
  const enteteRenderedH = entete ? (CONTENT_W / enteteRatio) : 25;
  const startY = 5 + enteteRenderedH + (titre ? 12 : 5);

  // endY = là où le contenu doit s'arrêter (avant le pied)
  const piedRatio = pied ? (pied.w / pied.h) : 1;
  const piedRenderedH = pied ? (CONTENT_W / piedRatio) : 15;
  const signatureRenderedH = signature ? (100 / (signature.w / signature.h)) : 40;
  const endY = PAGE_H - piedRenderedH - signatureRenderedH - 10;

  return {
    doc,
    startY,
    endY,
    applyHeaderFooter,
    MARGE_G,
    MARGE_D,
    PAGE_W,
    PAGE_H,
    CONTENT_W,
    entete,
    pied,
    signature,
    piedRenderedH,
    enteteRenderedH,
    signatureRenderedH,
  };
}

/**
 * Ajoute un filigrane d'identification en bas de chaque page PDF
 * Format : "Imprimé par [NOM] ([ROLE]) — le DD/MM/YYYY à HH:MM:SS"
 */
export function addDocumentStamp(doc, user, pageNum, totalPages) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const heureStr = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const stampText = `📄 Imprimé par : ${user.nom} (${user.role})  —  Le ${dateStr} à ${heureStr}  —  Page ${pageNum}/${totalPages}`;

  doc.setPage(pageNum);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(150, 150, 160);

  doc.setFillColor(248, 248, 252);
  doc.rect(14, 272, 182, 5, 'F');

  doc.text(stampText, 105, 275.5, { align: 'center' });

  doc.setTextColor(27, 42, 74);
}

/**
 * Ajoute un filigrane diagonal semi-transparent (documents sensibles)
 * À utiliser sur factures et documents financiers
 */
export function addDiagonalWatermark(doc, user) {
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.04 }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(27, 42, 74);
    doc.text(
      user.nom.toUpperCase(),
      105, 148,
      { align: 'center', angle: 45 }
    );
    doc.restoreGraphicsState();
  }
}

/**
 * Finalise le PDF : applique en-tête/pied sur TOUTES les pages et télécharge
 */
export async function finalizeSikaPDF(ctx, filename, user = null) {
  const { doc, applyHeaderFooter } = ctx;
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    applyHeaderFooter(i);
    if (user) addDocumentStamp(doc, user, i, n);
  }
  doc.save(filename);
}

/**
 * Génère un tableau autoTable avec style SIKA
 */
export function sikaTable(doc, columns, rows, startY, ctx) {
  autoTable(doc, {
    startY,
    margin: { left: ctx.MARGE_G, right: ctx.MARGE_D, bottom: ctx.piedRenderedH + (ctx.signatureRenderedH || 30) + 10 },
    head: [columns],
    body: rows,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      font: 'helvetica',
      textColor: [27, 42, 74],
      lineColor: [200, 200, 208],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [27, 42, 74],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [232, 236, 244],
    },
    columnStyles: {},
    didDrawPage: () => {
      // Sur chaque nouvelle page créée par autoTable : en-tête + pied
      ctx.applyHeaderFooter(doc.internal.getCurrentPageInfo().pageNumber);
    },
  });
  return doc.lastAutoTable.finalY;
}

/**
 * Ouvre le PDF dans un nouvel onglet pour impression
 */
export async function openPDFForPrint(ctx, user = null) {
  const { doc, applyHeaderFooter } = ctx;
  
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    applyHeaderFooter(i);
    if (user) addDocumentStamp(doc, user, i, n);
  }
  
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      win.focus();
      win.print();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    };
  }
}

/**
 * Utilitaire pour formater les montants avec points comme séparateurs
 */
export function formatMontant(montant) {
  if (!montant && montant !== 0) return '0';
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
  // Remplacer les espaces par des points (format 1.100.000.000)
  return formatted.replace(/\s/g, '.');
}

/**
 * Utilitaire pour formater les dates
 */
export function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR');
}

/**
 * Utilitaire pour formater les dates longues
 */
export function formatDateLong(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}
