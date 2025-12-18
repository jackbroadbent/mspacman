'use client'

import { useState } from 'react'
import { FIXED_LEVELS, FRUITS, MAZES, getMaze, LEVEL_TIERS, FruitKey, MazeKey, LevelFruits } from '@/lib/constants'
import { FruitPicker } from './FruitPicker'

interface LevelSelectorProps {
  selectedLevel: number | null
  levelFruits: LevelFruits
  onLevelSelect: (level: number) => void
  onLevelFruitsChange: (level: number, slotIndex: 0 | 1, fruit: FruitKey | null) => void
}

// Group levels by maze
function getLevelGroups(levels: { level: number; maze: MazeKey; fruit?: FruitKey }[]) {
  const groups: { maze: MazeKey; levels: typeof levels }[] = []
  let currentMaze: MazeKey | null = null

  for (const lvl of levels) {
    if (lvl.maze !== currentMaze) {
      groups.push({ maze: lvl.maze, levels: [lvl] })
      currentMaze = lvl.maze
    } else {
      groups[groups.length - 1].levels.push(lvl)
    }
  }
  return groups
}

export function LevelSelector({
  selectedLevel,
  levelFruits,
  onLevelSelect,
  onLevelFruitsChange,
}: LevelSelectorProps) {
  const [tier, setTier] = useState<1 | 2 | 3>(1)

  const handleLevelClick = (level: number) => {
    onLevelSelect(level)
  }

  const handleExpand = (newTier: 2 | 3) => {
    setTier(newTier)
  }

  const isRandomLevel = selectedLevel !== null && selectedLevel >= 8

  // Prepare level data for tiers
  // Tier 1: Levels 1-9 (includes 8-9 which are also Maze C like 6-7)
  const tier1Levels = [
    ...FIXED_LEVELS,
    { level: 8, maze: getMaze(8) as 'A' | 'B' | 'C' | 'D' },
    { level: 9, maze: getMaze(9) as 'A' | 'B' | 'C' | 'D' },
  ]

  // Tier 2: Levels 10-21 (includes 21 which starts a new Maze D group with 18-20)
  const tier2Levels = Array.from({ length: 12 }, (_, i) => ({
    level: i + 10,
    maze: getMaze(i + 10),
  }))

  // Tier 3: Levels 22-136
  const tier3Levels = Array.from({ length: LEVEL_TIERS.MAX_LEVEL - 21 }, (_, i) => ({
    level: i + 22,
    maze: getMaze(i + 22),
  }))

  const renderLevelButton = (level: number, maze: MazeKey, fruit?: FruitKey) => {
    const isSelected = selectedLevel === level
    const mazeColor = MAZES[maze].color
    return (
      <button
        key={level}
        className={`btn level-btn ${isSelected ? 'selected' : ''}`}
        onClick={() => handleLevelClick(level)}
        style={{ borderColor: mazeColor }}
      >
        <span className="level-num">{level}</span>
        <span className="level-fruit" style={fruit ? {} : { opacity: 0.5, color: 'var(--text)' }}>
          {fruit ? FRUITS[fruit].emoji : '?'}
        </span>
      </button>
    )
  }

  const renderGroupedLevels = (levels: { level: number; maze: MazeKey; fruit?: FruitKey }[]) => {
    const groups = getLevelGroups(levels)
    return (
      <>
        {groups.map((group, idx) => (
          <div key={`group-${group.maze}-${idx}`} className="level-group">
            {group.levels.map(({ level, maze, fruit }) =>
              renderLevelButton(level, maze, fruit)
            )}
          </div>
        ))}
      </>
    )
  }

  return (
    <div className="section">
      <div className="section-title">Level</div>

      {/* Tier 1: Levels 1-9 */}
      {renderGroupedLevels(tier1Levels)}

      {/* 10+ expand trigger */}
      {tier === 1 && (
        <button
          className="expand-btn"
          onClick={() => handleExpand(2)}
        >
          ▼ Level 10 and above...
        </button>
      )}

      {/* Tier 2: Levels 10-21 */}
      {tier >= 2 && (
        <>
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            {renderGroupedLevels(tier2Levels)}
          </div>

          {tier === 2 && (
            <button
              className="expand-btn"
              onClick={() => handleExpand(3)}
            >
              ▼ Level 22 and above...
            </button>
          )}
        </>
      )}

      {/* Tier 3: Levels 22-136 */}
      {tier === 3 && (
        <div style={{ marginTop: 'var(--spacing-sm)' }}>
          {renderGroupedLevels(tier3Levels)}
        </div>
      )}

      {/* Fruit pickers for random levels (8+) */}
      {isRandomLevel && selectedLevel && (
        <div className="level-fruits-section">
          <div className="section-title" style={{ marginTop: 'var(--spacing-md)' }}>
            Mystery Fruits
          </div>
          {Array.from({ length: selectedLevel - 7 }, (_, i) => i + 8).map(level => {
            const maze = getMaze(level)
            const mazeColor = MAZES[maze].color
            const fruits = levelFruits[level] || [null, null]
            const isLastLevel = level === selectedLevel

            return (
              <div key={level} className="level-fruit-row">
                <div className="level-fruit-label" style={{ borderLeftColor: mazeColor }}>
                  <span className="level-fruit-num">{level}</span>
                </div>
                <div className="level-fruit-slots">
                  <FruitPicker
                    selectedFruit={fruits[0]}
                    onSelect={(fruit) => onLevelFruitsChange(level, 0, fruit)}
                    allowClear={isLastLevel}
                    compact
                  />
                  <FruitPicker
                    selectedFruit={fruits[1]}
                    onSelect={(fruit) => onLevelFruitsChange(level, 1, fruit)}
                    allowClear={isLastLevel}
                    compact
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
