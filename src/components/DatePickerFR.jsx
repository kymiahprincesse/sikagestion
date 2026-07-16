import { format } from 'date-fns'

export default function DatePickerFR({ value, onChange, label }) {
  const handleChange = (e) => {
    const isoDate = e.target.value
    onChange(isoDate)
  }

  const displayValue = value ? format(new Date(value), 'dd/MM/yyyy') : ''

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-navy">{label}</label>}
      <input
        type="date"
        value={value || ''}
        onChange={handleChange}
        className="w-full px-4 py-2 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-rouge focus:border-rouge"
      />
      {value && (
        <span className="text-xs text-bleu mt-1">
          Format: {displayValue}
        </span>
      )}
    </div>
  )
}
