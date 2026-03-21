'use client'

import { FRUITS, ALL_FRUITS, FruitKey, LevelFruitCounts } from '@/lib/constants'
import { FRUIT_ICONS } from './PixelFruits'

interface FruitPickerProps {
  selectedFruit: FruitKey | null
  onSelect: (fruit: FruitKey | null) => void
  allowClear?: boolean
  compact?: boolean
}

// Original FruitPicker for backward compatibility (if needed)
export function FruitPicker({ selectedFruit, onSelect, allowClear = false, compact = false }: FruitPickerProps) {
  if (compact) {
    return (
      <div className="fruit-picker-compact">
        {ALL_FRUITS.map(fruitKey => {
          const fruit = FRUITS[fruitKey]
          const FruitIcon = FRUIT_ICONS[fruitKey]
          return (
            <button
              key={fruitKey}
              className={`btn fruit-btn-compact ${selectedFruit === fruitKey ? 'selected' : ''}`}
              onClick={() => onSelect(selectedFruit === fruitKey && allowClear ? null : fruitKey)}
              title={fruit.name}
            >
              <FruitIcon />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="fruit-picker">
      <div style={{ width: '100%', marginBottom: 'var(--spacing-xs)', textAlign: 'center' }}>
        <span className="section-title" style={{ margin: 0 }}>Which fruit appeared?</span>
      </div>
      {ALL_FRUITS.map(fruitKey => {
        const fruit = FRUITS[fruitKey]
        const FruitIcon = FRUIT_ICONS[fruitKey]
        return (
          <button
            key={fruitKey}
            className={`btn fruit-btn ${selectedFruit === fruitKey ? 'selected' : ''}`}
            onClick={() => onSelect(selectedFruit === fruitKey ? null : fruitKey)}
            title={fruit.name}
          >
            <FruitIcon />
          </button>
        )
      })}
    </div>
  )
}

// New condensed fruit picker with tap-to-cycle count behavior
interface FruitCountPickerProps {
  fruitCounts: LevelFruitCounts
  onCountChange: (fruitCounts: LevelFruitCounts) => void
  isLastLevel?: boolean
}

export function FruitCountPicker({ fruitCounts, onCountChange, isLastLevel = false }: FruitCountPickerProps) {
  const handleFruitTap = (fruitKey: FruitKey) => {
    const currentCount = fruitCounts[fruitKey] || 0
    // Cycle: 0 -> 1 -> 2 -> 0
    const newCount = ((currentCount + 1) % 3) as 0 | 1 | 2

    const newCounts = { ...fruitCounts }
    if (newCount === 0) {
      delete newCounts[fruitKey]
    } else {
      newCounts[fruitKey] = newCount
    }
    onCountChange(newCounts)
  }

  return (
    <div className="fruit-count-picker">
      {ALL_FRUITS.map(fruitKey => {
        const fruit = FRUITS[fruitKey]
        const count = fruitCounts[fruitKey] || 0
        const FruitIcon = FRUIT_ICONS[fruitKey]

        return (
          <button
            key={fruitKey}
            className={`btn fruit-count-btn ${count > 0 ? 'selected' : ''} ${count === 2 ? 'selected-double' : ''}`}
            onClick={() => handleFruitTap(fruitKey)}
            title={`${fruit.name}${count > 0 ? ` (${count})` : ''}`}
          >
            <FruitIcon />
            {count === 2 && <span className="fruit-count-badge">2</span>}
          </button>
        )
      })}
    </div>
  )
}
