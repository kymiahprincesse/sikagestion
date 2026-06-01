import { useState } from 'react'
import MoneyInput from './MoneyInput'
import DatePickerFR from './DatePickerFR'

export default function ModalePaiement({ factureId, onSave, onClose }) {
  const [formData, setFormData] = useState({
    montant: '',
    date: new Date().toISOString().split('T')[0],
    mode: 'Virement',
    reference: ''
  })

  const modes = ['Virement', 'Chèque', 'Espèces', 'Mobile Money']

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...formData, factureId })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-navy/80" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-navy">Enregistrer un paiement</h3>
          <button
            onClick={onClose}
            className="text-rouge hover:text-rouge/80 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <MoneyInput
            label="Montant du paiement"
            value={formData.montant}
            onChange={(val) => setFormData({ ...formData, montant: val })}
          />

          <DatePickerFR
            label="Date du paiement"
            value={formData.date}
            onChange={(val) => setFormData({ ...formData, date: val })}
          />

          <div>
            <label className="text-sm font-medium text-navy block mb-1">
              Mode de paiement
            </label>
            <select
              value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
              className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
            >
              {modes.map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-navy block mb-1">
              Référence
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Numéro de transaction, chèque..."
              className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-argent text-gray-700 rounded-lg font-medium hover:bg-argent/80 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-vert text-white rounded-lg font-medium hover:bg-vert/90 transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
