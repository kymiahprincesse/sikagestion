import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevisStore } from '../store/useDevisStore';
import { useFacturesStore } from '../store/useFacturesStore';
import { useAOStore } from '../store/useAOStore';
import { useEncaissementsStore } from '../store/useEncaissementsStore';
import { useFournisseursStore } from '../store/useFournisseursStore';
import { usePlanificationStore } from '../store/usePlanificationStore';
import { useClientsStore } from '../store/useClientsStore';

const MODULES = {
  DEVIS: {
    nom: 'Devis',
    icone: '📄',
    couleur: 'text-bleu',
    route: '/devis'
  },
  FACTURES: {
    nom: 'Factures',
    icone: '💰',
    couleur: 'text-vert',
    route: '/factures'
  },
  AO: {
    nom: 'Appels d\'Offres',
    icone: '📋',
    couleur: 'text-rouge',
    route: '/appels-offres'
  },
  ENCAISSEMENTS: {
    nom: 'Encaissements',
    icone: '💵',
    couleur: 'text-vert',
    route: '/encaissements'
  },
  FOURNISSEURS: {
    nom: 'Fournisseurs',
    icone: '🏭',
    couleur: 'text-bleu',
    route: '/fournisseurs'
  },
  PROJETS: {
    nom: 'Planification',
    icone: '📊',
    couleur: 'text-rouge',
    route: '/planification'
  }
};

export default function SearchGlobal() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [historique, setHistorique] = useState(() => {
    try {
      const saved = sessionStorage.getItem('sika_search_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 5);
      }
    } catch {
      sessionStorage.removeItem('sika_search_history');
    }
    return [];
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const devis = useDevisStore((state) => state.devis);
  const factures = useFacturesStore((state) => state.factures);
  const ao = useAOStore((state) => state.appelsDoffres);
  const encaissements = useEncaissementsStore((state) => state.encaissements);
  const fournisseurs = useFournisseursStore((state) => state.fournisseurs);
  const projets = usePlanificationStore((state) => state.projets);
  const clients = useClientsStore((state) => state.clients);

  const ajouterHistorique = useCallback((recherche) => {
    setHistorique(prev => {
      const nouvelHistorique = [
        recherche,
        ...prev.filter(h => h !== recherche)
      ].slice(0, 5);
      
      try {
        sessionStorage.setItem('sika_search_history', JSON.stringify(nouvelHistorique));
      } catch {
        // Storage plein ou inaccessible - ignorer
      }
      return nouvelHistorique;
    });
  }, []);

  const handleSelectResult = useCallback((resultat) => {
    ajouterHistorique(query);
    setIsOpen(false);
    setQuery('');

    // Navigation vers le module avec l'ID
    const module = MODULES[resultat.module];
    if (module) {
      navigate(`${module.route}?id=${resultat.id}`);
    }
  }, [query, navigate, ajouterHistorique]);

  // Raccourci clavier Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fermer le dropdown si clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recherche globale : calculée avec useMemo pour éviter setState dans un effet
  const resultats = useMemo(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const resultatsTemp = [];

    // Recherche dans les DEVIS
    devis.forEach((d) => {
      const client = clients.find(c => c.id === d.clientId);
      const nomClient = client?.nom || '';
      
      if (
        d.numero?.toLowerCase().includes(q) ||
        nomClient.toLowerCase().includes(q) ||
        d.objet?.toLowerCase().includes(q)
      ) {
        resultatsTemp.push({
          module: 'DEVIS',
          id: d.id,
          titre: d.numero,
          sousTitre: `${nomClient} - ${d.objet || 'Sans objet'}`,
          data: d
        });
      }
    });

    // Recherche dans les FACTURES
    factures.forEach((f) => {
      const client = clients.find(c => c.id === f.clientId);
      const nomClient = client?.nom || '';
      
      if (
        f.numero?.toLowerCase().includes(q) ||
        nomClient.toLowerCase().includes(q)
      ) {
        resultatsTemp.push({
          module: 'FACTURES',
          id: f.id,
          titre: f.numero,
          sousTitre: `${nomClient} - ${f.montantTTC?.toLocaleString()} FCFA`,
          data: f
        });
      }
    });

    // Recherche dans les APPELS D'OFFRES
    ao.forEach((a) => {
      if (
        a.numeroDevis?.toLowerCase().includes(q) ||
        a.client?.toLowerCase().includes(q) ||
        a.designation?.toLowerCase().includes(q)
      ) {
        resultatsTemp.push({
          module: 'AO',
          id: a.id,
          titre: a.numeroDevis,
          sousTitre: `${a.client} - ${a.designation || 'Sans désignation'}`,
          data: a
        });
      }
    });

    // Recherche dans les ENCAISSEMENTS
    encaissements.forEach((e) => {
      const client = clients.find(c => c.id === e.clientId);
      const nomClient = client?.nom || '';
      const facture = factures.find(f => f.id === e.factureId);
      const numeroFacture = facture?.numero || '';
      
      if (
        nomClient.toLowerCase().includes(q) ||
        numeroFacture.toLowerCase().includes(q)
      ) {
        resultatsTemp.push({
          module: 'ENCAISSEMENTS',
          id: e.id,
          titre: `Encaissement ${e.montant?.toLocaleString()} FCFA`,
          sousTitre: `${nomClient} - Facture ${numeroFacture}`,
          data: e
        });
      }
    });

    // Recherche dans les FOURNISSEURS
    fournisseurs.forEach((f) => {
      if (
        f.nom?.toLowerCase().includes(q) ||
        f.libelle?.toLowerCase().includes(q)
      ) {
        resultatsTemp.push({
          module: 'FOURNISSEURS',
          id: f.id,
          titre: f.nom,
          sousTitre: f.libelle || 'Fournisseur',
          data: f
        });
      }
    });

    // Recherche dans les PROJETS PLANIFICATION
    projets.forEach((p) => {
      const client = clients.find(c => c.id === p.clientId);
      const nomClient = client?.nom || '';
      
      if (
        nomClient.toLowerCase().includes(q) ||
        p.nom?.toLowerCase().includes(q)
      ) {
        resultatsTemp.push({
          module: 'PROJETS',
          id: p.id,
          titre: p.nom,
          sousTitre: `${nomClient} - ${p.statut || 'PLANIFIE'}`,
          data: p
        });
      }
    });

    return resultatsTemp;
  }, [query, devis, factures, ao, encaissements, fournisseurs, projets, clients]);

  // Navigation au clavier dans les résultats
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen || resultats.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % resultats.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + resultats.length) % resultats.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (resultats[selectedIndex]) {
          handleSelectResult(resultats[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, resultats, selectedIndex, handleSelectResult]);



  const handleHistoriqueClick = (recherche) => {
    setQuery(recherche);
    setSelectedIndex(0);
    inputRef.current?.focus();
  };

  const groupedResults = resultats.reduce((acc, r) => {
    if (!acc[r.module]) {
      acc[r.module] = [];
    }
    acc[r.module].push(r);
    return acc;
  }, {});

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Rechercher... (Ctrl+K)"
          className="w-80 px-4 py-2 pl-10 bg-surface border-2 border-argent rounded-lg focus:outline-none focus:border-rouge transition-colors"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-argent"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 w-[600px] max-h-[500px] overflow-y-auto bg-surface border-2 border-argent rounded-lg shadow-2xl z-50">
          {query.trim() === '' && historique.length > 0 && (
            <div className="p-3 border-b border-argent">
              <p className="text-xs font-bold text-navy mb-2">RECHERCHES RÉCENTES</p>
              {historique.map((h, idx) => (
                <button
                  key={idx}
                  onClick={() => handleHistoriqueClick(h)}
                  className="block w-full text-left px-3 py-2 hover:bg-navyClair rounded text-sm text-navy"
                >
                  <span className="mr-2">🕐</span>
                  {h}
                </button>
              ))}
            </div>
          )}

          {resultats.length === 0 && query.trim() !== '' && (
            <div className="p-6 text-center text-argent">
              <p className="text-sm">Aucun résultat trouvé pour "{query}"</p>
            </div>
          )}

          {Object.keys(groupedResults).map((moduleKey) => {
            const module = MODULES[moduleKey];
            const items = groupedResults[moduleKey];
            
            return (
              <div key={moduleKey} className="border-b border-argent last:border-b-0">
                <div className="px-4 py-2 bg-navyClair">
                  <p className="text-xs font-bold text-navy flex items-center gap-2">
                    <span className={module.couleur}>{module.icone}</span>
                    {module.nom.toUpperCase()} ({items.length})
                  </p>
                </div>
                
                {items.map((item) => {
                  const globalIndex = resultats.indexOf(item);
                  const isSelected = globalIndex === selectedIndex;
                  
                  return (
                    <button
                      key={`${moduleKey}-${item.id}`}
                      onClick={() => handleSelectResult(item)}
                      className={`w-full text-left px-4 py-3 hover:bg-rougeClair transition-colors border-l-4 ${
                        isSelected ? 'bg-rougeClair border-rouge' : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{module.icone}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-navy text-sm truncate">
                            {item.titre}
                          </p>
                          <p className="text-xs text-bleu truncate">
                            {item.sousTitre}
                          </p>
                        </div>
                        <svg
                          className="w-4 h-4 text-argent flex-shrink-0 mt-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {resultats.length > 0 && (
            <div className="px-4 py-2 bg-navyClair border-t border-argent">
              <p className="text-xs text-bleu">
                {resultats.length} résultat{resultats.length > 1 ? 's' : ''} trouvé{resultats.length > 1 ? 's' : ''} • 
                <span className="ml-2">↑↓ Naviguer</span>
                <span className="ml-2">↵ Sélectionner</span>
                <span className="ml-2">Esc Fermer</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
