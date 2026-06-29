import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '../../components/NotificationProvider'
import { useDevisStore } from '../../store/useDevisStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useClientsStore } from '../../store/useClientsStore'
import { useNotificationsStore } from '../../store/useNotificationsStore'
import ClientSelect from '../../components/ClientSelect'
import { formatDateLong, formatFCFA, generateSecureId } from '../../utils/format'
import { createSikaPDF, finalizeSikaPDF, sikaTable, formatMontant, formatDate } from '../../utils/printUtils'
import { generateDevisHTML, prepareDevisData, printDevisHTML } from '../../utils/devisTemplate'
import { useNavigate, useLocation } from 'react-router-dom'

const TYPES_PROFIL = ['IPE', 'HEA', 'HEB', 'UPN', 'Tube carré', 'Tube rectangulaire', 'Cornière']
const TRAITEMENTS = ['Galvanisation à chaud', 'Peinture antirouille', 'Métallisation', 'Aucun']

const LIGNE_VIDE = {
  designation: '',
  typeProfil: 'IPE',
  surface: '',
  longueur: 0,
  quantite: 1,
  pu: 0,
  montant: ''
}
const nouvelleLigne = () => ({ ...LIGNE_VIDE, id: generateSecureId('LIG') })

export default function DevisCharpente() {
  const pdfRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { addDevis, updateDevis, getNextNumero, getDevisById } = useDevisStore()
  const { addLog } = useAuditStore()
  const { clients } = useClientsStore()
  const { ajouterNotification } = useNotificationsStore()
  const { confirm } = useNotifications()

  const [devisData, setDevisData] = useState(() => ({
    numero: location.state?.devisId ? '' : getNextNumero(),
    date: new Date().toISOString().split('T')[0],
    clientId: null,
    type: 'CHARPENTE',
    objet: '',
    notes: '',
    portee: 0,
    hauteur: 0,
    traitement: 'Peinture antirouille',

    lignes: [nouvelleLigne()],
    tauxRemise: 0,
    tvaActive: true,
    statut: 'BROUILLON'
  }))

  const [devisId, setDevisId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const loadedDevisIdRef = useRef(null)

  // Charger un devis existant si on vient de la liste avec location.state
  useEffect(() => {
    const idFromState = location.state?.devisId
    if (!idFromState || loadedDevisIdRef.current === idFromState) return

    const devisExist = getDevisById(idFromState)
    if (devisExist) {
      setDevisData({
        numero: devisExist.numero,
        date: devisExist.date || new Date().toISOString().split('T')[0],
        clientId: devisExist.clientId,
        type: devisExist.type || 'CHARPENTE',
        objet: devisExist.objet || '',
        notes: devisExist.notes || '',
        portee: devisExist.portee || 0,
        hauteur: devisExist.hauteur || 0,
        traitement: devisExist.traitement || 'Peinture antirouille',
        lignes: devisExist.lignes?.length > 0 ? devisExist.lignes.map(l => ({ ...l, surface: l.surface || l.dimension || '', quantite: l.quantite || 1, pu: l.pu || 0 })) : [nouvelleLigne()],
        tauxRemise: devisExist.tauxRemise || 0,
        tvaActive: devisExist.tvaActive !== undefined ? devisExist.tvaActive : true,
        statut: devisExist.statut || 'BROUILLON'
      })
      setDevisId(devisExist.id)
      loadedDevisIdRef.current = devisExist.id
    } else {
      console.error('Devis non trouvé avec ID:', idFromState)
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'ERREUR',
        message: 'Devis non trouvé. Il a peut-être été supprimé.'
      })
    }
  // getDevisById est stable dans le store Zustand ; location.state?.devisId est la seule dépendance utile
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.devisId])

  const calculerPoidsLineaire = (ligne) => {
    return 0
  }

  const calculerMontant = (ligne) => {
    if (ligne.montant !== '' && ligne.montant !== undefined && ligne.montant !== null) {
      return parseFloat(ligne.montant) || 0
    }
    const quantite = parseFloat(ligne.quantite) || 1
    const pu = parseFloat(ligne.pu) || 0
    return quantite * pu
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
      lignes: [...prev.lignes, nouvelleLigne()]
    }))
  }

  const supprimerLigne = (id) => {
    if (devisData.lignes.length <= 1) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'VALIDATION',
        message: 'Le devis doit contenir au moins une ligne'
      })
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
          return { ...l, [champ]: valeur }
        }
        return l
      })
    }))
  }

  const handleNouveau = async () => {
    const ok = await confirm({
      title: 'Nouveau devis',
      message: 'Créer un nouveau devis ? Les modifications non enregistrées seront perdues.',
      type: 'warning',
      confirmText: 'Créer',
      cancelText: 'Annuler'
    })
    if (!ok) return
    setDevisData({
      numero: getNextNumero(),
      date: new Date().toISOString().split('T')[0],
      clientId: null,
      type: 'CHARPENTE',
      objet: '',
      notes: '',
      portee: 0,
      hauteur: 0,
      traitement: 'Peinture antirouille',
      lignes: [nouvelleLigne()],
      tauxRemise: 0,
      tvaActive: true,
      statut: 'BROUILLON'
    })
    setDevisId(null)
    addLog({ module: 'DEVIS_CHARPENTE', action: 'NOUVEAU', utilisateur: 'Utilisateur' })
  }

  const handleEnregistrer = async () => {
    if (isSaving) return
    if (!devisData.clientId) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'ATTENTION',
        message: 'Veuillez sélectionner un client avant d\'enregistrer le devis'
      })
      return
    }

    const ok = await confirm({
      title: 'Enregistrer le devis',
      message: `Confirmer l'enregistrement du devis ${devisData.numero || ''} ?`,
      type: 'info',
      confirmText: 'Enregistrer',
      cancelText: 'Annuler'
    })
    if (!ok) return

    setIsSaving(true)
    const totaux = calculerTotaux()
    const devisComplet = { ...devisData, ...totaux, dateModification: new Date().toISOString().split('T')[0] }

    try {
      if (devisId) {
        await updateDevis(devisId, devisComplet)
        addLog({ module: 'DEVIS_CHARPENTE', action: 'MODIFICATION', utilisateur: 'Utilisateur', apres: { numero: devisData.numero, montantTTC: totaux.ttc } })
        ajouterNotification({
          type: 'INFO', icone: '✅', titre: 'SUCCÈS',
          message: `Devis ${devisData.numero} modifié - ${formatFCFA(totaux.ttc)}`,
          lien: '/devis/liste'
        })
        navigate('/devis/liste')
      } else {
        const nouveau = await addDevis(devisComplet)
        setDevisId(nouveau.id)
        addLog({ module: 'DEVIS_CHARPENTE', action: 'CREATION', utilisateur: 'Utilisateur', apres: { numero: nouveau.numero, montantTTC: totaux.ttc } })
        ajouterNotification({
          type: 'INFO', icone: '✅', titre: 'SUCCÈS',
          message: `Devis ${nouveau.numero} enregistré - ${formatFCFA(totaux.ttc)}`,
          lien: '/devis/liste'
        })
        navigate('/devis/liste')
      }
    } catch (error) {
      console.error('Erreur enregistrement:', error)
      ajouterNotification({
        type: 'URGENT', icone: '❌', titre: 'ERREUR ENREGISTREMENT',
        message: `Échec: ${error?.message || 'Erreur inconnue'}`
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerePDF = async () => {
    if (isGeneratingPDF) return
    if (!devisData.clientId) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'VALIDATION',
        message: 'Veuillez sélectionner un client avant de générer le PDF'
      })
      return
    }

    setIsGeneratingPDF(true)
    try {
      const client = clients.find(c => c.id === devisData.clientId)
      const totaux = calculerTotaux()

      // Préparer les données pour le template avec tous les détails
      const lignesAvecMontant = devisData.lignes.map(l => ({
        designation: l.designation || `Profil ${l.typeProfil || 'IPE'}`,
        typeProfil: l.typeProfil,
        surface: l.surface,
        longueur: l.longueur,
        dn: l.surface || l.longueur ? `${l.longueur || 0}m - ${l.surface || ''}` : '—',
        qte: parseFloat(l.quantite) || 0,
        pu: parseFloat(l.pu) || 0,
        montant: (parseFloat(l.quantite) || 0) * (parseFloat(l.pu) || 0)
      }))

      const templateData = {
        reference: devisData.numero,
        objet: devisData.objet || `Charpente Métallique - Portée ${devisData.portee || 0}m`,
        type: 'CHARPENTE',
        notes: devisData.notes || '',
        statut: devisData.statut || 'BROUILLON',
        client: {
          nom: client?.nom || '—',
          interlocuteur: devisData.demandePar || client?.contactNom || '—',
          adresse: client?.adresse || '—',
          telephone: client?.telephone || '',
          email: client?.contactEmail || '',
          raisonSociale: client?.raisonSociale || '',
          secteur: client?.secteur || '',
          ville: client?.ville || '',
          pays: client?.pays || 'Côte d\'Ivoire',
          conditionsPaiement: client?.conditionsPaiement || ''
        },
        infos: {
          date: devisData.date,
          validite: '30 jours',
          etabliPar: 'SIKA INDUSTRIE',
          tel: '(225) 07 97 25 25 26',
          demandePar: devisData.demandePar || ''
        },
        lignes: lignesAvecMontant,
        montantBrut: totaux.montantBrut,
        remise: totaux.remise,
        montantHT: totaux.montantHT,
        tva: totaux.tva,
        ttc: totaux.ttc
      }

      printDevisHTML(templateData)

      addLog({ module: 'DEVIS_CHARPENTE', action: 'EXPORT_PDF', utilisateur: 'Utilisateur', apres: { numero: devisData.numero } })
      ajouterNotification({
        type: 'INFO',
        icone: '📄',
        titre: 'PDF GÉNÉRÉ',
        message: 'Devis ouvert dans une nouvelle fenêtre pour impression'
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const clientSelectionne = clients.find(c => c.id === devisData.clientId)
  const totaux = calculerTotaux()

  return (
    <div className="min-h-screen bg-navyClair p-6">
      <div className="max-w-6xl mx-auto">
        
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-3">
          <button onClick={handleNouveau} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-bleu text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50">
            ➕ Nouveau
          </button>
          <button onClick={handleEnregistrer} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-vert text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50">
            {isSaving ? '⏳ Enregistrement...' : '💾 Enregistrer'}
          </button>
          <button onClick={handleGenerePDF} disabled={isGeneratingPDF} className="flex items-center gap-2 px-4 py-2 bg-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50">
            {isGeneratingPDF ? '⏳ PDF...' : '📄 PDF'}
          </button>
          <button
            onClick={() => setDevisData(prev => ({ ...prev, tvaActive: !prev.tvaActive }))}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${devisData.tvaActive ? 'bg-vert text-white hover:bg-opacity-90' : 'bg-argent text-navy hover:bg-opacity-80'} disabled:opacity-50`}
          >
            🔄 TVA 18% : {devisData.tvaActive ? 'Activée' : 'Désactivée'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">N° Devis</label>
              <input type="text" value={devisData.numero} readOnly className="w-full px-3 py-2 border border-argent rounded-lg bg-navyClair font-bold text-navy" />
              <div className="mt-2">
                <span className="inline-block px-3 py-1 bg-orange text-white text-xs font-bold rounded-full uppercase tracking-wide">
                  {devisData.type}
                </span>
              </div>
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

          <div className="mb-4">
            <label className="block text-sm font-semibold text-navy mb-2">Notes / Observations</label>
            <textarea
              value={devisData.notes || ''}
              onChange={(e) => setDevisData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Informations complémentaires, remarques, conditions particulières..."
              className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
            />
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
                  <th className="border border-argent px-4 py-2 text-center w-40">SURFACE</th>
                  <th className="border border-argent px-4 py-2 text-center w-24">QTÉ</th>
                  <th className="border border-argent px-4 py-2 text-right w-36">PU (FCFA/m)</th>
                  <th className="border border-argent px-4 py-2 text-right w-36">MONTANT (FCFA)</th>
                  <th className="border border-argent px-4 py-2 text-center w-24">Actions</th>
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
                        <input type="text" value={ligne.surface} onChange={(e) => modifierLigne(ligne.id, 'surface', e.target.value)} className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-orange" placeholder="m²..." />
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <input type="number" value={ligne.quantite} onChange={(e) => modifierLigne(ligne.id, 'quantite', e.target.value)} className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-orange" />
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <input type="number" value={ligne.pu || ''} onChange={(e) => modifierLigne(ligne.id, 'pu', e.target.value)} placeholder="0" className="w-full px-2 py-1 border-2 border-orange rounded text-right font-semibold focus:outline-none focus:ring-2 focus:ring-orange bg-orangeClair" />
                      </td>
                      <td className="border border-argent px-3 py-2">
                        <input
                          type="number"
                          value={ligne.montant !== '' && ligne.montant !== undefined ? ligne.montant : montant || ''}
                          onChange={(e) => modifierLigne(ligne.id, 'montant', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                          placeholder={montant > 0 ? String(montant) : '0'}
                          min="0" step="1"
                          className="w-full px-2 py-1 border-2 border-navy rounded text-right font-bold text-navy focus:outline-none focus:ring-2 focus:ring-navy bg-navyClair"
                          title="Saisissable — laissez vide pour calculer auto (Qte × PU)"
                        />
                        {(ligne.montant === '' || ligne.montant === undefined) && montant > 0 && (
                          <div className="text-right text-xs text-gray-400 mt-0.5">= {ligne.quantite}×{ligne.pu}</div>
                        )}
                      </td>
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
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-navy font-semibold">REMISE</span>
                <input type="number" min="0" max="100" value={devisData.tauxRemise} onChange={(e) => setDevisData(prev => ({ ...prev, tauxRemise: e.target.value }))} className="w-16 px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-orange" />
                <span className="text-navy">%</span>
              </div>
              <span className="text-lg font-bold text-rouge">- {formatFCFA(totaux.remise)}</span>
            </div>
            
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
              <h2 className="text-xl text-bleu">DEVIS CHARPENTE MÉTALLIQUE</h2>
              <p className="text-sm text-navy mt-2">{devisData.numero}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BARRE ACTIONS BAS */}
      <div className="bg-white border-t-4 border-orange shadow-lg rounded-lg mt-6 px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleNouveau} className="flex items-center gap-2 px-4 py-2 bg-bleu text-white rounded-lg hover:bg-opacity-90 transition font-medium text-sm">
              ➕ Nouveau
            </button>
            <button
              onClick={() => setDevisData(prev => ({ ...prev, tvaActive: !prev.tvaActive }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${devisData.tvaActive ? 'bg-vert text-white hover:bg-opacity-90' : 'bg-argent text-navy hover:bg-opacity-80'}`}
            >
              🔄 TVA : {devisData.tvaActive ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-navy font-bold text-sm hidden sm:block">TTC : {formatFCFA(totaux.ttc)}</span>
            <button onClick={handleGenerePDF} disabled={isGeneratingPDF} className="flex items-center gap-2 px-4 py-2 bg-orange text-white rounded-lg hover:bg-opacity-90 transition font-medium text-sm disabled:opacity-50">
              {isGeneratingPDF ? '⏳ PDF...' : '📄 PDF'}
            </button>
            <button onClick={handleEnregistrer} disabled={isSaving} className="flex items-center gap-2 px-5 py-3 bg-vert text-white rounded-lg hover:bg-opacity-90 transition font-bold text-base shadow-lg disabled:opacity-50">
              {isSaving ? '⏳ Enregistrement...' : '💾 Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
