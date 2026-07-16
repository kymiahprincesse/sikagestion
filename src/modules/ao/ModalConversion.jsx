import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditStore } from '../../store/useAuditStore';
import { useNotificationsStore } from '../../store/useNotificationsStore';

export default function ModalConversion({ ao, onClose }) {
  const navigate = useNavigate();
  const { addLog } = useAuditStore();
  const { ajouterNotification } = useNotificationsStore();
  const [typeDevis, setTypeDevis] = useState('');

  const typesDevis = [
    { value: 'calorifuge', label: 'Devis Calorifuge', icon: '🔥', route: '/devis/calorifuge' },
    { value: 'pliage', label: 'Devis Pliage', icon: '🔧', route: '/devis/pliage' },
    { value: 'reservoir', label: 'Devis Réservoir', icon: '🛢️', route: '/devis/reservoir' }
  ];

  const handleConvertir = () => {
    if (!typeDevis) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'VALIDATION',
        message: 'Veuillez sélectionner un type de devis'
      });
      return;
    }

    const typeSelectionne = typesDevis.find(t => t.value === typeDevis);

    addLog({
      module: 'Appels d\'offres',
      action: 'Conversion AO en Devis',
      utilisateur: 'Admin',
      avant: ao,
      apres: { type: typeSelectionne.label }
    });

    const dataDevis = {
      client: ao.client,
      dateDevis: ao.dateDevis,
      referenceAO: ao.referenceAO,
      designations: ao.designations,
      prestationSouhaitee: ao.prestationSouhaitee
    };

    navigate(typeSelectionne.route, { 
      state: { 
        fromAO: true, 
        aoData: dataDevis,
        aoId: ao.id
      } 
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full">
        <div className="bg-navy text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Convertir en Devis</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-rouge transition text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="bg-rouge-light border-l-4 border-rouge p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>AO:</strong> {ao.numeroDevis} - {ao.client}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Référence:</strong> {ao.referenceAO}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Sélectionnez le type de devis à créer:
            </label>

            <div className="grid grid-cols-1 gap-4">
              {typesDevis.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setTypeDevis(type.value)}
                  className={`p-4 border-2 rounded-lg text-left transition transform hover:scale-105 ${
                    typeDevis === type.value
                      ? 'border-rouge bg-rouge-light'
                      : 'border-argent hover:border-bleu'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{type.icon}</span>
                    <div>
                      <h3 className="font-bold text-lg text-navy">{type.label}</h3>
                      <p className="text-sm text-gray-600">
                        Créer un devis {type.label.toLowerCase()} à partir de cet AO
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-background p-4 rounded-lg mb-6">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Informations pré-remplies:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Client: {ao.client}</li>
              <li>✓ Date: {ao.dateDevis}</li>
              <li>✓ Référence AO: {ao.referenceAO}</li>
              {ao.designations && <li>✓ Désignations: {ao.designations}</li>}
            </ul>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-argent">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-argent rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleConvertir}
              disabled={!typeDevis}
              className={`px-6 py-2 rounded-lg transition ${
                typeDevis
                  ? 'bg-rouge text-white hover:bg-rouge-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              🔄 Convertir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
