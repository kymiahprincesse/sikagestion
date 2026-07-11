import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '../../components/NotificationProvider'
import { useDevisStore } from '../../store/useDevisStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useClientsStore } from '../../store/useClientsStore'
import { useNotificationsStore } from '../../store/useNotificationsStore'
import ClientSelect from '../../components/ClientSelect'
import { formatDateLong, formatFCFA, safeParseFloat, generateSecureId } from '../../utils/format'
import { printDevisHTML } from '../../utils/devisTemplate'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDuplicatePrevention } from '../../hooks/useDuplicatePrevention'

const DESIGNATIONS_PREDEFINES = [
  'CONDUITE HUILE ROUGE',
  'CONDUITE VAPEUR ET HUILE ROUGE',
  'CONDUITE VAPEUR',
  'ROBINETTERIE',
  'ACCESSOIRES',
  'BRIDE',
  'COUDE',
  'MANCHON',
  'TEE',
  'VANNE'
]

const LIGNE_VIDE = {
  designation: '',
  ml: 0,
  pt: 0,
  qte: 0,
  qteManuelle: false,
  pu: 0,
  montant: ''
}
const nouvelleLigne = () => ({ ...LIGNE_VIDE, id: generateSecureId('LIG') })

export default function DevisCalorifuge() {
  const pdfRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { addDevis, updateDevis, getNextNumero, getDevisById, devis } = useDevisStore()
  const { addLog } = useAuditStore()
  const { clients } = useClientsStore()
  const { ajouterNotification } = useNotificationsStore()
  const { confirm } = useNotifications()

  // ═══ SYSTÈME DE PRÉVENTION DES DOUBLONS ═══
  const duplicatePrevention = useDuplicatePrevention('devis', devis, {
    délaiAntiDoubleClic: 3000,
    onDoublonDetecté: (result) => {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'DOUBLON DÉTECTÉ',
        message: result.raison,
        lien: '/devis/liste'
      });
    }
  });
  // ════════════════════════════════════════

  const [devisData, setDevisData] = useState(() => ({
    numero: '',
    date: new Date().toISOString().split('T')[0],
    clientId: null,
    type: 'CALORIFUGE',
    demandePar: '',
    objet: '',
    notes: '',
    lignes: [nouvelleLigne()],
    tauxRemise: 0,
    tvaActive: true,
    statut: 'BROUILLON'
  }))

  const [devisId, setDevisId] = useState(null)
  const [showDesignationSuggestions, setShowDesignationSuggestions] = useState({})
  const [designationSearch, setDesignationSearch] = useState({})

  // Générer le numéro après le montage (évite setState pendant le render)
  useEffect(() => {
    if (!devisData.numero && !location.state?.devisId) {
      setDevisData(prev => ({ ...prev, numero: getNextNumero() }))
    }
  }, [devisData.numero, location.state?.devisId, getNextNumero])

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
            type: devisExist.type || 'CALORIFUGE',
            demandePar: devisExist.demandePar || '',
            objet: devisExist.objet || '',
            notes: devisExist.notes || '',
            lignes: devisExist.lignes?.length > 0 ? devisExist.lignes : [nouvelleLigne()],
            tauxRemise: devisExist.tauxRemise || 0,
            tvaActive: devisExist.tvaActive !== undefined ? devisExist.tvaActive : true,
            statut: devisExist.statut || 'BROUILLON'
          })
          setDevisId(devisExist.id)
        } else {
          console.error('Devis non trouvé avec ID:', location.state.devisId)
          ajouterNotification({
            type: 'ATTENTION',
            icone: '⚠️',
            titre: 'ERREUR',
            message: 'Devis non trouvé. Il a peut-être été supprimé.'
          })
        }
      }
    }
    loadDevis()
  }, [location.state, location.state?.devisId, getDevisById])

  // Calculs automatiques avec synchronisation QTE/ML/PT
  const calculerQte = (ligne) => {
    if (ligne.qteManuelle) {
      return safeParseFloat(ligne.qte, 0)
    }
    const ml = safeParseFloat(ligne.ml, 0)
    const pt = safeParseFloat(ligne.pt, 0)
    return ml + pt
  }

  const synchroniserQte = (ligneId, champ, valeur) => {
    const ligne = devisData.lignes.find(l => l.id === ligneId)
    if (!ligne) return

    if (champ === 'qte') {
      const nouvelleQte = safeParseFloat(valeur, 0)
      const ml = safeParseFloat(ligne.ml, 0)
      const pt = safeParseFloat(ligne.pt, 0)
      const totalActuel = ml + pt

      if (nouvelleQte !== totalActuel) {
        const diff = nouvelleQte - totalActuel
        if (ml >= pt) {
          setDevisData(prev => ({
            ...prev,
            lignes: prev.lignes.map(l => 
              l.id === ligneId ? { ...l, ml: Math.max(0, ml + diff) } : l
            )
          }))
        } else {
          setDevisData(prev => ({
            ...prev,
            lignes: prev.lignes.map(l => 
              l.id === ligneId ? { ...l, pt: Math.max(0, pt + diff) } : l
            )
          }))
        }
      }
    } else if (champ === 'ml' || champ === 'pt') {
      const ml = champ === 'ml' ? safeParseFloat(valeur, 0) : safeParseFloat(ligne.ml, 0)
      const pt = champ === 'pt' ? safeParseFloat(valeur, 0) : safeParseFloat(ligne.pt, 0)
      const nouvelleQte = ml + pt
      setDevisData(prev => ({
        ...prev,
        lignes: prev.lignes.map(l => 
          l.id === ligneId ? { ...l, qte: nouvelleQte } : l
        )
      }))
    }
  }

  const calculerMontant = (ligne) => {
    if (ligne.montant !== '' && ligne.montant !== undefined && ligne.montant !== null) {
      return safeParseFloat(ligne.montant, 0)
    }
    const qte = calculerQte(ligne)
    const pu = safeParseFloat(ligne.pu, 0)
    return qte * pu
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

  // Gestion des lignes
  const ajouterLigne = () => {
    setDevisData(prev => ({
      ...prev,
      lignes: [...prev.lignes, nouvelleLigne()]
    }))
  }

  const supprimerLigne = async (id) => {
    if (devisData.lignes.length <= 1) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'VALIDATION',
        message: 'Le devis doit contenir au moins une ligne'
      })
      return
    }

    const ok = await confirm({
      title: 'Supprimer la ligne',
      message: 'Voulez-vous vraiment supprimer cette ligne du devis ?',
      type: 'warning',
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    })
    if (!ok) return

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

  // Autocomplétion désignation
  const filtrerDesignations = (search) => {
    if (!search || search.length < 2) return []
    return DESIGNATIONS_PREDEFINES.filter(d => 
      d.toLowerCase().includes(search.toLowerCase())
    )
  }

  const selectionnerDesignation = (ligneId, designation) => {
    modifierLigne(ligneId, 'designation', designation)
    setShowDesignationSuggestions(prev => ({ ...prev, [ligneId]: false }))
    setDesignationSearch(prev => ({ ...prev, [ligneId]: '' }))
  }

  // Validation
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
      const pu = parseFloat(ligne.pu) || 0
      if (pu <= 0) {
        erreurs.push(`Ligne ${index + 1}: Le prix unitaire doit être supérieur à 0`)
      }
    })

    if (erreurs.length > 0) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'ERREURS DE VALIDATION',
        message: erreurs.join(', ')
      })
      return false
    }

    return true
  }

  // Actions
  const nouveauDevis = async () => {
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
      type: 'CALORIFUGE',
      demandePar: '',
      objet: '',
      notes: '',
      lignes: [nouvelleLigne()],
      tauxRemise: 0,
      tvaActive: true,
      statut: 'BROUILLON'
    })
    setDevisId(null)
  }

  const enregistrerDevis = async () => {
    const saveOk = await confirm({
      title: 'Enregistrer le devis',
      message: `Confirmer l'enregistrement du devis ${devisData.numero || ''} ?`,
      type: 'info',
      confirmText: 'Enregistrer',
      cancelText: 'Annuler'
    })
    if (!saveOk) return

    const totaux = calculerTotaux()
    const devisComplet = {
      ...devisData,
      montantBrut: totaux.montantBrut,
      remise: totaux.remise,
      montantHT: totaux.montantHT,
      montantTVA: totaux.tva,
      montantTTC: totaux.ttc
    }

    // ═══ VÉRIFICATION DES DOUBLONS AVANT ENREGISTREMENT ═══
    if (!devisId) {
      const validation = duplicatePrevention.vérifierDoublon(devisComplet);
      if (validation.estDoublon) {
        ajouterNotification({
          type: 'ATTENTION',
          icone: '⚠️',
          titre: 'DOUBLON DÉTECTÉ',
          message: `${validation.message}. Devis existant: ${validation.doublonDetecté?.numero || 'N/A'}`,
          lien: '/devis/liste'
        });
        return;
      }
    }
    // ═══════════════════════════════════════════════════

    if (devisId) {
      updateDevis(devisId, devisComplet)
      addLog({
        module: 'devis',
        action: 'UPDATE',
        apres: devisComplet,
        impactFinancier: totaux.ttc
      })
      ajouterNotification({
        type: 'INFO',
        icone: '✅',
        titre: 'SUCCÈS',
        message: `Devis ${devisData.numero} modifié avec succès - Montant: ${formatFCFA(totaux.ttc)}`,
        lien: '/devis/liste'
      })
      navigate('/devis/liste')
    } else {
      const nouveau = await addDevis(devisComplet)
      setDevisId(nouveau.id)
      addLog({
        module: 'devis',
        action: 'CREATE',
        apres: nouveau,
        impactFinancier: totaux.ttc
      })
      ajouterNotification({
        type: 'INFO',
        icone: '✅',
        titre: 'SUCCÈS',
        message: `Devis ${nouveau.numero} enregistré avec succès - Montant: ${formatFCFA(totaux.ttc)}`,
        lien: '/devis/liste'
      })
      navigate('/devis/liste')
    }
  }

  const genererPDF = async () => {
    if (!validerDevis()) return

    const totaux = calculerTotaux()
    const devisComplet = {
      ...devisData,
      montantBrut: totaux.montantBrut,
      remise: totaux.remise,
      montantHT: totaux.montantHT,
      montantTVA: totaux.tva,
      montantTTC: totaux.ttc,
      statut: 'VALIDE'
    }

    if (!devisId) {
      const nouveau = addDevis(devisComplet)
      setDevisId(nouveau.id)
    } else {
      updateDevis(devisId, devisComplet)
    }

    addLog({
      module: 'devis',
      action: 'PDF_GENERATE',
      apres: devisComplet,
      impactFinancier: totaux.ttc
    })

    try {
      const client = clients.find(c => c.id === devisData.clientId);
      
      // Préparer les données pour le template avec tous les détails
      const lignesAvecMontant = devisData.lignes.map(l => ({
        ...l,
        designation: l.designation || 'Ligne calorifuge',
        montant: calculerMontant(l)
      }));
      
      const templateData = {
        reference: devisData.numero,
        objet: devisData.objet || 'Calorifuge',
        type: 'CALORIFUGE',
        notes: devisData.notes || '',
        statut: devisData.statut || 'BROUILLON',
        client: {
          nom: client?.nom || '—',
          interlocuteur: devisData.demandePar || client?.contactNom || '—',
          site: client?.ville || '—'
        },
        infos: {
          date: devisData.date,
          validite: '30 jours',
          etabliPar: 'SIKA INDUSTRIE',
          tel: '(225) 07 97 25 25 26'
        },
        lignes: lignesAvecMontant,
        montantBrut: totaux.montantBrut,
        remise: totaux.remise,
        montantHT: totaux.montantHT,
        tva: totaux.tva,
        ttc: totaux.ttc
      };

      printDevisHTML(templateData);
      
      ajouterNotification({
        type: 'INFO',
        icone: '📄',
        titre: 'PDF GÉNÉRÉ',
        message: 'Devis ouvert dans une nouvelle fenêtre pour impression'
      });
    } catch (error) {
      console.error('Erreur PDF:', error);
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR PDF',
        message: 'Erreur lors de la génération: ' + error.message
      });
    }
  }

  const envoyerEmail = () => {
    if (!validerDevis()) return
    ajouterNotification({
      type: 'INFO',
      icone: '📧',
      titre: 'INFO',
      message: 'Fonctionnalité d\'envoi par email à implémenter'
    })
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
            📄 Générer PDF
          </button>
          <button
            onClick={envoyerEmail}
            className="px-4 py-2 bg-bleu text-white rounded-lg hover:bg-bleu/90 transition-colors font-medium"
          >
            📧 Email
          </button>
          <button
            onClick={() => setDevisData(prev => ({ ...prev, tvaActive: !prev.tvaActive }))}
            className={`px-4 py-2 rounded-lg hover:opacity-90 transition-colors font-medium ${devisData.tvaActive ? 'bg-vert text-white' : 'bg-argent text-navy'}`}
          >
            🔄 TVA 18% : {devisData.tvaActive ? 'Activée' : 'Désactivée'}
          </button>
        </div>
      </div>

      {/* FORMULAIRE */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* EN-TÊTE */}
        <div className="border-b-2 border-orange pb-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="text-navy">
              <div className="text-3xl font-bold">SIKA</div>
              <div className="text-sm font-medium">INDUSTRIE</div>
            </div>
            <div className="text-navy text-right">
              <div className="text-3xl font-bold">SIKA</div>
              <div className="text-sm font-medium">INDUSTRIE</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <label className="text-sm font-medium text-bleu block mb-1">Date</label>
              <input
                type="date"
                value={devisData.date}
                onChange={(e) => setDevisData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              />
              <div className="text-sm text-navy mt-1">{formatDateLong(devisData.date)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-bleu block mb-1">N° Devis</label>
              <input
                type="text"
                value={devisData.numero}
                readOnly
                className="w-full px-4 py-2 border border-argent rounded-lg bg-navyClair font-bold text-navy"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <ClientSelect
              value={devisData.clientId}
              onChange={(id) => setDevisData(prev => ({ ...prev, clientId: id }))}
              clients={clients}
            />
            <div>
              <label className="text-sm font-medium text-bleu block mb-1">A la demande de</label>
              <input
                type="text"
                value={devisData.demandePar}
                onChange={(e) => setDevisData(prev => ({ ...prev, demandePar: e.target.value }))}
                placeholder="Nom du contact client"
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              />
            </div>
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
            <div>
              <label className="text-sm font-medium text-bleu block mb-1">NOTES / OBSERVATIONS</label>
              <textarea
                value={devisData.notes || ''}
                onChange={(e) => setDevisData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Informations complémentaires, conditions particulières, remarques client..."
                rows={3}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              />
            </div>
          </div>
        </div>

        {/* TABLEAU DE SAISIE */}
        <div className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="border border-argent px-4 py-3 text-left text-sm font-bold">DESIGNATION</th>
                  <th className="border border-argent px-2 py-3 text-center text-sm font-bold w-24">ML</th>
                  <th className="border border-argent px-2 py-3 text-center text-sm font-bold w-24">PT</th>
                  <th className="border border-argent px-2 py-3 text-center text-sm font-bold w-28">QTE</th>
                  <th className="border border-argent px-2 py-3 text-center text-sm font-bold w-32">PU</th>
                  <th className="border border-argent px-2 py-3 text-center text-sm font-bold w-36">MONTANT</th>
                  <th className="border border-argent px-2 py-3 text-center text-sm font-bold w-40">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {devisData.lignes.map((ligne, index) => {
                  const qte = calculerQte(ligne)
                  const pu = safeParseFloat(ligne.pu, 0)
                  const montantAuto = qte * pu
                  const suggestions = filtrerDesignations(designationSearch[ligne.id] || ligne.designation)
 
                  return (
                    <tr key={ligne.id} className="hover:bg-orangeClair transition-colors">
                      <td className="border border-argent px-3 py-3">
                        <div className="relative flex flex-col gap-2">
                          <input
                            type="text"
                            value={ligne.designation}
                            onChange={(e) => {
                              modifierLigne(ligne.id, 'designation', e.target.value)
                              setDesignationSearch(prev => ({ ...prev, [ligne.id]: e.target.value }))
                              setShowDesignationSuggestions(prev => ({ ...prev, [ligne.id]: true }))
                            }}
                            onFocus={() => setShowDesignationSuggestions(prev => ({ ...prev, [ligne.id]: true }))}
                            placeholder="Saisir ou sélectionner la désignation..."
                            className="w-full px-2 py-1.5 border border-argent rounded focus:outline-none focus:ring-1 focus:ring-orange font-medium"
                          />
                          {showDesignationSuggestions[ligne.id] && suggestions.length > 0 && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setShowDesignationSuggestions(prev => ({ ...prev, [ligne.id]: false }))}
                              />
                              <div className="absolute z-20 w-full mt-1 bg-white border border-orange rounded shadow-lg max-h-48 overflow-y-auto">
                                {suggestions.map((designation, i) => (
                                  <button
                                    key={i}
                                    onClick={() => selectionnerDesignation(ligne.id, designation)}
                                    className="w-full px-3 py-2 text-left hover:bg-orangeClair transition-colors border-b border-argent last:border-b-0 text-sm"
                                  >
                                    {designation}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="border border-argent px-2 py-2">
                        <input
                          type="number"
                          value={ligne.ml || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            modifierLigne(ligne.id, 'ml', val)
                            synchroniserQte(ligne.id, 'ml', val)
                          }}
                          min="0"
                          step="0.01"
                          placeholder="0"
                          className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:ring-1 focus:ring-orange font-semibold text-bleu"
                        />
                      </td>
                      <td className="border border-argent px-2 py-2">
                        <input
                          type="number"
                          value={ligne.pt || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            modifierLigne(ligne.id, 'pt', val)
                            synchroniserQte(ligne.id, 'pt', val)
                          }}
                          min="0"
                          step="0.01"
                          placeholder="0"
                          className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:ring-1 focus:ring-orange font-semibold text-bleu"
                        />
                      </td>
                      <td className="border border-argent px-2 py-2 bg-navyClair">
                        <input
                          type="number"
                          value={qte}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            modifierLigne(ligne.id, 'qte', val)
                            modifierLigne(ligne.id, 'qteManuelle', true)
                            synchroniserQte(ligne.id, 'qte', val)
                          }}
                          onBlur={() => {
                            modifierLigne(ligne.id, 'qteManuelle', false)
                          }}
                          min="0"
                          step="0.01"
                          className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:ring-1 focus:ring-orange font-bold text-navy bg-white"
                          title="Saisir la quantité - ML et PT se synchroniseront automatiquement"
                        />
                      </td>
                      <td className="border border-argent px-2 py-2">
                        <input
                          type="number"
                          value={ligne.pu}
                          onChange={(e) => modifierLigne(ligne.id, 'pu', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="1"
                          className="w-full px-2 py-1 border border-argent rounded text-right focus:outline-none focus:ring-1 focus:ring-orange"
                        />
                      </td>
                      <td className="border border-argent px-2 py-2 bg-orangeClair">
                        <input
                          type="number"
                          value={ligne.montant !== '' && ligne.montant !== undefined && ligne.montant !== null ? ligne.montant : montantAuto || ''}
                          onChange={(e) => modifierLigne(ligne.id, 'montant', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                          placeholder={montantAuto > 0 ? String(montantAuto) : '0'}
                          min="0"
                          step="1"
                          className="w-full px-2 py-1 border border-orange rounded text-right font-bold text-navy focus:outline-none focus:ring-1 focus:ring-orange bg-white"
                          title="Saisissable — laissez vide pour calculer automatiquement (Qte x PU)"
                        />
                        {(ligne.montant === '' || ligne.montant === undefined || ligne.montant === null) && montantAuto > 0 && (
                          <div className="text-right text-xs text-gray-400 mt-0.5">= {qte}x{pu}</div>
                        )}
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
          <div className="w-full md:w-1/2 bg-navyClair border-l-4 border-orange p-4 rounded-r-lg">
            <div className="space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-argent">
                <span className="text-sm font-medium text-bleu">MONTANT BRUT HT</span>
                <span className="text-lg font-bold text-navy">{formatFCFA(totaux.montantBrut)}</span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-navy">REMISE</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={devisData.tauxRemise}
                    onChange={(e) => setDevisData(prev => ({ ...prev, tauxRemise: e.target.value }))}
                    className="w-16 px-2 py-1 border border-argent rounded text-center focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                  <span className="text-navy">%</span>
                </div>
                <span className="font-bold text-rouge">- {formatFCFA(totaux.remise)}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-argent bg-orange bg-opacity-20 p-2 rounded">
                <span className="font-bold text-navy">MONTANT TOTAL HT</span>
                <span className="font-bold text-navy text-lg">{formatFCFA(totaux.montantHT)}</span>
              </div>

              {devisData.tvaActive && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-bleu">TVA (18%)</span>
                  <span className="text-lg font-bold text-orange">{formatFCFA(totaux.tva)}</span>
                </div>
              )}

              <div className="border-t-2 border-orange pt-2 flex justify-between items-center">
                <span className="text-base font-bold text-navy">MONTANT TTC</span>
                <span className="text-xl font-bold text-navy">{formatFCFA(totaux.ttc)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BARRE ACTIONS BAS */}
      <div className="bg-white border-t-4 border-orange shadow-lg rounded-lg mt-6 px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={nouveauDevis} className="flex items-center gap-2 px-4 py-2 bg-bleu text-white rounded-lg hover:bg-opacity-90 transition font-medium text-sm">
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
            <button onClick={genererPDF} className="flex items-center gap-2 px-4 py-2 bg-orange text-white rounded-lg hover:bg-opacity-90 transition font-medium text-sm">
              📄 PDF
            </button>
            <button onClick={enregistrerDevis} className="flex items-center gap-2 px-5 py-3 bg-vert text-white rounded-lg hover:bg-opacity-90 transition font-bold text-base shadow-lg">
              💾 Enregistrer
            </button>
          </div>
        </div>
      </div>

      {/* PDF TEMPLATE (caché) */}
      <div ref={pdfRef} className="hidden print:block">
        <div className="p-8 bg-white">
          {/* En-tête PDF */}
          <div className="flex justify-between items-start mb-8 border-b-4 border-orange pb-4">
            <div className="text-navy">
              <div className="text-4xl font-bold">SIKA</div>
              <div className="text-lg font-medium">INDUSTRIE</div>
              <div className="text-xs mt-2">Calorifugeage Industriel</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-navy">DEVIS</div>
              <div className="text-sm text-bleu mt-1">{devisData.numero}</div>
              <div className="text-sm text-navy mt-1">{formatDateLong(devisData.date)}</div>
            </div>
          </div>

          {/* Informations client */}
          <div className="mb-6">
            <div className="text-sm text-bleu font-medium">CLIENT</div>
            <div className="text-lg font-bold text-navy">{clientSelectionne?.nom || 'Non spécifié'}</div>
            {devisData.demandePar && (
              <>
                <div className="text-sm text-bleu font-medium mt-2">A la demande de</div>
                <div className="text-navy">{devisData.demandePar}</div>
              </>
            )}
            {devisData.objet && (
              <>
                <div className="text-sm text-bleu font-medium mt-2">OBJET</div>
                <div className="text-navy">{devisData.objet}</div>
              </>
            )}
          </div>

          {/* Tableau PDF */}
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="bg-navy text-white">
                <th className="border border-navy px-3 py-2 text-left text-sm">DESIGNATION</th>
                <th className="border border-navy px-3 py-2 text-center text-sm w-20">ML</th>
                <th className="border border-navy px-3 py-2 text-center text-sm w-20">PT</th>
                <th className="border border-navy px-3 py-2 text-center text-sm w-24">QTE</th>
                <th className="border border-navy px-3 py-2 text-right text-sm w-28">PU</th>
                <th className="border border-navy px-3 py-2 text-right text-sm w-32">MONTANT</th>
              </tr>
            </thead>
            <tbody>
              {devisData.lignes.map((ligne, index) => {
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-navyClair'}>
                    <td className="border border-argent px-3 py-2 text-sm">{ligne.designation}</td>
                    <td className="border border-argent px-3 py-2 text-center text-sm font-semibold">{ligne.ml || '—'}</td>
                    <td className="border border-argent px-3 py-2 text-center text-sm font-semibold">{ligne.pt || '—'}</td>
                    <td className="border border-argent px-3 py-2 text-center text-sm font-bold">{calculerQte(ligne)}</td>
                    <td className="border border-argent px-3 py-2 text-right text-sm">{formatFCFA(ligne.pu)}</td>
                    <td className="border border-argent px-3 py-2 text-right text-sm font-bold">{formatFCFA(calculerMontant(ligne))}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-navyClair">
                <td colSpan="5" className="border border-navy px-3 py-2 text-right font-bold text-navy">MONTANT BRUT HT</td>
                <td className="border border-navy px-3 py-2 text-right font-bold text-navy">{formatFCFA(totaux.montantBrut)}</td>
              </tr>
              {devisData.tauxRemise > 0 && (
                <tr className="bg-white">
                  <td colSpan="5" className="border border-navy px-3 py-2 text-right font-bold text-rouge">REMISE {devisData.tauxRemise}%</td>
                  <td className="border border-navy px-3 py-2 text-right font-bold text-rouge">- {formatFCFA(totaux.remise)}</td>
                </tr>
              )}
              <tr className="bg-orangeClair">
                <td colSpan="5" className="border border-navy px-3 py-2 text-right font-bold text-navy">MONTANT TOTAL HT</td>
                <td className="border border-navy px-3 py-2 text-right font-bold text-navy">{formatFCFA(totaux.montantHT)}</td>
              </tr>
              {devisData.tvaActive && (
                <tr className="bg-white">
                  <td colSpan="5" className="border border-navy px-3 py-2 text-right font-bold text-orange">TVA (18%)</td>
                  <td className="border border-navy px-3 py-2 text-right font-bold text-orange">{formatFCFA(totaux.tva)}</td>
                </tr>
              )}
              <tr className="bg-navy text-white">
                <td colSpan="5" className="border border-navy px-3 py-2 text-right font-bold text-lg">MONTANT TTC</td>
                <td className="border border-navy px-3 py-2 text-right font-bold text-lg">{formatFCFA(totaux.ttc)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Notes et signature */}
            <div className="text-xs text-navy">
              - Délai de validité du devis : 30 jours
            </div>

          <div className="flex justify-end mt-8">
            <div className="text-center">
              <div className="text-sm text-bleu font-medium mb-12">Le Gérant</div>
              <div className="font-bold text-navy border-t-2 border-navy pt-2">KOMLAN AMEMATCHRON</div>
            </div>
          </div>

          {/* Pied de page */}
          <div className="mt-12 pt-4 border-t-2 border-argent text-center text-xs text-bleu">
            <div className="font-bold">SIKA INDUSTRIE — Confidential</div>
            <div>www.sika-industrie.ci</div>
          </div>
        </div>
      </div>
    </div>
  )
}
