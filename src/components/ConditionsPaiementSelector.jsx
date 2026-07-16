import { useState } from 'react';
import { useConditionsPaiementStore } from '../store/useConditionsPaiementStore';

export default function ConditionsPaiementSelector({ value, onChange, className = '' }) {
  const { conditions, addCondition, removeCondition } = useConditionsPaiementStore();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [showManageModal, setShowManageModal] = useState(false);

  const handleAddCustom = () => {
    const jours = parseInt(customValue);
    if (!isNaN(jours) && jours > 0) {
      const added = addCondition(jours);
      if (added) {
        onChange(jours);
        setCustomValue('');
        setShowCustomInput(false);
      }
    }
  };

  const handleRemove = (jours) => {
    if (conditions.length > 1) {
      removeCondition(jours);
      if (value === jours && conditions.length > 0) {
        const firstCondition = conditions.find(c => c.value !== jours);
        if (firstCondition) {
          onChange(firstCondition.value);
        }
      }
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className={`flex-1 px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-rouge focus:border-rouge ${className}`}
        >
          {conditions.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="px-3 py-2 bg-bleu text-white rounded-lg hover:bg-bleu/90 transition-colors"
          title="Ajouter une condition personnalisée"
        >
          ➕
        </button>
        
        <button
          type="button"
          onClick={() => setShowManageModal(true)}
          className="px-3 py-2 bg-rouge text-white rounded-lg hover:bg-rouge/90 transition-colors"
          title="Gérer les conditions"
        >
          ⚙️
        </button>
      </div>

      {showCustomInput && (
        <div className="mt-2 flex gap-2 p-3 bg-navyClair rounded-lg border border-rouge">
          <input
            type="number"
            min="1"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Nombre de jours"
            className="flex-1 px-3 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-rouge focus:border-rouge"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="px-4 py-2 bg-vert text-white rounded-lg hover:bg-vert/90 transition-colors"
          >
            Ajouter
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              setCustomValue('');
            }}
            className="px-4 py-2 bg-argent text-gray-700 rounded-lg hover:bg-argent/80 transition-colors"
          >
            Annuler
          </button>
        </div>
      )}

      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/80" onClick={() => setShowManageModal(false)}></div>
          
          <div className="relative bg-surface rounded-lg shadow-2xl max-w-md w-full">
            <div className="bg-navy text-white p-4 rounded-t-lg">
              <h3 className="text-xl font-bold">Gérer les conditions de paiement</h3>
            </div>
            
            <div className="p-6">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {conditions.map(c => (
                  <div key={c.value} className="flex items-center justify-between p-3 bg-navyClair rounded-lg">
                    <span className="font-medium text-navy">{c.label}</span>
                    {conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemove(c.value)}
                        className="px-3 py-1 bg-rouge text-white rounded text-sm hover:bg-rouge/90 transition-colors"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-argent">
                <p className="text-sm text-bleu mb-3">
                  💡 Utilisez le bouton ➕ pour ajouter de nouvelles conditions de paiement
                </p>
                <button
                  type="button"
                  onClick={() => setShowManageModal(false)}
                  className="w-full px-4 py-2 bg-rouge text-white rounded-lg hover:bg-rouge/90 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
