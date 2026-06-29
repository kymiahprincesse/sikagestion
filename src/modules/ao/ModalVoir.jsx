import { STATUTS_AO } from '../../store/useAOStore';

const InfoRow = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-4 py-3 border-b border-argent">
    <div className="font-medium text-gray-700">{label}</div>
    <div className="col-span-2 text-gray-900">{value || '-'}</div>
  </div>
);

export default function ModalVoir({ ao, onClose }) {
  const getStatutLabel = (statut) => {
    const labels = {
      [STATUTS_AO.A_CHIFFRER]: 'A chiffrer',
      [STATUTS_AO.DECLINE]: 'Décliné',
      [STATUTS_AO.EN_ATTENTE]: 'En attente',
      [STATUTS_AO.SOUMIS]: 'Soumis',
      [STATUTS_AO.GAGNE]: 'Gagné',
      [STATUTS_AO.PERDU]: 'Perdu'
    };
    return labels[statut] || statut;
  };

  const getStatutColor = (statut) => {
    const colors = {
      [STATUTS_AO.A_CHIFFRER]: 'bg-bleu',
      [STATUTS_AO.DECLINE]: 'bg-gray-500',
      [STATUTS_AO.EN_ATTENTE]: 'bg-orange',
      [STATUTS_AO.SOUMIS]: 'bg-purple-600',
      [STATUTS_AO.GAGNE]: 'bg-vert',
      [STATUTS_AO.PERDU]: 'bg-rouge'
    };
    return colors[statut] || 'bg-gray-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-navy text-white px-6 py-4 flex items-center justify-between sticky top-0">
          <h2 className="text-xl font-bold">Détails de l'Appel d'Offres</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-orange transition text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="bg-orange-light border-l-4 border-orange p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-navy">{ao.numeroDevis}</h3>
                <p className="text-gray-700 mt-1">{ao.client}</p>
              </div>
              <span className={`${getStatutColor(ao.statut)} text-white px-4 py-2 rounded-lg font-medium`}>
                {getStatutLabel(ao.statut)}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-bold text-navy mb-4 pb-2 border-b-2 border-orange">
                Informations Générales
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <InfoRow label="Date du Devis" value={ao.dateDevis} />
                <InfoRow label="N° Devis" value={ao.numeroDevis} />
                <InfoRow label="Client" value={ao.client} />
                <InfoRow label="Référence AO" value={ao.referenceAO} />
                <InfoRow label="Secteur d'Activité" value={ao.secteurActivite} />
                <InfoRow label="Prestation Souhaitée" value={ao.prestationSouhaitee} />
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-navy mb-4 pb-2 border-b-2 border-orange">
                Désignations
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {ao.designations || 'Aucune désignation'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-navy mb-4 pb-2 border-b-2 border-orange">
                Dates et Échéances
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <InfoRow label="Réception AO" value={ao.receptionAO} />
                <InfoRow label="Date de Visite de Chantier" value={ao.dateVisiteChantier} />
                <InfoRow label="Date de Réponse AO" value={ao.dateReponseAO} />
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-navy mb-4 pb-2 border-b-2 border-orange">
                Informations Financières
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <InfoRow 
                  label="Montant Retenue" 
                  value={ao.montantRetenue ? `${ao.montantRetenue.toLocaleString()} FCFA` : '-'} 
                />
              </div>
            </div>

            {ao.dateCreation && (
              <div className="bg-navy-light rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Date de création:</strong> {ao.dateCreation}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-argent">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-navy text-white rounded-lg hover:bg-navy-600 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
