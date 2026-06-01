// ═══════════════════════════════════════════════════════════════
// SIKA INDUSTRIE — WRAPPER POUR IMPRESSION NAVIGATEUR
// ═══════════════════════════════════════════════════════════════
import enteteImg from '../assets/ENTETE SIKApng1.png';
import piedImg from '../assets/ENTETE SIKA pied 1.png';

export default function PrintWrapper({ children, titre = '' }) {
  return (
    <div className="print-zone">
      {/* EN-TÊTE OFFICIEL */}
      <div className="print-header">
        <img src={enteteImg} alt="En-tête SIKA INDUSTRIE" />
        {titre && (
          <h2 style={{
            textAlign: 'center',
            color: '#1B2A4A',
            fontWeight: 'bold',
            fontSize: '14pt',
            margin: '4mm 0',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            {titre}
          </h2>
        )}
        <hr style={{ border: '0.8px solid #E8610A', margin: '2mm 0 4mm' }} />
      </div>

      {/* CONTENU */}
      <div className="print-content">
        {children}
      </div>

      {/* PIED DE PAGE OFFICIEL */}
      <div className="print-footer">
        <hr style={{ border: '0.5px solid #1B2A4A', margin: '4mm 0 2mm' }} />
        <img src={piedImg} alt="Pied de page SIKA INDUSTRIE" />
      </div>
    </div>
  );
}
