import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '../../components/NotificationProvider'
import { useDevisStore } from '../../store/useDevisStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useClientsStore } from '../../store/useClientsStore'
import { useNotificationsStore } from '../../store/useNotificationsStore'
import ClientSelect from '../../components/ClientSelect'
import { formatDateLong, formatFCFA, generateSecureId } from '../../utils/format'
import { printDevisHTML } from '../../utils/devisTemplate'
import { useNavigate, useLocation } from 'react-router-dom'

const TYPES_SOUDURE = ['TIG', 'MIG/MAG', 'Arc électrique', 'Oxyacétylénique', 'Plasma']
const TYPES_MATERIAU = ['Acier carbone', 'Inox 304', 'Inox 316', 'Aluminium', 'Acier allié']
const POSITIONS_SOUDURE = ['À plat (PA)', 'Horizontale (PC)', 'Verticale (PF)', 'Au plafond (PE)']
const QUALIFICATIONS = ['Soudeur qualifié', 'Soudeur certifié ISO 9606', 'Soudeur spécialisé']

const LIGNE_VIDE = {
  designation: '',
  longueur: 0,
  epaisseur: 0,
  pu: 0,
  montant: ''
}
const nouvelleLigne = () => ({ ...LIGNE_VIDE, id: generateSecureId('LIG') })

export default function DevisSoudure() {
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
    type: 'SOUDURE',
    objet: '',
    notes: '',

    typeSoudure: 'TIG',
    materiau: 'Acier carbone',
    position: 'À plat (PA)',
    qualification: 'Soudeur qualifié',
    controleQualite: true,
    radiographie: false,

    lignes: [nouvelleLigne()],
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
            type: devisExist.type || 'SOUDURE',
            objet: devisExist.objet || '',
            notes: devisExist.notes || '',
            typeSoudure: devisExist.typeSoudure || 'TIG',
            materiau: devisExist.materiau || 'Acier carbone',
            position: devisExist.position || 'À plat (PA)',
            qualification: devisExist.qualification || 'Soudeur qualifié',
            controleQualite: devisExist.controleQualite !== undefined ? devisExist.controleQualite : true,
            radiographie: devisExist.radiographie || false,
            lignes: devisExist.lignes?.length > 0 ? devisExist.lignes.map(l => ({ ...l, longueur: l.longueur || 0, epaisseur: l.epaisseur || 0, pu: l.pu || 0 })) : [nouvelleLigne()],
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
  }, [location.state?.devisId, getDevisById, ajouterNotification])

  const calculerMontant = (ligne) => {
    const longueur = parseFloat(ligne.longueur) || 0
    const pu = parseFloat(ligne.pu) || 0
    return longueur * pu
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

  const modifierLigne = (id, champ, valeur) => {
    setDevisData(prev => ({
      ...prev,
      lignes: prev.lignes.map(l => l.id === id ? { ...l, [champ]: valeur } : l)
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
    if (ok) {
      setDevisData({
        numero: '',
        date: new Date().toISOString().split('T')[0],
        clientId: null,
        type: 'SOUDURE',
        objet: '',
        notes: '',
        typeSoudure: 'TIG',
        materiau: 'Acier carbone',
        position: 'À plat (PA)',
        qualification: 'Soudeur qualifié',
        controleQualite: true,
        radiographie: false,
        lignes: [nouvelleLigne()],
        tauxRemise: 0,
        tvaActive: true,
        statut: 'BROUILLON'
      })
      setDevisId(null)
      // Le useEffect générera automatiquement le nouveau numéro
      addLog({ module: 'DEVIS_SOUDURE', action: 'NOUVEAU', utilisateur: 'Utilisateur' })
    }
  }

  const handleEnregistrer = async () => {
    if (!devisData.clientId) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'ATTENTION',
        message: 'Veuillez sélectionner un client avant d\'enregistrer le devis'
      })
      return
    }

    const saveOk = await confirm({
      title: 'Enregistrer le devis',
      message: `Confirmer l'enregistrement du devis ${devisData.numero || ''} ?`,
      type: 'info',
      confirmText: 'Enregistrer',
      cancelText: 'Annuler'
    })
    if (!saveOk) return

    const totaux = calculerTotaux()
    const devisComplet = { ...devisData, ...totaux, dateModification: new Date().toISOString().split('T')[0] }

    try {
      if (devisId) {
        await updateDevis(devisId, devisComplet)
        addLog({ module: 'DEVIS_SOUDURE', action: 'MODIFICATION', utilisateur: 'Utilisateur', apres: { numero: devisData.numero, montantTTC: totaux.ttc } })
        ajouterNotification({
          type: 'INFO', icone: '✅', titre: 'SUCCÈS',
          message: `Devis ${devisData.numero} modifié - ${formatFCFA(totaux.ttc)}`,
          lien: '/devis/liste'
        })
        navigate('/devis/liste')
      } else {
        const nouveau = await addDevis(devisComplet)
        setDevisId(nouveau.id)
        addLog({ module: 'DEVIS_SOUDURE', action: 'CREATION', utilisateur: 'Utilisateur', apres: { numero: nouveau.numero, montantTTC: totaux.ttc } })
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
    }
  }

  const handleGenerePDF = async () => {
    if (!devisData.clientId) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'ATTENTION',
        message: 'Veuillez sélectionner un client avant de générer le PDF'
      })
      return
    }
    
    const client = clients.find(c => c.id === devisData.clientId);
    const totaux = calculerTotaux();
    
    // Préparer les données pour le template avec tous les détails
    const lignesAvecMontant = devisData.lignes.map(l => ({
      designation: l.designation || `Soudure ${l.typeSoudure || 'TIG'}`,
      typeSoudure: l.typeSoudure,
      materiau: l.materiau,
      epaisseur: l.epaisseur,
      longueur: l.longueur,
      unite: l.epaisseur ? `Ép. ${l.epaisseur}mm` : `${l.longueur || 0}m`,
      qte: parseFloat(l.quantite) || 0,
      pu: parseFloat(l.pu) || 0,
      montant: (parseFloat(l.quantite) || 0) * (parseFloat(l.pu) || 0)
    }));
    
    const templateData = {
      reference: devisData.numero,
      objet: devisData.objet || `Soudure ${devisData.typeSoudure || 'TIG'} - ${devisData.materiau || 'Acier'}`,
      type: 'SOUDURE',
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
    };

    printDevisHTML(templateData);
    
    addLog({ module: 'DEVIS_SOUDURE', action: 'EXPORT_PDF', utilisateur: 'Utilisateur', apres: { numero: devisData.numero } });
    ajouterNotification({
      type: 'INFO',
      icone: '📄',
      titre: 'PDF GÉNÉRÉ',
      message: 'Devis ouvert dans une nouvelle fenêtre pour impression'
    });
  }

  const clientSelectionne = clients.find(c => c.id === devisData.clientId)
  const totaux = calculerTotaux()

  return (
    <div className="min-h-screen bg-navyClair p-6">
      <div className="max-w-6xl mx-auto">
        
        <div className="bg-surface rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-3">
          <button onClick={handleNouveau} className="flex items-center gap-2 px-4 py-2 bg-bleu text-white rounded-lg hover:bg-opacity-90 transition">
            ➕ Nouveau
          </button>
          <button onClick={handleEnregistrer} className="flex items-center gap-2 px-4 py-2 bg-vert text-white rounded-lg hover:bg-opacity-90 transition">
            💾 Enregistrer
          </button>
          <button onClick={handleGenerePDF} className="flex items-center gap-2 px-4 py-2 bg-rouge text-white rounded-lg hover:bg-opacity-90 transition">
            📄 PDF
          </button>
          <button
            onClick={() => setDevisData(prev => ({ ...prev, tvaActive: !prev.tvaActive }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${devisData.tvaActive ? 'bg-vert text-white hover:bg-opacity-90' : 'bg-argent text-navy hover:bg-opacity-80'}`}
          >
            🔄 TVA 18% : {devisData.tvaActive ? 'Activée' : 'Désactivée'}
          </button>
        </div>

        <div className="bg-surface rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">N° Devis</label>
              <input type="text" value={devisData.numero} readOnly className="w-full px-3 py-2 border border-argent rounded-lg bg-navyClair font-bold text-navy" />
              <div className="mt-2">
                <span className="text-xs font-semibold text-bleu uppercase tracking-wide">Type de devis</span>
                <div className="mt-1">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-rouge text-white text-xs font-bold rounded-full uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-surface" />
                    {devisData.type}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Date</label>
              <input type="date" value={devisData.date} onChange={(e) => setDevisData(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-rouge" />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold text-navy mb-2">Client</label>
            <ClientSelect value={devisData.clientId} onChange={(clientId) => setDevisData(prev => ({ ...prev, clientId }))} />
          </div>
          
          {clientSelectionne && (
            <div className="bg-rougeClair border-l-4 border-rouge p-4 rounded mb-4">
              <p className="text-sm text-navy"><strong>{clientSelectionne.nom}</strong> - {clientSelectionne.ville}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-semibold text-navy mb-2">Objet du devis</label>
            <textarea
              value={devisData.objet}
              onChange={(e) => setDevisData(prev => ({ ...prev, objet: e.target.value }))}
              placeholder="Ex: Travaux de soudure sur structure métallique ou tuyauterie industrielle..."
              rows={2}
              className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-rouge font-semibold text-navy resize-none"
            />
          </div>
        </div>

        <div className="bg-surface rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-navy mb-4 border-b-2 border-rouge pb-2">Spécifications Soudure</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Type de soudure</label>
              <select value={devisData.typeSoudure} onChange={(e) => setDevisData(prev => ({ ...prev, typeSoudure: e.target.value }))} className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-rouge">
                {TYPES_SOUDURE.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Matériau</label>
              <select value={devisData.materiau} onChange={(e) => setDevisData(prev => ({ ...prev, materiau: e.target.value }))} className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-rouge">
                {TYPES_MATERIAU.map(mat => <option key={mat} value={mat}>{mat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Position de soudure</label>
              <select value={devisData.position} onChange={(e) => setDevisData(prev => ({ ...prev, position: e.target.value }))} className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-rouge">
                {POSITIONS_SOUDURE.map(pos => <option key={pos} value={pos}>{pos}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Qualification</label>
              <select value={devisData.qualification} onChange={(e) => setDevisData(prev => ({ ...prev, qualification: e.target.value }))} className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-rouge">
                {QUALIFICATIONS.map(qual => <option key={qual} value={qual}>{qual}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={devisData.controleQualite} onChange={(e) => setDevisData(prev => ({ ...prev, controleQualite: e.target.checked }))} className="w-5 h-5 text-rouge focus:ring-rouge" />
              <span className="text-sm text-navy font-semibold">Contrôle qualité</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={devisData.radiographie} onChange={(e) => setDevisData(prev => ({ ...prev, radiographie: e.target.checked }))} className="w-5 h-5 text-rouge focus:ring-rouge" />
              <span className="text-sm text-navy font-semibold">Radiographie</span>
            </label>
          </div>
        </div>

        <div className="bg-surface rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-navy mb-4 border-b-2 border-rouge pb-2">Détail des travaux</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="border border-argent px-4 py-2 text-left">DÉSIGNATION</th>
                  <th className="border border-argent px-4 py-2 text-center w-32">QUANTITÉ</th>
                  <th className="border border-argent px-4 py-2 text-center w-32">ÉPAISSEUR</th>
                  <th className="border border-argent px-4 py-2 text-right w-32">PU (FCFA/m)</th>
                  <th className="border border-argent px-4 py-2 text-right w-32">MONTANT (FCFA)</th>
                  <th className="border border-argent px-4 py-2 text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devisData.lignes.map((ligne, index) => {
                  const montant = calculerMontant(ligne)
                  return (
                    <tr key={ligne.id} className={index % 2 === 0 ? 'bg-surface' : 'bg-navyClair'}>
                      <td className="border border-argent px-4 py-2">
                        <input type="text" value={ligne.designation} onChange={(e) => modifierLigne(ligne.id, 'designation', e.target.value)} className="w-full px-2 py-1 border border-argent rounded focus:outline-none focus:border-rouge" placeholder="Désignation..." />
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <input type="number" step="0.01" value={ligne.longueur} onChange={(e) => modifierLigne(ligne.id, 'longueur', e.target.value)} className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-rouge" />
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <input type="number" step="0.1" value={ligne.epaisseur} onChange={(e) => modifierLigne(ligne.id, 'epaisseur', e.target.value)} className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-rouge" />
                      </td>
                      <td className="border border-argent px-4 py-2">
                        <input type="number" value={ligne.pu || ''} onChange={(e) => modifierLigne(ligne.id, 'pu', e.target.value)} placeholder="0" className="w-full px-2 py-1 border-2 border-rouge rounded text-right font-semibold focus:outline-none focus:ring-2 focus:ring-rouge bg-rougeClair" />
                      </td>
                      <td className="border border-argent px-3 py-2">
                        <input
                          type="number"
                          value={ligne.montant !== '' && ligne.montant !== undefined ? ligne.montant : montant || ''}
                          onChange={(e) => modifierLigne(ligne.id, 'montant', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                          placeholder={montant > 0 ? String(montant) : '0'}
                          min="0" step="1"
                          className="w-full px-2 py-1 border-2 border-navy rounded text-right font-bold text-navy focus:outline-none focus:ring-2 focus:ring-navy bg-navyClair"
                          title="Saisissable — laissez vide pour calculer auto (Longueur × PU)"
                        />
                        {(ligne.montant === '' || ligne.montant === undefined) && montant > 0 && (
                          <div className="text-right text-xs text-gray-400 mt-0.5">= {ligne.longueur}×{ligne.pu}</div>
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
                <input type="number" min="0" max="100" value={devisData.tauxRemise} onChange={(e) => setDevisData(prev => ({ ...prev, tauxRemise: e.target.value }))} className="w-16 px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-rouge" />
                <span className="text-navy">%</span>
              </div>
              <span className="text-lg font-bold text-rouge">- {formatFCFA(totaux.remise)}</span>
            </div>
            
            <div className="flex justify-between items-center bg-rougeClair p-2 rounded">
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

        <div className="bg-surface rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-semibold text-navy mb-2">Notes / Observations</label>
          <textarea
            value={devisData.notes || ''}
            onChange={(e) => setDevisData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full min-h-[120px] px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-rouge resize-vertical"
            placeholder="Ajoutez des notes ou observations ici..."
          />
        </div>

        <div className="hidden">
          <div ref={pdfRef} className="bg-surface p-8" style={{ width: '210mm' }}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-navy mb-2">SIKA INDUSTRIE</h1>
              <h2 className="text-xl text-bleu">DEVIS SOUDURE</h2>
              <p className="text-sm text-navy mt-2">{devisData.numero}</p>
            </div>
            {clientSelectionne && (
              <div className="mb-6">
                <p className="font-bold text-navy">Client : {clientSelectionne.nom}</p>
                <p className="text-sm text-navy">Date : {formatDateLong(devisData.date)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BARRE ACTIONS BAS */}
      <div className="bg-surface border-t-4 border-rouge shadow-lg rounded-lg mt-6 px-4 py-3">
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
            <button onClick={handleGenerePDF} className="flex items-center gap-2 px-4 py-2 bg-rouge text-white rounded-lg hover:bg-opacity-90 transition font-medium text-sm">
              📄 PDF
            </button>
            <button onClick={handleEnregistrer} className="flex items-center gap-2 px-5 py-3 bg-vert text-white rounded-lg hover:bg-opacity-90 transition font-bold text-base shadow-lg">
              💾 Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
