import { formatFCFA } from '../utils/format'

export default function SoldeDisplay({ solde, label = 'Solde' }) {

  const isPositive = solde >= 0
  const colorClass = isPositive ? 'text-vert' : 'text-rouge'

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-bleu">{label}</span>
      <span className={`text-2xl font-bold ${colorClass}`}>
        {isPositive ? '+' : ''}{formatFCFA(solde)}
      </span>
    </div>
  )
}
