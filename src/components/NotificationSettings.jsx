import { useState, useEffect } from 'react'
import { Bell, BellOff, Check, X } from 'lucide-react'
import { requestNotificationPermission } from '../utils/notifications'

export default function NotificationSettings() {
  const [permission, setPermission] = useState(Notification.permission)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState({
    alertesBudget: true,
    facturesImpayees: true,
    devisGagnes: true,
    nouveauxAO: true,
    encaissements: true,
    tachesRetard: true
  })

  useEffect(() => {
    const saved = localStorage.getItem('notification_preferences')
    if (saved) {
      setPreferences(JSON.parse(saved))
    }

    const checkPermission = () => {
      setPermission(Notification.permission)
    }

    const interval = setInterval(checkPermission, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleEnableNotifications = async () => {
    try {
      const granted = await requestNotificationPermission()
      const newPermission = granted ? 'granted' : (Notification.permission === 'denied' ? 'denied' : 'default')
      setPermission(newPermission)
      
      if (granted) {
        new Notification('🎉 Notifications Activées', {
          body: 'Vous recevrez maintenant des alertes en temps réel',
          icon: '/favicon.png'
        })
      }
    } catch (error) {
      console.error('Erreur activation notifications:', error)
      setPermission(Notification.permission)
    }
  }

  const handleTogglePreference = (key) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] }
    setPreferences(newPrefs)
    localStorage.setItem('notification_preferences', JSON.stringify(newPrefs))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-2 rounded-lg transition-all hover:bg-opacity-10 hover:bg-bleu relative"
        style={{ color: '#1F5C99' }}
        title="Paramètres notifications"
      >
        {permission === 'granted' ? (
          <Bell size={20} />
        ) : (
          <BellOff size={20} />
        )}
        {permission !== 'granted' && (
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full" style={{ backgroundColor: '#E60000' }}></span>
        )}
      </button>

      {showSettings && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50" style={{ borderColor: '#C8C8D0' }}>
          <div className="p-4 border-b" style={{ borderColor: '#C8C8D0', backgroundColor: '#1B2A4A' }}>
            <h3 className="text-lg font-bold text-white">Notifications Push</h3>
          </div>

          <div className="p-4 space-y-4">
            {permission !== 'granted' && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#FFE6E6' }}>
                <p className="text-sm mb-3" style={{ color: '#E60000' }}>
                  Les notifications navigateur sont désactivées. Activez-les pour recevoir des alertes en temps réel.
                </p>
                <button
                  onClick={handleEnableNotifications}
                  className="w-full px-4 py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: '#E60000' }}
                >
                  Activer les Notifications
                </button>
              </div>
            )}

            {permission === 'granted' && (
              <>
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                  <Check size={18} style={{ color: '#1A7A4A' }} />
                  <span className="text-sm font-medium" style={{ color: '#1A7A4A' }}>
                    Notifications activées
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold" style={{ color: '#1B2A4A' }}>Types de notifications :</p>

                  {[
                    { key: 'alertesBudget', label: 'Alertes Budget (80%)', icon: '⚠️' },
                    { key: 'facturesImpayees', label: 'Factures Impayées', icon: '🔴' },
                    { key: 'devisGagnes', label: 'Devis Gagnés', icon: '🎉' },
                    { key: 'nouveauxAO', label: 'Nouveaux AO', icon: '📋' },
                    { key: 'encaissements', label: 'Encaissements', icon: '💰' },
                    { key: 'tachesRetard', label: 'Tâches en Retard', icon: '⏰' }
                  ].map(({ key, label, icon }) => (
                    <label key={key} className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-opacity-50" style={{ backgroundColor: preferences[key] ? '#E8ECF4' : 'transparent' }}>
                      <span className="flex items-center gap-2 text-sm">
                        <span>{icon}</span>
                        <span style={{ color: '#1B2A4A' }}>{label}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={preferences[key]}
                        onChange={() => handleTogglePreference(key)}
                        className="w-5 h-5 rounded focus:ring-2 focus:ring-orange"
                      />
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-4 border-t flex justify-end" style={{ borderColor: '#C8C8D0' }}>
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 rounded-lg font-semibold transition-all hover:bg-opacity-10"
              style={{ color: '#1B2A4A', backgroundColor: '#E8ECF4' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
