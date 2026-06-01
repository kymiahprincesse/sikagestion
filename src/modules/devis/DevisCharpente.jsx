import { useState, useRef, useEffect } from 'react'
import { useDevisStore } from '../../store/useDevisStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useClientsStore } from '../../store/useClientsStore'
import ClientSelect from '../../components/ClientSelect'
import { formatDateLong, formatFCFA } from '../../utils/format'
import { createSikaPDF, finalizeSikaPDF, sikaTable, formatMontant, formatDate } from '../../utils/printUtils'

const TYPES_PROFIL = ['IPE', 'HEA', 'HEB', 'UPN', 'Tube carré', 'Tube rectangulaire', 'Cornière']
const DIMENSIONS_IPE = ['IPE80', 'IPE100', 'IPE120', 'IPE140', 'IPE160', 'IPE180', 'IPE200', 'IPE220', 'IPE240', 'IPE270', 'IPE300', 'IPE330', 'IPE360', 'IPE400', 'IPE450', 'IPE500']
const DIMENSIONS_HEA = ['HEA100', 'HEA120', 'HEA140', 'HEA160', 'HEA180', 'HEA200', 'HEA220', 'HEA240', 'HEA260', 'HEA280', 'HEA300']
const TRAITEMENTS = ['Galvanisation à chaud', 'Peinture antirouille', 'Métallisation', 'Aucun']

const LIGNE_VIDE = {
  id: Date.now(),
  designation: '',
  typeProfil: 'IPE',
  dimension: 'IPE200',
  longueur: 0,
  quantite: 1,
  pu: 0
}

export default function DevisCharpente() {
  const pdfRef = useRef(null)
  const { addDevis, updateDevis, getNextNumero } = useDevisStore()
  const { addLog } = useAuditStore()
  const { clients } = useClientsStore()

  const [devisData, setDevisData] = useState({
    numero: '',
    date: new Date().toISOString().split('T')[0],
    clientId: null,
    type: 'CHARPENTE',
    objet: '',
    portee: 0,
    hauteur: 0,
    traitement: 'Peinture antirouille',
    
    lignes: [{ ...LIGNE_VIDE, id: Date.now() }],
    tauxRemise: 0,
    statut: 'BROUILLON'
  })

  const [devisId, setDevisId] = useState(null)

  useEffect(() => {
    if (!devisData.numero) {
      setDevisData(prev => ({ ...prev, numero: getNextNumero() }))
    }
  }, [])

  const getDimensionsDisponibles = (typeProfil) => {
    switch(typeProfil) {
      case 'IPE': return DIMENSIONS_IPE
      case 'HEA': return DIMENSIONS_HEA
      case 'HEB': return DIMENSIONS_HEA.map(d => d.replace('HEA', 'HEB'))
      case 'UPN': return ['UPN80', 'UPN100', 'UPN120', 'UPN140', 'UPN160', 'UPN180', 'UPN200']
      case 'Tube carré': return ['40x40', '50x50', '60x60', '80x80', '100x100', '120x120', '140x140', '160x160']
      case 'Tube rectangulaire': return ['40x20', '50x30', '60x40', '80x40', '100x50', '120x60', '140x80', '160x80']
      case 'Cornière': return ['40x40', '50x50', '60x60', '70x70', '80x80', '100x100', '120x120']
      default: return DIMENSIONS_IPE
    }
  }

  const calculerPoidsLineaire = (ligne) => {
    return 0
  }

  const calculerMontant = (ligne) => {
    const longueur = parseFloat(ligne.longueur) || 0
    const quantite = parseFloat(ligne.quantite) || 1
    const pu = parseFloat(ligne.pu) || 0
    return longueur * quantite * pu
  }

  const calculerTotaux = () => {
    const montantBrut = devisData.lignes.reduce((sum, ligne) => sum + calculerMontant(ligne), 0)
    const tauxRemise = parseFloat(devisData.tauxRemise) || 0
    const remise = montantBrut * (tauxRemise / 100)
    const montantHT = montantBrut - remise
    const tva = montantHT * 0.18
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
      lignes: prev.lignes.map(l => {
        if (l.id === id) {
          const nouvelleLigne = { ...l, [champ]: valeur }
          if (champ === 'typeProfil') {
            const dimensions = getDimensionsDisponibles(valeur)
            nouvelleLigne.dimension = dimensions[0]
          }
          return nouvelleLigne
        }
        return l
      })
    }))
  }

  const handleNouveau = () => {
    if (confirm('Créer un nouveau devis ? Les modifications non enregistrées seront perdues.')) {
      setDevisData({
        numero: getNextNumero(),
        date: new Date().toISOString().split('T')[0],
        clientId: null,
        type: 'CHARPENTE',
        objet: '',
        portee: 0,
        hauteur: 0,
        traitement: 'Peinture antirouille',
        lignes: [{ ...LIGNE_VIDE, id: Date.now() }],
        tauxRemise: 0,
        statut: 'BROUILLON'
      })
      setDevisId(null)
      addLog({ module: 'DEVIS_CHARPENTE', action: 'NOUVEAU', utilisateur: 'Utilisateur' })
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
      addLog({ module: 'DEVIS_CHARPENTE', action: 'MODIFICATION', utilisateur: 'Utilisateur', apres: { numero: devisData.numero, montantTTC: totaux.ttc } })
      alert('Devis modifié avec succès')
    } else {
      const nouveau = addDevis(devisComplet)
      setDevisId(nouveau.id)
      addLog({ module: 'DEVIS_CHARPENTE', action: 'CREATION', utilisateur: 'Utilisateur', apres: { numero: nouveau.numero, montantTTC: totaux.ttc } })
      alert('Devis enregistré avec succès')
    }
  }

  const handleDupliquer = () => {
    const nouveauNumero = getNextNumero()
    const devisDuplique = { ...devisData, numero: nouveauNumero, date: new Date().toISOString().split('T')[0], statut: 'BROUILLON' }
    const nouveau = addDevis(devisDuplique)
    setDevisId(nouveau.id)
    setDevisData(devisDuplique)
    addLog({ module: 'DEVIS_CHARPENTE', action: 'DUPLICATION', utilisateur: 'Utilisateur', apres: { numero: nouveauNumero } })
    alert(`Devis dupliqué : ${nouveauNumero}`)
  }

  const handleGenerePDF = async () => {
    if (!devisData.clientId) {
      alert('Veuillez sélectionner un client avant de générer le PDF')
      return
    }
    
    const client = clients.find(c => c.id === devisData.clientId);
    const ctx = await createSikaPDF(`DEVIS CHARPENTE - ${devisData.numero}`);
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
    
    const columns = ['Profil', 'Dimension', 'Longueur (m)', 'Qté', 'PU (FCFA)', 'Montant (FCFA)'];
    const rows = devisData.lignes.map(ligne => [
      ligne.typeProfil || '—',
      ligne.dimension || '—',
      ligne.longueur || 0,
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
    [
      ['Montant HT', formatMontant(totaux.montantHT) + ' FCFA'],
      ['TVA (18%)', formatMontant(totaux.tva) + ' FCFA'],
      ['MONTANT TTC', formatMontant(totaux.ttc) + ' FCFA']
    ].forEach(([label, val], idx) => {
      if (idx === 2) {
        doc.setFillColor(27, 42, 74);
        doc.rect(totauxX - 2, y - 4, 82, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
      }
      doc.text(label, totauxX, y);
      doc.text(val, PAGE_W - 15, y, { align: 'right' });
      y += (idx === 2) ? 10 : 6;
      doc.setTextColor(27, 42, 74);
      doc.setFontSize(9);
    });
    
    await finalizeSikaPDF(ctx, `SIKA_Devis_Charpente_${devisData.numero.replace(/\//g, '_')}.pdf`);
    addLog({ module: 'DEVIS_CHARPENTE', action: 'EXPORT_PDF', utilisateur: 'Utilisateur', apres: { numero: devisData.numero } });
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
          <button onClick={handleDupliquer} className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg hover:bg-opacity-90 transition">
            📋 Dupliquer
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
            <input type="text" value={devisData.objet} onChange={(e) => setDevisData(prev => ({ ...prev, objet: e.target.value }))} className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange" placeholder="Ex: Charpente métallique hangar industriel..." />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Portée (m)</label>
              <input type="number" step="0.1" value={devisData.portee} onChange={(e) => setDevisData(prev => ({ ...prev, portee: e.target.value }))} className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Hauteur (m)</label>
              <input type="number" step="0.1" value={devisData.hauteur} onChange={(e) => setDevisData(prev => ({ ...prev, hauteur: e.target.value }))} className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Traitement de surface</label>
              <select value={devisData.traitement} onChange={(e) => setDevisData(prev => ({ ...prev, traitement: e.target.value }))} className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange">
                {TRAITEMENTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          
          {clientSelectionne && (
            <div className="bg-orangeClair border-l-4 border-orange p-4 rounded">
              <p className="text-sm text-navy"><strong>{clientSelectionne.nom}</strong> - {clientSelectionne.ville}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-navy mb-4 border-b-2 border-orange pb-2">Détail de la charpente métallique</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="border border-argent px-4 py-2 text-left">DÉSIGNATION</th>
                  <th className="border border-argent px-4 py-2 text-center w-32">TYPE PROFILÉ</th>
                  <th className="border border-argent px-4 py-2 text-center w-32">DIMENSION</th>
                  <th className="border border-argent px-4 py-2 text-center w-24">LONG. (m)</th>
                  <th className="border border-argent px-4 py-2 text-center w-20">QTÉ</th>
                  <th className="border border-argent px-4 py-2 text-right w-32">PU (FCFA/m)</th>
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
                        <select value={ligne.typeProfil} onChange={(e) => modifierLigne(ligne.id, 'typeProfil', e.target.value)} className="w-full px-2 py-1 border border-argent rounded focus:outline-none focus:border-orange">
                          {TYPES_PROFIL.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <select value={ligne.dimension} onChange={(e) => modifierLigne(ligne.id, 'dimension', e.target.value)} className="w-full px-2 py-1 border border-argent rounded focus:outline-none focus:border-orange">
                          {getDimensionsDisponibles(ligne.typeProfil).map(dim => <option key={dim} value={dim}>{dim}</option>)}
                        </select>
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <input type="number" step="0.01" value={ligne.longueur} onChange={(e) => modifierLigne(ligne.id, 'longueur', e.target.value)} className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-orange" />
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <input type="number" value={ligne.quantite} onChange={(e) => modifierLigne(ligne.id, 'quantite', e.target.value)} className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-orange" />
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
            
            <div className="flex justify-between items-center">
              <span className="text-navy font-semibold">TVA 18%</span>
              <span className="text-lg font-bold text-bleu">{formatFCFA(totaux.tva)}</span>
            </div>
            
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
              <h2 className="text-xl text-bleu">DEVIS CHARPENTE MÉTALLIQUE</h2>
              <p className="text-sm text-navy mt-2">{devisData.numero}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
