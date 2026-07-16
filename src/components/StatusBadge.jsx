export default function StatusBadge({ status }) {
  const configs = {
    'Gagné': { bg: 'bg-vert', text: 'text-white', label: 'Gagné' },
    'Payé': { bg: 'bg-vert', text: 'text-white', label: 'Payé' },
    'Perdu': { bg: 'bg-rouge', text: 'text-white', label: 'Perdu' },
    'Retard': { bg: 'bg-rouge', text: 'text-white', label: 'Retard' },
    'Attente': { bg: 'bg-rouge', text: 'text-white', label: 'Attente' },
    'Brouillon': { bg: 'bg-bleu', text: 'text-white', label: 'Brouillon' },
    'Décliné': { bg: 'bg-argent', text: 'text-gray-700', label: 'Décliné' },
  }

  const config = configs[status] || { bg: 'bg-gray-300', text: 'text-gray-700', label: status }

  return (
    <span className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-xs font-bold inline-block`}>
      {config.label}
    </span>
  )
}
