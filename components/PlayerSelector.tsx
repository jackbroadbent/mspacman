'use client'

import { useState } from 'react'
import { Player } from '@/lib/types'

interface PlayerSelectorProps {
  players: Player[]
  selectedPlayerId: string | null
  onSelect: (playerId: string) => void
  loggedInPlayerId?: string
}

export function PlayerSelector({
  players,
  selectedPlayerId,
  onSelect,
  loggedInPlayerId,
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
            {loggedInPlayerId === player.id && (
              <span style={{ marginLeft: '4px', opacity: 0.6 }}>*</span>
            )}
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
