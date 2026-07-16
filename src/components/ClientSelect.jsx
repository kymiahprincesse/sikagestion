import { useState } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { useClientsStore } from '../store/useClientsStore'

export default function ClientSelect({ value, onChange, clients: clientsProp }) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 300)

  const storeClients = useClientsStore(state => state.clients)
  const clients = clientsProp || storeClients

  const filteredClients = clients.filter(client =>
    client.isActif &&
    (!search || client.nom.toLowerCase().includes(debouncedSearch.toLowerCase()))
  )

  const selectedClient = clients.find(c => c.id === value)

  const handleSelect = (client) => {
    onChange(client.id)
    setSearch('')
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <label className="text-sm font-medium text-navy block mb-1">Client</label>
      <div className="relative">
        <input
          type="text"
          value={search || selectedClient?.nom || ''}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Rechercher un client..."
          className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-rouge focus:border-rouge"
        />
        {selectedClient && !search && (
          <button
            onClick={() => {
              onChange(null)
              setSearch('')
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-rouge hover:text-rouge/80"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-surface border border-argent rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredClients.length > 0 ? (
              filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleSelect(client)}
                  className="w-full px-4 py-2 text-left hover:bg-[var(--color-accent-light)] transition-colors border-b border-argent last:border-b-0"
                >
                  <span className="font-medium text-navy">{client.nom}</span>
                  {client.ville && <span className="text-xs text-bleu ml-2">— {client.ville}</span>}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-bleu">
                Aucun client trouvé
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
