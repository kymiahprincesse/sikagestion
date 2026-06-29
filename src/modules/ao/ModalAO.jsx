import { useState, useEffect } from 'react';
import { useAOStore, STATUTS_AO } from '../../store/useAOStore';
import { useClientsStore } from '../../store/useClientsStore';
import { useAuditStore } from '../../store/useAuditStore';
import { useNotifications } from '../../components/NotificationProvider';

export default function ModalAO({ ao, onClose }) {
  const { addAO, updateAO } = useAOStore();
  const { clients } = useClientsStore();
  const { addLog } = useAuditStore();
  const { success, error } = useNotifications();

  const [formData, setFormData] = useState(() => {
    if (ao) {
      return {
        dateDevis: ao.dateDevis || '',
        numeroDevis: ao.numeroDevis || '',
        client: ao.client || '',
        referenceAO: ao.referenceAO || '',
        secteurActivite: ao.secteurActivite || '',
        prestationSouhaitee: ao.prestationSouhaitee || '',
        designations: ao.designations || '',
        receptionAO: ao.receptionAO || '',
        dateVisiteChantier: ao.dateVisiteChantier || '',
        dateReponseAO: ao.dateReponseAO || '',
        montantRetenue: ao.montantRetenue || '',
        statut: ao.statut || STATUTS_AO.A_CHIFFRER
      };
    }
    return {
      dateDevis: new Date().toISOString().split('T')[0],
      numeroDevis: '',
      client: '',
      referenceAO: '',
      secteurActivite: '',
      prestationSouhaitee: '',
      designations: '',
      receptionAO: '',
      dateVisiteChantier: '',
      dateReponseAO: '',
      montantRetenue: '',
      statut: STATUTS_AO.A_CHIFFRER
    };
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.dateDevis) newErrors.dateDevis = 'Date du devis requise';
    if (!formData.client) newErrors.client = 'Client requis';
    if (!formData.referenceAO) newErrors.referenceAO = 'Référence AO requise';
    if (!formData.secteurActivite) newErrors.secteurActivite = 'Secteur d\'activité requis';
    if (!formData.prestationSouhaitee) newErrors.prestationSouhaitee = 'Prestation souhaitée requise';
    if (!formData.receptionAO) newErrors.receptionAO = 'Date de réception AO requise';
    if (!formData.dateReponseAO) newErrors.dateReponseAO = 'Date de réponse AO requise';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    const dataToSave = {
      ...formData,
      montantRetenue: formData.montantRetenue ? parseFloat(formData.montantRetenue) : null
    };

    try {
      if (ao) {
        await updateAO(ao.id, dataToSave);
        addLog({
          module: 'Appels d\'offres',
          action: 'Modification AO',
          utilisateur: 'Admin',
          avant: ao,
          apres: { ...ao, ...dataToSave }
        });
        success(`AO ${formData.numeroDevis || formData.referenceAO} modifié avec succès`);
      } else {
        const nouvelAO = await addAO(dataToSave);
        addLog({
          module: 'Appels d\'offres',
          action: 'Création AO',
          utilisateur: 'Admin',
          avant: null,
          apres: nouvelAO
        });
        success(`AO ${nouvelAO?.numeroDevis || nouvelAO?.referenceAO || ''} créé avec succès`);
      }
      onClose();
    } catch (err) {
      error('Erreur lors de l\'enregistrement de l\'AO : ' + (err?.message || 'Vérifiez la connexion'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-navy text-white px-6 py-4 flex items-center justify-between sticky top-0">
          <h2 className="text-xl font-bold">
            {ao ? 'Modifier l\'Appel d\'Offres' : 'Nouvel Appel d\'Offres'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-orange transition text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date du Devis *
              </label>
              <input
                type="date"
                name="dateDevis"
                value={formData.dateDevis}
                onChange={handleChange}
                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-orange ${
                  errors.dateDevis ? 'border-rouge' : 'border-argent'
                }`}
              />
              {errors.dateDevis && <p className="text-rouge text-xs mt-1">{errors.dateDevis}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                N° Devis
              </label>
              <input
                type="text"
                name="numeroDevis"
                value={formData.numeroDevis}
                onChange={handleChange}
                placeholder="Auto-généré si vide"
                className="w-full border border-argent rounded-lg px-4 py-2 focus:outline-none focus:border-orange bg-gray-50"
                disabled={!ao}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client *
              </label>
              <select
                name="client"
                value={formData.client}
                onChange={handleChange}
                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-orange ${
                  errors.client ? 'border-rouge' : 'border-argent'
                }`}
              >
                <option value="">Sélectionner un client</option>
                {clients.filter(c => c.isActif).map((client) => (
                  <option key={client.id} value={client.nom}>
                    {client.nom}
                  </option>
                ))}
              </select>
              {errors.client && <p className="text-rouge text-xs mt-1">{errors.client}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Référence AO *
              </label>
              <input
                type="text"
                name="referenceAO"
                value={formData.referenceAO}
                onChange={handleChange}
                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-orange ${
                  errors.referenceAO ? 'border-rouge' : 'border-argent'
                }`}
              />
              {errors.referenceAO && <p className="text-rouge text-xs mt-1">{errors.referenceAO}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secteur d'Activité *
              </label>
              <select
                name="secteurActivite"
                value={formData.secteurActivite}
                onChange={handleChange}
                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-orange ${
                  errors.secteurActivite ? 'border-rouge' : 'border-argent'
                }`}
              >
                <option value="">Sélectionner un secteur</option>
                <option value="Construction">Construction</option>
                <option value="Métallurgie">Métallurgie</option>
                <option value="Industrie">Industrie</option>
                <option value="Energie">Energie</option>
                <option value="Chimie">Chimie</option>
                <option value="Agroalimentaire">Agroalimentaire</option>
                <option value="Autre">Autre</option>
              </select>
              {errors.secteurActivite && <p className="text-rouge text-xs mt-1">{errors.secteurActivite}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prestation Souhaitée *
              </label>
              <select
                name="prestationSouhaitee"
                value={formData.prestationSouhaitee}
                onChange={handleChange}
                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-orange ${
                  errors.prestationSouhaitee ? 'border-rouge' : 'border-argent'
                }`}
              >
                <option value="">Sélectionner une prestation</option>
                <option value="Calorifuge">Calorifuge</option>
                <option value="Pliage">Pliage</option>
                <option value="Réservoir">Réservoir</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Installation">Installation</option>
                <option value="Autre">Autre</option>
              </select>
              {errors.prestationSouhaitee && <p className="text-rouge text-xs mt-1">{errors.prestationSouhaitee}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Désignations
              </label>
              <textarea
                name="designations"
                value={formData.designations}
                onChange={handleChange}
                rows="3"
                className="w-full border border-argent rounded-lg px-4 py-2 focus:outline-none focus:border-orange"
                placeholder="Description détaillée des travaux..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Réception AO *
              </label>
              <input
                type="date"
                name="receptionAO"
                value={formData.receptionAO}
                onChange={handleChange}
                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-orange ${
                  errors.receptionAO ? 'border-rouge' : 'border-argent'
                }`}
              />
              {errors.receptionAO && <p className="text-rouge text-xs mt-1">{errors.receptionAO}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de Visite de Chantier
              </label>
              <input
                type="date"
                name="dateVisiteChantier"
                value={formData.dateVisiteChantier}
                onChange={handleChange}
                className="w-full border border-argent rounded-lg px-4 py-2 focus:outline-none focus:border-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de Réponse AO *
              </label>
              <input
                type="date"
                name="dateReponseAO"
                value={formData.dateReponseAO}
                onChange={handleChange}
                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-orange ${
                  errors.dateReponseAO ? 'border-rouge' : 'border-argent'
                }`}
              />
              {errors.dateReponseAO && <p className="text-rouge text-xs mt-1">{errors.dateReponseAO}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant Retenue (FCFA)
              </label>
              <input
                type="number"
                name="montantRetenue"
                value={formData.montantRetenue}
                onChange={handleChange}
                className="w-full border border-argent rounded-lg px-4 py-2 focus:outline-none focus:border-orange"
                placeholder="0"
                min="0"
                step="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut AO
              </label>
              <select
                name="statut"
                value={formData.statut}
                onChange={handleChange}
                className="w-full border border-argent rounded-lg px-4 py-2 focus:outline-none focus:border-orange"
              >
                <option value={STATUTS_AO.A_CHIFFRER}>A chiffrer</option>
                <option value={STATUTS_AO.DECLINE}>Décliné</option>
                <option value={STATUTS_AO.EN_ATTENTE}>En attente</option>
                <option value={STATUTS_AO.SOUMIS}>Soumis</option>
                <option value={STATUTS_AO.GAGNE}>Gagné</option>
                <option value={STATUTS_AO.PERDU}>Perdu</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-argent">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-argent rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-orange text-white rounded-lg hover:bg-orange-600 transition"
            >
              {ao ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
