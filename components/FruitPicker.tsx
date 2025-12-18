'use client'

import { FRUITS, ALL_FRUITS, FruitKey } from '@/lib/constants'

interface FruitPickerProps {
  selectedFruit: FruitKey | null
  onSelect: (fruit: FruitKey | null) => void
  allowClear?: boolean
  compact?: boolean
}

export function FruitPicker({ selectedFruit, onSelect, allowClear = false, compact = false }: FruitPickerProps) {
  if (compact) {
    // Compact mode: single row of small fruit buttons
    return (
      <div className="fruit-picker-compact">
        {ALL_FRUITS.map(fruitKey => {
          const fruit = FRUITS[fruitKey]
          return (
            <button
              key={fruitKey}
              className={`btn fruit-btn-compact ${selectedFruit === fruitKey ? 'selected' : ''}`}
              onClick={() => onSelect(selectedFruit === fruitKey && allowClear ? null : fruitKey)}
              title={fruit.name}
            >
              {fruit.emoji}
            </button>
          )
        })}
      </div>
    )
  }

  // Original full-size mode
  return (
    <div className="fruit-picker">
      <div style={{ width: '100%', marginBottom: 'var(--spacing-xs)', textAlign: 'center' }}>
        <span className="section-title" style={{ margin: 0 }}>Which fruit appeared?</span>
      </div>
      {ALL_FRUITS.map(fruitKey => {
        const fruit = FRUITS[fruitKey]
        return (
          <button
            key={fruitKey}
            className={`btn fruit-btn ${selectedFruit === fruitKey ? 'selected' : ''}`}
            onClick={() => onSelect(fruitKey)}
            title={fruit.name}
          >
            {fruit.emoji}
          </button>
        )
      })}
    </div>
  )
}
