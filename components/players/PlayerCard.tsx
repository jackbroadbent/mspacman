'use client'

import { PlayerStats } from '@/lib/analytics.types'
import { FRUITS, FruitKey } from '@/lib/constants'
import { TrendChart } from './TrendChart'

interface PlayerCardProps {
  player: PlayerStats
  onClick?: () => void
}

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

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return '1 month ago'
  return `${Math.floor(diffDays / 30)} months ago`
}

export function PlayerCard({ player, onClick }: PlayerCardProps) {
  const fruitEmoji = FRUITS[player.mostCommonDeathFruit as FruitKey]?.emoji || '🍒'

  return (
    <div className="player-card" onClick={onClick}>
      {/* Header */}
      <div className="player-card-header">
        <div className="player-card-rank">#{player.rank}</div>
        <div className="player-card-name">{player.playerName}</div>
        <div className="player-card-fruit">{fruitEmoji}</div>
      </div>

      {/* High Score */}
      <div className="player-card-highscore">
        <div className="player-card-label">HIGH SCORE</div>
        <div className="player-card-score">{player.highScore.toLocaleString()}</div>
        <div className="player-card-date">{formatDate(player.highScoreDate)}</div>
      </div>

      {/* Stats Row */}
      <div className="player-card-stats">
        <div className="player-card-stat">
          <span className="player-card-stat-label">AVG</span>
          <span className="player-card-stat-value">{formatScore(player.averageScore)}</span>
        </div>
        <div className="player-card-stat-divider">|</div>
        <div className="player-card-stat">
          <span className="player-card-stat-label">GAMES</span>
          <span className="player-card-stat-value">{player.totalGames}</span>
        </div>
      </div>

      {/* Trend Chart */}
      <TrendChart
        recentGames={player.recentGames}
        movingAverage50={player.movingAverage50}
        trendPercentage={player.trendPercentage}
      />

      {/* Recent Games */}
      <div className="player-card-recent">
        <div className="player-card-recent-title">RECENT GAMES</div>
        <div className="player-card-recent-list">
          {player.recentGames.slice(0, 5).map((game, index) => (
            <div key={index} className="player-card-recent-item">
              <div className="player-card-recent-left">
                <span className="player-card-recent-score">{formatScore(game.score)}</span>
                <span className="player-card-recent-level">(Lv{game.level})</span>
              </div>
              <div className="player-card-recent-right">
                <span className="player-card-recent-time">{timeAgo(game.date)}</span>
                <span className={`player-card-recent-delta ${game.deltaFromAvg >= 0 ? 'positive' : 'negative'}`}>
                  {game.deltaFromAvg >= 0 ? '▲' : '▼'}
                </span>
              </div>
            </div>
          ))}
          {player.recentGames.length === 0 && (
            <div className="player-card-recent-empty">No games yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
