import { useState } from 'react'
import { 
  Breadcrumb, 
  StatusBadge, 
  SoldeDisplay, 
  TVABlock, 
  ActionButtons,
  MoneyInput,
  DatePickerFR,
  ClientSelect
} from '../components'
import { formatFCFA } from '../utils/format'

export default function Dashboard() {
  const [montant, setMontant] = useState(1250000)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [client, setClient] = useState(null)

  const breadcrumbItems = [
    { label: 'Accueil', path: '/' },
    { label: 'Dashboard' }
  ]

  const stats = [
    { label: 'Projets actifs', value: '12', icon: '📁', color: 'bg-bleu' },
    { label: 'Factures en attente', value: '8', icon: '💰', color: 'bg-orange' },
    { label: 'Clients', value: '45', icon: '👥', color: 'bg-vert' },
    { label: 'Revenus ce mois', value: '125 000 000 FCFA', icon: '📈', color: 'bg-navy' },
  ]

  const factures = [
    { id: 1, numero: 'F-2026-001', client: 'GMCI', montant: 5000000, status: 'Payé' },
    { id: 2, numero: 'F-2026-002', client: 'AMCC', montant: 3500000, status: 'Attente' },
    { id: 3, numero: 'F-2026-003', client: 'LDC', montant: 7200000, status: 'Retard' },
  ]

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">Tableau de bord</h1>
        <p className="text-bleu">Vue d'ensemble de votre activité SIKA INDUSTRIE</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-argent p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-sm text-bleu mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-navy">{stat.value}</p>
          </div>
        ))}
      </div>

      
      <div className="bg-white rounded-lg shadow-sm border border-argent p-6">
        <h3 className="text-lg font-bold text-navy mb-4">Factures récentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-orange">
                <th className="text-left py-3 px-4 text-navy font-bold">N° Facture</th>
                <th className="text-left py-3 px-4 text-navy font-bold">Client</th>
                <th className="text-left py-3 px-4 text-navy font-bold">Montant</th>
                <th className="text-left py-3 px-4 text-navy font-bold">Statut</th>
                <th className="text-left py-3 px-4 text-navy font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {factures.map((facture) => (
                <tr key={facture.id} className="border-b border-argent hover:bg-orangeClair transition-colors">
                  <td className="py-3 px-4 font-medium text-navy">{facture.numero}</td>
                  <td className="py-3 px-4 text-bleu">{facture.client}</td>
                  <td className="py-3 px-4 font-bold text-navy">
                    {formatFCFA(facture.montant)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={facture.status} />
                  </td>
                  <td className="py-3 px-4">
                    <ActionButtons
                      onView={() => console.log('Voir', facture.id)}
                      onEdit={() => console.log('Modifier', facture.id)}
                      onPrint={() => console.log('Imprimer', facture.id)}
                      onDelete={() => console.log('Supprimer', facture.id)}
                      permissions={{ add: false, edit: true, view: true, print: true, delete: true }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
