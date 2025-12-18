'use client'

import { GAME_FEATURES } from '@/lib/constants'

interface FeatureTogglesProps {
  selectedFeatures: string[]
  onToggle: (featureId: string) => void
}

export function FeatureToggles({ selectedFeatures, onToggle }: FeatureTogglesProps) {
  return (
    <div className="section">
      <div className="section-title">Game Features (optional)</div>
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
      </div>
    </div>
  )
}
