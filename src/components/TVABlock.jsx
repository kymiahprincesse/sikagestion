import { formatFCFA } from '../utils/format'

export default function TVABlock({ ht, tvaActive = true }) {
  const tva = tvaActive ? ht * 0.18 : 0
  const ttc = ht + tva

  return (
    <div className="bg-navyClair border-l-4 border-orange p-4 rounded-r-lg">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-bleu">MONTANT HT</span>
          <span className="text-lg font-bold text-navy">{formatFCFA(ht)}</span>
        </div>
        {tvaActive && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-bleu">TVA 18%</span>
            <span className="text-lg font-bold text-orange">{formatFCFA(tva)}</span>
          </div>
        )}
        <div className="border-t-2 border-orange pt-2 flex justify-between items-center">
          <span className="text-base font-bold text-navy">MONTANT TTC</span>
          <span className="text-xl font-bold text-navy">{formatFCFA(ttc)}</span>
        </div>
      </div>
    </div>
  )
}
