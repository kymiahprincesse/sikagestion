import { useState, useEffect } from 'react'

export default function MoneyInput({ value, onChange, label, placeholder = '0' }) {
  const [displayValue, setDisplayValue] = useState('')

  useEffect(() => {
    if (value !== null && value !== undefined && value !== '') {
      const formatted = Number(value).toLocaleString('fr-FR')
      setDisplayValue(formatted)
    } else {
      setDisplayValue('')
    }
  }, [value])

  const handleChange = (e) => {
    const input = e.target.value.replace(/\s/g, '').replace(/[^\d]/g, '')
    const numValue = input === '' ? '' : Number(input)
    onChange(numValue)
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-navy">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full px-4 py-2 pr-16 border border-argent rounded-lg focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange"
        />
        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-bleu font-medium">
          FCFA
        </span>
      </div>
    </div>
  )
}
