'use client'

import { useState } from 'react'
import { GAME_FEATURES } from '@/lib/constants'

interface FeatureTogglesProps {
  selectedFeatures: string[]
  onToggle: (featureId: string) => void
  customFeature: string
  onCustomFeatureChange: (value: string) => void
}

export function FeatureToggles({
  selectedFeatures,
  onToggle,
  customFeature,
  onCustomFeatureChange,
}: FeatureTogglesProps) {
  const [showOtherInput, setShowOtherInput] = useState(false)

  const handleOtherClick = () => {
    setShowOtherInput(!showOtherInput)
    if (showOtherInput) {
      onCustomFeatureChange('')
    }
  }

  return (
    <div className="section">
      <div className="section-title">Cute Little Tricks & Features (optional)</div>
      <div className="feature-grid">
        {GAME_FEATURES.map(feature => (
          <button
            key={feature.id}
            className={`btn feature-btn ${selectedFeatures.includes(feature.id) ? 'selected' : ''}`}
            onClick={() => onToggle(feature.id)}
          >
            {feature.name}
          </button>
        ))}
        <button
          className={`btn feature-btn ${showOtherInput || customFeature ? 'selected' : ''}`}
          onClick={handleOtherClick}
        >
          Other...
        </button>
      </div>
      {showOtherInput && (
        <input
          type="text"
          className="other-input"
          placeholder="Describe the trick or feature..."
          value={customFeature}
          onChange={(e) => onCustomFeatureChange(e.target.value)}
          autoFocus
        />
      )}
    </div>
  )
}
