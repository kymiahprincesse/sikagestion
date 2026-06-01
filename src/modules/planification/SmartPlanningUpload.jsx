import { useState } from 'react';
import * as XLSX from 'xlsx';

const MAPPING_COLONNES = {
  dateDebut: ['début', 'date début', 'date_debut', 'start', 'date start', 'debut'],
  dateFin: ['fin', 'date fin', 'date_fin', 'end', 'date end', 'date de fin'],
  nomTache: ['tâche', 'tache', 'task', 'activité', 'activite', 'nom', 'libellé', 'libelle', 'description'],
  clientId: ['client', 'projet', 'project', 'client_id'],
  nbTechniciens: ['ressources', 'techniciens', 'nb techniciens', 'resources', 'team', 'équipe', 'equipe'],
  dureeJours: ['durée', 'duree', 'jours', 'days', 'duration', 'nb jours'],
  kmSite: ['distance', 'km', 'kilomètres', 'kilometres', 'km site'],
  nbDeplacements: ['déplacements', 'deplacements', 'nb déplacements', 'trips', 'voyages']
};

const detecterColonne = (nomColonne) => {
  const nomNormalise = nomColonne.toLowerCase().trim();
  
  for (const [cle, variantes] of Object.entries(MAPPING_COLONNES)) {
    if (variantes.some(v => nomNormalise.includes(v))) {
      return cle;
    }
  }
  
  return null;
};

export default function SmartPlanningUpload({ onClose, onImport, projetId }) {
  const [etape, setEtape] = useState(1);
  const [fichier, setFichier] = useState(null);
  const [donneesBrutes, setDonneesBrutes] = useState([]);
  const [colonnesDetectees, setColonnesDetectees] = useState({});
  const [mappingManuel, setMappingManuel] = useState({});
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErreur('');
    setEnCours(true);

    try {
      const extension = file.name.split('.').pop().toLowerCase();

      if (extension === 'xlsx' || extension === 'xls') {
        await traiterExcel(file);
      } else if (extension === 'pdf') {
        setErreur('Import PDF en cours de développement. Utilisez Excel pour le moment.');
        setEnCours(false);
        return;
      } else {
        setErreur('Format non supporté. Utilisez Excel (.xlsx, .xls)');
        setEnCours(false);
        return;
      }

      setFichier(file);
      setEtape(2);
    } catch (error) {
      setErreur(`Erreur lors de la lecture du fichier: ${error.message}`);
    } finally {
      setEnCours(false);
    }
  };

  const traiterExcel = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          if (jsonData.length < 2) {
            reject(new Error('Le fichier ne contient pas assez de données'));
            return;
          }

          const entetes = jsonData[0];
          const lignes = jsonData.slice(1, 6);

          const mapping = {};
          entetes.forEach((entete, index) => {
            const colonneDetectee = detecterColonne(String(entete));
            if (colonneDetectee) {
              mapping[index] = {
                nomOriginal: entete,
                champCible: colonneDetectee,
                autoDetecte: true
              };
            } else {
              mapping[index] = {
                nomOriginal: entete,
                champCible: null,
                autoDetecte: false
              };
            }
          });

          setColonnesDetectees(mapping);
          setDonneesBrutes({ entetes, lignes, toutesLignes: jsonData.slice(1) });
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleMappingManuel = (indexColonne, champCible) => {
    setMappingManuel(prev => ({
      ...prev,
      [indexColonne]: champCible
    }));
  };

  const validerMapping = () => {
    const mappingFinal = { ...colonnesDetectees };
    
    Object.entries(mappingManuel).forEach(([index, champ]) => {
      if (mappingFinal[index]) {
        mappingFinal[index].champCible = champ;
      }
    });

    const champsObligatoires = ['nomTache', 'dateDebut'];
    const champsMappés = Object.values(mappingFinal)
      .filter(m => m.champCible)
      .map(m => m.champCible);

    const manquants = champsObligatoires.filter(c => !champsMappés.includes(c));
    
    if (manquants.length > 0) {
      setErreur(`Champs obligatoires manquants: ${manquants.join(', ')}`);
      return;
    }

    setColonnesDetectees(mappingFinal);
    setEtape(3);
  };

  const confirmerImport = () => {
    setEnCours(true);
    
    try {
      const tachesImportees = donneesBrutes.toutesLignes.map(ligne => {
        const tache = {};
        
        Object.entries(colonnesDetectees).forEach(([index, mapping]) => {
          if (mapping.champCible && ligne[index] !== undefined && ligne[index] !== '') {
            let valeur = ligne[index];
            
            if (mapping.champCible === 'dateDebut' || mapping.champCible === 'dateFin') {
              if (typeof valeur === 'number') {
                const date = XLSX.SSF.parse_date_code(valeur);
                valeur = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
              }
            } else if (['nbTechniciens', 'dureeJours', 'kmSite', 'nbDeplacements'].includes(mapping.champCible)) {
              valeur = parseInt(valeur) || 0;
            }
            
            tache[mapping.champCible] = valeur;
          }
        });

        if (tache.dateDebut && tache.dateFin && !tache.dureeJours) {
          const debut = new Date(tache.dateDebut);
          const fin = new Date(tache.dateFin);
          tache.dureeJours = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));
        }

        return tache;
      }).filter(t => t.nomTache);

      onImport(tachesImportees);
      onClose();
    } catch (error) {
      setErreur(`Erreur lors de l'import: ${error.message}`);
    } finally {
      setEnCours(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fakeEvent = { target: { files: [files[0]] } };
      handleFileUpload(fakeEvent);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-navy text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-bold">📤 Import Planning Intelligent</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-orange transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    etape >= num ? 'bg-orange text-white' : 'bg-argent text-navy'
                  }`}
                >
                  {num}
                </div>
                {num < 4 && (
                  <div
                    className={`w-16 h-1 ${
                      etape > num ? 'bg-orange' : 'bg-argent'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {erreur && (
            <div className="mb-4 p-4 bg-red-50 border border-rouge rounded-lg text-rouge">
              ⚠️ {erreur}
            </div>
          )}

          {etape === 1 && (
            <div>
              <h3 className="text-lg font-bold text-navy mb-4">Étape 1 : Sélectionner le fichier</h3>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-argent rounded-lg p-12 text-center hover:border-orange transition-colors cursor-pointer"
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-6xl mb-4">📁</div>
                  <p className="text-navy font-medium mb-2">
                    Glissez-déposez votre fichier ici
                  </p>
                  <p className="text-bleu text-sm mb-4">ou cliquez pour parcourir</p>
                  <p className="text-xs text-gray-500">
                    Formats supportés : Excel (.xlsx, .xls)
                  </p>
                </label>
              </div>
              {enCours && (
                <div className="mt-4 text-center text-bleu">
                  Chargement du fichier...
                </div>
              )}
            </div>
          )}

          {etape === 2 && donneesBrutes.entetes && (
            <div>
              <h3 className="text-lg font-bold text-navy mb-4">
                Étape 2 : Vérification des colonnes détectées
              </h3>
              <p className="text-bleu mb-4">
                Fichier : <span className="font-medium">{fichier?.name}</span>
              </p>
              
              <div className="overflow-x-auto mb-4">
                <table className="w-full border border-argent">
                  <thead className="bg-navyClair">
                    <tr>
                      <th className="px-4 py-2 text-left text-navy font-bold border-b border-argent">
                        Colonne Excel
                      </th>
                      <th className="px-4 py-2 text-left text-navy font-bold border-b border-argent">
                        Champ SIKA
                      </th>
                      <th className="px-4 py-2 text-left text-navy font-bold border-b border-argent">
                        Aperçu
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(colonnesDetectees).map(([index, mapping]) => (
                      <tr key={index} className="border-b border-argent hover:bg-orangeClair">
                        <td className="px-4 py-2 font-medium text-navy">
                          {mapping.nomOriginal}
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={mappingManuel[index] || mapping.champCible || ''}
                            onChange={(e) => handleMappingManuel(index, e.target.value)}
                            className="w-full px-3 py-1 border border-argent rounded focus:outline-none focus:ring-2 focus:ring-orange"
                          >
                            <option value="">-- Ignorer --</option>
                            <option value="nomTache">Nom de la tâche *</option>
                            <option value="dateDebut">Date début *</option>
                            <option value="dateFin">Date fin</option>
                            <option value="dureeJours">Durée (jours)</option>
                            <option value="nbTechniciens">Nb techniciens</option>
                            <option value="kmSite">Distance site (km)</option>
                            <option value="nbDeplacements">Nb déplacements</option>
                          </select>
                          {mapping.autoDetecte && (
                            <span className="text-xs text-vert ml-2">✓ Auto</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-bleu">
                          {donneesBrutes.lignes[0]?.[index] || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-orangeClair p-4 rounded-lg mb-4">
                <p className="text-sm text-navy">
                  <strong>Aperçu des 5 premières lignes</strong>
                </p>
                <div className="mt-2 text-xs text-bleu">
                  {donneesBrutes.lignes.length} lignes affichées sur {donneesBrutes.toutesLignes.length} au total
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setEtape(1)}
                  className="px-4 py-2 bg-argent text-navy rounded-lg hover:bg-gray-400 transition-colors"
                >
                  ← Retour
                </button>
                <button
                  onClick={validerMapping}
                  className="px-6 py-2 bg-orange text-white rounded-lg hover:bg-orange/90 transition-colors font-medium"
                >
                  Continuer →
                </button>
              </div>
            </div>
          )}

          {etape === 3 && (
            <div>
              <h3 className="text-lg font-bold text-navy mb-4">
                Étape 3 : Confirmation
              </h3>
              
              <div className="bg-navyClair p-4 rounded-lg mb-4">
                <p className="text-navy font-medium mb-2">Résumé de l'import :</p>
                <ul className="space-y-1 text-bleu">
                  <li>📄 Fichier : {fichier?.name}</li>
                  <li>📊 Nombre de tâches : {donneesBrutes.toutesLignes.length}</li>
                  <li>
                    ✓ Colonnes mappées : {Object.values(colonnesDetectees).filter(m => m.champCible).length}
                  </li>
                </ul>
              </div>

              <div className="bg-orange/10 border border-orange rounded-lg p-4 mb-4">
                <p className="text-navy font-medium">⚠️ Attention</p>
                <p className="text-sm text-bleu mt-1">
                  Les tâches seront ajoutées au projet sélectionné. Cette action ne peut pas être annulée facilement.
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setEtape(2)}
                  className="px-4 py-2 bg-argent text-navy rounded-lg hover:bg-gray-400 transition-colors"
                >
                  ← Retour
                </button>
                <button
                  onClick={confirmerImport}
                  disabled={enCours}
                  className="px-6 py-2 bg-vert text-white rounded-lg hover:bg-vert/90 transition-colors font-medium disabled:opacity-50"
                >
                  {enCours ? 'Import en cours...' : '✓ Confirmer l\'import'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
