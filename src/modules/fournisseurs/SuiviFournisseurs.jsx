import { useState, useMemo } from 'react';
import { useFournisseursStore } from '../../store/useFournisseursStore';
import { useAuditStore } from '../../store/useAuditStore';
import { useAuthStore } from '../../store/useAuthStore';
import ConditionsPaiementSelector from '../../components/ConditionsPaiementSelector';
import { 
  Plus, FileSpreadsheet, FileText, Search, Edit, Eye, 
  Printer, CreditCard, Trash2, X, Save, Users, Building2 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { createSikaPDF, finalizeSikaPDF, sikaTable, formatMontant, formatDate } from '../../utils/printUtils';

const SuiviFournisseurs = () => {
  const { achats, addAchat, updateAchat, deleteAchat, fournisseurs, addFournisseur, updateFournisseur, deleteFournisseur } = useFournisseursStore();
  const { addLog } = useAuditStore();
  const { user } = useAuthStore();

  const [ongletActif, setOngletActif] = useState('achats');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('TOUS');
  const [showModal, setShowModal] = useState(false);
  const [showReglementModal, setShowReglementModal] = useState(false);
  const [showReferentielModal, setShowReferentielModal] = useState(false);
  const [modeEdition, setModeEdition] = useState(false);
  const [achatSelectionne, setAchatSelectionne] = useState(null);
  const [fournisseurSelectionne, setFournisseurSelectionne] = useState(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    fournisseurId: '',
    ncc: '',
    numeroFacture: '',
    libelles: '',
    dateReglement: '',
    montantHT: 0,
    observation: ''
  });

  const [formFournisseur, setFormFournisseur] = useState({
    nom: '',
    ncc: '',
    adresse: '',
    contact: '',
    conditionsPaiement: 30,
    type: 'FOURNISSEUR'
  });

  const [reglementData, setReglementData] = useState({
    montant: 0,
    dateReglement: new Date().toISOString().split('T')[0],
    modePaiement: 'ESPECES',
    reference: ''
  });

  const calculerTVA = (montantHT) => montantHT * 0.18;
  const calculerTTC = (montantHT) => montantHT + calculerTVA(montantHT);

  const getStatut = (achat) => {
    if (!achat.dateReglement) return 'EN_ATTENTE';
    const dateReg = new Date(achat.dateReglement);
    const maintenant = new Date();
    const dateAchat = new Date(achat.date);
    const joursRetard = Math.floor((maintenant - dateAchat) / (1000 * 60 * 60 * 24));
    
    if (dateReg <= maintenant) return 'PAYE';
    if (joursRetard > 30) return 'EN_RETARD';
    return 'EN_ATTENTE';
  };

  const achatsAffiches = useMemo(() => {
    let result = achats.map(achat => ({
      ...achat,
      montantTVA: calculerTVA(achat.montantHT || 0),
      montantTTC: calculerTTC(achat.montantHT || 0),
      statut: getStatut(achat)
    }));

    if (recherche) {
      const searchLower = recherche.toLowerCase();
      result = result.filter(achat => {
        const fournisseur = fournisseurs.find(f => f.id === achat.fournisseurId);
        return (
          fournisseur?.nom?.toLowerCase().includes(searchLower) ||
          achat.numeroFacture?.toLowerCase().includes(searchLower) ||
          achat.libelles?.toLowerCase().includes(searchLower) ||
          achat.ncc?.toLowerCase().includes(searchLower)
        );
      });
    }

    if (filtreStatut !== 'TOUS') {
      result = result.filter(achat => achat.statut === filtreStatut);
    }

    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [achats, fournisseurs, recherche, filtreStatut]);

  const totaux = useMemo(() => {
    const totalHT = achatsAffiches.reduce((sum, a) => sum + (a.montantHT || 0), 0);
    const totalTVA = achatsAffiches.reduce((sum, a) => sum + (a.montantTVA || 0), 0);
    const totalTTC = achatsAffiches.reduce((sum, a) => sum + (a.montantTTC || 0), 0);
    const totalPaye = achatsAffiches.filter(a => a.statut === 'PAYE').reduce((sum, a) => sum + (a.montantTTC || 0), 0);
    const resteAPayer = totalTTC - totalPaye;

    return { totalHT, totalTVA, totalTTC, totalPaye, resteAPayer };
  }, [achatsAffiches]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const achatData = {
      ...formData,
      montantHT: parseFloat(formData.montantHT) || 0,
      montantTVA: calculerTVA(parseFloat(formData.montantHT) || 0),
      montantTTC: calculerTTC(parseFloat(formData.montantHT) || 0)
    };

    if (modeEdition && achatSelectionne) {
      updateAchat(achatSelectionne.id, achatData);
      addLog({
        module: 'FOURNISSEURS',
        action: 'MODIFICATION_ACHAT',
        utilisateur: user?.nom || 'Utilisateur',
        avant: achatSelectionne,
        apres: achatData,
        impactFinancier: achatData.montantTTC - achatSelectionne.montantTTC
      });
    } else {
      addAchat(achatData);
      addLog({
        module: 'FOURNISSEURS',
        action: 'CREATION_ACHAT',
        utilisateur: user?.nom || 'Utilisateur',
        apres: achatData,
        impactFinancier: achatData.montantTTC
      });
    }

    resetForm();
  };

  const handleReglement = (e) => {
    e.preventDefault();
    
    if (!achatSelectionne) return;

    const updatedAchat = {
      ...achatSelectionne,
      dateReglement: reglementData.dateReglement,
      montantPaye: parseFloat(reglementData.montant),
      modePaiement: reglementData.modePaiement,
      referenceReglement: reglementData.reference
    };

    updateAchat(achatSelectionne.id, updatedAchat);
    
    addLog({
      module: 'FOURNISSEURS',
      action: 'REGLEMENT_ACHAT',
      utilisateur: user?.nom || 'Utilisateur',
      avant: achatSelectionne,
      apres: updatedAchat,
      impactFinancier: -parseFloat(reglementData.montant)
    });

    setShowReglementModal(false);
    setReglementData({ montant: 0, dateReglement: new Date().toISOString().split('T')[0], modePaiement: 'ESPECES', reference: '' });
  };

  const handleSubmitFournisseur = (e) => {
    e.preventDefault();
    
    if (fournisseurSelectionne) {
      updateFournisseur(fournisseurSelectionne.id, formFournisseur);
      addLog({
        module: 'FOURNISSEURS',
        action: 'MODIFICATION_FOURNISSEUR',
        utilisateur: user?.nom || 'Utilisateur',
        avant: fournisseurSelectionne,
        apres: formFournisseur
      });
    } else {
      addFournisseur(formFournisseur);
      addLog({
        module: 'FOURNISSEURS',
        action: 'CREATION_FOURNISSEUR',
        utilisateur: user?.nom || 'Utilisateur',
        apres: formFournisseur
      });
    }

    resetFormFournisseur();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      fournisseurId: '',
      ncc: '',
      numeroFacture: '',
      libelles: '',
      dateReglement: '',
      montantHT: 0,
      observation: ''
    });
    setShowModal(false);
    setModeEdition(false);
    setAchatSelectionne(null);
  };

  const resetFormFournisseur = () => {
    setFormFournisseur({
      nom: '',
      ncc: '',
      adresse: '',
      contact: '',
      conditionsPaiement: 30,
      type: 'FOURNISSEUR'
    });
    setShowReferentielModal(false);
    setFournisseurSelectionne(null);
  };

  const handleEdit = (achat) => {
    setAchatSelectionne(achat);
    setFormData({
      date: achat.date,
      fournisseurId: achat.fournisseurId,
      ncc: achat.ncc,
      numeroFacture: achat.numeroFacture,
      libelles: achat.libelles,
      dateReglement: achat.dateReglement || '',
      montantHT: achat.montantHT,
      observation: achat.observation || ''
    });
    setModeEdition(true);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('Confirmer la suppression de cet achat ?')) {
      const achat = achats.find(a => a.id === id);
      deleteAchat(id);
      addLog({
        module: 'FOURNISSEURS',
        action: 'SUPPRESSION_ACHAT',
        utilisateur: user?.nom || 'Utilisateur',
        avant: achat,
        impactFinancier: -achat.montantTTC
      });
    }
  };

  const handleDeleteFournisseur = (id) => {
    if (confirm('Confirmer la suppression de ce fournisseur ?')) {
      const fournisseur = fournisseurs.find(f => f.id === id);
      deleteFournisseur(id);
      addLog({
        module: 'FOURNISSEURS',
        action: 'SUPPRESSION_FOURNISSEUR',
        utilisateur: user?.nom || 'Utilisateur',
        avant: fournisseur
      });
    }
  };

  const exportExcel = () => {
    const data = achatsAffiches.map(achat => {
      const fournisseur = fournisseurs.find(f => f.id === achat.fournisseurId);
      return {
        'DATE': achat.date,
        'NOM DU FOURNISSEUR': fournisseur?.nom || '',
        'NCC': achat.ncc,
        'NUMERO DE LA FACTURE': achat.numeroFacture,
        'LIBELLES': achat.libelles,
        'DATE DE REGLEMENT': achat.dateReglement || '',
        'MONTANT HT': achat.montantHT,
        'MONTANT TVA': achat.montantTVA,
        'MONTANT TTC': achat.montantTTC,
        'OBSERVATION': achat.observation || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fournisseurs');
    XLSX.writeFile(wb, `suivi_fournisseurs_${new Date().toISOString().split('T')[0]}.xlsx`);

    addLog({
      module: 'FOURNISSEURS',
      action: 'EXPORT_EXCEL',
      utilisateur: user?.nom || 'Utilisateur'
    });
  };

  const exportPDF = async () => {
    const ctx = await createSikaPDF('SUIVI FOURNISSEURS');
    const { doc, startY, MARGE_G, PAGE_W } = ctx;

    let y = startY;

    // Date d'édition
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date d'édition : ${formatDate(new Date())}`, MARGE_G, y);
    y += 8;

    // Tableau des achats
    const columns = ['Date', 'Fournisseur', 'NCC', 'N° Facture', 'Libellés', 'Date Règl.', 'HT (FCFA)', 'TVA (FCFA)', 'TTC (FCFA)'];
    const rows = achatsAffiches.map(achat => {
      const fournisseur = fournisseurs.find(f => f.id === achat.fournisseurId);
      return [
        formatDate(achat.date),
        fournisseur?.nom || '',
        achat.ncc,
        achat.numeroFacture,
        achat.libelles.substring(0, 30),
        achat.dateReglement ? formatDate(achat.dateReglement) : '—',
        formatMontant(achat.montantHT),
        formatMontant(achat.montantTVA),
        formatMontant(achat.montantTTC)
      ];
    });

    const finalY = sikaTable(doc, columns, rows, y, ctx);
    let ty = finalY + 10;

    // Totaux
    const totauxX = PAGE_W - 80;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);

    [
      ['Total HT', formatMontant(totaux.totalHT) + ' FCFA'],
      ['Total TVA', formatMontant(totaux.totalTVA) + ' FCFA'],
      ['Total TTC', formatMontant(totaux.totalTTC) + ' FCFA'],
      ['Total Payé', formatMontant(totaux.totalPaye) + ' FCFA'],
      ['Reste à Payer', formatMontant(totaux.resteAPayer) + ' FCFA']
    ].forEach(([label, val], idx) => {
      const isReste = idx === 4;
      if (isReste) {
        doc.setFillColor(230, 0, 0);
        doc.rect(totauxX - 2, ty - 4, 82, 8, 'F');
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setTextColor(27, 42, 74);
      }
      doc.text(label, totauxX, ty);
      doc.text(val, PAGE_W - 15, ty, { align: 'right' });
      ty += 6;
    });

    await finalizeSikaPDF(ctx, `SIKA_Fournisseurs_${new Date().toISOString().split('T')[0]}.pdf`);

    addLog({
      module: 'FOURNISSEURS',
      action: 'EXPORT_PDF',
      utilisateur: user?.nom || 'Utilisateur'
    });
  };

  const imprimerAchat = async (achat) => {
    const fournisseur = fournisseurs.find(f => f.id === achat.fournisseurId);
    const ctx = await createSikaPDF(`Achat N° ${achat.numeroFacture}`);
    const { doc, startY, MARGE_G, PAGE_W } = ctx;
    
    let y = startY;

    // Informations achat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(27, 42, 74);

    const infos = [
      ['Date', formatDate(achat.date)],
      ['Fournisseur', fournisseur?.nom || '—'],
      ['NCC', achat.ncc],
      ['N° Facture', achat.numeroFacture],
      ['Libellés', achat.libelles],
      ['Date de règlement', achat.dateReglement ? formatDate(achat.dateReglement) : 'Non réglé'],
      ['Observation', achat.observation || '—']
    ];

    infos.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ' :', MARGE_G, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, 120);
      doc.text(lines, MARGE_G + 45, y);
      y += lines.length * 6;
    });

    y += 10;

    // Ligne séparatrice
    doc.setDrawColor(230, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(MARGE_G, y, PAGE_W - 15, y);
    y += 8;

    // Montants
    doc.setFontSize(11);
    const montantX = PAGE_W - 80;

    [
      ['Montant HT', formatMontant(achat.montantHT) + ' FCFA'],
      ['TVA (18%)', formatMontant(achat.montantTVA) + ' FCFA'],
      ['MONTANT TTC', formatMontant(achat.montantTTC) + ' FCFA']
    ].forEach(([label, val], idx) => {
      const isTTC = idx === 2;
      if (isTTC) {
        doc.setFillColor(27, 42, 74);
        doc.rect(montantX - 2, y - 4, 82, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(27, 42, 74);
        doc.setFont('helvetica', 'normal');
      }
      doc.text(label, montantX, y);
      doc.text(val, PAGE_W - 15, y, { align: 'right' });
      y += isTTC ? 10 : 6;
      doc.setTextColor(27, 42, 74);
    });

    await finalizeSikaPDF(ctx, `SIKA_Achat_${achat.numeroFacture}.pdf`);

    addLog({
      module: 'FOURNISSEURS',
      action: 'IMPRESSION_ACHAT',
      utilisateur: user?.nom || 'Utilisateur'
    });
  };

  const StatutBadge = ({ statut }) => {
    const config = {
      PAYE: { icon: '✅', label: 'Payé', color: 'bg-[#1A7A4A] text-white' },
      EN_ATTENTE: { icon: '🟠', label: 'En attente', color: 'bg-[#E60000] text-white' },
      EN_RETARD: { icon: '🔴', label: 'En retard', color: 'bg-[#E60000] text-white' }
    };

    const { icon, label, color } = config[statut] || config.EN_ATTENTE;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>
        {icon} {label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#E8ECF4] p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#06006E] to-[#06006E] p-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Building2 className="w-8 h-8" />
              SUIVI FOURNISSEURS
            </h1>
          </div>

          <div className="border-b border-[#C8C8D0]">
            <div className="flex">
              <button
                onClick={() => setOngletActif('achats')}
                className={`px-6 py-3 font-medium transition-colors ${
                  ongletActif === 'achats'
                    ? 'bg-[#E60000] text-white border-b-2 border-[#E60000]'
                    : 'text-[#06006E] hover:bg-[#FFE6E6]'
                }`}
              >
                Suivi des Achats
              </button>
              <button
                onClick={() => setOngletActif('referentiel')}
                className={`px-6 py-3 font-medium transition-colors ${
                  ongletActif === 'referentiel'
                    ? 'bg-[#E60000] text-white border-b-2 border-[#E60000]'
                    : 'text-[#06006E] hover:bg-[#FFE6E6]'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Référentiel Fournisseurs
              </button>
            </div>
          </div>

          {ongletActif === 'achats' && (
            <>
              <div className="p-6 bg-[#FFE6E6] border-b border-[#C8C8D0]">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        resetForm();
                        setShowModal(true);
                      }}
                      className="bg-[#E60000] hover:bg-[#d55609] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Nouveau
                    </button>
                    <button
                      onClick={exportExcel}
                      className="bg-[#1A7A4A] hover:bg-[#156339] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <FileSpreadsheet className="w-5 h-5" />
                      Excel
                    </button>
                    <button
                      onClick={exportPDF}
                      className="bg-[#E60000] hover:bg-[#a93226] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <FileText className="w-5 h-5" />
                      PDF
                    </button>
                  </div>

                  <div className="flex gap-3 items-center">
                    <select
                      value={filtreStatut}
                      onChange={(e) => setFiltreStatut(e.target.value)}
                      className="border border-[#C8C8D0] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                    >
                      <option value="TOUS">Tous les statuts</option>
                      <option value="PAYE">Payé</option>
                      <option value="EN_ATTENTE">En attente</option>
                      <option value="EN_RETARD">En retard</option>
                    </select>

                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000] w-64"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#06006E] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">DATE</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">NOM DU FOURNISSEUR</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">NCC</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">NUMERO DE LA FACTURE</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">LIBELLES</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">DATE DE REGLEMENT</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">MONTANT HT</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">MONTANT TVA</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">MONTANT TTC</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">OBSERVATION</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">STATUT</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {achatsAffiches.map((achat, index) => {
                      const fournisseur = fournisseurs.find(f => f.id === achat.fournisseurId);
                      return (
                        <tr
                          key={achat.id}
                          className={`border-b border-[#C8C8D0] hover:bg-[#FFE6E6] transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-[#E8ECF4]'
                          }`}
                        >
                          <td className="px-4 py-3 text-sm">{achat.date}</td>
                          <td className="px-4 py-3 text-sm font-medium text-[#06006E]">{fournisseur?.nom || ''}</td>
                          <td className="px-4 py-3 text-sm">{achat.ncc}</td>
                          <td className="px-4 py-3 text-sm">{achat.numeroFacture}</td>
                          <td className="px-4 py-3 text-sm">{achat.libelles}</td>
                          <td className="px-4 py-3 text-sm">{achat.dateReglement || '-'}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{achat.montantHT.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-right">{achat.montantTVA.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-[#06006E]">{achat.montantTTC.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{achat.observation || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <StatutBadge statut={achat.statut} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleEdit(achat)}
                                className="text-[#06006E] hover:text-[#E60000] transition-colors"
                                title="Modifier"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setAchatSelectionne(achat);
                                  setReglementData({
                                    montant: achat.montantTTC,
                                    dateReglement: new Date().toISOString().split('T')[0],
                                    modePaiement: 'ESPECES',
                                    reference: ''
                                  });
                                  setShowReglementModal(true);
                                }}
                                className="text-[#1A7A4A] hover:text-[#E60000] transition-colors"
                                title="Règlement"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => imprimerAchat(achat)}
                                className="text-[#06006E] hover:text-[#E60000] transition-colors"
                                title="Imprimer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(achat.id)}
                                className="text-[#E60000] hover:text-[#E60000] transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-gradient-to-r from-[#06006E] to-[#06006E] p-6">
                <div className="grid grid-cols-5 gap-6 text-white">
                  <div>
                    <p className="text-sm opacity-80">Total HT</p>
                    <p className="text-2xl font-bold">{totaux.totalHT.toFixed(2)} F</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">Total TVA</p>
                    <p className="text-2xl font-bold">{totaux.totalTVA.toFixed(2)} F</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">Total TTC</p>
                    <p className="text-2xl font-bold">{totaux.totalTTC.toFixed(2)} F</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">Total Payé</p>
                    <p className="text-2xl font-bold text-[#1A7A4A]">{totaux.totalPaye.toFixed(2)} F</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">Reste à Payer</p>
                    <p className="text-2xl font-bold text-[#E60000]">{totaux.resteAPayer.toFixed(2)} F</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {ongletActif === 'referentiel' && (
            <>
              <div className="p-6 bg-[#FFE6E6] border-b border-[#C8C8D0]">
                <button
                  onClick={() => {
                    resetFormFournisseur();
                    setShowReferentielModal(true);
                  }}
                  className="bg-[#E60000] hover:bg-[#d55609] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Nouveau Fournisseur
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#06006E] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">NOM</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">NCC</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">ADRESSE</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">CONTACT</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">CONDITIONS PAIEMENT</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">TYPE</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fournisseurs.map((fournisseur, index) => (
                      <tr
                        key={fournisseur.id}
                        className={`border-b border-[#C8C8D0] hover:bg-[#FFE6E6] transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-[#E8ECF4]'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-[#06006E]">{fournisseur.nom}</td>
                        <td className="px-4 py-3 text-sm">{fournisseur.ncc}</td>
                        <td className="px-4 py-3 text-sm">{fournisseur.adresse}</td>
                        <td className="px-4 py-3 text-sm">{fournisseur.contact}</td>
                        <td className="px-4 py-3 text-sm">{fournisseur.conditionsPaiement}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            fournisseur.type === 'CLIENT' ? 'bg-[#06006E] text-white' :
                            fournisseur.type === 'FOURNISSEUR' ? 'bg-[#E60000] text-white' :
                            'bg-[#1A7A4A] text-white'
                          }`}>
                            {fournisseur.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => {
                                setFournisseurSelectionne(fournisseur);
                                setFormFournisseur(fournisseur);
                                setShowReferentielModal(true);
                              }}
                              className="text-[#06006E] hover:text-[#E60000] transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteFournisseur(fournisseur.id)}
                              className="text-[#E60000] hover:text-[#E60000] transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#06006E] to-[#06006E] p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {modeEdition ? 'Modifier l\'achat' : 'Nouvel achat'}
              </h2>
              <button onClick={resetForm} className="text-white hover:text-[#E60000] transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#06006E] mb-2">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#06006E] mb-2">Fournisseur</label>
                  <select
                    value={formData.fournisseurId}
                    onChange={(e) => {
                      const fournisseur = fournisseurs.find(f => f.id === parseInt(e.target.value));
                      setFormData({ 
                        ...formData, 
                        fournisseurId: e.target.value,
                        ncc: fournisseur?.ncc || ''
                      });
                    }}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {fournisseurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#06006E] mb-2">NCC</label>
                  <input
                    type="text"
                    value={formData.ncc}
                    onChange={(e) => setFormData({ ...formData, ncc: e.target.value })}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#06006E] mb-2">Numéro de facture</label>
                  <input
                    type="text"
                    value={formData.numeroFacture}
                    onChange={(e) => setFormData({ ...formData, numeroFacture: e.target.value })}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#06006E] mb-2">Libellés</label>
                  <input
                    type="text"
                    value={formData.libelles}
                    onChange={(e) => setFormData({ ...formData, libelles: e.target.value })}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#06006E] mb-2">Montant HT</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.montantHT}
                    onChange={(e) => setFormData({ ...formData, montantHT: e.target.value })}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#06006E] mb-2">Date de règlement</label>
                  <input
                    type="date"
                    value={formData.dateReglement}
                    onChange={(e) => setFormData({ ...formData, dateReglement: e.target.value })}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#06006E] mb-2">Observation</label>
                  <textarea
                    value={formData.observation}
                    onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                    rows="3"
                  />
                </div>
              </div>

              <div className="bg-[#E8ECF4] p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[#06006E] font-medium">TVA (18%)</p>
                    <p className="text-lg font-bold text-[#06006E]">
                      {calculerTVA(parseFloat(formData.montantHT) || 0).toFixed(2)} F
                    </p>
                  </div>
                  <div>
                    <p className="text-[#06006E] font-medium">TTC</p>
                    <p className="text-lg font-bold text-[#E60000]">
                      {calculerTTC(parseFloat(formData.montantHT) || 0).toFixed(2)} F
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-[#C8C8D0] text-[#06006E] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#E60000] hover:bg-[#d55609] text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  {modeEdition ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReglementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-[#1A7A4A] to-[#06006E] p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                Règlement
              </h2>
              <button
                onClick={() => setShowReglementModal(false)}
                className="text-white hover:text-[#E60000] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleReglement} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#06006E] mb-2">Montant</label>
                <input
                  type="number"
                  step="0.01"
                  value={reglementData.montant}
                  onChange={(e) => setReglementData({ ...reglementData, montant: e.target.value })}
                  className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#06006E] mb-2">Date de règlement</label>
                <input
                  type="date"
                  value={reglementData.dateReglement}
                  onChange={(e) => setReglementData({ ...reglementData, dateReglement: e.target.value })}
                  className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#06006E] mb-2">Mode de paiement</label>
                <select
                  value={reglementData.modePaiement}
                  onChange={(e) => setReglementData({ ...reglementData, modePaiement: e.target.value })}
                  className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                >
                  <option value="ESPECES">Espèces</option>
                  <option value="CHEQUE">Chèque</option>
                  <option value="VIREMENT">Virement</option>
                  <option value="CARTE">Carte bancaire</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#06006E] mb-2">Référence</label>
                <input
                  type="text"
                  value={reglementData.reference}
                  onChange={(e) => setReglementData({ ...reglementData, reference: e.target.value })}
                  className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowReglementModal(false)}
                  className="px-6 py-2 border border-[#C8C8D0] text-[#06006E] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#1A7A4A] hover:bg-[#156339] text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReferentielModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#06006E] to-[#06006E] p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {fournisseurSelectionne ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </h2>
              <button onClick={resetFormFournisseur} className="text-white hover:text-[#E60000] transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitFournisseur} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#06006E] mb-2">Nom</label>
                  <input
                    type="text"
                    value={formFournisseur.nom}
                    onChange={(e) => setFormFournisseur({ ...formFournisseur, nom: e.target.value })}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#06006E] mb-2">NCC</label>
                  <input
                    type="text"
                    value={formFournisseur.ncc}
                    onChange={(e) => setFormFournisseur({ ...formFournisseur, ncc: e.target.value })}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#06006E] mb-2">Adresse</label>
                  <input
                    type="text"
                    value={formFournisseur.adresse}
                    onChange={(e) => setFormFournisseur({ ...formFournisseur, adresse: e.target.value })}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#06006E] mb-2">Contact</label>
                  <input
                    type="text"
                    value={formFournisseur.contact}
                    onChange={(e) => setFormFournisseur({ ...formFournisseur, contact: e.target.value })}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#06006E] mb-2">Conditions de paiement</label>
                  <ConditionsPaiementSelector
                    value={formFournisseur.conditionsPaiement}
                    onChange={(jours) => setFormFournisseur({ ...formFournisseur, conditionsPaiement: jours })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#06006E] mb-2">Type</label>
                  <select
                    value={formFournisseur.type}
                    onChange={(e) => setFormFournisseur({ ...formFournisseur, type: e.target.value })}
                    className="w-full px-4 py-2 border border-[#C8C8D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E60000]"
                  >
                    <option value="CLIENT">CLIENT</option>
                    <option value="FOURNISSEUR">FOURNISSEUR</option>
                    <option value="LES DEUX">LES DEUX</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={resetFormFournisseur}
                  className="px-6 py-2 border border-[#C8C8D0] text-[#06006E] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#E60000] hover:bg-[#d55609] text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  {fournisseurSelectionne ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuiviFournisseurs;
