import { useState, useMemo } from 'react';
import { usePlanificationStore, STATUTS_PROJET, STATUTS_TACHE } from '../../store/usePlanificationStore';
import { useClientsStore } from '../../store/useClientsStore';
import { useParametresStore } from '../../store/useParametresStore';
import { useDevisStore } from '../../store/useDevisStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationsStore } from '../../store/useNotificationsStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import * as XLSX from 'xlsx';
import { createSikaPDF, addSikaHeaderFooterToAllPages, getSikaContentMargins } from '../../utils/pdfTemplate';
import { formatFCFA, formatNumberPoints } from '../../utils/format';
import Breadcrumb from '../../components/Breadcrumb';
import ActionButtons from '../../components/ActionButtons';
import SmartPlanningUpload from './SmartPlanningUpload';

const CLIENTS_RAPIDES = [
  { id: 1, nom: 'GMCI' },
  { id: 2, nom: 'AMCC' },
  { id: 3, nom: 'LDC' }
];

const getStatutBadge = (statut) => {
  const badges = {
    [STATUTS_PROJET.EN_PREPARATION]: { emoji: '🟡', label: 'En préparation', color: 'bg-yellow-100 text-yellow-800' },
    [STATUTS_PROJET.EN_COURS]: { emoji: '🔵', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
    [STATUTS_PROJET.TERMINE]: { emoji: '🟢', label: 'Terminé', color: 'bg-green-100 text-green-800' },
    [STATUTS_PROJET.EN_RETARD]: { emoji: '🔴', label: 'En retard', color: 'bg-red-100 text-red-800' },
    [STATUTS_PROJET.SUSPENDU]: { emoji: '⏸', label: 'Suspendu', color: 'bg-gray-100 text-gray-800' }
  };
  const badge = badges[statut] || badges[STATUTS_PROJET.EN_PREPARATION];
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
      {badge.emoji} {badge.label}
    </span>
  );
};

const getIndicateurBudget = (pourcentage) => {
  if (pourcentage < 60) return { emoji: '🟢', label: 'Économe', color: 'text-vert' };
  if (pourcentage < 80) return { emoji: '🟡', label: 'Alerte', color: 'text-yellow-600' };
  return { emoji: '🔴', label: 'Dépassement', color: 'text-rouge' };
};

const calculerDureeJours = (dateDebut, dateFin) => {
  if (!dateDebut || !dateFin) return 0;
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  return Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));
};

export default function PlanificationProjet() {
  const user = useAuthStore(state => state.utilisateurConnecte);

  const indemniteRepas = useParametresStore(state => state.indemniteRepas || 5000);
  const prixCarburant = useParametresStore(state => state.prixCarburant || 700);
  const consommationMoyenne = useParametresStore(state => state.consommationMoyenne || 8);
  
  const getClientsActifs = useClientsStore(state => state.getClientsActifs);
  const clientsActifs = getClientsActifs ? getClientsActifs() : [];
  const getClientById = useClientsStore(state => state.getClientById);
  const devis = useDevisStore(state => state.devis || []);

  const projets = usePlanificationStore(state => state.projets || []);
  const addProjet = usePlanificationStore(state => state.addProjet);
  const updateProjet = usePlanificationStore(state => state.updateProjet);
  const deleteProjet = usePlanificationStore(state => state.deleteProjet);
  const addTache = usePlanificationStore(state => state.addTache);
  const updateTache = usePlanificationStore(state => state.updateTache);
  const deleteTache = usePlanificationStore(state => state.deleteTache);
  const getTachesByProjet = usePlanificationStore(state => state.getTachesByProjet);
  const getStatistiquesProjet = usePlanificationStore(state => state.getStatistiquesProjet);
  const calculerBudgetTache = usePlanificationStore(state => state.calculerBudgetTache);
  const importerTaches = usePlanificationStore(state => state.importerTaches);

  const { ajouterNotification } = useNotificationsStore();

  const [clientSelectionne, setClientSelectionne] = useState(null);
  const [projetSelectionne, setProjetSelectionne] = useState(null);
  const [tacheSelectionnee, setTacheSelectionnee] = useState(null);
  const [vue, setVue] = useState('liste');
  const [showFormProjet, setShowFormProjet] = useState(false);
  const [showFormTache, setShowFormTache] = useState(false);
  const [showImportPlanning, setShowImportPlanning] = useState(false);
  const [onglet, setOnglet] = useState('taches');

  const [formProjet, setFormProjet] = useState({
    nom: '', clientId: null, devisId: null,
    dateDebut: '', dateFin: '', budgetPrevu: 0,
    statut: STATUTS_PROJET.EN_PREPARATION, referenceProjet: '', notes: ''
  });

  const [formTache, setFormTache] = useState({
    nom: '', nbTechniciens: 1, kmSite: 0, nbDeplacements: 0,
    budgetMateriel: 0, budgetSousTraitance: 0,
    notes: '', statut: STATUTS_TACHE.A_FAIRE
  });
  
  const [tacheDateDebut, setTacheDateDebut] = useState('');
  const [tacheDateFin, setTacheDateFin] = useState('');

  const projetsFiltres = useMemo(() => {
    if (!clientSelectionne) return projets;
    return projets.filter(p => p.clientId === clientSelectionne);
  }, [projets, clientSelectionne]);

  const dureeJoursCalculee = useMemo(() => {
    if (!showFormTache || !tacheDateDebut || !tacheDateFin) return 0;
    return calculerDureeJours(tacheDateDebut, tacheDateFin);
  }, [showFormTache, tacheDateDebut, tacheDateFin]);

  const budgetCalcule = useMemo(() => {
    if (!calculerBudgetTache || !showFormTache) return null;
    
    const tacheData = {
      dureeJours: dureeJoursCalculee,
      nbTechniciens: formTache.nbTechniciens,
      kmSite: formTache.kmSite,
      nbDeplacements: formTache.nbDeplacements,
      budgetMateriel: formTache.budgetMateriel,
      budgetSousTraitance: formTache.budgetSousTraitance
    };
    
    const parametres = { indemniteRepas, prixCarburant, consommationMoyenne };
    return calculerBudgetTache(tacheData, parametres);
  }, [
    showFormTache,
    dureeJoursCalculee,
    formTache.nbTechniciens,
    formTache.kmSite,
    formTache.nbDeplacements,
    formTache.budgetMateriel,
    formTache.budgetSousTraitance,
    indemniteRepas,
    prixCarburant,
    consommationMoyenne
  ]);

  const storeReady = calculerBudgetTache && getStatistiquesProjet && getTachesByProjet;

  if (!storeReady) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-xl font-bold text-navy mb-2">Chargement...</h2>
          <p className="text-bleu">Initialisation du module de planification</p>
        </div>
      </div>
    );
  }

  const handleClientRapide = (clientId) => {
    setClientSelectionne(clientId);
    setProjetSelectionne(null);
    setVue('liste');
  };

  const handleNouveauProjet = () => {
    setFormProjet({
      nom: '', clientId: clientSelectionne, devisId: null,
      dateDebut: '', dateFin: '', budgetPrevu: 0,
      statut: STATUTS_PROJET.EN_PREPARATION, referenceProjet: '', notes: ''
    });
    setShowFormProjet(true);
  };

  const handleSaveProjet = () => {
    if (!formProjet.nom || !formProjet.clientId) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'VALIDATION',
        message: 'Veuillez remplir les champs obligatoires (nom et client)'
      });
      return;
    }
    
    if (projetSelectionne) {
      updateProjet(projetSelectionne.id, formProjet, user?.nom || 'Utilisateur');
    } else {
      const nouveauProjet = addProjet({ ...formProjet, creePar: user?.nom || 'Utilisateur' });
      setProjetSelectionne(nouveauProjet);
    }
    
    setShowFormProjet(false);
    setFormProjet({
      nom: '', clientId: null, devisId: null,
      dateDebut: '', dateFin: '', budgetPrevu: 0,
      statut: STATUTS_PROJET.EN_PREPARATION, referenceProjet: '', notes: ''
    });
  };

  const handleVoirProjet = (projet) => {
    setProjetSelectionne(projet);
    setVue('detail');
    setOnglet('taches');
  };

  const handleModifierProjet = () => {
    if (!projetSelectionne) return;
    setFormProjet(projetSelectionne);
    setShowFormProjet(true);
  };

  const handleSupprimerProjet = () => {
    if (!projetSelectionne) return;
    if (confirm(`Êtes-vous sûr de vouloir supprimer le projet "${projetSelectionne.nom}" ?`)) {
      deleteProjet(projetSelectionne.id);
      setProjetSelectionne(null);
      setVue('liste');
    }
  };

  const handleNouvelleTache = () => {
    setFormTache({
      nom: '', nbTechniciens: 1, kmSite: 0, nbDeplacements: 0,
      budgetMateriel: 0, budgetSousTraitance: 0,
      notes: '', statut: STATUTS_TACHE.A_FAIRE
    });
    setTacheDateDebut('');
    setTacheDateFin('');
    setTacheSelectionnee(null);
    setShowFormTache(true);
  };

  const handleSaveTache = () => {
    if (!formTache.nom || !projetSelectionne) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'VALIDATION',
        message: 'Veuillez remplir les champs obligatoires (nom de la tâche)'
      });
      return;
    }
    
    const tacheComplete = { 
      ...formTache, 
      dateDebut: tacheDateDebut,
      dateFin: tacheDateFin,
      dureeJours: dureeJoursCalculee 
    };
    const parametres = { indemniteRepas, prixCarburant, consommationMoyenne };
    const budget = calculerBudgetTache(tacheComplete, parametres);

    if (tacheSelectionnee) {
      updateTache(tacheSelectionnee.id, { ...tacheComplete, ...budget });
    } else {
      addTache({ ...tacheComplete, projetId: projetSelectionne.id, ...budget });
    }
    
    setShowFormTache(false);
    setTacheSelectionnee(null);
  };

  const handleModifierTache = (tache) => {
    setTacheSelectionnee(tache);
    const { dateDebut, dateFin, ...autresChamps } = tache;
    setFormTache(autresChamps);
    setTacheDateDebut(dateDebut || '');
    setTacheDateFin(dateFin || '');
    setShowFormTache(true);
  };

  const handleSupprimerTache = (tacheId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      deleteTache(tacheId);
    }
  };

  const handleImportPlanning = (tachesImportees) => {
    if (!projetSelectionne) return;
    importerTaches(tachesImportees, projetSelectionne.id);
  };

  const exporterExcel = () => {
    const wb = XLSX.utils.book_new();
    const dataProjets = projetsFiltres.map(p => {
      const stats = getStatistiquesProjet(p.id);
      const client = getClientById(p.clientId);
      return {
        'Nom': p.nom, 'Client': client?.nom || '',
        'Date début': p.dateDebut, 'Date fin': p.dateFin,
        'Budget prévu': stats?.budgetPrevu || 0,
        'Coût réel': stats?.coutReel || 0,
        'Écart': stats?.ecart || 0,
        '% Consommé': stats?.pourcentageConsomme || 0,
        'Statut': p.statut, 'Avancement %': stats?.avancement || 0
      };
    });
    const ws1 = XLSX.utils.json_to_sheet(dataProjets);
    XLSX.utils.book_append_sheet(wb, ws1, 'Projets');
    
    if (projetSelectionne) {
      const tachesProjet = getTachesByProjet(projetSelectionne.id);
      const dataTaches = tachesProjet.map(t => ({
        'Tâche': t.nom, 'Date début': t.dateDebut, 'Date fin': t.dateFin,
        'Durée (j)': t.dureeJours, 'Techniciens': t.nbTechniciens,
        'Budget Carburant': t.budgetCarburant || 0,
        'Budget Nourriture': t.budgetNourriture || 0,
        'Budget Logistique': t.budgetLogistique || 0,
        'Coût Total': t.coutTotal || 0, 'Statut': t.statut
      }));
      const ws2 = XLSX.utils.json_to_sheet(dataTaches);
      XLSX.utils.book_append_sheet(wb, ws2, 'Tâches');
    }
    XLSX.writeFile(wb, `Planification_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exporterPDF = () => {
    try {
      const doc = createSikaPDF();
      const margins = getSikaContentMargins();

      doc.setFontSize(14);
      doc.setTextColor(27, 42, 74);
      doc.text('Planification Projets', 105, margins.top + 5, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, margins.top + 15);

      if (clientSelectionne) {
        const client = getClientById(clientSelectionne);
        doc.text(`Client: ${client?.nom || 'Tous les clients'}`, 14, margins.top + 22);
      }

      if (projetSelectionne) {
        const stats = getStatistiquesProjet(projetSelectionne.id);
        const client = getClientById(projetSelectionne.clientId);
        doc.setFontSize(12);
        doc.setTextColor(27, 42, 74);
        doc.text(`Projet: ${projetSelectionne.nom}`, 14, margins.top + 32);
        doc.text(`Client: ${client?.nom || ''}`, 14, margins.top + 39);
        doc.text(`Budget prévu: ${formatFCFA(stats?.budgetPrevu || 0)}`, 14, margins.top + 46);
        doc.text(`Coût réel: ${formatFCFA(stats?.coutReel || 0)}`, 14, margins.top + 53);
        doc.text(`Écart: ${formatFCFA(stats?.ecart || 0)}`, 14, margins.top + 60);

        const tachesProjet = getTachesByProjet(projetSelectionne.id);
        const tableData = tachesProjet.map(t => [
          t.nom, t.dateDebut, t.dateFin, t.dureeJours, t.nbTechniciens,
          formatNumberPoints(t.coutTotal || 0), t.statut
        ]);
        
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: margins.top + 68,
            head: [['Tâche', 'Début', 'Fin', 'Durée', 'Tech.', 'Coût', 'Statut']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [27, 42, 74], textColor: 255 },
            alternateRowStyles: { fillColor: [232, 236, 244] },
            margin: { bottom: margins.bottom }
          });
        } else {
          console.error('autoTable non disponible');
          // Fallback: afficher le texte manuellement
          let y = margins.top + 75;
          tableData.forEach((row, i) => {
            doc.setFontSize(8);
            doc.text(row.join(' | '), 14, y);
            y += 5;
          });
        }
      } else {
        const dataProjets = projetsFiltres.map(p => {
          const stats = getStatistiquesProjet(p.id);
          const client = getClientById(p.clientId);
          return [
            p.nom,
            client?.nom || '',
            p.dateDebut || '-',
            p.dateFin || '-',
            formatNumberPoints(stats?.budgetPrevu || 0),
            formatNumberPoints(stats?.coutReel || 0),
            formatNumberPoints(stats?.ecart || 0),
            `${Math.round(stats?.pourcentageConsomme || 0)}%`,
            p.statut
          ];
        });
        
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: margins.top + 30,
            head: [['Projet', 'Client', 'Début', 'Fin', 'Budget', 'Coût', 'Écart', '%', 'Statut']],
            body: dataProjets,
            theme: 'grid',
            headStyles: { fillColor: [27, 42, 74], textColor: 255 },
            alternateRowStyles: { fillColor: [232, 236, 244] },
            margin: { bottom: margins.bottom },
            styles: { fontSize: 8 }
          });
        } else {
          let y = margins.top + 35;
          dataProjets.forEach((row) => {
            doc.setFontSize(7);
            doc.text(row.slice(0, 5).join(' | '), 14, y);
            y += 4;
          });
        }
      }

      addSikaHeaderFooterToAllPages(doc);
      doc.save(`Planification_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR PDF',
        message: 'Erreur lors de l\'export PDF: ' + (error.message || 'Erreur inconnue')
      });
    }
  };

  const visualiser = () => {
    try {
      const doc = createSikaPDF();
      const margins = getSikaContentMargins();

      doc.setFontSize(14);
      doc.setTextColor(27, 42, 74);
      doc.text('Planification Projets - Aperçu', 105, margins.top + 5, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, margins.top + 15);

      if (clientSelectionne) {
        const client = getClientById(clientSelectionne);
        doc.text(`Client: ${client?.nom || 'Tous les clients'}`, 14, margins.top + 22);
      }

      if (projetSelectionne) {
        const stats = getStatistiquesProjet(projetSelectionne.id);
        const client = getClientById(projetSelectionne.clientId);
        doc.setFontSize(12);
        doc.setTextColor(27, 42, 74);
        doc.text(`Projet: ${projetSelectionne.nom}`, 14, margins.top + 32);
        doc.text(`Client: ${client?.nom || ''}`, 14, margins.top + 39);
        doc.text(`Budget prévu: ${formatFCFA(stats?.budgetPrevu || 0)}`, 14, margins.top + 46);
        doc.text(`Coût réel: ${formatFCFA(stats?.coutReel || 0)}`, 14, margins.top + 53);
        doc.text(`Écart: ${formatFCFA(stats?.ecart || 0)}`, 14, margins.top + 60);

        const tachesProjet = getTachesByProjet(projetSelectionne.id);
        const tableData = tachesProjet.map(t => [
          t.nom, t.dateDebut, t.dateFin, t.dureeJours, t.nbTechniciens,
          formatNumberPoints(t.coutTotal || 0), t.statut
        ]);
        
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: margins.top + 68,
            head: [['Tâche', 'Début', 'Fin', 'Durée', 'Tech.', 'Coût', 'Statut']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [27, 42, 74], textColor: 255 },
            alternateRowStyles: { fillColor: [232, 236, 244] },
            margin: { bottom: margins.bottom }
          });
        } else {
          let y = margins.top + 75;
          tableData.forEach((row) => {
            doc.setFontSize(8);
            doc.text(row.join(' | '), 14, y);
            y += 5;
          });
        }
      } else {
        const dataProjets = projetsFiltres.map(p => {
          const stats = getStatistiquesProjet(p.id);
          const client = getClientById(p.clientId);
          return [
            p.nom,
            client?.nom || '',
            p.dateDebut || '-',
            p.dateFin || '-',
            formatNumberPoints(stats?.budgetPrevu || 0),
            formatNumberPoints(stats?.coutReel || 0),
            formatNumberPoints(stats?.ecart || 0),
            `${Math.round(stats?.pourcentageConsomme || 0)}%`,
            p.statut
          ];
        });
        
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: margins.top + 30,
            head: [['Projet', 'Client', 'Début', 'Fin', 'Budget', 'Coût', 'Écart', '%', 'Statut']],
            body: dataProjets,
            theme: 'grid',
            headStyles: { fillColor: [27, 42, 74], textColor: 255 },
            alternateRowStyles: { fillColor: [232, 236, 244] },
            margin: { bottom: margins.bottom },
            styles: { fontSize: 8 }
          });
        } else {
          let y = margins.top + 35;
          dataProjets.forEach((row) => {
            doc.setFontSize(7);
            doc.text(row.slice(0, 5).join(' | '), 14, y);
            y += 4;
          });
        }
      }

      addSikaHeaderFooterToAllPages(doc);

      const pdfOutput = doc.output('dataurlstring');
      
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Aperçu - Planification Projets</title></head>
            <body style="margin:0;padding:0;overflow:hidden;">
              <iframe src="${pdfOutput}" width="100%" height="100%" style="border:none;"></iframe>
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        const link = document.createElement('a');
        link.href = pdfOutput;
        link.target = '_blank';
        link.click();
      }
    } catch (error) {
      console.error('Erreur lors de la visualisation:', error);
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR',
        message: 'Erreur lors de la visualisation: ' + (error.message || 'Erreur inconnue')
      });
    }
  };

  const imprimer = () => {
    try {
      const doc = createSikaPDF();
      const margins = getSikaContentMargins();

      doc.setFontSize(14);
      doc.setTextColor(27, 42, 74);
      doc.text('Planification Projets', 105, margins.top + 5, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, margins.top + 15);

      if (clientSelectionne) {
        const client = getClientById(clientSelectionne);
        doc.text(`Client: ${client?.nom || 'Tous les clients'}`, 14, margins.top + 22);
      }

      if (projetSelectionne) {
        const stats = getStatistiquesProjet(projetSelectionne.id);
        const client = getClientById(projetSelectionne.clientId);
        doc.setFontSize(12);
        doc.setTextColor(27, 42, 74);
        doc.text(`Projet: ${projetSelectionne.nom}`, 14, margins.top + 32);
        doc.text(`Client: ${client?.nom || ''}`, 14, margins.top + 39);
        doc.text(`Budget prévu: ${formatFCFA(stats?.budgetPrevu || 0)}`, 14, margins.top + 46);
        doc.text(`Coût réel: ${formatFCFA(stats?.coutReel || 0)}`, 14, margins.top + 53);
        doc.text(`Écart: ${formatFCFA(stats?.ecart || 0)}`, 14, margins.top + 60);

        const tachesProjet = getTachesByProjet(projetSelectionne.id);
        const tableData = tachesProjet.map(t => [
          t.nom, t.dateDebut, t.dateFin, t.dureeJours, t.nbTechniciens,
          formatNumberPoints(t.coutTotal || 0), t.statut
        ]);
        
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: margins.top + 68,
            head: [['Tâche', 'Début', 'Fin', 'Durée', 'Tech.', 'Coût', 'Statut']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [27, 42, 74], textColor: 255 },
            alternateRowStyles: { fillColor: [232, 236, 244] },
            margin: { bottom: margins.bottom }
          });
        } else {
          let y = margins.top + 75;
          tableData.forEach((row) => {
            doc.setFontSize(8);
            doc.text(row.join(' | '), 14, y);
            y += 5;
          });
        }
      } else {
        const dataProjets = projetsFiltres.map(p => {
          const stats = getStatistiquesProjet(p.id);
          const client = getClientById(p.clientId);
          return [
            p.nom,
            client?.nom || '',
            p.dateDebut || '-',
            p.dateFin || '-',
            formatNumberPoints(stats?.budgetPrevu || 0),
            formatNumberPoints(stats?.coutReel || 0),
            formatNumberPoints(stats?.ecart || 0),
            `${Math.round(stats?.pourcentageConsomme || 0)}%`,
            p.statut
          ];
        });
        
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: margins.top + 30,
            head: [['Projet', 'Client', 'Début', 'Fin', 'Budget', 'Coût', 'Écart', '%', 'Statut']],
            body: dataProjets,
            theme: 'grid',
            headStyles: { fillColor: [27, 42, 74], textColor: 255 },
            alternateRowStyles: { fillColor: [232, 236, 244] },
            margin: { bottom: margins.bottom },
            styles: { fontSize: 8 }
          });
        } else {
          let y = margins.top + 35;
          dataProjets.forEach((row) => {
            doc.setFontSize(7);
            doc.text(row.slice(0, 5).join(' | '), 14, y);
            y += 4;
          });
        }
      }

      addSikaHeaderFooterToAllPages(doc);

      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Ouvrir directement dans un nouvel onglet pour impression
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
      } else {
        doc.save(`Planification_${new Date().toISOString().split('T')[0]}.pdf`);
      }

    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      ajouterNotification({
        type: 'URGENT',
        icone: '❌',
        titre: 'ERREUR',
        message: 'Erreur lors de l\'impression: ' + (error.message || 'Erreur inconnue')
      });
    }
  };

  const breadcrumbItems = [
    { label: 'Accueil', path: '/dashboard' },
    { label: 'Planification', path: '/planification' }
  ];
  if (clientSelectionne) {
    const client = getClientById(clientSelectionne);
    breadcrumbItems.push({ label: client?.nom || 'Client' });
  }

  return (
    <div className="p-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-navy mb-4">🚀 Pilotage Projets</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium text-navy mb-2">Sélectionner un client</label>
          <div className="flex gap-2 flex-wrap">
            {CLIENTS_RAPIDES.map(client => (
              <button
                key={client.id}
                onClick={() => handleClientRapide(client.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  clientSelectionne === client.id
                    ? 'bg-[#E60000] text-white'
                    : 'bg-gray-100 text-navy hover:bg-[#E60000] hover:text-white'
                }`}
              >
                {client.nom}
              </button>
            ))}
            <select
              value={clientSelectionne || ''}
              onChange={(e) => handleClientRapide(parseInt(e.target.value))}
              className="px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
            >
              <option value="">Tous les clients</option>
              {clientsActifs.map(client => (
                <option key={client.id} value={client.id}>{client.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <ActionButtons
            onAdd={handleNouveauProjet}
            onEdit={projetSelectionne ? handleModifierProjet : null}
            onView={visualiser}
            onPrint={imprimer}
            onDelete={projetSelectionne ? handleSupprimerProjet : null}
            permissions={{
              add: true,
              edit: !!projetSelectionne,
              view: true,
              print: true,
              delete: !!projetSelectionne
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportPlanning(true)}
              disabled={!projetSelectionne}
              className="px-4 py-2 bg-bleu text-white rounded-lg hover:bg-bleu/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📤 Import Planning
            </button>
            <button onClick={exporterExcel} className="px-4 py-2 bg-vert text-white rounded-lg hover:bg-vert/90 transition-colors">
              📊 Export Excel
            </button>
            <button onClick={exporterPDF} className="px-4 py-2 bg-rouge text-white rounded-lg hover:bg-rouge/90 transition-colors">
              📄 Export PDF
            </button>
          </div>
        </div>
      </div>

      {vue === 'liste' && (
        <ListeProjets
          projets={projetsFiltres}
          getStatistiquesProjet={getStatistiquesProjet}
          getClientById={getClientById}
          onVoirProjet={handleVoirProjet}
        />
      )}

      {vue === 'detail' && projetSelectionne && (
        <DetailProjet
          projet={projetSelectionne}
          stats={getStatistiquesProjet(projetSelectionne.id)}
          client={getClientById(projetSelectionne.clientId)}
          taches={getTachesByProjet(projetSelectionne.id)}
          onglet={onglet}
          setOnglet={setOnglet}
          onNouvelleTache={handleNouvelleTache}
          onModifierTache={handleModifierTache}
          onSupprimerTache={handleSupprimerTache}
          onRetour={() => setVue('liste')}
        />
      )}

      {showFormProjet && (
        <FormProjet
          form={formProjet}
          setForm={setFormProjet}
          onSave={handleSaveProjet}
          onCancel={() => setShowFormProjet(false)}
          clients={clientsActifs}
          devis={devis}
        />
      )}

      {showFormTache && (
        <FormTache
          form={formTache}
          setForm={setFormTache}
          dateDebut={tacheDateDebut}
          setDateDebut={setTacheDateDebut}
          dateFin={tacheDateFin}
          setDateFin={setTacheDateFin}
          onSave={handleSaveTache}
          onCancel={() => { setShowFormTache(false); setTacheSelectionnee(null); }}
          budgetCalcule={budgetCalcule}
          dureeJoursCalculee={dureeJoursCalculee}
        />
      )}

      {showImportPlanning && projetSelectionne && (
        <SmartPlanningUpload
          onClose={() => setShowImportPlanning(false)}
          onImport={handleImportPlanning}
          projetId={projetSelectionne.id}
        />
      )}
    </div>
  );
}

function ListeProjets({ projets, getStatistiquesProjet, getClientById, onVoirProjet }) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-navy text-white">
            <tr>
              <th className="px-4 py-3 text-left">Nom projet</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Date début</th>
              <th className="px-4 py-3 text-left">Date fin</th>
              <th className="px-4 py-3 text-right">Budget prévu</th>
              <th className="px-4 py-3 text-right">Coût réel</th>
              <th className="px-4 py-3 text-right">Écart</th>
              <th className="px-4 py-3 text-center">% Consommé</th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projets.length === 0 ? (
              <tr>
                <td colSpan="10" className="px-4 py-8 text-center text-bleu">
                  Aucun projet trouvé. Cliquez sur "Ajouter" pour créer un nouveau projet.
                </td>
              </tr>
            ) : (
              projets.map((projet, index) => {
                const stats = getStatistiquesProjet(projet.id);
                const client = getClientById(projet.clientId);
                const indicateur = getIndicateurBudget(stats?.pourcentageConsomme || 0);
                return (
                  <tr
                    key={projet.id}
                    className={`border-b border-argent hover:bg-orange/10 cursor-pointer ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                    onClick={() => onVoirProjet(projet)}
                  >
                    <td className="px-4 py-3 font-medium text-navy">{projet.nom}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-orange text-white rounded text-xs font-medium">
                        {client?.nom || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bleu">{projet.dateDebut || '-'}</td>
                    <td className="px-4 py-3 text-bleu">{projet.dateFin || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatFCFA(stats?.budgetPrevu || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatFCFA(stats?.coutReel || 0)}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      (stats?.ecart || 0) >= 0 ? 'text-rouge' : 'text-vert'
                    }`}>
                      {formatFCFA(stats?.ecart || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${indicateur.color}`}>
                        {indicateur.emoji} {Math.round(stats?.pourcentageConsomme || 0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{getStatutBadge(projet.statut)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onVoirProjet(projet); }}
                        className="text-bleu hover:text-orange transition-colors"
                      >
                        👁
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailProjet({ projet, stats, client, taches, onglet, setOnglet, onNouvelleTache, onModifierTache, onSupprimerTache, onRetour }) {
  const indicateur = getIndicateurBudget(stats?.pourcentageConsomme || 0);
  const graphiqueData = taches.map(t => ({
    nom: t.nom.substring(0, 20),
    'Budget Prévu': t.coutTotal || 0,
    'Coût Réel': t.coutReel || 0
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-navy text-white px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{projet.nom}</h2>
          <p className="text-sm opacity-90">Client: <span className="font-medium">{client?.nom || 'N/A'}</span></p>
        </div>
        <button onClick={onRetour} className="px-4 py-2 bg-white text-navy rounded-lg hover:bg-orange/10 transition-colors">
          ← Retour
        </button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Budget Total Devis', value: stats?.budgetPrevu || 0, color: 'text-navy' },
            { label: 'Coût Total Réel', value: stats?.coutReel || 0, color: 'text-navy' },
            { label: (stats?.ecart || 0) > 0 ? '⚠️ Dépassement' : '✅ Économie', value: stats?.ecart || 0, color: (stats?.ecart || 0) > 0 ? 'text-rouge' : 'text-vert' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-bleu mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{formatFCFA(value)}</p>
            </div>
          ))}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-bleu mb-1">Consommation Budget</p>
            <p className={`text-xl font-bold ${indicateur.color}`}>
              {indicateur.emoji} {Math.round(stats?.pourcentageConsomme || 0)}%
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-navy">Progression Budget</span>
            <span className={`text-sm font-bold ${indicateur.color}`}>
              {Math.round(stats?.pourcentageConsomme || 0)}%
            </span>
          </div>
          <div className="w-full bg-argent rounded-full h-4 overflow-hidden">
            <div
              className={`h-full transition-all ${
                (stats?.pourcentageConsomme || 0) < 60 ? 'bg-vert'
                : (stats?.pourcentageConsomme || 0) < 80 ? 'bg-yellow-500'
                : 'bg-rouge'
              }`}
              style={{ width: `${Math.min(stats?.pourcentageConsomme || 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="border-b border-argent mb-6">
          <div className="flex gap-4">
            {['taches', 'suivi'].map(tab => (
              <button
                key={tab}
                onClick={() => setOnglet(tab)}
                className={`px-4 py-2 font-medium transition-colors ${
                  onglet === tab ? 'text-orange border-b-2 border-orange' : 'text-bleu hover:text-orange'
                }`}
              >
                {tab === 'taches' ? '📋 Tâches' : '📊 Suivi Budgétaire'}
              </button>
            ))}
          </div>
        </div>

        {onglet === 'taches' && (
          <OngletTaches
            taches={taches}
            onNouvelleTache={onNouvelleTache}
            onModifierTache={onModifierTache}
            onSupprimerTache={onSupprimerTache}
          />
        )}

        {onglet === 'suivi' && (
          <OngletSuivi taches={taches} graphiqueData={graphiqueData} />
        )}
      </div>
    </div>
  );
}

function OngletTaches({ taches, onNouvelleTache, onModifierTache, onSupprimerTache }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-navy">Liste des tâches</h3>
        <button onClick={onNouvelleTache} className="px-4 py-2 bg-vert text-white rounded-lg hover:bg-vert/90 transition-colors">
          ➕ Nouvelle tâche
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Tâche','Début','Fin','Durée (j)','Tech.','Carburant','Nourriture','Logistique','Coût Total','Statut','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-navy">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {taches.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-4 py-8 text-center text-bleu">
                  Aucune tâche. Cliquez sur "Nouvelle tâche" pour commencer.
                </td>
              </tr>
            ) : (
              taches.map((tache, index) => (
                <tr key={tache.id} className={`border-b border-argent hover:bg-orange/10 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-4 py-3 font-medium text-navy">{tache.nom}</td>
                  <td className="px-4 py-3 text-bleu">{tache.dateDebut || '-'}</td>
                  <td className="px-4 py-3 text-bleu">{tache.dateFin || '-'}</td>
                  <td className="px-4 py-3 text-center">{tache.dureeJours || 0}</td>
                  <td className="px-4 py-3 text-center">{tache.nbTechniciens || 0}</td>
                  <td className="px-4 py-3 text-right">{formatNumberPoints(tache.budgetCarburant || 0)}</td>
                  <td className="px-4 py-3 text-right">{formatNumberPoints(tache.budgetNourriture || 0)}</td>
                  <td className="px-4 py-3 text-right">{formatNumberPoints(tache.budgetLogistique || 0)}</td>
                  <td className="px-4 py-3 text-right font-bold text-navy">{formatNumberPoints(tache.coutTotal || 0)}</td>
                  <td className="px-4 py-3 text-center">{getStatutBadge(tache.statut)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => onModifierTache(tache)} className="text-bleu hover:text-orange mr-2">📝</button>
                    <button onClick={() => onSupprimerTache(tache.id)} className="text-rouge hover:text-rouge/80">🗑</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OngletSuivi({ taches, graphiqueData }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-navy mb-4">Suivi Budgétaire - Prévu vs Réel</h3>
      {taches.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={graphiqueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nom" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip formatter={(value) => `${formatFCFA(value)}`} />
            <Legend />
            <Bar dataKey="Budget Prévu" fill="#1B2A4A" />
            <Bar dataKey="Coût Réel" fill="#E60000" />
            <Line type="monotone" dataKey="Écart" stroke="#E60000" strokeDasharray="5 5" />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-12 text-bleu">
          Aucune donnée à afficher. Ajoutez des tâches pour voir le graphique.
        </div>
      )}
    </div>
  );
}

function FormProjet({ form, setForm, onSave, onCancel, clients, devis }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-navy text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-bold">{form.id ? '📝 Modifier le projet' : '➕ Nouveau projet'}</h2>
          <button onClick={onCancel} className="text-white hover:text-orange text-2xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Nom du projet <span className="text-rouge">*</span></label>
            <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              placeholder="Ex: Installation système ventilation" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Client <span className="text-rouge">*</span></label>
              <select value={form.clientId || ''} onChange={(e) => setForm({ ...form, clientId: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange">
                <option value="">Sélectionner un client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Devis lié</label>
              <select value={form.devisId || ''} onChange={(e) => setForm({ ...form, devisId: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange">
                <option value="">Aucun devis</option>
                {devis.map(d => <option key={d.id} value={d.id}>{d.numero}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Date début</label>
              <input type="date" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Date fin</label>
              <input type="date" value={form.dateFin} onChange={(e) => setForm({ ...form, dateFin: e.target.value })}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Budget prévu (FCFA)</label>
              <input type="number" value={form.budgetPrevu} onChange={(e) => setForm({ ...form, budgetPrevu: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Statut</label>
              <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange">
                <option value={STATUTS_PROJET.EN_PREPARATION}>🟡 En préparation</option>
                <option value={STATUTS_PROJET.EN_COURS}>🔵 En cours</option>
                <option value={STATUTS_PROJET.TERMINE}>🟢 Terminé</option>
                <option value={STATUTS_PROJET.EN_RETARD}>🔴 En retard</option>
                <option value={STATUTS_PROJET.SUSPENDU}>⏸ Suspendu</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Référence projet (pour caisse)</label>
            <input type="text" value={form.referenceProjet} onChange={(e) => setForm({ ...form, referenceProjet: e.target.value })}
              className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              placeholder="Ex: PROJ-2026-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
              className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              placeholder="Notes et commentaires..." />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={onCancel} className="px-6 py-2 bg-argent text-navy rounded-lg hover:bg-gray-400 transition-colors">Annuler</button>
            <button onClick={onSave} className="px-6 py-2 bg-orange text-white rounded-lg hover:bg-orange/90 transition-colors font-medium">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormTache({ form, setForm, dateDebut, setDateDebut, dateFin, setDateFin, onSave, onCancel, budgetCalcule, dureeJoursCalculee }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-navy text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-bold">{form.id ? '📝 Modifier la tâche' : '➕ Nouvelle tâche'}</h2>
          <button onClick={onCancel} className="text-white hover:text-orange text-2xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Nom de la tâche <span className="text-rouge">*</span></label>
            <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              placeholder="Ex: Installation conduits ventilation" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Date début</label>
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Date fin</label>
              <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Durée (jours) — auto</label>
              <input type="number" value={dureeJoursCalculee || 0} readOnly
                className="w-full px-4 py-2 border border-argent rounded-lg bg-gray-50 text-navy font-bold cursor-not-allowed" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Nb techniciens</label>
              <input type="number" min="1" value={form.nbTechniciens} onChange={(e) => setForm({ ...form, nbTechniciens: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Distance site (km)</label>
              <input type="number" min="0" value={form.kmSite} onChange={(e) => setForm({ ...form, kmSite: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Nb déplacements</label>
              <input type="number" min="0" value={form.nbDeplacements} onChange={(e) => setForm({ ...form, nbDeplacements: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Budget matériel (FCFA)</label>
              <input type="number" min="0" value={form.budgetMateriel} onChange={(e) => setForm({ ...form, budgetMateriel: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Budget sous-traitance (FCFA)</label>
              <input type="number" min="0" value={form.budgetSousTraitance} onChange={(e) => setForm({ ...form, budgetSousTraitance: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Statut</label>
            <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}
              className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange">
              <option value={STATUTS_TACHE.A_FAIRE}>À faire</option>
              <option value={STATUTS_TACHE.EN_COURS}>En cours</option>
              <option value={STATUTS_TACHE.TERMINE}>Terminé</option>
              <option value={STATUTS_TACHE.EN_RETARD}>En retard</option>
              <option value={STATUTS_TACHE.BLOQUE}>Bloqué</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange"
              placeholder="Notes et commentaires..." />
          </div>

          {budgetCalcule && (
            <div className="bg-orange/10 p-4 rounded-lg border border-orange">
              <h3 className="font-bold text-navy mb-3">💰 Calculs en temps réel</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-bleu">Budget Carburant estimé:</p>
                  <p className="font-bold text-navy">{formatFCFA(budgetCalcule.budgetCarburant)}</p>
                </div>
                <div>
                  <p className="text-bleu">Budget Nourriture estimé:</p>
                  <p className="font-bold text-navy">{formatFCFA(budgetCalcule.budgetNourriture)}</p>
                </div>
                <div>
                  <p className="text-bleu">Budget Logistique:</p>
                  <p className="font-bold text-navy">{formatFCFA(budgetCalcule.budgetLogistique)}</p>
                </div>
                <div>
                  <p className="text-bleu">Coût Hebdo estimé:</p>
                  <p className="font-bold text-navy">{formatFCFA(budgetCalcule.coutHebdo)}</p>
                </div>
                <div className="col-span-2 border-t border-orange pt-2 mt-2">
                  <p className="text-bleu">Coût Total Estimé:</p>
                  <p className="text-2xl font-bold text-orange">{formatFCFA(budgetCalcule.coutTotal)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={onCancel} className="px-6 py-2 bg-argent text-navy rounded-lg hover:bg-gray-400 transition-colors">Annuler</button>
            <button onClick={onSave} className="px-6 py-2 bg-orange text-white rounded-lg hover:bg-orange/90 transition-colors font-medium">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
