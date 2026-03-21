'use client'

import { useState, useCallback } from 'react'
import { PlayerSelector } from '@/components/PlayerSelector'
import { ScoreInput } from '@/components/ScoreInput'
import { LevelSelector } from '@/components/LevelSelector'
import { FeatureToggles } from '@/components/FeatureToggles'
import { MOCK_PLAYERS, LevelFruits, LevelFruitCounts, FruitKey } from '@/lib/constants'
import { LevelFruitsJson } from '@/lib/database.types'

// Score data for editing
export interface EditScoreData {
  id: string
  playerId: string
  score: number
  level: number
  levelFruits: LevelFruitsJson | null
  features: string[]
}

interface LogPopupProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editScore?: EditScoreData | null  // If provided, we're in edit mode
}

// Convert LevelFruitsJson (tuple format) to LevelFruits (counts format)
function jsonToLevelFruits(json: LevelFruitsJson | null): LevelFruits {
  if (!json) return {}
  const result: LevelFruits = {}
  for (const [level, tuple] of Object.entries(json)) {
    const counts: LevelFruitCounts = {}
    for (const fruit of tuple) {
      if (fruit) {
        const current = counts[fruit] || 0
        counts[fruit] = (current + 1) as 0 | 1 | 2
      }
    }
    result[parseInt(level)] = counts
  }
  return result
}

export function LogPopup({ isOpen, onClose, onSuccess, editScore }: LogPopupProps) {
  const isEditMode = !!editScore

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [score, setScore] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [levelFruits, setLevelFruits] = useState<LevelFruits>({})
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [customFeature, setCustomFeature] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form with edit data when editScore changes
  const [initializedEditId, setInitializedEditId] = useState<string | null>(null)

  if (isOpen && editScore && editScore.id !== initializedEditId) {
    setSelectedPlayerId(editScore.playerId)
    setScore(editScore.score.toLocaleString())
    setSelectedLevel(editScore.level)
    setLevelFruits(jsonToLevelFruits(editScore.levelFruits))
    setSelectedFeatures(editScore.features || [])
    setCustomFeature('')
    setError(null)
    setInitializedEditId(editScore.id)
  }

  const handleFeatureToggle = useCallback((featureId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    )
  }, [])

  const handleLevelSelect = useCallback((level: number) => {
    setSelectedLevel(level)
    if (level < 8) {
      setLevelFruits({})
    } else {
      setLevelFruits(prev => {
        const newFruits: LevelFruits = {}
        for (let l = 8; l <= level; l++) {
          newFruits[l] = prev[l] || {}
        }
        return newFruits
      })
    }
  }, [])

  const handleLevelFruitsChange = useCallback((level: number, fruitCounts: LevelFruitCounts) => {
    setLevelFruits(prev => ({ ...prev, [level]: fruitCounts }))
  }, [])

  const resetForm = () => {
    setSelectedPlayerId(null)
    setScore('')
    setSelectedLevel(null)
    setLevelFruits({})
    setSelectedFeatures([])
    setCustomFeature('')
    setError(null)
    setInitializedEditId(null)
  }

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const url = isEditMode ? `/api/scores/${editScore!.id}` : '/api/scores'
      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          score: parseInt(score.replace(/,/g, '')) || 0,
          level: selectedLevel,
          levelFruits: selectedLevel && selectedLevel >= 8 ? levelFruits : undefined,
          features: selectedFeatures,
          customFeature: customFeature || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'submit'} score`)
      }

      resetForm()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Submit error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [isEditMode, editScore, selectedPlayerId, score, selectedLevel, levelFruits, selectedFeatures, customFeature, onSuccess, onClose])

  const getTotalFruitCount = (fruitCounts: LevelFruitCounts | undefined): number => {
    if (!fruitCounts) return 0
    return (Object.values(fruitCounts) as number[]).reduce((sum, count) => sum + (count || 0), 0)
  }

  const validateLevelFruits = (level: number): boolean => {
    for (let l = 8; l < level; l++) {
      if (getTotalFruitCount(levelFruits[l]) !== 2) return false
    }
    return true
  }

  const isValid =
    selectedPlayerId !== null &&
    score.length > 0 &&
    selectedLevel !== null &&
    (selectedLevel < 8 || validateLevelFruits(selectedLevel))

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="popup-overlay" onClick={handleClose} />
      <div className="popup-container">
        <div className="popup-header">
          <h2>{isEditMode ? 'Edit Score' : 'Log Score'}</h2>
          <button className="popup-close" onClick={handleClose}>
            &times;
          </button>
        </div>
        <div className="popup-content">
          <PlayerSelector
            players={MOCK_PLAYERS}
            selectedPlayerId={selectedPlayerId}
            onSelect={setSelectedPlayerId}
          />

          <ScoreInput
            value={score}
            onChange={setScore}
          />

          <LevelSelector
            selectedLevel={selectedLevel}
            levelFruits={levelFruits}
            onLevelSelect={handleLevelSelect}
            onLevelFruitsChange={handleLevelFruitsChange}
          />

          <FeatureToggles
            selectedFeatures={selectedFeatures}
            onToggle={handleFeatureToggle}
            customFeature={customFeature}
            onCustomFeatureChange={setCustomFeature}
          />

          {error && (
            <div className="popup-error">
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            disabled={!isValid || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Score' : 'Log Score')}
          </button>
        </div>
      </div>
    </>
  )
}

export function FloatingPlusButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="floating-plus-btn" onClick={onClick} aria-label="Log Score">
      <span>+</span>
    </button>
  )
}
