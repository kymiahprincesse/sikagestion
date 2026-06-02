// Système de notifications push navigateur

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('Ce navigateur ne supporte pas les notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export const sendBrowserNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.png',
      badge: '/favicon.png',
      ...options
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // Auto-close après 5 secondes
    setTimeout(() => {
      notification.close()
    }, 5000)

    return notification
  }
}

// Notifications spécifiques par type
export const notifyAlerteBudget = (projetNom, pourcentage) => {
  sendBrowserNotification('⚠️ Alerte Budget', {
    body: `Le projet "${projetNom}" a consommé ${pourcentage}% de son budget`,
    tag: 'alerte-budget',
    requireInteraction: true
  })
}

export const notifyFactureImpayee = (numeroFacture, clientNom, montant) => {
  sendBrowserNotification('🔴 Facture Impayée', {
    body: `Facture ${numeroFacture} - ${clientNom}\nMontant: ${montant} FCFA`,
    tag: 'facture-impayee'
  })
}

export const notifyDevisGagne = (numeroDevis, clientNom, montant) => {
  sendBrowserNotification('🎉 Devis Gagné !', {
    body: `Devis ${numeroDevis} - ${clientNom}\nMontant: ${montant} FCFA`,
    tag: 'devis-gagne'
  })
}

export const notifyNouveauAO = (numeroAO, clientNom, dateEcheance) => {
  sendBrowserNotification('📋 Nouvel Appel d\'Offres', {
    body: `AO ${numeroAO} - ${clientNom}\nÉchéance: ${dateEcheance}`,
    tag: 'nouveau-ao'
  })
}

export const notifyEncaissementRecu = (montant, clientNom) => {
  sendBrowserNotification('💰 Encaissement Reçu', {
    body: `${montant} FCFA reçu de ${clientNom}`,
    tag: 'encaissement'
  })
}

export const notifyStockFaible = (produit, quantite) => {
  sendBrowserNotification('⚠️ Stock Faible', {
    body: `${produit}: ${quantite} unités restantes`,
    tag: 'stock-faible',
    requireInteraction: true
  })
}

export const notifyTacheEnRetard = (tacheNom, projetNom) => {
  sendBrowserNotification('🔴 Tâche en Retard', {
    body: `"${tacheNom}" du projet "${projetNom}" est en retard`,
    tag: 'tache-retard',
    requireInteraction: true
  })
}

// Notification d'erreur système (erreurs Supabase, etc.)
export const notifyError = (titre, message) => {
  // Notification navigateur
  sendBrowserNotification(`❌ ${titre}`, {
    body: message,
    tag: 'erreur-systeme',
    requireInteraction: true
  })

  // Toast notification via le DOM (fallback si permissions navigateur refusées)
  // SECURITY: Utilise textContent au lieu de innerHTML pour éviter XSS
  if (typeof window !== 'undefined') {
    const toast = document.createElement('div')
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #E60000;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      max-width: 400px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `
    
    // Créer les éléments de manière sécurisée (pas d'innerHTML)
    const titleDiv = document.createElement('div')
    titleDiv.style.fontWeight = 'bold'
    titleDiv.style.marginBottom = '4px'
    titleDiv.textContent = '❌ ' + titre  // textContent = safe contre XSS
    
    const messageDiv = document.createElement('div')
    messageDiv.textContent = message  // textContent = safe contre XSS
    
    toast.appendChild(titleDiv)
    toast.appendChild(messageDiv)
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 5000)
  }
}
