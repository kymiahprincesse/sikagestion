import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignorer si on est dans un input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      // Ctrl/Cmd + K : Recherche globale
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        // TODO: Ouvrir modal de recherche globale
        console.log('Recherche globale')
      }

      // Alt + D : Dashboard
      if (e.altKey && e.key === 'd') {
        e.preventDefault()
        navigate('/dashboard')
      }

      // Alt + C : Clients
      if (e.altKey && e.key === 'c') {
        e.preventDefault()
        navigate('/clients')
      }

      // Alt + A : Appels d'Offres
      if (e.altKey && e.key === 'a') {
        e.preventDefault()
        navigate('/ao')
      }

      // Alt + V : Devis
      if (e.altKey && e.key === 'v') {
        e.preventDefault()
        navigate('/devis/liste')
      }

      // Alt + F : Factures
      if (e.altKey && e.key === 'f') {
        e.preventDefault()
        navigate('/factures')
      }

      // Alt + E : Encaissements
      if (e.altKey && e.key === 'e') {
        e.preventDefault()
        navigate('/encaissements')
      }

      // Alt + P : Planification
      if (e.altKey && e.key === 'p') {
        e.preventDefault()
        navigate('/planification')
      }

      // Alt + N : Nouveau Devis Calorifuge
      if (e.altKey && e.key === 'n') {
        e.preventDefault()
        navigate('/devis/calorifuge')
      }

      // Alt + R : Nouveau Devis Réservoir
      if (e.altKey && e.key === 'r') {
        e.preventDefault()
        navigate('/devis/reservoir')
      }

      // Alt + I : Import/Export
      if (e.altKey && e.key === 'i') {
        e.preventDefault()
        navigate('/import-export')
      }

      // Alt + T : Tour de Contrôle
      if (e.altKey && e.key === 't') {
        e.preventDefault()
        navigate('/tour-de-controle')
      }

      // Alt + G : Paramètres
      if (e.altKey && e.key === 'g') {
        e.preventDefault()
        navigate('/parametres')
      }

      // Échap : Fermer modales (à implémenter dans chaque composant)
      if (e.key === 'Escape') {
        // Les composants individuels doivent écouter cet événement
        const event = new CustomEvent('closeModal')
        window.dispatchEvent(event)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [navigate])
}

// Hook pour afficher l'aide des raccourcis
export function useShortcutsHelp() {
  const shortcuts = [
    { key: 'Alt + D', description: 'Tableau de bord' },
    { key: 'Alt + C', description: 'Clients' },
    { key: 'Alt + A', description: 'Appels d\'Offres' },
    { key: 'Alt + V', description: 'Liste des Devis' },
    { key: 'Alt + F', description: 'Factures' },
    { key: 'Alt + E', description: 'Encaissements' },
    { key: 'Alt + P', description: 'Planification' },
    { key: 'Alt + N', description: 'Nouveau Devis Calorifuge' },
    { key: 'Alt + R', description: 'Nouveau Devis Réservoir' },
    { key: 'Alt + I', description: 'Import/Export' },
    { key: 'Alt + T', description: 'Tour de Contrôle' },
    { key: 'Alt + G', description: 'Paramètres' },
    { key: 'Ctrl/Cmd + K', description: 'Recherche globale' },
    { key: 'Échap', description: 'Fermer les modales' }
  ]

  return shortcuts
}
