import { useState } from 'react'
import { Keyboard, X } from 'lucide-react'
import { useShortcutsHelp } from '../hooks/useKeyboardShortcuts'

export default function ShortcutsHelp() {
  const [showHelp, setShowHelp] = useState(false)
  const shortcuts = useShortcutsHelp()

  return (
    <>
      <button
        onClick={() => setShowHelp(true)}
        className="p-2 rounded-lg transition-all hover:bg-opacity-10 hover:bg-bleu"
        style={{ color: 'var(--color-primary)' }}
        title="Raccourcis clavier (Alt + ?)"
      >
        <Keyboard size={20} />
      </button>

      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-primary)' }}>
              <div className="flex items-center gap-3">
                <Keyboard size={24} className="text-white" />
                <h2 className="text-2xl font-bold text-white">Raccourcis Clavier</h2>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-lg text-white hover:bg-white hover:bg-opacity-10 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <p className="mb-6" style={{ color: 'var(--color-primary)' }}>
                Utilisez ces raccourcis pour naviguer rapidement dans l'application
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--color-surface-muted)' }}
                  >
                    <span style={{ color: 'var(--color-primary)' }}>{shortcut.description}</span>
                    <kbd
                      className="px-3 py-1 rounded font-mono text-sm font-semibold"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                    >
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-accent-light)' }}>
                <p className="text-sm" style={{ color: 'var(--color-accent)' }}>
                  💡 <strong>Astuce :</strong> Appuyez sur <kbd className="px-2 py-1 rounded bg-surface font-mono text-xs">Alt + ?</kbd> à tout moment pour afficher cette aide
                </p>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setShowHelp(false)}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
