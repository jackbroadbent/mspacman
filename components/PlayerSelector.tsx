'use client'

import { useState } from 'react'
import { Player } from '@/lib/types'

interface PlayerSelectorProps {
  players: Player[]
  selectedPlayerId: string | null
  onSelect: (playerId: string) => void
}

export function PlayerSelector({
  players,
  selectedPlayerId,
  onSelect,
}: PlayerSelectorProps) {
  const [showMore, setShowMore] = useState(false)

  const activePlayers = players.filter(p => p.isActive)
  const inactivePlayers = players.filter(p => !p.isActive)

  return (
    <div className="section">
      <div className="section-title">Player</div>

      {/* Active players */}
      <div className="button-grid">
        {activePlayers.map(player => (
          <button
            key={player.id}
            className={`btn player-btn ${selectedPlayerId === player.id ? 'selected' : ''}`}
            onClick={() => onSelect(player.id)}
          >
            {player.name}
          </button>
        ))}
      </div>

      {/* Expandable inactive players */}
      {inactivePlayers.length > 0 && (
        <>
          <button
            className="expand-btn"
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? '▲ Hide others' : `▼ Show ${inactivePlayers.length} more players`}
          </button>

          {showMore && (
            <div className="button-grid" style={{ marginTop: 'var(--spacing-sm)' }}>
              {inactivePlayers.map(player => (
                <button
                  key={player.id}
                  className={`btn player-btn ${selectedPlayerId === player.id ? 'selected' : ''}`}
                  onClick={() => onSelect(player.id)}
                >
                  {player.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
