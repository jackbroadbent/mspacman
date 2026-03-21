'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PlayerFullStats, PlayerStats } from '@/lib/analytics.types'
import { FRUITS, FruitKey } from '@/lib/constants'
import { TrendChart } from '@/components/players/TrendChart'

function formatScore(score: number): string {
  return score.toLocaleString()
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startStr} - ${endStr}`
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDelta(score: number, average: number): { text: string; className: string } {
  if (average === 0) return { text: '', className: '' }

  const diff = score - average
  const percentage = Math.round((diff / average) * 100)

  if (percentage > 0) {
    return { text: `+${percentage}%`, className: 'delta-positive' }
  } else if (percentage < 0) {
    return { text: `${percentage}%`, className: 'delta-negative' }
  }
  return { text: '0%', className: 'delta-neutral' }
}

export default function PlayerDetailPage() {
  const [player, setPlayer] = useState<PlayerFullStats | null>(null)
  const [playerList, setPlayerList] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const playerId = params.playerId as string

  // Fetch player list for navigation
  useEffect(() => {
    async function fetchPlayerList() {
      try {
        const response = await fetch('/api/analytics/player-stats')
        if (response.ok) {
          const data = await response.json()
          setPlayerList(data.players || [])
        }
      } catch {
        // Silently fail - navigation just won't work
      }
    }
    fetchPlayerList()
  }, [])

  useEffect(() => {
    async function fetchPlayer() {
      try {
        const response = await fetch(`/api/analytics/player-full-stats?playerId=${playerId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch player stats')
        }
        const data = await response.json()
        setPlayer(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (playerId) {
      fetchPlayer()
    }
  }, [playerId])

  // Navigation helpers
  const currentIndex = playerList.findIndex(p => p.playerId === playerId)
  const prevPlayer = currentIndex > 0 ? playerList[currentIndex - 1] : null
  const nextPlayer = currentIndex < playerList.length - 1 ? playerList[currentIndex + 1] : null

  const goToPlayer = (id: string) => {
    router.push(`/players/${id}`)
  }

  const goBack = () => {
    router.push('/?mode=players')
  }

  // Swipe handling
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current

    // Only trigger if horizontal swipe is dominant and significant
    const minSwipeDistance = 50
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX < 0 && nextPlayer) {
        // Swipe left -> next player
        goToPlayer(nextPlayer.playerId)
      } else if (deltaX > 0 && prevPlayer) {
        // Swipe right -> previous player
        goToPlayer(prevPlayer.playerId)
      }
    }

    touchStartX.current = null
    touchStartY.current = null
  }

  if (loading) {
    return (
      <main className="container">
        <div className="player-full-loading">
          <div className="player-carousel-spinner" />
          <p>Loading player stats...</p>
        </div>
      </main>
    )
  }

  if (error || !player) {
    return (
      <main className="container">
        <div className="player-full-error">
          <button className="player-full-back" onClick={goBack}>
            ← Back
          </button>
          <p>Error: {error || 'Player not found'}</p>
        </div>
      </main>
    )
  }

  const fruitEmoji = FRUITS[player.mostCommonDeathFruit as FruitKey]?.emoji || '🍒'

  return (
    <main
      className="container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="player-full-page">
        {/* Back button */}
        <button className="player-full-back" onClick={goBack}>
          ← Back
        </button>

        {/* Header with navigation */}
        <div className="player-full-header-row">
          <button
            className="player-full-nav-arrow"
            onClick={() => prevPlayer && goToPlayer(prevPlayer.playerId)}
            disabled={!prevPlayer}
            aria-label="Previous player"
          >
            ←
          </button>
          <div className="player-full-header">
            <div className="player-full-name">{player.playerName}</div>
            <div className="player-full-fruit">{fruitEmoji}</div>
          </div>
          <button
            className="player-full-nav-arrow"
            onClick={() => nextPlayer && goToPlayer(nextPlayer.playerId)}
            disabled={!nextPlayer}
            aria-label="Next player"
          >
            →
          </button>
        </div>
        <div className="player-full-rank">#{player.rank} by High Score</div>

        {/* High Score Card */}
        <div className="player-full-section player-full-highscore">
          <div className="player-full-label">HIGH SCORE</div>
          <div className="player-full-score">{player.highScore.toLocaleString()}</div>
          <div className="player-full-date">{formatDate(player.highScoreDate)}</div>
        </div>

        {/* Stats Grid */}
        <div className="player-full-stats-grid">
          <div className="player-full-stat-card">
            <div className="player-full-label">AVG SCORE</div>
            <div className="player-full-stat-value">{formatScore(player.averageScore)}</div>
          </div>
          <div className="player-full-stat-card">
            <div className="player-full-label">TOTAL GAMES</div>
            <div className="player-full-stat-value">{player.totalGames}</div>
          </div>
        </div>

        {/* Year by Year Stats */}
        <div className="player-full-section">
          <div className="player-full-section-title">YEAR-BY-YEAR STATS</div>
          <div className="player-full-yearly">
            {player.yearlyStats.map((year) => (
              <div key={year.year} className="player-full-year-row">
                <div className="player-full-year-label">{year.year}</div>
                <div className="player-full-year-stats">
                  <span>Games: {year.gamesPlayed}</span>
                  <span>Avg: {formatScore(year.averageScore)}</span>
                  <span>Hi: {formatScore(year.highScore)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Stats */}
        <div className="player-full-section">
          <div className="player-full-section-title">ADDITIONAL STATS</div>
          <div className="player-full-additional">
            <div className="player-full-additional-row">
              <span className="player-full-additional-label">Best Level</span>
              <span className="player-full-additional-value">{player.bestLevel}</span>
            </div>
            <div className="player-full-additional-row">
              <span className="player-full-additional-label">Avg Level Reached</span>
              <span className="player-full-additional-value">{player.avgLevelReached}</span>
            </div>
            <div className="player-full-additional-row">
              <span className="player-full-additional-label">Games This Month</span>
              <span className="player-full-additional-value">{player.gamesThisMonth}</span>
            </div>
            <div className="player-full-additional-row">
              <span className="player-full-additional-label">Longest Session</span>
              <span className="player-full-additional-value">
                {player.longestSession.gamesPlayed} games ({formatDate(player.longestSession.date)})
              </span>
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="player-full-section">
          <div className="player-full-section-title">STREAKS</div>
          <div className="player-full-streaks">
            <div className="player-full-streak hot">
              <div className="player-full-streak-icon">🔥</div>
              <div className="player-full-streak-content">
                <div className="player-full-streak-label">Hot Streak</div>
                <div className="player-full-streak-value">{player.longestHotStreak.gamesCount} games</div>
                {player.longestHotStreak.gamesCount > 0 && (
                  <div className="player-full-streak-dates">
                    {formatDateRange(player.longestHotStreak.startDate, player.longestHotStreak.endDate)}
                  </div>
                )}
              </div>
            </div>
            <div className="player-full-streak cold">
              <div className="player-full-streak-icon">❄️</div>
              <div className="player-full-streak-content">
                <div className="player-full-streak-label">Cold Streak</div>
                <div className="player-full-streak-value">{player.longestColdStreak.gamesCount} games</div>
                {player.longestColdStreak.gamesCount > 0 && (
                  <div className="player-full-streak-dates">
                    {formatDateRange(player.longestColdStreak.startDate, player.longestColdStreak.endDate)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="player-full-section">
          <TrendChart
            recentGames={player.recentGames}
            movingAverage50={player.movingAverage50}
            trendPercentage={player.trendPercentage}
          />
        </div>

        {/* Recent Games (expanded) */}
        <div className="player-full-section">
          <div className="player-full-section-title">RECENT GAMES</div>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>vs Avg</th>
                <th>Lvl</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {player.allGames.slice(0, 20).map((game, index) => {
                const delta = formatDelta(game.score, player.movingAverage50)
                return (
                  <tr key={index}>
                    <td className="score">{formatScore(game.score)}</td>
                    <td>
                      {delta.text && (
                        <span className={`activity-delta ${delta.className}`}>
                          {delta.text}
                        </span>
                      )}
                    </td>
                    <td className="level">{game.level}</td>
                    <td className="date">{timeAgo(game.date)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
