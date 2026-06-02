import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import enteteImg from '../assets/ENTETE SIKApng1.png'
import piedImg from '../assets/ENTETE SIKA pied 1.png'

/**
 * Ajoute l'en-tête SIKA à un document PDF
 * @param {jsPDF} doc - Instance jsPDF
 * @param {number} pageNumber - Numéro de page actuel
 */
export const addSikaHeader = (doc, pageNumber = 1) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // En-tête image - hauteur 25mm
  try {
    doc.addImage(enteteImg, 'PNG', 0, 0, pageWidth, 25)
  } catch (e) {
    console.error('Erreur chargement en-tête:', e)
    // Fallback: en-tête texte
    doc.setFillColor(27, 42, 74) // Navy
    doc.rect(0, 0, pageWidth, 25, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('SIKA INDUSTRIE', pageWidth / 2, 15, { align: 'center' })
  }
}

/**
 * Ajoute le pied de page SIKA à un document PDF
 * @param {jsPDF} doc - Instance jsPDF
 * @param {number} pageNumber - Numéro de page actuel
 * @param {number} totalPages - Nombre total de pages
 */
export const addSikaFooter = (doc, pageNumber = 1, totalPages = 1) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Pied de page image - hauteur 15mm, position en bas
  const footerHeight = 15
  const footerY = pageHeight - footerHeight
  
  try {
    doc.addImage(piedImg, 'PNG', 0, footerY, pageWidth, footerHeight)
  } catch (e) {
    console.error('Erreur chargement pied de page:', e)
    // Fallback: pied de page texte
    doc.setDrawColor(230, 0, 0) // Rouge SIKA
    doc.setLineWidth(0.5)
    doc.line(0, footerY, pageWidth, footerY)
    
    doc.setFillColor(245, 245, 245)
    doc.rect(0, footerY, pageWidth, footerHeight, 'F')
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    
    // Texte gauche
    doc.text('SIKA INDUSTRIE — Confidentiel', 10, footerY + 8)
    
    // Texte centre
    doc.text('www.sika-industrie.com', pageWidth / 2, footerY + 8, { align: 'center' })
    
    // Texte droite - numéro de page
    doc.setFont(undefined, 'bold')
    doc.text(`Page ${pageNumber}/${totalPages}`, pageWidth - 10, footerY + 8, { align: 'right' })
  }
}

/**
 * Ajoute en-tête et pied de page à toutes les pages d'un document
 * @param {jsPDF} doc - Instance jsPDF
 * @param {number} totalPages - Nombre total de pages (optionnel, calculé automatiquement si non fourni)
 */
export const addSikaHeaderFooterToAllPages = (doc, totalPages = null) => {
  const pages = totalPages || doc.internal.getNumberOfPages()
  
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    addSikaHeader(doc, i)
    addSikaFooter(doc, i, pages)
  }
}

/**
 * Crée un nouveau document PDF avec en-tête et pied de page pré-configurés
 * @param {string} orientation - 'portrait' ou 'landscape'
 * @returns {jsPDF} Instance jsPDF configurée
 */
export const createSikaPDF = (orientation = 'portrait') => {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  })

  // Ajouter en-tête et pied de page à la première page
  addSikaHeader(doc, 1)
  addSikaFooter(doc, 1, 1)

  return doc
}

/**
 * Obtient les marges recommandées pour le contenu (en tenant compte de l'en-tête et du pied de page)
 * @returns {Object} Marges { top, bottom, left, right }
 */
export const getSikaContentMargins = () => {
  return {
    top: 30,      // 25mm en-tête + 5mm marge
    bottom: 20,   // 15mm pied + 5mm marge
    left: 14,     // Marge standard
    right: 14     // Marge standard
  }
}

/**
 * Calcule la hauteur disponible pour le contenu sur une page
 * @param {jsPDF} doc - Instance jsPDF
 * @returns {number} Hauteur disponible en mm
 */
export const getSikaContentHeight = (doc) => {
  const pageHeight = doc.internal.pageSize.getHeight()
  const margins = getSikaContentMargins()
  return pageHeight - margins.top - margins.bottom
}

/**
 * Ajoute une nouvelle page avec en-tête et pied de page
 * @param {jsPDF} doc - Instance jsPDF
 * @returns {number} Numéro de la nouvelle page
 */
export const addSikaPage = (doc) => {
  doc.addPage()
  const pageNumber = doc.internal.getNumberOfPages()
  addSikaHeader(doc, pageNumber)
  addSikaFooter(doc, pageNumber, pageNumber) // Sera mis à jour à la fin
  return pageNumber
}
