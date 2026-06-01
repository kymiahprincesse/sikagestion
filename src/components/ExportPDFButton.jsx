import { createSikaPDF, finalizeSikaPDF } from '../utils/printUtils'
import { useAudit } from '../hooks/useAudit'

export default function ExportPDFButton({ 
  title = 'DOCUMENT', 
  getData, 
  filename = 'document.pdf', 
  module = 'Export', 
  auditData = null 
}) {
  const { logExportPDF } = useAudit();
  
  const handleExport = async () => {
    const data = getData()
    
    // Note: Ce composant est générique et nécessite que getData() 
    // retourne un objet avec { content: string } pour affichage HTML simple
    // Pour des exports plus complexes, utiliser directement printUtils.js
    
    const ctx = await createSikaPDF(title);
    const { doc, startY, MARGE_G } = ctx;
    
    let y = startY;
    
    // Affichage simple du contenu texte
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(27, 42, 74);
    
    const lines = doc.splitTextToSize(data.content || data, 170);
    doc.text(lines, MARGE_G, y);
    
    await finalizeSikaPDF(ctx, filename);
    
    // Enregistrer l'export dans l'audit trail
    logExportPDF(module, auditData || { filename, date: new Date().toISOString() });
  }

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-orange text-white rounded-lg font-medium hover:bg-orange/90 transition-colors flex items-center gap-2"
    >
      <span className="text-lg">📄</span>
      <span>Exporter PDF</span>
    </button>
  )
}
