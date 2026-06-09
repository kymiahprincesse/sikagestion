import { useState, useMemo } from 'react';
import { useNotifications } from '../../components/NotificationProvider';
import { useAOStore, STATUTS_AO } from '../../store/useAOStore';
import { useClientsStore } from '../../store/useClientsStore';
import { useAuditStore } from '../../store/useAuditStore';
import SikaHeader from '../../components/SikaHeader';
import SikaFooter from '../../components/SikaFooter';
import ModalAO from './ModalAO';
import ModalConversion from './ModalConversion';
import ModalVoir from './ModalVoir';
import * as XLSX from 'xlsx';
import { formatDate } from '../../utils/format';
import { createSikaPDF, finalizeSikaPDF, sikaTable, formatMontant, formatDate as formatDatePDF, openPDFForPrint } from '../../utils/printUtils';

export default function SuiviAO() {
  const { appelsDoffres, deleteAO, getStatistiques, getAOUrgents } = useAOStore();
  const { clients } = useClientsStore();
  const { addLog } = useAuditStore();
  const { confirmDelete } = useNotifications();

  const [showModalAO, setShowModalAO] = useState(false);
  const [showModalConversion, setShowModalConversion] = useState(false);
  const [showModalVoir, setShowModalVoir] = useState(false);
  const [aoSelectionne, setAOSelectionne] = useState(null);
  const [filtreStatut, setFiltreStatut] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtreSecteur, setFiltreSecteur] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const stats = getStatistiques();
  const aoUrgents = getAOUrgents();

  const badges = [
    { label: 'A chiffrer', statut: STATUTS_AO.A_CHIFFRER, count: stats.aChiffrer, color: 'bg-bleu text-white' },
    { label: 'Décliné', statut: STATUTS_AO.DECLINE, count: stats.decline, color: 'bg-gray-500 text-white' },
    { label: 'En attente', statut: STATUTS_AO.EN_ATTENTE, count: stats.enAttente, color: 'bg-orange text-white' },
    { label: 'Soumis', statut: STATUTS_AO.SOUMIS, count: stats.soumis, color: 'bg-purple-600 text-white' },
    { label: 'Gagné', statut: STATUTS_AO.GAGNE, count: stats.gagne, color: 'bg-vert text-white' },
    { label: 'Perdu', statut: STATUTS_AO.PERDU, count: stats.perdu, color: 'bg-rouge text-white' }
  ];

  const secteurs = useMemo(() => {
    const secteursUniques = new Set(appelsDoffres.map(ao => ao.secteurActivite).filter(Boolean));
    return Array.from(secteursUniques).sort();
  }, [appelsDoffres]);

  const aoFiltres = useMemo(() => {
    let resultat = [...appelsDoffres];

    if (filtreStatut) {
      resultat = resultat.filter(ao => ao.statut === filtreStatut);
    }

    if (recherche) {
      const terme = recherche.toLowerCase();
      resultat = resultat.filter(ao =>
        ao.numeroDevis?.toLowerCase().includes(terme) ||
        ao.client?.toLowerCase().includes(terme) ||
        ao.referenceAO?.toLowerCase().includes(terme) ||
        ao.prestationSouhaitee?.toLowerCase().includes(terme)
      );
    }

    if (filtreSecteur) {
      resultat = resultat.filter(ao => ao.secteurActivite === filtreSecteur);
    }

    if (dateDebut) {
      resultat = resultat.filter(ao => ao.dateDevis >= dateDebut);
    }

    if (dateFin) {
      resultat = resultat.filter(ao => ao.dateDevis <= dateFin);
    }

    return resultat.sort((a, b) => new Date(b.dateDevis) - new Date(a.dateDevis));
  }, [appelsDoffres, filtreStatut, recherche, filtreSecteur, dateDebut, dateFin]);

  const handleNouvelAO = () => {
    setAOSelectionne(null);
    setShowModalAO(true);
  };

  const handleModifier = (ao) => {
    setAOSelectionne(ao);
    setShowModalAO(true);
  };

  const handleVoir = (ao) => {
    setAOSelectionne(ao);
    setShowModalVoir(true);
  };

  const handleConvertir = (ao) => {
    setAOSelectionne(ao);
    setShowModalConversion(true);
  };

  const handleSupprimer = async (ao) => {
    const ok = await confirmDelete(`l'AO ${ao.numeroDevis || ao.id}`);
    if (!ok) return;
    deleteAO(ao.id);
    addLog({
      module: 'Appels d\'offres',
      action: 'Suppression AO',
      utilisateur: 'Admin',
      avant: ao,
      apres: null
    });
  };

  const handleImprimer = (ao) => {
    window.print();
    addLog({
      module: 'Appels d\'offres',
      action: 'Impression AO',
      utilisateur: 'Admin',
      avant: ao
    });
  };

  const handleExportExcel = () => {
    const dataExport = aoFiltres.map(ao => {
      const client = clients.find(c => c.id === ao.clientId);
      return {
        'N° AO': ao.numero,
        'Client': client?.nom || 'Inconnu',
        'Objet': ao.objet,
        'Secteur': ao.secteur || '',
        'Date Réception': formatDate(ao.dateReception),
        'Date Réponse': formatDate(ao.dateReponse),
        'Montant Estimé': ao.montantEstime || 0,
        'Statut': ao.statut,
        'Priorité': ao.priorite || 'Normale'
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Appels d\'offres');
    XLSX.writeFile(wb, `AO_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    addLog({
      module: 'Appels d\'offres',
      action: 'Export Excel',
      utilisateur: 'Admin'
    });
  };

  const handleExportPDF = async () => {
    const ctx = await createSikaPDF('SUIVI DES APPELS D\'OFFRES');
    const { doc, startY, MARGE_G, PAGE_W } = ctx;
    
    let y = startY;
    
    // Statistiques en haut
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total : ${aoFiltres.length} appel(s) d'offres`, MARGE_G, y);
    doc.text(`Gagné : ${stats.gagne} | Perdu : ${stats.perdu} | En cours : ${stats.aChiffrer + stats.enAttente + stats.soumis}`, MARGE_G + 70, y);
    y += 8;
    
    // Tableau AO
    const columns = ['N° AO', 'Client', 'Objet', 'Secteur', 'Date limite', 'Montant (FCFA)', 'Statut'];
    const rows = aoFiltres.map(ao => {
      const client = clients.find(c => c.id === ao.clientId);
      return [
        ao.numeroAO || '—',
        client?.nom || '—',
        ao.objet?.substring(0, 30) || '—',
        ao.secteurActivite || '—',
        ao.dateLimite ? formatDate(ao.dateLimite) : '—',
        ao.montantEstime ? formatMontant(ao.montantEstime) : '—',
        ao.statut || '—'
      ];
    });
    
    sikaTable(doc, columns, rows, y, ctx);
    
    await finalizeSikaPDF(ctx, `SIKA_AppelsOffres_${new Date().toISOString().split('T')[0]}.pdf`);
    
    addLog({
      module: 'Appels d\'offres',
      action: 'Export PDF',
      utilisateur: 'Admin'
    });
  };
  
  const handlePrintAO = async (ao) => {
    const client = clients.find(c => c.id === ao.clientId);
    const ctx = await createSikaPDF(`APPEL D'OFFRES - ${ao.numeroAO}`);
    const { doc, startY, MARGE_G, PAGE_W } = ctx;
    
    let y = startY;
    
    // Informations AO
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    
    const infos = [
      ['N° AO', ao.numeroAO || '—'],
      ['Client', client?.nom || '—'],
      ['Objet', ao.objet || '—'],
      ['Secteur d\'activité', ao.secteurActivite || '—'],
      ['Date limite', ao.dateLimite ? formatDate(ao.dateLimite) : '—'],
      ['Date réponse', ao.dateReponseAO ? formatDate(ao.dateReponseAO) : '—'],
      ['Montant estimé', ao.montantEstime ? formatMontant(ao.montantEstime) + ' FCFA' : '—'],
      ['Statut', ao.statut || '—'],
      ['Priorité', ao.priorite || '—']
    ];
    
    infos.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ' :', MARGE_G, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, 120);
      doc.text(lines, MARGE_G + 50, y);
      y += lines.length * 6;
    });
    
    if (ao.description) {
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPTION :', MARGE_G, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(ao.description, 160);
      doc.text(descLines, MARGE_G + 5, y);
    }
    
    await finalizeSikaPDF(ctx, `SIKA_AO_${ao.numeroAO}.pdf`);
  };

  const getRowClass = (ao) => {
    if (ao.statut === STATUTS_AO.DECLINE || ao.statut === STATUTS_AO.PERDU) {
      return 'bg-gray-100 text-gray-500';
    }

    if (ao.dateReponseAO) {
      const dateReponse = new Date(ao.dateReponseAO);
      const aujourdhui = new Date();
      const diffJours = Math.ceil((dateReponse - aujourdhui) / (1000 * 60 * 60 * 24));
      
      if (diffJours <= 3 && diffJours >= 0) {
        return 'bg-red-50 border-l-4 border-rouge animate-pulse';
      }
    }

    return 'hover:bg-orange-light';
  };

  const getStatutBadge = (statut) => {
    const config = {
      [STATUTS_AO.A_CHIFFRER]: { label: 'A chiffrer', color: 'bg-bleu' },
      [STATUTS_AO.DECLINE]: { label: 'Décliné', color: 'bg-gray-500' },
      [STATUTS_AO.EN_ATTENTE]: { label: 'En attente', color: 'bg-orange' },
      [STATUTS_AO.SOUMIS]: { label: 'Soumis', color: 'bg-purple-600' },
      [STATUTS_AO.GAGNE]: { label: 'Gagné', color: 'bg-vert' },
      [STATUTS_AO.PERDU]: { label: 'Perdu', color: 'bg-rouge' }
    };

    const { label, color } = config[statut] || { label: statut, color: 'bg-gray-400' };
    return <span className={`${color} text-white px-2 py-1 rounded text-xs font-medium`}>{label}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SikaHeader module="SUIVI DES APPELS D'OFFRES" />

      <div className="p-6">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-3">
              <button
                onClick={handleNouvelAO}
                className="bg-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
              >
                ➕ Nouvel AO
              </button>
              <button
                onClick={handleExportExcel}
                className="bg-vert text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                📊 Export Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-rouge text-white px-4 py-2 rounded-lg hover:bg-red-700 transition flex items-center gap-2"
              >
                📄 Export PDF
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="🔍 Recherche..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="border border-argent rounded-lg px-4 py-2 w-64 focus:outline-none focus:border-orange"
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-4 mb-6">
            {badges.map((badge) => (
              <button
                key={badge.statut}
                onClick={() => setFiltreStatut(filtreStatut === badge.statut ? null : badge.statut)}
                className={`${badge.color} rounded-lg p-4 text-center transition transform hover:scale-105 ${
                  filtreStatut === badge.statut ? 'ring-4 ring-navy' : ''
                }`}
              >
                <div className="text-2xl font-bold">{badge.count}</div>
                <div className="text-sm mt-1">{badge.label}</div>
              </button>
            ))}
          </div>

          {aoUrgents.length > 0 && (
            <div className="bg-red-50 border-l-4 border-rouge p-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-rouge font-bold">⚠️ ALERTES URGENTES:</span>
                <span className="text-gray-700">
                  {aoUrgents.length} AO à répondre dans les 3 prochains jours
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <select
              value={filtreSecteur}
              onChange={(e) => setFiltreSecteur(e.target.value)}
              className="border border-argent rounded-lg px-4 py-2 focus:outline-none focus:border-orange"
            >
              <option value="">Tous les secteurs</option>
              {secteurs.map((secteur) => (
                <option key={secteur} value={secteur}>{secteur}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="border border-argent rounded-lg px-4 py-2 focus:outline-none focus:border-orange"
              placeholder="Date début"
            />

            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="border border-argent rounded-lg px-4 py-2 focus:outline-none focus:border-orange"
              placeholder="Date fin"
            />

            {(filtreStatut || recherche || filtreSecteur || dateDebut || dateFin) && (
              <button
                onClick={() => {
                  setFiltreStatut(null);
                  setRecherche('');
                  setFiltreSecteur('');
                  setDateDebut('');
                  setDateFin('');
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">DATE DU DEVIS</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">N° DEVIS</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">CLIENT</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">REFERANCE AO</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">SECTEUR D'ACTIVITE</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">PRESTATION SOUHAITEE</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">DESIGNATIONS</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">RECEPTION AO</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">DATE DE VISITE</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">DATE DE REPONSE</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">MONTANT RETENUE</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">STATUT AO</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-argent">
                {aoFiltres.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="px-4 py-8 text-center text-gray-500">
                      Aucun appel d'offres trouvé
                    </td>
                  </tr>
                ) : (
                  aoFiltres.map((ao) => (
                    <tr key={ao.id} className={getRowClass(ao)}>
                      <td className="px-4 py-3 text-sm">{ao.dateDevis}</td>
                      <td className="px-4 py-3 text-sm font-medium text-bleu">{ao.numeroDevis}</td>
                      <td className="px-4 py-3 text-sm">{ao.client}</td>
                      <td className="px-4 py-3 text-sm">{ao.referenceAO}</td>
                      <td className="px-4 py-3 text-sm">{ao.secteurActivite}</td>
                      <td className="px-4 py-3 text-sm">{ao.prestationSouhaitee}</td>
                      <td className="px-4 py-3 text-sm">{ao.designations}</td>
                      <td className="px-4 py-3 text-sm">{ao.receptionAO}</td>
                      <td className="px-4 py-3 text-sm">{ao.dateVisiteChantier || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium">{ao.dateReponseAO}</td>
                      <td className="px-4 py-3 text-sm font-medium text-right">
                        {ao.montantRetenue ? `${ao.montantRetenue.toLocaleString()} FCFA` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">{getStatutBadge(ao.statut)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleModifier(ao)}
                            className="text-bleu hover:text-blue-700 transition"
                            title="Modifier"
                          >
                            📝
                          </button>
                          <button
                            onClick={() => handleVoir(ao)}
                            className="text-gray-600 hover:text-gray-800 transition"
                            title="Voir"
                          >
                            👁
                          </button>
                          <button
                            onClick={() => handleImprimer(ao)}
                            className="text-gray-600 hover:text-gray-800 transition"
                            title="Imprimer"
                          >
                            🖨
                          </button>
                          <button
                            onClick={() => handleConvertir(ao)}
                            className="text-vert hover:text-green-700 transition"
                            title="Convertir en Devis"
                          >
                            🔄
                          </button>
                          <button
                            onClick={() => handleSupprimer(ao)}
                            className="text-rouge hover:text-red-700 transition"
                            title="Supprimer"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-navy-light px-6 py-4 border-t border-argent">
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>Total: <strong>{aoFiltres.length}</strong> appel(s) d'offres</span>
              <span>Affichés: <strong>{aoFiltres.length}</strong> / {appelsDoffres.length}</span>
            </div>
          </div>
        </div>
      </div>

      <SikaFooter />

      {showModalAO && (
        <ModalAO
          ao={aoSelectionne}
          onClose={() => {
            setShowModalAO(false);
            setAOSelectionne(null);
          }}
        />
      )}

      {showModalConversion && (
        <ModalConversion
          ao={aoSelectionne}
          onClose={() => {
            setShowModalConversion(false);
            setAOSelectionne(null);
          }}
        />
      )}

      {showModalVoir && (
        <ModalVoir
          ao={aoSelectionne}
          onClose={() => {
            setShowModalVoir(false);
            setAOSelectionne(null);
          }}
        />
      )}
    </div>
  );
}
