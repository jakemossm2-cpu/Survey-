import { useState } from 'react'

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

export default function StarRating({ value, onChange, disabled = false }) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(star)}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => !disabled && setHovered(0)}
          className={`text-3xl transition-transform ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <span className={star <= display ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
      {display > 0 && (
        <span className="ml-2 text-sm font-medium text-gray-600">{LABELS[display]}</span>
      )}
    </div>
  )
}
