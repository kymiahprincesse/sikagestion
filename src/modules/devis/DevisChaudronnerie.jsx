import { useState, useRef, useEffect } from 'react'
import { useDevisStore } from '../../store/useDevisStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useClientsStore } from '../../store/useClientsStore'
import { useNotificationsStore } from '../../store/useNotificationsStore'
import ClientSelect from '../../components/ClientSelect'
import { formatDateLong, formatFCFA } from '../../utils/format'
import { createSikaPDF, finalizeSikaPDF, sikaTable, formatMontant, formatDate } from '../../utils/printUtils'
import { useNavigate, useLocation } from 'react-router-dom'

const TYPES_TRAVAUX = ['Découpe', 'Pliage', 'Roulage', 'Assemblage', 'Soudure', 'Finition']
const MATERIAUX = ['Acier carbone', 'Inox 304', 'Inox 316', 'Aluminium', 'Galvanisé']
const EPAISSEURS_STANDARD = [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]

const LIGNE_VIDE = {
  id: Date.now(),
  designation: '',
  typeTravail: 'Découpe',
  materiau: 'Acier carbone',
  epaisseur: 3,
  surface: 0,
  pu: 0
}

export default function DevisChaudronnerie() {
  const pdfRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { addDevis, updateDevis, getNextNumero, getDevisById } = useDevisStore()
  const { addLog } = useAuditStore()
  const { clients } = useClientsStore()
  const { ajouterNotification } = useNotificationsStore()

  const [devisData, setDevisData] = useState(() => ({
    numero: getNextNumero(),
    date: new Date().toISOString().split('T')[0],
    clientId: null,
    type: 'CHAUDRONNERIE',
    objet: '',
    lieuInstallation: '',

    lignes: [{ ...LIGNE_VIDE, id: Date.now() }],
    tauxRemise: 0,
    tvaActive: true,
    statut: 'BROUILLON'
  }))

  const [devisId, setDevisId] = useState(null)

  // Charger un devis existant si on vient de la liste avec location.state
  useEffect(() => {
    const loadDevis = () => {
      if (location.state?.devisId) {
        const devisExist = getDevisById(location.state.devisId)
        if (devisExist) {
          setDevisData({
            numero: devisExist.numero,
            date: devisExist.date || new Date().toISOString().split('T')[0],
            clientId: devisExist.clientId,
            type: devisExist.type || 'CHAUDRONNERIE',
            objet: devisExist.objet || '',
            lieuInstallation: devisExist.lieuInstallation || '',
            lignes: devisExist.lignes?.length > 0 ? devisExist.lignes : [{ ...LIGNE_VIDE, id: Date.now() }],
            tauxRemise: devisExist.tauxRemise || 0,
            tvaActive: devisExist.tvaActive !== undefined ? devisExist.tvaActive : true,
            statut: devisExist.statut || 'BROUILLON'
          })
          setDevisId(devisExist.id)
        } else {
          console.error('Devis non trouvé avec ID:', location.state.devisId)
          alert('Devis non trouvé. Il a peut-être été supprimé.')
        }
      }
    }
    loadDevis()
  }, [location.state, location.state?.devisId, getDevisById])

  const calculerMontant = (ligne) => {
    const surface = parseFloat(ligne.surface) || 0
    const pu = parseFloat(ligne.pu) || 0
    return surface * pu
  }

  const calculerTotaux = () => {
    const montantBrut = devisData.lignes.reduce((sum, ligne) => sum + calculerMontant(ligne), 0)
    const tauxRemise = parseFloat(devisData.tauxRemise) || 0
    const remise = montantBrut * (tauxRemise / 100)
    const montantHT = montantBrut - remise
    const tva = devisData.tvaActive ? montantHT * 0.18 : 0
    const ttc = montantHT + tva
    return { montantBrut, remise, montantHT, tva, ttc }
  }

  const ajouterLigne = () => {
    setDevisData(prev => ({
      ...prev,
      lignes: [...prev.lignes, { ...LIGNE_VIDE, id: Date.now() }]
    }))
  }

  const supprimerLigne = (id) => {
    if (devisData.lignes.length <= 1) {
      alert('Le devis doit contenir au moins une ligne')
      return
    }
    setDevisData(prev => ({
      ...prev,
      lignes: prev.lignes.filter(l => l.id !== id)
    }))
  }

  const modifierLigne = (id, champ, valeur) => {
    setDevisData(prev => ({
      ...prev,
      lignes: prev.lignes.map(l => l.id === id ? { ...l, [champ]: valeur } : l)
    }))
  }

  const handleNouveau = () => {
    if (confirm('Créer un nouveau devis ? Les modifications non enregistrées seront perdues.')) {
      setDevisData({
        numero: getNextNumero(),
        date: new Date().toISOString().split('T')[0],
        clientId: null,
        type: 'CHAUDRONNERIE',
        objet: '',
        lieuInstallation: '',
        lignes: [{ ...LIGNE_VIDE, id: Date.now() }],
        tauxRemise: 0,
        tvaActive: true,
        statut: 'BROUILLON'
      })
      setDevisId(null)
      addLog({ module: 'DEVIS_CHAUDRONNERIE', action: 'NOUVEAU', utilisateur: 'Utilisateur' })
    }
  }

  const handleEnregistrer = () => {
    if (!devisData.clientId) {
      alert('Veuillez sélectionner un client')
      return
    }

    const totaux = calculerTotaux()
    const devisComplet = { ...devisData, ...totaux, dateModification: new Date().toISOString().split('T')[0] }

    if (devisId) {
      updateDevis(devisId, devisComplet)
      addLog({ module: 'DEVIS_CHAUDRONNERIE', action: 'MODIFICATION', utilisateur: 'Utilisateur', apres: { numero: devisData.numero, montantTTC: totaux.ttc } })
      alert('Devis modifié avec succès')
    } else {
      const nouveau = addDevis(devisComplet)
      setDevisId(nouveau.id)
      addLog({ module: 'DEVIS_CHAUDRONNERIE', action: 'CREATION', utilisateur: 'Utilisateur', apres: { numero: nouveau.numero, montantTTC: totaux.ttc } })
      alert('Devis enregistré avec succès')
    }
  }

  const handleGenerePDF = async () => {
    if (!devisData.clientId) {
      alert('Veuillez sélectionner un client avant de générer le PDF')
      return
    }
    
    const client = clients.find(c => c.id === devisData.clientId);
    const ctx = await createSikaPDF(`DEVIS CHAUDRONNERIE - ${devisData.numero}`);
    const { doc, startY, MARGE_G, PAGE_W } = ctx;
    
    let y = startY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    
    const infos = [
      ['Client', client?.nom || 'N/A'],
      ['Date', formatDate(devisData.date)],
      ['Objet', devisData.objet || 'N/A']
    ];
    
    infos.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ' :', MARGE_G, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, MARGE_G + 25, y);
      y += 6;
    });
    
    y += 8;
    
    const columns = ['Type travaux', 'Matériau', 'Surface (m²)', 'Qté', 'PU (FCFA)', 'Montant (FCFA)'];
    const rows = devisData.lignes.map(ligne => [
      ligne.typeTravaux || '—',
      ligne.materiau || '—',
      ligne.surface || 0,
      ligne.quantite || 0,
      formatMontant(ligne.pu),
      formatMontant(ligne.quantite * ligne.pu)
    ]);
    
    const finalY = sikaTable(doc, columns, rows, y, ctx);
    y = finalY + 10;
    
    const totauxX = PAGE_W - 80;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    
    const totaux = calculerTotaux();
    const rowsTotaux = [
      ['Montant HT', formatMontant(totaux.montantHT) + ' FCFA'],
      ...(devisData.tvaActive ? [['TVA (18%)', formatMontant(totaux.tva) + ' FCFA']] : []),
      ['MONTANT TTC', formatMontant(totaux.ttc) + ' FCFA']
    ];
    rowsTotaux.forEach(([label, val], idx) => {
      if (idx === rowsTotaux.length - 1) {
        doc.setFillColor(27, 42, 74);
        doc.rect(totauxX - 2, y - 4, 82, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
      }
      doc.text(label, totauxX, y);
      doc.text(val, PAGE_W - 15, y, { align: 'right' });
      y += (idx === rowsTotaux.length - 1) ? 10 : 6;
      doc.setTextColor(27, 42, 74);
      doc.setFontSize(9);
    });
    
    await finalizeSikaPDF(ctx, `SIKA_Devis_Chaudronnerie_${devisData.numero.replace(/\//g, '_')}.pdf`);
    addLog({ module: 'DEVIS_CHAUDRONNERIE', action: 'EXPORT_PDF', utilisateur: 'Utilisateur', apres: { numero: devisData.numero } });
  }

  const clientSelectionne = clients.find(c => c.id === devisData.clientId)
  const totaux = calculerTotaux()

  return (
    <div className="min-h-screen bg-navyClair p-6">
      <div className="max-w-6xl mx-auto">
        
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-3">
          <button onClick={handleNouveau} className="flex items-center gap-2 px-4 py-2 bg-bleu text-white rounded-lg hover:bg-opacity-90 transition">
            ➕ Nouveau
          </button>
          <button onClick={handleEnregistrer} className="flex items-center gap-2 px-4 py-2 bg-vert text-white rounded-lg hover:bg-opacity-90 transition">
            💾 Enregistrer
          </button>
          <button onClick={handleGenerePDF} className="flex items-center gap-2 px-4 py-2 bg-orange text-white rounded-lg hover:bg-opacity-90 transition">
            📄 PDF
          </button>
          <button
            onClick={() => setDevisData(prev => ({ ...prev, tvaActive: !prev.tvaActive }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${devisData.tvaActive ? 'bg-vert text-white hover:bg-opacity-90' : 'bg-argent text-navy hover:bg-opacity-80'}`}
          >
            🔄 TVA 18% : {devisData.tvaActive ? 'Activée' : 'Désactivée'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">N° Devis</label>
              <input type="text" value={devisData.numero} readOnly className="w-full px-3 py-2 border border-argent rounded-lg bg-navyClair font-bold text-navy" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Date</label>
              <input type="date" value={devisData.date} onChange={(e) => setDevisData(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange" />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold text-navy mb-2">Client</label>
            <ClientSelect value={devisData.clientId} onChange={(clientId) => setDevisData(prev => ({ ...prev, clientId }))} />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-navy mb-2">Objet</label>
            <input type="text" value={devisData.objet} onChange={(e) => setDevisData(prev => ({ ...prev, objet: e.target.value }))} className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange" placeholder="Ex: Fabrication de structure métallique..." />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-navy mb-2">Lieu d'installation</label>
            <input type="text" value={devisData.lieuInstallation} onChange={(e) => setDevisData(prev => ({ ...prev, lieuInstallation: e.target.value }))} className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange" placeholder="Ex: Zone industrielle..." />
          </div>
          
          {clientSelectionne && (
            <div className="bg-orangeClair border-l-4 border-orange p-4 rounded">
              <p className="text-sm text-navy"><strong>{clientSelectionne.nom}</strong> - {clientSelectionne.ville}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-navy mb-4 border-b-2 border-orange pb-2">Détail des travaux de chaudronnerie</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="border border-argent px-4 py-2 text-left">DÉSIGNATION</th>
                  <th className="border border-argent px-4 py-2 text-center w-32">TYPE TRAVAIL</th>
                  <th className="border border-argent px-4 py-2 text-center w-32">MATÉRIAU</th>
                  <th className="border border-argent px-4 py-2 text-center w-24">ÉP. (mm)</th>
                  <th className="border border-argent px-4 py-2 text-center w-24">SURF. (m²)</th>
                  <th className="border border-argent px-4 py-2 text-right w-32">PU (FCFA/m²)</th>
                  <th className="border border-argent px-4 py-2 text-right w-32">MONTANT (FCFA)</th>
                  <th className="border border-argent px-4 py-2 text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devisData.lignes.map((ligne, index) => {
                  const montant = calculerMontant(ligne)
                  return (
                    <tr key={ligne.id} className={index % 2 === 0 ? 'bg-white' : 'bg-navyClair'}>
                      <td className="border border-argent px-4 py-2">
                        <input type="text" value={ligne.designation} onChange={(e) => modifierLigne(ligne.id, 'designation', e.target.value)} className="w-full px-2 py-1 border border-argent rounded focus:outline-none focus:border-orange" placeholder="Désignation..." />
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <select value={ligne.typeTravail} onChange={(e) => modifierLigne(ligne.id, 'typeTravail', e.target.value)} className="w-full px-2 py-1 border border-argent rounded focus:outline-none focus:border-orange">
                          {TYPES_TRAVAUX.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <select value={ligne.materiau} onChange={(e) => modifierLigne(ligne.id, 'materiau', e.target.value)} className="w-full px-2 py-1 border border-argent rounded focus:outline-none focus:border-orange">
                          {MATERIAUX.map(mat => <option key={mat} value={mat}>{mat}</option>)}
                        </select>
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <select value={ligne.epaisseur} onChange={(e) => modifierLigne(ligne.id, 'epaisseur', e.target.value)} className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-orange">
                          {EPAISSEURS_STANDARD.map(ep => <option key={ep} value={ep}>{ep}</option>)}
                        </select>
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <input type="number" step="0.01" value={ligne.surface} onChange={(e) => modifierLigne(ligne.id, 'surface', e.target.value)} className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-orange" />
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <input type="number" value={ligne.pu} onChange={(e) => modifierLigne(ligne.id, 'pu', e.target.value)} className="w-full px-2 py-1 border border-argent rounded text-right focus:outline-none focus:border-orange" />
                      </td>
                      <td className="border border-argent px-4 py-2 text-right font-semibold text-navy">{formatFCFA(montant)}</td>
                      <td className="border border-argent px-4 py-2 text-center">
                        <button onClick={() => supprimerLigne(ligne.id)} className="text-rouge hover:text-opacity-70" title="Supprimer">🗑</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          <button onClick={ajouterLigne} className="mt-4 px-4 py-2 bg-bleu text-white rounded-lg hover:bg-opacity-90 transition">➕ Ajouter une ligne</button>
          
          <div className="mt-6 border-t-2 border-argent pt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-navy font-semibold">MONTANT BRUT</span>
              <span className="text-lg font-bold text-navy">{formatFCFA(totaux.montantBrut)}</span>
            </div>
            
            {devisData.tauxRemise > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-navy font-semibold">REMISE</span>
                  <input type="number" value={devisData.tauxRemise} onChange={(e) => setDevisData(prev => ({ ...prev, tauxRemise: e.target.value }))} className="w-16 px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-orange" />
                  <span className="text-navy">%</span>
                </div>
                <span className="text-lg font-bold text-rouge">- {formatFCFA(totaux.remise)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center bg-orangeClair p-2 rounded">
              <span className="text-navy font-bold">MONTANT TOTAL HT</span>
              <span className="text-xl font-bold text-navy">{formatFCFA(totaux.montantHT)}</span>
            </div>
            
            {devisData.tvaActive && (
              <div className="flex justify-between items-center">
                <span className="text-navy font-semibold">TVA 18%</span>
                <span className="text-lg font-bold text-bleu">{formatFCFA(totaux.tva)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center bg-navy text-white p-3 rounded-lg">
              <span className="font-bold text-lg">MONTANT TTC</span>
              <span className="text-2xl font-bold">{formatFCFA(totaux.ttc)}</span>
            </div>
          </div>
        </div>

        <div className="hidden">
          <div ref={pdfRef} className="bg-white p-8" style={{ width: '210mm' }}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-navy mb-2">SIKA INDUSTRIE</h1>
              <h2 className="text-xl text-bleu">DEVIS CHAUDRONNERIE</h2>
              <p className="text-sm text-navy mt-2">{devisData.numero}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
