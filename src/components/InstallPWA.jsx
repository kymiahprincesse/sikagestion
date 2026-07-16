import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

export default function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false)
  const [promptInstall, setPromptInstall] = useState(null)

  useEffect(() => {
    const handler = e => {
      e.preventDefault()
      setSupportsPWA(true)
      setPromptInstall(e)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const onClick = evt => {
    evt.preventDefault()
    if (!promptInstall) {
      return
    }
    promptInstall.prompt()
  }

  if (!supportsPWA) {
    return null
  }

  return (
    <button
      className="flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-md animate-fade-in-up"
      onClick={onClick}
      aria-label="Installer l'application"
      title="Installer SIKA GESTION sur votre appareil"
    >
      <Download size={16} />
      <span className="hidden sm:inline">Installer l'App</span>
    </button>
  )
}
