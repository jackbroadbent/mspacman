'use client'

import { useEffect, useState } from 'react'
import { RecentScore } from '@/lib/analytics.types'

function formatTimeAgo(dateString: string): string {
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

function formatNumber(num: number): string {
  return num.toLocaleString()
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

export function RecentScores() {
  const [scores, setScores] = useState<RecentScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics/recent?limit=5')
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setScores(data.scores)
      } catch (err) {
        setError('Failed to load recent scores')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="section">
        <div className="section-title">Recent Scores</div>
        <div className="chart-skeleton" style={{ height: '150px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="section">
        <div className="section-title">Recent Scores</div>
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-md)' }}>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="section-title">Recent Scores</div>
      {scores.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-md)' }}>
          No recent scores
        </div>
      ) : (
        scores.map((score, index) => {
          const delta = formatDelta(score.score, score.playerAverage)
          return (
            <div key={`${score.playerId}-${score.createdAt}-${index}`} className="recent-score-item">
              <div>
                <div className="recent-score-player">{score.playerName}</div>
                <div className="recent-score-meta">
                  Level {score.level} · {formatTimeAgo(score.createdAt)}
                </div>
              </div>
              <div className="recent-score-right">
                <div className="recent-score-value">{formatNumber(score.score)}</div>
                {delta.text && (
                  <div className={`recent-score-delta ${delta.className}`}>
                    {delta.text}
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
