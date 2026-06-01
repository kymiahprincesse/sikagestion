import { useState, useRef, useEffect } from 'react'
import { useDevisStore } from '../../store/useDevisStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useClientsStore } from '../../store/useClientsStore'
import ClientSelect from '../../components/ClientSelect'
import { formatDateLong, formatFCFA } from '../../utils/format'
import { createSikaPDF, finalizeSikaPDF, sikaTable, formatMontant, formatDate } from '../../utils/printUtils'

const TYPES_TOLE = [
  'Galvanisé',
  'Inox 304',
  'Inox 316',
  'Aluminium',
  'Acier noir'
]

const UNITES_PRIX = [
  { value: 'piece', label: 'par pièce' },
  { value: 'ml', label: 'par ml' }
]

const LIGNE_VIDE = {
  id: Date.now(),
  designation: '',
  qte: 0,
  pu: 0
}

export default function DevisPliage() {
  const pdfRef = useRef(null)
  const { addDevis, updateDevis, getNextNumero } = useDevisStore()
  const { addLog } = useAuditStore()
  const { clients } = useClientsStore()

  const [devisData, setDevisData] = useState({
    numero: '',
    date: new Date().toISOString().split('T')[0],
    clientId: null,
    type: 'PLIAGE',
    objet: '',
    lignes: [{ ...LIGNE_VIDE, id: Date.now() }],
    statut: 'BROUILLON',
    tvaActive: false
  })

  const [specifications, setSpecifications] = useState({
    typeTole: 'Galvanisé',
    epaisseur: 0,
    nombrePlis: 0,
    unitePrix: 'piece'
  })

  const [devisId, setDevisId] = useState(null)

  useEffect(() => {
    if (!devisData.numero) {
      setDevisData(prev => ({ ...prev, numero: getNextNumero() }))
    }
  }, [])

  const calculerMontant = (ligne) => {
    const qte = parseFloat(ligne.qte) || 0
    const pu = parseFloat(ligne.pu) || 0
    return qte * pu
  }

  const calculerTotaux = () => {
    const montantHT = devisData.lignes.reduce((sum, ligne) => sum + calculerMontant(ligne), 0)
    const tva = devisData.tvaActive ? montantHT * 0.18 : 0
    const ttc = montantHT + tva
    return { montantHT, tva, ttc }
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

  const dupliquerLigne = (ligne) => {
    const nouvelleLigne = { ...ligne, id: Date.now() }
    const index = devisData.lignes.findIndex(l => l.id === ligne.id)
    const nouvellesLignes = [...devisData.lignes]
    nouvellesLignes.splice(index + 1, 0, nouvelleLigne)
    setDevisData(prev => ({ ...prev, lignes: nouvellesLignes }))
  }

  const deplacerLigne = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= devisData.lignes.length) return

    const nouvellesLignes = [...devisData.lignes]
    const temp = nouvellesLignes[index]
    nouvellesLignes[index] = nouvellesLignes[newIndex]
    nouvellesLignes[newIndex] = temp
    setDevisData(prev => ({ ...prev, lignes: nouvellesLignes }))
  }

  const modifierLigne = (id, champ, valeur) => {
    setDevisData(prev => ({
      ...prev,
      lignes: prev.lignes.map(l => 
        l.id === id ? { ...l, [champ]: valeur } : l
      )
    }))
  }

  const validerDevis = () => {
    const erreurs = []

    if (!devisData.clientId) {
      erreurs.push('Le client est obligatoire')
    }

    if (devisData.lignes.length === 0) {
      erreurs.push('Le devis doit contenir au moins une ligne')
    }

    devisData.lignes.forEach((ligne, index) => {
      if (!ligne.designation) {
        erreurs.push(`Ligne ${index + 1}: La désignation est obligatoire`)
      }
      const qte = parseFloat(ligne.qte) || 0
      if (qte <= 0) {
        erreurs.push(`Ligne ${index + 1}: La quantité doit être supérieure à 0`)
      }
      const pu = parseFloat(ligne.pu) || 0
      if (pu <= 0) {
        erreurs.push(`Ligne ${index + 1}: Le prix unitaire doit être supérieur à 0`)
      }
    })

    if (erreurs.length > 0) {
      alert('Erreurs de validation:\n' + erreurs.join('\n'))
      return false
    }

    return true
  }

  const nouveauDevis = () => {
    if (confirm('Créer un nouveau devis ? Les modifications non enregistrées seront perdues.')) {
      setDevisData({
        numero: getNextNumero(),
        date: new Date().toISOString().split('T')[0],
        clientId: null,
        objet: '',
        lignes: [{ ...LIGNE_VIDE, id: Date.now() }],
        statut: 'BROUILLON',
        tvaActive: false
      })
      setSpecifications({
        typeTole: 'Galvanisé',
        epaisseur: 0,
        nombrePlis: 0,
        unitePrix: 'piece'
      })
      setDevisId(null)
    }
  }

  const enregistrerDevis = () => {
    if (!validerDevis()) return

    const totaux = calculerTotaux()
    const devisComplet = {
      ...devisData,
      specifications,
      montantHT: totaux.montantHT,
      montantTVA: totaux.tva,
      montantTTC: totaux.ttc,
      type: 'PLIAGE',
      statut: 'BROUILLON'
    }

    if (devisId) {
      updateDevis(devisId, devisComplet)
      addLog({
        module: 'devis_pliage',
        action: 'UPDATE',
        apres: devisComplet,
        impactFinancier: totaux.ttc
      })
      alert('Devis mis à jour avec succès')
    } else {
      const nouveau = addDevis(devisComplet)
      setDevisId(nouveau.id)
      addLog({
        module: 'devis_pliage',
        action: 'CREATE',
        apres: nouveau,
        impactFinancier: totaux.ttc
      })
      alert('Devis enregistré avec succès')
    }
  }

  const genererPDF = async () => {
    if (!validerDevis()) return

    const totaux = calculerTotaux()
    const devisComplet = {
      ...devisData,
      specifications,
      montantHT: totaux.montantHT,
      montantTVA: totaux.tva,
      montantTTC: totaux.ttc,
      type: 'PLIAGE',
      statut: 'VALIDE'
    }

    if (!devisId) {
      const nouveau = addDevis(devisComplet)
      setDevisId(nouveau.id)
    } else {
      updateDevis(devisId, devisComplet)
    }

    addLog({
      module: 'devis_pliage',
      action: 'PDF_GENERATE',
      apres: devisComplet,
      impactFinancier: totaux.ttc
    })

    try {
      const client = clients.find(c => c.id === devisData.clientId);
      const ctx = await createSikaPDF(`DEVIS PLIAGE - ${devisData.numero}`);
      const { doc, startY, MARGE_G, PAGE_W } = ctx;
      
      let y = startY;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(27, 42, 74);
      
      const infos = [
        ['Client', client?.nom || 'N/A'],
        ['Date', formatDate(devisData.date)],
        ['Demandé par', devisData.demandePar || 'N/A'],
        ['Objet', devisData.objet || 'N/A']
      ];
      
      infos.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label + ' :', MARGE_G, y);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value, 120);
        doc.text(lines, MARGE_G + 35, y);
        y += lines.length * 6;
      });
      
      y += 8;
      
      const columns = ['Désignation', 'Type', 'Épaisseur', 'Longueur', 'Qté', 'PU (FCFA)', 'Montant (FCFA)'];
      const rows = devisData.lignes.map(ligne => [
        ligne.designation,
        ligne.typeTole || '—',
        ligne.epaisseur || '—',
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
      
      await finalizeSikaPDF(ctx, `SIKA_Devis_Pliage_${devisData.numero.replace(/\//g, '_')}.pdf`);
      alert('PDF généré avec succès');
    } catch (error) {
      alert('Erreur lors de la génération du PDF: ' + error.message);
    }
  }

  const dupliquerDevis = () => {
    const nouveauNumero = getNextNumero()
    setDevisData(prev => ({
      ...prev,
      numero: nouveauNumero,
      date: new Date().toISOString().split('T')[0],
      statut: 'BROUILLON'
    }))
    setDevisId(null)
    alert('Devis dupliqué. Nouveau numéro: ' + nouveauNumero)
  }

  const supprimerDevis = () => {
    if (!devisId) {
      alert('Aucun devis à supprimer')
      return
    }
    if (confirm('Voulez-vous vraiment supprimer ce devis ?')) {
      addLog({
        module: 'devis_pliage',
        action: 'DELETE',
        avant: { id: devisId, numero: devisData.numero }
      })
      nouveauDevis()
      alert('Devis supprimé')
    }
  }

  const totaux = calculerTotaux()
  const clientSelectionne = clients.find(c => c.id === devisData.clientId)

  return (
    <div className="min-h-screen bg-navyClair p-6">
      {/* BARRE ACTIONS */}
      <div className="bg-white border-b-4 border-orange p-4 mb-6 rounded-lg shadow-lg sticky top-0 z-10">
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={nouveauDevis}
            className="px-4 py-2 bg-bleu text-white rounded-lg hover:bg-bleu/90 transition-colors font-medium"
          >
            ➕ Nouveau
          </button>
          <button
            onClick={enregistrerDevis}
            className="px-4 py-2 bg-vert text-white rounded-lg hover:bg-vert/90 transition-colors font-medium"
          >
            💾 Enregistrer
          </button>
          <button
            onClick={genererPDF}
            className="px-4 py-2 bg-orange text-white rounded-lg hover:bg-orange/90 transition-colors font-medium"
          >
            📄 PDF
          </button>
          <button
            onClick={dupliquerDevis}
            className="px-4 py-2 bg-argent text-navy rounded-lg hover:bg-argent/80 transition-colors font-medium"
          >
            📋 Dupliquer
          </button>
          <button
            onClick={supprimerDevis}
            className="px-4 py-2 bg-rouge text-white rounded-lg hover:bg-rouge/90 transition-colors font-medium"
          >
            🗑 Supprimer
          </button>
        </div>
      </div>

      {/* FORMULAIRE */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* EN-TÊTE */}
        <div className="border-b-2 border-orange pb-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-navy rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-white text-xs font-bold">sika</div>
                  <div className="text-white text-[8px] font-medium">INDUSTRIE</div>
                </div>
              </div>
            </div>
            <div className="text-right text-navy">
              <div className="text-sm">Abidjan, le {formatDateLong(devisData.date)}</div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-navy">DEVIS : {devisData.numero}</h1>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <ClientSelect
              value={devisData.clientId}
              onChange={(id) => setDevisData(prev => ({ ...prev, clientId: id }))}
              clients={clients}
            />
            <div>
              <label className="text-sm font-medium text-bleu block mb-1">OBJET</label>
              <textarea
                value={devisData.objet}
                onChange={(e) => setDevisData(prev => ({ ...prev, objet: e.target.value }))}
                placeholder="Description de la mission"
                rows={3}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              />
            </div>
          </div>
        </div>

        {/* PANEL SPÉCIFICATIONS PLIAGE */}
        <div className="bg-navyClair border-l-4 border-orange p-4 mb-6 rounded-lg">
          <h3 className="text-lg font-bold text-navy mb-4">Spécifications Pliage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-bleu block mb-1">Type de tôle</label>
              <select
                value={specifications.typeTole}
                onChange={(e) => setSpecifications(prev => ({ ...prev, typeTole: e.target.value }))}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              >
                {TYPES_TOLE.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-bleu block mb-1">Épaisseur (mm)</label>
              <input
                type="number"
                value={specifications.epaisseur}
                onChange={(e) => setSpecifications(prev => ({ ...prev, epaisseur: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.1"
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-bleu block mb-1">Nombre de plis</label>
              <input
                type="number"
                value={specifications.nombrePlis}
                onChange={(e) => setSpecifications(prev => ({ ...prev, nombrePlis: parseInt(e.target.value) || 0 }))}
                min="0"
                step="1"
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-bleu block mb-1">Unité de prix</label>
              <select
                value={specifications.unitePrix}
                onChange={(e) => setSpecifications(prev => ({ ...prev, unitePrix: e.target.value }))}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              >
                {UNITES_PRIX.map(unite => (
                  <option key={unite.value} value={unite.value}>{unite.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TABLEAU - 4 COLONNES */}
        <div className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="border border-argent px-4 py-3 text-left text-sm font-bold">DESIGNATION</th>
                  <th className="border border-argent px-4 py-3 text-center text-sm font-bold w-32">QTE</th>
                  <th className="border border-argent px-4 py-3 text-center text-sm font-bold w-32">PU</th>
                  <th className="border border-argent px-4 py-3 text-center text-sm font-bold w-40">MONTANT</th>
                  <th className="border border-argent px-4 py-3 text-center text-sm font-bold w-32">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {devisData.lignes.map((ligne, index) => {
                  const montant = calculerMontant(ligne)

                  return (
                    <tr key={ligne.id} className="hover:bg-orangeClair transition-colors">
                      <td className="border border-argent px-4 py-2">
                        <input
                          type="text"
                          value={ligne.designation}
                          onChange={(e) => modifierLigne(ligne.id, 'designation', e.target.value)}
                          placeholder="Description de la pièce..."
                          className="w-full px-2 py-1 border border-argent rounded focus:outline-none focus:ring-1 focus:ring-orange"
                        />
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <input
                          type="number"
                          value={ligne.qte}
                          onChange={(e) => modifierLigne(ligne.id, 'qte', parseInt(e.target.value) || 0)}
                          min="0"
                          step="1"
                          className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:ring-1 focus:ring-orange"
                        />
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <input
                          type="number"
                          value={ligne.pu}
                          onChange={(e) => modifierLigne(ligne.id, 'pu', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="1"
                          className="w-full px-2 py-1 border border-argent rounded text-right focus:outline-none focus:ring-1 focus:ring-orange"
                        />
                      </td>
                      <td className="border border-argent px-4 py-2 bg-orangeClair">
                        <div className="text-right font-bold text-navy">{formatFCFA(montant)}</div>
                      </td>
                      <td className="border border-argent px-2 py-2">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => dupliquerLigne(ligne)}
                            className="px-2 py-1 bg-bleu text-white rounded hover:bg-bleu/90 text-xs"
                            title="Dupliquer"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => deplacerLigne(index, 'up')}
                            disabled={index === 0}
                            className="px-2 py-1 bg-argent text-navy rounded hover:bg-argent/80 text-xs disabled:opacity-30"
                            title="Monter"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => deplacerLigne(index, 'down')}
                            disabled={index === devisData.lignes.length - 1}
                            className="px-2 py-1 bg-argent text-navy rounded hover:bg-argent/80 text-xs disabled:opacity-30"
                            title="Descendre"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => supprimerLigne(ligne.id)}
                            className="px-2 py-1 bg-rouge text-white rounded hover:bg-rouge/90 text-xs"
                            title="Supprimer"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={ajouterLigne}
            className="mt-4 px-6 py-2 bg-orange text-white rounded-lg hover:bg-orange/90 transition-colors font-medium"
          >
            ➕ Ajouter une ligne
          </button>
        </div>

        {/* TOTAUX */}
        <div className="flex justify-end">
          <div className="w-full md:w-1/2 bg-navyClair p-4 rounded-lg border-2 border-orange">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-argent">
                <span className="font-bold text-navy">MONTANT HT</span>
                <span className="font-bold text-navy text-lg">{formatFCFA(totaux.montantHT)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tva-checkbox"
                    checked={devisData.tvaActive}
                    onChange={(e) => setDevisData(prev => ({ ...prev, tvaActive: e.target.checked }))}
                    className="w-4 h-4 accent-orange cursor-pointer"
                  />
                  <label htmlFor="tva-checkbox" className="font-medium text-bleu cursor-pointer">
                    TVA 18%
                  </label>
                </div>
                <span className="font-bold text-orange">{formatFCFA(totaux.tva)}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t-2 border-orange">
                <span className="font-bold text-navy text-lg">MONTANT TTC</span>
                <span className="font-bold text-orange text-xl">{formatFCFA(totaux.ttc)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF TEMPLATE (caché) */}
      <div ref={pdfRef} className="hidden print:block">
        <div className="p-8 bg-white">
          {/* En-tête PDF */}
          <div className="flex justify-between items-start mb-8 border-b-4 border-orange pb-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-navy rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-white text-sm font-bold">sika</div>
                  <div className="text-white text-[10px] font-medium">INDUSTRIE</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-navy">Abidjan, le {formatDateLong(devisData.date)}</div>
              <div className="text-2xl font-bold text-navy mt-2">DEVIS : {devisData.numero}</div>
            </div>
          </div>

          {/* Informations client */}
          <div className="mb-6">
            <div className="text-sm text-bleu font-medium">CLIENT</div>
            <div className="text-lg font-bold text-navy">{clientSelectionne?.nom || 'Non spécifié'}</div>
            {devisData.objet && (
              <>
                <div className="text-sm text-bleu font-medium mt-2">OBJET</div>
                <div className="text-navy">{devisData.objet}</div>
              </>
            )}
          </div>

          {/* Spécifications */}
          <div className="mb-6 bg-navyClair p-4 rounded-lg">
            <div className="text-sm font-bold text-navy mb-2">SPÉCIFICATIONS PLIAGE</div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-bleu font-medium">Type de tôle:</span>
                <div className="text-navy font-bold">{specifications.typeTole}</div>
              </div>
              <div>
                <span className="text-bleu font-medium">Épaisseur:</span>
                <div className="text-navy font-bold">{specifications.epaisseur} mm</div>
              </div>
              <div>
                <span className="text-bleu font-medium">Nombre de plis:</span>
                <div className="text-navy font-bold">{specifications.nombrePlis}</div>
              </div>
              <div>
                <span className="text-bleu font-medium">Unité de prix:</span>
                <div className="text-navy font-bold">
                  {UNITES_PRIX.find(u => u.value === specifications.unitePrix)?.label}
                </div>
              </div>
            </div>
          </div>

          {/* Tableau PDF */}
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="bg-navy text-white">
                <th className="border border-navy px-4 py-2 text-left text-sm">DESIGNATION</th>
                <th className="border border-navy px-4 py-2 text-center text-sm">QTE</th>
                <th className="border border-navy px-4 py-2 text-right text-sm">PU</th>
                <th className="border border-navy px-4 py-2 text-right text-sm">MONTANT</th>
              </tr>
            </thead>
            <tbody>
              {devisData.lignes.map((ligne, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-navyClair'}>
                  <td className="border border-argent px-4 py-2 text-sm">{ligne.designation}</td>
                  <td className="border border-argent px-4 py-2 text-center text-sm font-bold">{ligne.qte}</td>
                  <td className="border border-argent px-4 py-2 text-right text-sm">{formatFCFA(ligne.pu)}</td>
                  <td className="border border-argent px-4 py-2 text-right text-sm font-bold">{formatFCFA(calculerMontant(ligne))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-navyClair">
                <td colSpan="3" className="border border-navy px-4 py-2 text-right font-bold text-navy">MONTANT HT</td>
                <td className="border border-navy px-4 py-2 text-right font-bold text-navy">{formatFCFA(totaux.montantHT)}</td>
              </tr>
              {devisData.tvaActive && (
                <tr className="bg-orangeClair">
                  <td colSpan="3" className="border border-navy px-4 py-2 text-right font-bold text-orange">TVA 18%</td>
                  <td className="border border-navy px-4 py-2 text-right font-bold text-orange">{formatFCFA(totaux.tva)}</td>
                </tr>
              )}
              <tr className="bg-navy text-white">
                <td colSpan="3" className="border border-navy px-4 py-2 text-right font-bold text-lg">MONTANT TTC</td>
                <td className="border border-navy px-4 py-2 text-right font-bold text-lg">{formatFCFA(totaux.ttc)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Notes et signature */}
          <div className="mb-6">
            <div className="text-sm text-bleu font-medium mb-2">NB : Conditions de paiement</div>
            <div className="text-xs text-navy">
              - Acompte de 30% à la commande<br />
              - Solde à la livraison<br />
              - Délai de paiement : 30 jours
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <div className="text-center">
              <div className="text-sm text-bleu font-medium mb-12">Le Gérant</div>
              <div className="font-bold text-navy border-t-2 border-navy pt-2">KOMLAN AMEMATCHRON</div>
            </div>
          </div>

          {/* Pied de page */}
          <div className="mt-12 pt-4 border-t-2 border-argent text-center text-xs text-bleu">
            <div className="font-bold">SIKA INDUSTRIE — Pliage Industriel</div>
            <div>www.sika-industrie.ci</div>
          </div>
        </div>
      </div>
    </div>
  )
}
