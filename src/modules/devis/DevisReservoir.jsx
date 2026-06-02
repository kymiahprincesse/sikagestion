import { useState, useRef, useEffect } from 'react'
import { useDevisStore } from '../../store/useDevisStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useClientsStore } from '../../store/useClientsStore'
import { useNotificationsStore } from '../../store/useNotificationsStore'
import ClientSelect from '../../components/ClientSelect'
import { formatDateLong, formatFCFA } from '../../utils/format'
import { createSikaPDF, finalizeSikaPDF, sikaTable, formatMontant, formatDate } from '../../utils/printUtils'
import { useNavigate, useLocation } from 'react-router-dom'

const FORMES_RESERVOIR = ['Cylindrique', 'Sphérique', 'Rectangulaire', 'Conique']
const TYPES_ACIER = ['A36', 'A516 Grade 70', 'A283 Grade C', 'Inox 304', 'Inox 316']
const REVETEMENTS = ['Époxy', 'Polyuréthane', 'Galvanisation', 'Peinture antirouille', 'Aucun']

const LIGNE_COMMERCIALE_VIDE = {
  id: Date.now(),
  designation: '',
  qte: 0,
  pu: 0
}

const LIGNES_PREDEFINES = [
  { designation: 'Mobilisation', qte: 6, pu: 0 },
  { designation: 'Cintrage', qte: 1, pu: 0 },
  { designation: 'Peinture', qte: 1, pu: 0 }
]

const ETAPES_DESCRIPTIF = [
  'Préparation du site et installation du chantier',
  'Traçage et découpe des tôles',
  'Formage et cintrage des éléments',
  'Assemblage par pointage',
  'Soudage des viroles',
  'Soudage des fonds',
  'Contrôle des soudures (visuel et radiographique)',
  'Test d\'étanchéité hydraulique',
  'Traitement de surface et préparation',
  'Application du revêtement',
  'Inspection finale et réception'
]

export default function DevisReservoir() {
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
    type: 'RESERVOIR',

    // Paramètres réservoir
    volume: 0,
    volumeUnit: 'm³',
    forme: 'Cylindrique',
    typeAcier: 'A516 Grade 70',
    pression: 0,
    temperature: 20,
    revetement: 'Époxy',
    lieuMontage: '',

    // Dimensions calculées
    diametre: 0,
    hauteur: 0,
    epaisseur: 0,

    // Section A - Offre Technique
    etendueTravaux: '',
    etapesRealisees: ETAPES_DESCRIPTIF.reduce((acc, etape) => ({ ...acc, [etape]: false }), {}),
    moyensHumains: '',
    outillages: '',
    gestionSecurite: '',
    planning: '',
    limitesClient: '',
    limitesSika: '',

    // Section B - Offre Commerciale
    lignesCommerciales: LIGNES_PREDEFINES.map((l, i) => ({ ...l, id: Date.now() + i })),
    tauxRemise: 10,

    // Modalités de paiement
    modalitesPaiement: [
      { libelle: 'À la commande', pourcentage: 50 },
      { libelle: 'Avancement des travaux', pourcentage: 45 },
      { libelle: 'Réception définitive', pourcentage: 5 }
    ],
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
            type: devisExist.type || 'RESERVOIR',
            volume: devisExist.volume || 0,
            volumeUnit: devisExist.volumeUnit || 'm³',
            forme: devisExist.forme || 'Cylindrique',
            typeAcier: devisExist.typeAcier || 'A516 Grade 70',
            pression: devisExist.pression || 0,
            temperature: devisExist.temperature || 20,
            revetement: devisExist.revetement || 'Époxy',
            lieuMontage: devisExist.lieuMontage || '',
            diametre: devisExist.diametre || 0,
            hauteur: devisExist.hauteur || 0,
            epaisseur: devisExist.epaisseur || 0,
            objet: devisExist.objet || '',
            lignesCommerciales: devisExist.lignesCommerciales?.length > 0 ? devisExist.lignesCommerciales : LIGNES_PREDEFINES.map((l, i) => ({ ...l, id: Date.now() + i })),
            tauxRemise: devisExist.tauxRemise || 10,
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

  const [accordeonOuvert, setAccordeonOuvert] = useState({
    A1: true,
    A2: false,
    A3: false,
    A4: false,
    A5: false,
    A6: false
  })

  // Calculs helper temps réel
  const calculerSurfaceCylindrique = () => {
    const d = parseFloat(devisData.diametre) || 0
    const h = parseFloat(devisData.hauteur) || 0
    const surfaceLaterale = Math.PI * d * h
    const surfaceFonds = 2 * Math.PI * Math.pow(d / 2, 2)
    return surfaceLaterale + surfaceFonds
  }

  const calculerPoidsAcier = () => {
    const surface = calculerSurfaceCylindrique()
    const epaisseur = (parseFloat(devisData.epaisseur) || 0) / 1000 // mm vers m
    const densite = 7850 // kg/m³
    return surface * epaisseur * densite
  }

  const calculerTempsSoudure = () => {
    const poids = calculerPoidsAcier()
    const tauxSoudure = 15 // kg/h
    return poids / tauxSoudure
  }

  // Calculs commerciaux (ordre OBLIGATOIRE)
  const calculerTotaux = () => {
    const montantBrut = devisData.lignesCommerciales.reduce((sum, ligne) => {
      const qte = parseFloat(ligne.qte) || 0
      const pu = parseFloat(ligne.pu) || 0
      return sum + (qte * pu)
    }, 0)
    
    const tauxRemise = parseFloat(devisData.tauxRemise) || 0
    const remise = montantBrut * (tauxRemise / 100)
    const montantHT = montantBrut - remise
    const tva = devisData.tvaActive ? montantHT * 0.18 : 0
    const ttc = montantHT + tva
    
    return { montantBrut, remise, montantHT, tva, ttc }
  }

  // Gestion des lignes commerciales
  const ajouterLigneCommerciale = () => {
    setDevisData(prev => ({
      ...prev,
      lignesCommerciales: [...prev.lignesCommerciales, { ...LIGNE_COMMERCIALE_VIDE, id: Date.now() }]
    }))
  }

  const supprimerLigneCommerciale = (id) => {
    setDevisData(prev => ({
      ...prev,
      lignesCommerciales: prev.lignesCommerciales.filter(l => l.id !== id)
    }))
  }

  const modifierLigneCommerciale = (id, champ, valeur) => {
    setDevisData(prev => ({
      ...prev,
      lignesCommerciales: prev.lignesCommerciales.map(l =>
        l.id === id ? { ...l, [champ]: valeur } : l
      )
    }))
  }

  // Actions principales
  const handleNouveau = () => {
    if (confirm('Créer un nouveau devis ? Les modifications non enregistrées seront perdues.')) {
      setDevisData({
        numero: getNextNumero(),
        date: new Date().toISOString().split('T')[0],
        clientId: null,
        type: 'RESERVOIR',
        volume: 0,
        volumeUnit: 'm³',
        forme: 'Cylindrique',
        typeAcier: 'A516 Grade 70',
        pression: 0,
        temperature: 20,
        revetement: 'Époxy',
        lieuMontage: '',
        diametre: 0,
        hauteur: 0,
        epaisseur: 0,
        etendueTravaux: '',
        etapesRealisees: ETAPES_DESCRIPTIF.reduce((acc, etape) => ({ ...acc, [etape]: false }), {}),
        moyensHumains: '',
        outillages: '',
        gestionSecurite: '',
        planning: '',
        limitesClient: '',
        limitesSika: '',
        lignesCommerciales: LIGNES_PREDEFINES.map((l, i) => ({ ...l, id: Date.now() + i })),
        tauxRemise: 10,
        modalitesPaiement: [
          { libelle: 'À la commande', pourcentage: 50 },
          { libelle: 'Avancement des travaux', pourcentage: 45 },
          { libelle: 'Réception définitive', pourcentage: 5 }
        ],
        tvaActive: true,
        statut: 'BROUILLON'
      })
      setDevisId(null)
      
      addLog({
        module: 'DEVIS_RESERVOIR',
        action: 'NOUVEAU',
        utilisateur: 'Utilisateur'
      })
    }
  }

  const handleEnregistrer = () => {
    if (!devisData.clientId) {
      alert('Veuillez sélectionner un client')
      return
    }

    const totaux = calculerTotaux()
    const devisComplet = {
      ...devisData,
      ...totaux,
      dateModification: new Date().toISOString().split('T')[0]
    }

    if (devisId) {
      updateDevis(devisId, devisComplet)
      addLog({
        module: 'DEVIS_RESERVOIR',
        action: 'MODIFICATION',
        utilisateur: 'Utilisateur',
        apres: { numero: devisData.numero, montantTTC: totaux.ttc }
      })
      alert('Devis modifié avec succès')
    } else {
      const nouveau = addDevis(devisComplet)
      setDevisId(nouveau.id)
      addLog({
        module: 'DEVIS_RESERVOIR',
        action: 'CREATION',
        utilisateur: 'Utilisateur',
        apres: { numero: nouveau.numero, montantTTC: totaux.ttc }
      })
      alert('Devis enregistré avec succès')
    }
  }

  const handleGenerePDF = async () => {
    if (!devisData.clientId) {
      alert('Veuillez sélectionner un client avant de générer le PDF')
      return
    }
    
    const client = clients.find(c => c.id === devisData.clientId);
    const ctx = await createSikaPDF(`DEVIS RÉSERVOIR - ${devisData.numero}`);
    const { doc, startY, MARGE_G, PAGE_W } = ctx;
    
    let y = startY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    
    const infos = [
      ['Client', client?.nom || 'N/A'],
      ['Date', formatDate(devisData.date)],
      ['Objet', devisData.objet || 'N/A'],
      ['Forme', devisData.parametresReservoir?.forme || 'N/A'],
      ['Capacité', devisData.parametresReservoir?.capacite ? `${devisData.parametresReservoir.capacite} L` : 'N/A']
    ];
    
    infos.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ' :', MARGE_G, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, MARGE_G + 35, y);
      y += 6;
    });
    
    y += 8;
    
    const columns = ['Désignation', 'Qté', 'Unité', 'PU (FCFA)', 'Montant (FCFA)'];
    const rows = devisData.lignes.map(ligne => [
      ligne.designation,
      ligne.quantite || 0,
      ligne.unite || '—',
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
    
    await finalizeSikaPDF(ctx, `SIKA_Devis_Reservoir_${devisData.numero.replace(/\//g, '_')}.pdf`)
    
    addLog({
      module: 'DEVIS_RESERVOIR',
      action: 'EXPORT_PDF',
      utilisateur: 'Utilisateur',
      apres: { numero: devisData.numero }
    })
  }

  const clientSelectionne = clients.find(c => c.id === devisData.clientId)
  const totaux = calculerTotaux()
  const surfaceCylindrique = calculerSurfaceCylindrique()
  const poidsAcier = calculerPoidsAcier()
  const tempsSoudure = calculerTempsSoudure()

  return (
    <div className="min-h-screen bg-navyClair p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* BARRE ACTIONS */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-3">
          <button
            onClick={handleNouveau}
            className="flex items-center gap-2 px-4 py-2 bg-bleu text-white rounded-lg hover:bg-opacity-90 transition"
          >
            ➕ Nouveau
          </button>
          <button
            onClick={handleEnregistrer}
            className="flex items-center gap-2 px-4 py-2 bg-vert text-white rounded-lg hover:bg-opacity-90 transition"
          >
            💾 Enregistrer
          </button>
          <button
            onClick={handleGenerePDF}
            className="flex items-center gap-2 px-4 py-2 bg-orange text-white rounded-lg hover:bg-opacity-90 transition"
          >
            📄 PDF complet (A+B)
          </button>
          <button
            onClick={() => setDevisData(prev => ({ ...prev, tvaActive: !prev.tvaActive }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${devisData.tvaActive ? 'bg-vert text-white hover:bg-opacity-90' : 'bg-argent text-navy hover:bg-opacity-80'}`}
          >
            🔄 TVA 18% : {devisData.tvaActive ? 'Activée' : 'Désactivée'}
          </button>
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLONNE GAUCHE - Formulaire principal */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* EN-TÊTE DEVIS */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">N° Devis</label>
                  <input
                    type="text"
                    value={devisData.numero}
                    readOnly
                    className="w-full px-3 py-2 border border-argent rounded-lg bg-navyClair font-bold text-navy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Date</label>
                  <input
                    type="date"
                    value={devisData.date}
                    onChange={(e) => setDevisData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold text-navy mb-2">Client</label>
                <ClientSelect
                  value={devisData.clientId}
                  onChange={(clientId) => setDevisData(prev => ({ ...prev, clientId }))}
                />
              </div>
              
              {clientSelectionne && (
                <div className="bg-orangeClair border-l-4 border-orange p-4 rounded">
                  <p className="text-sm text-navy">
                    <strong>{clientSelectionne.nom}</strong> - {clientSelectionne.ville}, {clientSelectionne.pays}
                  </p>
                  <p className="text-xs text-bleu mt-1">{clientSelectionne.contactNom} - {clientSelectionne.contactTelephone}</p>
                </div>
              )}
            </div>

            {/* PARAMÈTRES RÉSERVOIR */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-navy mb-4 border-b-2 border-orange pb-2">
                Paramètres du Réservoir
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Volume</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={devisData.volume}
                      onChange={(e) => setDevisData(prev => ({ ...prev, volume: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                      placeholder="0"
                    />
                    <select
                      value={devisData.volumeUnit}
                      onChange={(e) => setDevisData(prev => ({ ...prev, volumeUnit: e.target.value }))}
                      className="px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                    >
                      <option value="m³">m³</option>
                      <option value="litres">litres</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Forme</label>
                  <select
                    value={devisData.forme}
                    onChange={(e) => setDevisData(prev => ({ ...prev, forme: e.target.value }))}
                    className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                  >
                    {FORMES_RESERVOIR.map(forme => (
                      <option key={forme} value={forme}>{forme}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Type d'acier</label>
                  <select
                    value={devisData.typeAcier}
                    onChange={(e) => setDevisData(prev => ({ ...prev, typeAcier: e.target.value }))}
                    className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                  >
                    {TYPES_ACIER.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Pression (bar)</label>
                  <input
                    type="number"
                    value={devisData.pression}
                    onChange={(e) => setDevisData(prev => ({ ...prev, pression: e.target.value }))}
                    className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Température (°C)</label>
                  <input
                    type="number"
                    value={devisData.temperature}
                    onChange={(e) => setDevisData(prev => ({ ...prev, temperature: e.target.value }))}
                    className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                    placeholder="20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Revêtement</label>
                  <select
                    value={devisData.revetement}
                    onChange={(e) => setDevisData(prev => ({ ...prev, revetement: e.target.value }))}
                    className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                  >
                    {REVETEMENTS.map(rev => (
                      <option key={rev} value={rev}>{rev}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-semibold text-navy mb-2">Lieu de montage</label>
                <input
                  type="text"
                  value={devisData.lieuMontage}
                  onChange={(e) => setDevisData(prev => ({ ...prev, lieuMontage: e.target.value }))}
                  className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                  placeholder="Ex: Monrovia, Zone Industrielle..."
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Diamètre (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={devisData.diametre}
                    onChange={(e) => setDevisData(prev => ({ ...prev, diametre: e.target.value }))}
                    className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Hauteur (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={devisData.hauteur}
                    onChange={(e) => setDevisData(prev => ({ ...prev, hauteur: e.target.value }))}
                    className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy mb-2">Épaisseur (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={devisData.epaisseur}
                    onChange={(e) => setDevisData(prev => ({ ...prev, epaisseur: e.target.value }))}
                    className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* SECTION A - OFFRE TECHNIQUE */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-navy mb-4 border-b-2 border-orange pb-2">
                SECTION A — OFFRE TECHNIQUE
              </h2>
              
              {/* A1 - Étendue des travaux */}
              <div className="mb-4 border border-argent rounded-lg">
                <button
                  onClick={() => setAccordeonOuvert(prev => ({ ...prev, A1: !prev.A1 }))}
                  className="w-full px-4 py-3 bg-navyClair text-navy font-semibold text-left flex justify-between items-center hover:bg-opacity-80 transition"
                >
                  <span>A1 - Étendue des travaux</span>
                  <span>{accordeonOuvert.A1 ? '▼' : '▶'}</span>
                </button>
                {accordeonOuvert.A1 && (
                  <div className="p-4">
                    <textarea
                      value={devisData.etendueTravaux}
                      onChange={(e) => setDevisData(prev => ({ ...prev, etendueTravaux: e.target.value }))}
                      className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                      rows="4"
                      placeholder="Décrire l'étendue des travaux..."
                    />
                  </div>
                )}
              </div>
              
              {/* A2 - Descriptif 11 étapes */}
              <div className="mb-4 border border-argent rounded-lg">
                <button
                  onClick={() => setAccordeonOuvert(prev => ({ ...prev, A2: !prev.A2 }))}
                  className="w-full px-4 py-3 bg-navyClair text-navy font-semibold text-left flex justify-between items-center hover:bg-opacity-80 transition"
                >
                  <span>A2 - Descriptif des étapes de réalisation</span>
                  <span>{accordeonOuvert.A2 ? '▼' : '▶'}</span>
                </button>
                {accordeonOuvert.A2 && (
                  <div className="p-4 space-y-2">
                    {ETAPES_DESCRIPTIF.map((etape, index) => (
                      <label key={index} className="flex items-center gap-3 p-2 hover:bg-orangeClair rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={devisData.etapesRealisees[etape] || false}
                          onChange={(e) => setDevisData(prev => ({
                            ...prev,
                            etapesRealisees: {
                              ...prev.etapesRealisees,
                              [etape]: e.target.checked
                            }
                          }))}
                          className="w-5 h-5 text-orange focus:ring-orange"
                        />
                        <span className="text-sm text-navy">{index + 1}. {etape}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              {/* A3 - Moyens humains + outillages */}
              <div className="mb-4 border border-argent rounded-lg">
                <button
                  onClick={() => setAccordeonOuvert(prev => ({ ...prev, A3: !prev.A3 }))}
                  className="w-full px-4 py-3 bg-navyClair text-navy font-semibold text-left flex justify-between items-center hover:bg-opacity-80 transition"
                >
                  <span>A3 - Moyens humains et outillages</span>
                  <span>{accordeonOuvert.A3 ? '▼' : '▶'}</span>
                </button>
                {accordeonOuvert.A3 && (
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-navy mb-2">Moyens humains</label>
                      <textarea
                        value={devisData.moyensHumains}
                        onChange={(e) => setDevisData(prev => ({ ...prev, moyensHumains: e.target.value }))}
                        className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                        rows="3"
                        placeholder="Ex: 2 soudeurs qualifiés, 1 chef de chantier..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-navy mb-2">Outillages</label>
                      <textarea
                        value={devisData.outillages}
                        onChange={(e) => setDevisData(prev => ({ ...prev, outillages: e.target.value }))}
                        className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                        rows="3"
                        placeholder="Ex: Poste de soudure, cintreuse, grue..."
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* A4 - Gestion sécurité */}
              <div className="mb-4 border border-argent rounded-lg">
                <button
                  onClick={() => setAccordeonOuvert(prev => ({ ...prev, A4: !prev.A4 }))}
                  className="w-full px-4 py-3 bg-navyClair text-navy font-semibold text-left flex justify-between items-center hover:bg-opacity-80 transition"
                >
                  <span>A4 - Gestion de la sécurité</span>
                  <span>{accordeonOuvert.A4 ? '▼' : '▶'}</span>
                </button>
                {accordeonOuvert.A4 && (
                  <div className="p-4">
                    <textarea
                      value={devisData.gestionSecurite}
                      onChange={(e) => setDevisData(prev => ({ ...prev, gestionSecurite: e.target.value }))}
                      className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                      rows="4"
                      placeholder="Mesures de sécurité, EPI, procédures..."
                    />
                  </div>
                )}
              </div>
              
              {/* A5 - Planning */}
              <div className="mb-4 border border-argent rounded-lg">
                <button
                  onClick={() => setAccordeonOuvert(prev => ({ ...prev, A5: !prev.A5 }))}
                  className="w-full px-4 py-3 bg-navyClair text-navy font-semibold text-left flex justify-between items-center hover:bg-opacity-80 transition"
                >
                  <span>A5 - Planning et durée par phase</span>
                  <span>{accordeonOuvert.A5 ? '▼' : '▶'}</span>
                </button>
                {accordeonOuvert.A5 && (
                  <div className="p-4">
                    <textarea
                      value={devisData.planning}
                      onChange={(e) => setDevisData(prev => ({ ...prev, planning: e.target.value }))}
                      className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                      rows="4"
                      placeholder="Ex: Phase 1 (5 jours), Phase 2 (10 jours)..."
                    />
                  </div>
                )}
              </div>
              
              {/* A6 - Limites charges */}
              <div className="mb-4 border border-argent rounded-lg">
                <button
                  onClick={() => setAccordeonOuvert(prev => ({ ...prev, A6: !prev.A6 }))}
                  className="w-full px-4 py-3 bg-navyClair text-navy font-semibold text-left flex justify-between items-center hover:bg-opacity-80 transition"
                >
                  <span>A6 - Limites de charges CLIENT / SIKA</span>
                  <span>{accordeonOuvert.A6 ? '▼' : '▶'}</span>
                </button>
                {accordeonOuvert.A6 && (
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-navy mb-2">Charges CLIENT</label>
                      <textarea
                        value={devisData.limitesClient}
                        onChange={(e) => setDevisData(prev => ({ ...prev, limitesClient: e.target.value }))}
                        className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                        rows="3"
                        placeholder="Ce qui est à la charge du client..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-navy mb-2">Charges SIKA</label>
                      <textarea
                        value={devisData.limitesSika}
                        onChange={(e) => setDevisData(prev => ({ ...prev, limitesSika: e.target.value }))}
                        className="w-full px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                        rows="3"
                        placeholder="Ce qui est à la charge de SIKA..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION B - OFFRE COMMERCIALE */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-navy mb-4 border-b-2 border-orange pb-2">
                SECTION B — OFFRE COMMERCIALE
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-navy text-white">
                      <th className="border border-argent px-4 py-2 text-left">DÉSIGNATION</th>
                      <th className="border border-argent px-4 py-2 text-center w-24">QTÉ</th>
                      <th className="border border-argent px-4 py-2 text-right w-32">PU (FCFA)</th>
                      <th className="border border-argent px-4 py-2 text-right w-32">MONTANT (FCFA)</th>
                      <th className="border border-argent px-4 py-2 text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devisData.lignesCommerciales.map((ligne, index) => {
                      const qte = parseFloat(ligne.qte) || 0
                      const pu = parseFloat(ligne.pu) || 0
                      const montant = qte * pu
                      
                      return (
                        <tr key={ligne.id} className={index % 2 === 0 ? 'bg-white' : 'bg-navyClair'}>
                          <td className="border border-argent px-4 py-2">
                            <input
                              type="text"
                              value={ligne.designation}
                              onChange={(e) => modifierLigneCommerciale(ligne.id, 'designation', e.target.value)}
                              className="w-full px-2 py-1 border border-argent rounded focus:outline-none focus:border-orange"
                              placeholder="Désignation..."
                            />
                          </td>
                          <td className="border border-argent px-4 py-2">
                            <input
                              type="number"
                              value={ligne.qte}
                              onChange={(e) => modifierLigneCommerciale(ligne.id, 'qte', e.target.value)}
                              className="w-full px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-orange"
                            />
                          </td>
                          <td className="border border-argent px-4 py-2">
                            <input
                              type="number"
                              value={ligne.pu}
                              onChange={(e) => modifierLigneCommerciale(ligne.id, 'pu', e.target.value)}
                              className="w-full px-2 py-1 border border-argent rounded text-right focus:outline-none focus:border-orange"
                            />
                          </td>
                          <td className="border border-argent px-4 py-2 text-right font-semibold text-navy">
                            {formatFCFA(montant)}
                          </td>
                          <td className="border border-argent px-4 py-2 text-center">
                            <button
                              onClick={() => supprimerLigneCommerciale(ligne.id)}
                              className="text-rouge hover:text-opacity-70"
                              title="Supprimer"
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              <button
                onClick={ajouterLigneCommerciale}
                className="mt-4 px-4 py-2 bg-bleu text-white rounded-lg hover:bg-opacity-90 transition"
              >
                ➕ Ajouter une ligne
              </button>
              
              {/* CALCULS (ordre OBLIGATOIRE) */}
              <div className="mt-6 border-t-2 border-argent pt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-navy font-semibold">MONTANT BRUT</span>
                  <span className="text-lg font-bold text-navy">{formatFCFA(totaux.montantBrut)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-navy font-semibold">REMISE</span>
                    <input
                      type="number"
                      value={devisData.tauxRemise}
                      onChange={(e) => setDevisData(prev => ({ ...prev, tauxRemise: e.target.value }))}
                      className="w-16 px-2 py-1 border border-argent rounded text-center focus:outline-none focus:border-orange"
                    />
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
              
              {/* MODALITÉS DE PAIEMENT */}
              <div className="mt-6 border-t-2 border-argent pt-4">
                <h3 className="text-lg font-bold text-navy mb-3">Modalités de paiement</h3>
                <div className="space-y-2">
                  {devisData.modalitesPaiement.map((modalite, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <input
                        type="text"
                        value={modalite.libelle}
                        onChange={(e) => {
                          const nouvelles = [...devisData.modalitesPaiement]
                          nouvelles[index].libelle = e.target.value
                          setDevisData(prev => ({ ...prev, modalitesPaiement: nouvelles }))
                        }}
                        className="flex-1 px-3 py-2 border border-argent rounded-lg focus:outline-none focus:border-orange"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={modalite.pourcentage}
                          onChange={(e) => {
                            const nouvelles = [...devisData.modalitesPaiement]
                            nouvelles[index].pourcentage = parseFloat(e.target.value) || 0
                            setDevisData(prev => ({ ...prev, modalitesPaiement: nouvelles }))
                          }}
                          className="w-20 px-2 py-2 border border-argent rounded-lg text-center focus:outline-none focus:border-orange"
                        />
                        <span className="text-navy font-semibold">%</span>
                        <span className="text-bleu font-semibold w-32 text-right">
                          {formatFCFA(totaux.ttc * (modalite.pourcentage / 100))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* COLONNE DROITE - Helper calcul */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h3 className="text-lg font-bold text-navy mb-4 border-b-2 border-orange pb-2">
                📊 Helper Calcul (Temps Réel)
              </h3>
              
              <div className="space-y-4">
                <div className="bg-navyClair p-4 rounded-lg">
                  <p className="text-xs text-bleu mb-2">Surface cylindrique</p>
                  <p className="text-sm text-navy mb-1">π × D × H + 2 × π × (D/2)²</p>
                  <p className="text-2xl font-bold text-orange">{surfaceCylindrique.toFixed(2)} m²</p>
                </div>
                
                <div className="bg-navyClair p-4 rounded-lg">
                  <p className="text-xs text-bleu mb-2">Poids acier</p>
                  <p className="text-sm text-navy mb-1">Surface × épaisseur × 7 850 kg/m³</p>
                  <p className="text-2xl font-bold text-orange">{poidsAcier.toFixed(0)} kg</p>
                </div>
                
                <div className="bg-navyClair p-4 rounded-lg">
                  <p className="text-xs text-bleu mb-2">Temps soudure estimé</p>
                  <p className="text-sm text-navy mb-1">Poids / 15 kg/h</p>
                  <p className="text-2xl font-bold text-orange">{tempsSoudure.toFixed(1)} h</p>
                </div>
                
                <div className="bg-orangeClair border-l-4 border-orange p-4 rounded">
                  <p className="text-xs text-bleu mb-2">Statut</p>
                  <p className="text-lg font-bold text-navy">{devisData.statut}</p>
                </div>
                
                {devisData.clientId && (
                  <div className="bg-vert bg-opacity-10 border-l-4 border-vert p-4 rounded">
                    <p className="text-xs text-bleu mb-2">Client sélectionné</p>
                    <p className="text-sm font-bold text-navy">{clientSelectionne?.nom}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ZONE PDF CACHÉE */}
        <div className="hidden">
          <div ref={pdfRef} className="bg-white p-8" style={{ width: '210mm' }}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-navy mb-2">SIKA INDUSTRIE</h1>
              <h2 className="text-xl text-bleu">DEVIS RÉSERVOIR</h2>
              <p className="text-sm text-navy mt-2">{devisData.numero}</p>
            </div>
            
            {clientSelectionne && (
              <div className="mb-6">
                <p className="font-bold text-navy">Client : {clientSelectionne.nom}</p>
                <p className="text-sm text-navy">{clientSelectionne.ville}, {clientSelectionne.pays}</p>
                <p className="text-sm text-navy">Date : {formatDateLong(devisData.date)}</p>
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="font-bold text-navy mb-2">Paramètres du réservoir</h3>
              <p className="text-sm">Volume : {devisData.volume} {devisData.volumeUnit}</p>
              <p className="text-sm">Forme : {devisData.forme}</p>
              <p className="text-sm">Type acier : {devisData.typeAcier}</p>
              <p className="text-sm">Pression : {devisData.pression} bar</p>
              <p className="text-sm">Température : {devisData.temperature} °C</p>
              <p className="text-sm">Revêtement : {devisData.revetement}</p>
              <p className="text-sm">Lieu de montage : {devisData.lieuMontage}</p>
            </div>
            
            <div className="mb-6">
              <h3 className="font-bold text-navy mb-2">SECTION A - OFFRE TECHNIQUE</h3>
              {/* Contenu technique pour PDF */}
            </div>
            
            <div className="mb-6">
              <h3 className="font-bold text-navy mb-2">SECTION B - OFFRE COMMERCIALE</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="border border-argent px-2 py-1 text-left">DÉSIGNATION</th>
                    <th className="border border-argent px-2 py-1 text-center">QTÉ</th>
                    <th className="border border-argent px-2 py-1 text-right">PU</th>
                    <th className="border border-argent px-2 py-1 text-right">MONTANT</th>
                  </tr>
                </thead>
                <tbody>
                  {devisData.lignesCommerciales.map((ligne, index) => (
                    <tr key={ligne.id}>
                      <td className="border border-argent px-2 py-1">{ligne.designation}</td>
                      <td className="border border-argent px-2 py-1 text-center">{ligne.qte}</td>
                      <td className="border border-argent px-2 py-1 text-right">{formatFCFA(ligne.pu)}</td>
                      <td className="border border-argent px-2 py-1 text-right">{formatFCFA(ligne.qte * ligne.pu)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="mt-4 text-right space-y-1">
                <p>MONTANT BRUT : {formatFCFA(totaux.montantBrut)}</p>
                <p>REMISE {devisData.tauxRemise}% : - {formatFCFA(totaux.remise)}</p>
                <p className="font-bold">MONTANT TOTAL HT : {formatFCFA(totaux.montantHT)}</p>
                <p>TVA 18% : {formatFCFA(totaux.tva)}</p>
                <p className="text-lg font-bold">MONTANT TTC : {formatFCFA(totaux.ttc)}</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-navy mb-2">Modalités de paiement</h3>
              {devisData.modalitesPaiement.map((modalite, index) => (
                <p key={index} className="text-sm">
                  {modalite.libelle} : {modalite.pourcentage}% ({formatFCFA(totaux.ttc * (modalite.pourcentage / 100))})
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
