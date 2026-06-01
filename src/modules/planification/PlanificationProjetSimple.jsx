import { useState } from 'react';

export default function PlanificationProjetSimple() {
  const [message, setMessage] = useState('Module Planification - Version Simple');

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-navy mb-4">🚀 {message}</h1>
        <p className="text-bleu mb-4">
          Cette version simple permet de vérifier que le module se charge correctement.
        </p>
        
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-500 rounded-lg p-4">
            <p className="text-green-800 font-medium">✅ Le composant fonctionne !</p>
            <p className="text-green-600 text-sm mt-2">
              Si vous voyez ce message, cela signifie que le module de planification se charge sans erreur.
            </p>
          </div>

          <button
            onClick={() => setMessage('Bouton cliqué - Tout fonctionne !')}
            className="px-6 py-3 bg-orange text-white rounded-lg hover:bg-orange/90 transition-colors font-medium"
          >
            Tester l'interactivité
          </button>

          <div className="bg-blue-50 border border-blue-500 rounded-lg p-4">
            <h3 className="font-bold text-navy mb-2">Prochaines étapes :</h3>
            <ul className="list-disc list-inside text-bleu space-y-1">
              <li>Vérifier que cette page s'affiche correctement</li>
              <li>Tester le bouton ci-dessus</li>
              <li>Si tout fonctionne, on réactivera la version complète</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
