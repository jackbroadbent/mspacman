'use client'

import { useState, useCallback } from 'react'
import { PlayerSelector } from '@/components/PlayerSelector'
import { ScoreInput } from '@/components/ScoreInput'
import { LevelSelector } from '@/components/LevelSelector'
import { FeatureToggles } from '@/components/FeatureToggles'
import { MOCK_PLAYERS, FruitKey, LevelFruits } from '@/lib/constants'

// Simulate logged-in user (first active player for demo)
const LOGGED_IN_PLAYER_ID = '1'

export default function Home() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(LOGGED_IN_PLAYER_ID)
  const [score, setScore] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [levelFruits, setLevelFruits] = useState<LevelFruits>({})
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [showToast, setShowToast] = useState(false)

  const handleFeatureToggle = useCallback((featureId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    )
  }, [])

  const handleLevelSelect = useCallback((level: number) => {
    setSelectedLevel(level)
    // Reset fruit selection when changing levels
    if (level < 8) {
      setLevelFruits({})
    } else {
      // Initialize fruit entries for levels 8 to selected level
      setLevelFruits(prev => {
        const newFruits: LevelFruits = {}
        for (let l = 8; l <= level; l++) {
          // Preserve existing selections if available
          newFruits[l] = prev[l] || [null, null]
        }
        return newFruits
      })
    }
  }, [])

  const handleLevelFruitsChange = useCallback((level: number, slotIndex: 0 | 1, fruit: FruitKey | null) => {
    setLevelFruits(prev => {
      const currentPair = prev[level] || [null, null]
      const newPair: [FruitKey | null, FruitKey | null] = [...currentPair]
      newPair[slotIndex] = fruit
      return { ...prev, [level]: newPair }
    })
  }, [])

  const handleSubmit = useCallback(() => {
    // In a real app, this would send to Supabase
    console.log('Submitting score:', {
      playerId: selectedPlayerId,
      score: parseInt(score.replace(/,/g, '')) || 0,
      level: selectedLevel,
      levelFruits: selectedLevel && selectedLevel >= 8 ? levelFruits : undefined,
      features: selectedFeatures,
      loggedBy: LOGGED_IN_PLAYER_ID,
      timestamp: new Date(),
    })

    // Show success toast
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)

    // Reset form
    setSelectedPlayerId(LOGGED_IN_PLAYER_ID)
    setScore('')
    setSelectedLevel(null)
    setLevelFruits({})
    setSelectedFeatures([])
  }, [selectedPlayerId, score, selectedLevel, levelFruits, selectedFeatures])

  // Validation helper for level fruits
  const validateLevelFruits = (level: number): boolean => {
    // Levels 8 to level-1 must have both fruits selected
    for (let l = 8; l < level; l++) {
      const pair = levelFruits[l]
      if (!pair || pair[0] === null || pair[1] === null) return false
    }
    // Final level (where user died) can have 0, 1, or 2 fruits - always valid
    return true
  }

  // Validation
  const isValid =
    selectedPlayerId !== null &&
    score.length > 0 &&
    selectedLevel !== null &&
    (selectedLevel < 8 || validateLevelFruits(selectedLevel))

  return (
    <main className="container">
      <header className="header">
        <h1>PACKMUNDERMAN'S</h1>
        <div className="subtitle">Loggington Enhanced</div>
      </header>

      <PlayerSelector
        players={MOCK_PLAYERS}
        selectedPlayerId={selectedPlayerId}
        onSelect={setSelectedPlayerId}
        loggedInPlayerId={LOGGED_IN_PLAYER_ID}
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
      />

      <button
        className="btn-primary"
        disabled={!isValid}
        onClick={handleSubmit}
      >
        Log Score
      </button>

      {showToast && (
        <div className="toast">
          Score logged!
        </div>
      )}
    </main>
  )
}
