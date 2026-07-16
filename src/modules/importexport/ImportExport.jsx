import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, FileText, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import 'jspdf-autotable';
import { createSikaPDF, addSikaHeaderFooterToAllPages, getSikaContentMargins } from '../../utils/pdfTemplate';
import { useClientsStore } from '../../store/useClientsStore';
import { useFournisseursStore } from '../../store/useFournisseursStore';
import { useDevisStore } from '../../store/useDevisStore';
import { useFacturesStore } from '../../store/useFacturesStore';
import { useEncaissementsStore } from '../../store/useEncaissementsStore';
import { useAOStore } from '../../store/useAOStore';
import { useCaisseStore } from '../../store/useCaisseStore';
import { useJournalStore } from '../../store/useJournalStore';
import { usePlanificationStore } from '../../store/usePlanificationStore';
import { useNotifications } from '../../components/NotificationProvider';
import GenerateExampleFile from './GenerateExampleFile';

const COLORS = {
  navy: 'var(--color-primary)',
  orange: 'var(--color-accent)',
  blue: 'var(--color-primary)',
  green: 'var(--color-success)',
  red: 'var(--color-accent)',
  silver: 'var(--color-border)',
  lightOrange: 'var(--color-accent-light)',
  lightNavy: 'var(--color-surface-muted)'
};

const MODULES_CONFIG = {
  clients: { 
    store: 'useClientsStore', 
    label: 'Clients',
    sheet: 'Clients',
    fields: ['code', 'nom', 'contact', 'telephone', 'email', 'adresse', 'ville', 'pays', 'typeClient', 'conditionsPaiement', 'delaiPaiement', 'plafondCredit', 'solde', 'statut']
  },
  fournisseurs: { 
    store: 'useFournisseursStore', 
    label: 'Fournisseurs',
    sheet: 'Fournisseurs',
    fields: ['code', 'nom', 'contact', 'telephone', 'email', 'adresse', 'ville', 'pays', 'categorie', 'conditionsPaiement', 'delaiPaiement', 'solde', 'statut']
  },
  devis: { 
    store: 'useDevisStore', 
    label: 'Devis',
    sheet: 'Devis',
    fields: ['numero', 'date', 'clientId', 'clientNom', 'montantHT', 'tva', 'montantTTC', 'validiteJours', 'statut', 'lignes']
  },
  factures: { 
    store: 'useFacturesStore', 
    label: 'Factures',
    sheet: 'Factures',
    fields: ['numero', 'date', 'dateEcheance', 'clientId', 'clientNom', 'montantHT', 'tva', 'montantTTC', 'montantPaye', 'solde', 'statut', 'lignes']
  },
  encaissements: { 
    store: 'useEncaissementsStore', 
    label: 'Encaissements',
    sheet: 'Encaissements',
    fields: ['numero', 'date', 'factureId', 'factureNumero', 'clientId', 'clientNom', 'montant', 'modePaiement', 'reference', 'notes']
  },
  ao: { 
    store: 'useAOStore', 
    label: 'Appels d\'Offres',
    sheet: 'AO',
    fields: ['numero', 'reference', 'titre', 'client', 'datePublication', 'dateLimite', 'montantEstime', 'statut', 'priorite']
  },
  caisse: { 
    store: 'useCaisseStore', 
    label: 'Caisse',
    sheet: 'Caisse',
    fields: ['date', 'type', 'categorie', 'montant', 'modePaiement', 'reference', 'description', 'beneficiaire']
  },
  journal: { 
    store: 'useJournalStore', 
    label: 'Journal de Caisse',
    sheet: 'Journal',
    fields: ['date', 'libelle', 'entrees', 'sorties', 'solde', 'modePaiement', 'reference']
  },
  planification: { 
    store: 'usePlanificationStore', 
    label: 'Planification',
    sheet: 'Planification',
    fields: ['titre', 'description', 'dateDebut', 'dateFin', 'statut', 'priorite', 'responsable', 'progression']
  }
};

const excelDateToJSDate = (excelDate) => {
  if (!excelDate || typeof excelDate !== 'number') return null;
  const date = new Date((excelDate - 25569) * 86400000);
  return date.toISOString().split('T')[0];
};

const ImportExport = () => {
  const [activeTab, setActiveTab] = useState('import');
  
  const [importFile, setImportFile] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [importMode, setImportMode] = useState('merge');
  const [importReport, setImportReport] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const [exportModule, setExportModule] = useState('clients');
  const [exportPeriod, setExportPeriod] = useState({ start: '', end: '' });
  const [exportClient, setExportClient] = useState('');
  const [exportFormat, setExportFormat] = useState('excel');
  
  const fileInputRef = useRef(null);
  const { success, error, warning } = useNotifications();
  
  const clients = useClientsStore(state => state.clients);
  const fournisseurs = useFournisseursStore(state => state.fournisseurs);
  const devis = useDevisStore(state => state.devis);
  const factures = useFacturesStore(state => state.factures);
  const encaissements = useEncaissementsStore(state => state.encaissements);
  const aos = useAOStore(state => state.appelsDoffres);
  const operations = useCaisseStore(state => state.mouvements);
  const journalEntries = useJournalStore(state => state.ecritures);
  const taches = usePlanificationStore(state => state.taches);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImportFile(file);
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      setSheets(workbook.SheetNames);
      setSelectedSheet('');
      setPreviewData([]);
      setColumnMapping({});
      setImportReport(null);
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleSheetSelect = (sheetName) => {
    setSelectedSheet(sheetName);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      if (jsonData.length > 0) {
        const headers = jsonData[0];
        const preview = jsonData.slice(1, 6);
        setPreviewData({ headers, rows: preview });
        
        const moduleKey = Object.keys(MODULES_CONFIG).find(
          key => MODULES_CONFIG[key].sheet.toLowerCase() === sheetName.toLowerCase()
        );
        
        if (moduleKey) {
          const autoMapping = {};
          const moduleFields = MODULES_CONFIG[moduleKey].fields;
          
          headers.forEach((header, index) => {
            const normalizedHeader = header.toString().toLowerCase().trim();
            const matchedField = moduleFields.find(field => 
              field.toLowerCase() === normalizedHeader ||
              field.toLowerCase().includes(normalizedHeader) ||
              normalizedHeader.includes(field.toLowerCase())
            );
            
            if (matchedField) {
              autoMapping[index] = matchedField;
            }
          });
          
          setColumnMapping(autoMapping);
        }
      }
    };
    
    reader.readAsArrayBuffer(importFile);
  };

  const handleImport = () => {
    if (!selectedSheet || !previewData.headers) return;
    
    setIsImporting(true);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[selectedSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        const _headers = jsonData[0];
        const dataRows = jsonData.slice(1);
        
        let imported = 0;
        let errors = [];
        
        const moduleKey = Object.keys(MODULES_CONFIG).find(
          key => MODULES_CONFIG[key].sheet.toLowerCase() === selectedSheet.toLowerCase()
        );
        
        if (!moduleKey) {
          setImportReport({ success: 0, errors: [{ row: 0, message: 'Module non reconnu' }] });
          setIsImporting(false);
          return;
        }
        
        const importedData = dataRows.map((row, rowIndex) => {
          try {
            const item = {};
            
            Object.entries(columnMapping).forEach(([colIndex, fieldName]) => {
              let value = row[colIndex];
              
              if (fieldName.toLowerCase().includes('date') && typeof value === 'number') {
                value = excelDateToJSDate(value);
              }
              
              if (fieldName === 'lignes' && typeof value === 'string') {
                try {
                  value = JSON.parse(value);
                } catch {
                  value = [];
                }
              }
              
              item[fieldName] = value;
            });
            
            if (!item.id) {
              item.id = `${moduleKey}_${Date.now()}_${rowIndex}`;
            }
            
            imported++;
            return item;
          } catch (error) {
            errors.push({ row: rowIndex + 2, message: error.message });
            return null;
          }
        }).filter(Boolean);
        
        if (importedData.length > 0) {
          const storeMap = {
            clients: useClientsStore,
            fournisseurs: useFournisseursStore,
            devis: useDevisStore,
            factures: useFacturesStore,
            encaissements: useEncaissementsStore,
            ao: useAOStore,
            caisse: useCaisseStore,
            journal: useJournalStore,
            planification: usePlanificationStore
          };
          
          const addMethodMap = {
            clients: 'addClient',
            fournisseurs: 'addFournisseur',
            devis: 'addDevis',
            factures: 'addFacture',
            encaissements: 'addEncaissement',
            ao: 'addAO',
            caisse: 'addMouvement',
            journal: 'addEcriture',
            planification: 'addTache'
          };
          
          const store = storeMap[moduleKey];
          const addMethod = addMethodMap[moduleKey];
          
          if (store && addMethod) {
            if (importMode === 'replace') {
              const state = store.getState();
              const dataKey = moduleKey === 'ao' ? 'appelsDoffres' : 
                             moduleKey === 'caisse' ? 'mouvements' :
                             moduleKey === 'journal' ? 'ecritures' :
                             moduleKey === 'planification' ? 'taches' :
                             moduleKey;
              
              if (state[dataKey]) {
                store.setState({ [dataKey]: [] });
              }
            }
            
            importedData.forEach(item => {
              const state = store.getState();
              if (state[addMethod]) {
                state[addMethod](item);
              }
            });
          }
        }
        
        setImportReport({ success: imported, errors });
        setIsImporting(false);
      } catch (error) {
        setImportReport({ success: 0, errors: [{ row: 0, message: error.message }] });
        setIsImporting(false);
      }
    };
    
    reader.readAsArrayBuffer(importFile);
  };

  const getModuleData = (moduleKey) => {
    const dataMap = {
      clients,
      fournisseurs,
      devis,
      factures,
      encaissements,
      ao: aos,
      caisse: operations,
      journal: journalEntries,
      planification: taches
    };
    
    let data = dataMap[moduleKey] || [];
    
    if (exportPeriod.start && exportPeriod.end) {
      data = data.filter(item => {
        const itemDate = item.date || item.dateDebut || item.datePublication;
        return itemDate >= exportPeriod.start && itemDate <= exportPeriod.end;
      });
    }
    
    if (exportClient) {
      data = data.filter(item => 
        item.clientId === exportClient || 
        item.clientNom?.toLowerCase().includes(exportClient.toLowerCase())
      );
    }
    
    return data;
  };

  const handleExportExcel = () => {
    const data = getModuleData(exportModule);
    const config = MODULES_CONFIG[exportModule];
    
    if (!data || data.length === 0) {
      warning('Aucune donnée à exporter');
      return;
    }
    
    try {
    const wsData = [config.fields];
    
    data.forEach(item => {
      const row = config.fields.map(field => {
        const value = item[field];
        
        if (Array.isArray(value)) {
          return JSON.stringify(value);
        }
        
        return value ?? '';
      });
      wsData.push(row);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.sheet);
    
    XLSX.writeFile(wb, `SIKA_${config.label}_${new Date().toISOString().split('T')[0]}.xlsx`);
    success(`${data.length} lignes exportées avec succès`);
    } catch {
      error('Erreur lors de l\'export Excel');
    }
  };

  const handleExportPDF = () => {
    const data = getModuleData(exportModule);
    const config = MODULES_CONFIG[exportModule];
    
    if (!data || data.length === 0) {
      warning('Aucune donnée à exporter');
      return;
    }
    
    try {
    const doc = createSikaPDF();
    const margins = getSikaContentMargins();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Titre du document
    doc.setFontSize(14);
    doc.setTextColor(27, 42, 74);
    doc.text(config.label, pageWidth / 2, margins.top + 5, { align: 'center' });
    
    const tableData = data.map(item => 
      config.fields.map(field => {
        const value = item[field];
        if (Array.isArray(value)) return `${value.length} lignes`;
        if (typeof value === 'object') return JSON.stringify(value);
        return value ?? '';
      })
    );
    
    doc.autoTable({
      head: [config.fields],
      body: tableData,
      startY: margins.top + 15,
      margin: { left: 20, right: 20, bottom: margins.bottom },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [27, 42, 74],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [232, 236, 244]
      }
    });
    
    if (exportModule === 'devis') {
      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Le Gérant,', 20, finalY);
      doc.setFont('helvetica', 'bold');
      doc.text('KOMLAN AMEMATCHRON', 20, finalY + 7);
    }
    
    // Ajouter en-tête et pied de page à toutes les pages
    addSikaHeaderFooterToAllPages(doc);
    
    doc.save(`SIKA_${config.label}_${new Date().toISOString().split('T')[0]}.pdf`);
    success(`PDF généré avec succès (${data.length} lignes)`);
    } catch {
      error('Erreur lors de l\'export PDF');
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: COLORS.navy }}>
            Import / Export
          </h1>
          <p className="text-gray-600 mt-2">Gestion des imports et exports de données</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'import'
                ? 'text-white shadow-lg'
                : 'bg-surface text-gray-600 hover:bg-gray-50'
            }`}
            style={activeTab === 'import' ? { backgroundColor: COLORS.orange } : {}}
          >
            <Upload className="inline-block w-5 h-5 mr-2" />
            Import
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'export'
                ? 'text-white shadow-lg'
                : 'bg-surface text-gray-600 hover:bg-gray-50'
            }`}
            style={activeTab === 'export' ? { backgroundColor: COLORS.orange } : {}}
          >
            <Download className="inline-block w-5 h-5 mr-2" />
            Export
          </button>
        </div>

        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="bg-surface rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.navy }}>
                <FileSpreadsheet className="inline-block w-6 h-6 mr-2" />
                Import depuis Excel
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    1. Sélectionner le fichier Excel (.xlsx, .xlsm)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xlsm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: COLORS.blue }}
                  >
                    <Upload className="inline-block w-4 h-4 mr-2" />
                    Choisir un fichier
                  </button>
                  {importFile && (
                    <span className="ml-4 text-sm text-gray-600">
                      {importFile.name}
                    </span>
                  )}
                </div>

                {sheets.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      2. Sélectionner la feuille à importer
                    </label>
                    <div className="relative">
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetSelect(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg appearance-none"
                        style={{ borderColor: COLORS.silver }}
                      >
                        <option value="">-- Choisir une feuille --</option>
                        {sheets.map(sheet => (
                          <option key={sheet} value={sheet}>{sheet}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {previewData.headers && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        3. Mapping des colonnes (auto-détecté)
                      </label>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border" style={{ borderColor: COLORS.silver }}>
                          <thead style={{ backgroundColor: COLORS.lightNavy }}>
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium" style={{ color: COLORS.navy }}>
                                Colonne Excel
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-medium" style={{ color: COLORS.navy }}>
                                Champ cible
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.headers.map((header, index) => (
                              <tr key={index} className="border-t" style={{ borderColor: COLORS.silver }}>
                                <td className="px-4 py-2 text-sm">{header}</td>
                                <td className="px-4 py-2">
                                  <span 
                                    className="px-2 py-1 rounded text-sm"
                                    style={{ 
                                      backgroundColor: columnMapping[index] ? COLORS.lightOrange : COLORS.lightNavy,
                                      color: columnMapping[index] ? COLORS.orange : COLORS.navy
                                    }}
                                  >
                                    {columnMapping[index] || 'Non mappé'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        4. Prévisualisation (5 premières lignes)
                      </label>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border text-sm" style={{ borderColor: COLORS.silver }}>
                          <thead style={{ backgroundColor: COLORS.navy }}>
                            <tr>
                              {previewData.headers.map((header, index) => (
                                <th key={index} className="px-3 py-2 text-left text-white text-xs">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.rows.map((row, rowIndex) => (
                              <tr 
                                key={rowIndex} 
                                className="border-t"
                                style={{ 
                                  backgroundColor: rowIndex % 2 === 0 ? 'white' : COLORS.lightNavy,
                                  borderColor: COLORS.silver
                                }}
                              >
                                {row.map((cell, cellIndex) => (
                                  <td key={cellIndex} className="px-3 py-2 text-xs">
                                    {cell?.toString() || ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        5. Mode d'import
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="merge"
                            checked={importMode === 'merge'}
                            onChange={(e) => setImportMode(e.target.value)}
                            className="mr-2"
                            style={{ accentColor: COLORS.orange }}
                          />
                          <span className="text-sm">Fusionner avec les données existantes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="replace"
                            checked={importMode === 'replace'}
                            onChange={(e) => setImportMode(e.target.value)}
                            className="mr-2"
                            style={{ accentColor: COLORS.orange }}
                          />
                          <span className="text-sm">Remplacer toutes les données</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={handleImport}
                        disabled={isImporting}
                        className="px-6 py-3 rounded-lg text-white font-medium disabled:opacity-50"
                        style={{ backgroundColor: COLORS.green }}
                      >
                        {isImporting ? 'Import en cours...' : 'Lancer l\'import'}
                      </button>
                    </div>
                  </>
                )}

                {importReport && (
                  <div 
                    className="p-4 rounded-lg"
                    style={{ 
                      backgroundColor: importReport.errors.length > 0 ? '#FEE' : COLORS.lightOrange,
                      borderLeft: `4px solid ${importReport.errors.length > 0 ? COLORS.red : COLORS.green}`
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {importReport.errors.length > 0 ? (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.red }} />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.green }} />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold mb-2">Rapport d'import</h3>
                        <p className="text-sm">
                          <strong>{importReport.success}</strong> lignes importées avec succès
                        </p>
                        {importReport.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium" style={{ color: COLORS.red }}>
                              {importReport.errors.length} erreur(s) :
                            </p>
                            <ul className="mt-1 text-sm space-y-1">
                              {importReport.errors.slice(0, 5).map((error, index) => (
                                <li key={index}>
                                  Ligne {error.row}: {error.message}
                                </li>
                              ))}
                              {importReport.errors.length > 5 && (
                                <li className="italic">... et {importReport.errors.length - 5} autres erreurs</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <GenerateExampleFile />
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-surface rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.navy }}>
                Exporter les données
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Module à exporter
                  </label>
                  <select
                    value={exportModule}
                    onChange={(e) => setExportModule(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    style={{ borderColor: COLORS.silver }}
                  >
                    {Object.entries(MODULES_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format d'export
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    style={{ borderColor: COLORS.silver }}
                  >
                    <option value="excel">Excel (.xlsx)</option>
                    <option value="pdf">PDF (.pdf)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début (optionnel)
                  </label>
                  <input
                    type="date"
                    value={exportPeriod.start}
                    onChange={(e) => setExportPeriod({ ...exportPeriod, start: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    style={{ borderColor: COLORS.silver }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin (optionnel)
                  </label>
                  <input
                    type="date"
                    value={exportPeriod.end}
                    onChange={(e) => setExportPeriod({ ...exportPeriod, end: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    style={{ borderColor: COLORS.silver }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrer par client (optionnel)
                  </label>
                  <input
                    type="text"
                    value={exportClient}
                    onChange={(e) => setExportClient(e.target.value)}
                    placeholder="Nom ou ID du client"
                    className="w-full px-4 py-2 border rounded-lg"
                    style={{ borderColor: COLORS.silver }}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                {exportFormat === 'excel' ? (
                  <button
                    onClick={handleExportExcel}
                    className="px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2"
                    style={{ backgroundColor: COLORS.green }}
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    Exporter en Excel
                  </button>
                ) : (
                  <button
                    onClick={handleExportPDF}
                    className="px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2"
                    style={{ backgroundColor: COLORS.red }}
                  >
                    <FileText className="w-5 h-5" />
                    Exporter en PDF
                  </button>
                )}
              </div>

              <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: COLORS.lightNavy }}>
                <h3 className="font-bold mb-2" style={{ color: COLORS.navy }}>
                  Informations
                </h3>
                <ul className="text-sm space-y-1" style={{ color: COLORS.navy }}>
                  <li>• Les exports Excel conservent les noms de colonnes exacts du fichier source</li>
                  <li>• Les exports PDF incluent l'en-tête SIKA INDUSTRIE et le pied de page confidentiel</li>
                  <li>• Pour les devis PDF, la signature du gérant est automatiquement ajoutée</li>
                  <li>• Les filtres de période et client sont optionnels</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportExport;
