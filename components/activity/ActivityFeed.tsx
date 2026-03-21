'use client'

import { useEffect, useState } from 'react'
import { ActivityFeedEntry } from '@/lib/analytics.types'

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

export function ActivityFeed() {
  const [entries, setEntries] = useState<ActivityFeedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics/activity-feed')
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setEntries(data.entries)
      } catch (err) {
        setError('Failed to load activity')
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
        <div className="section-title">Recent Activity</div>
        <div className="chart-skeleton" style={{ height: '300px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="section">
        <div className="section-title">Recent Activity</div>
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-md)' }}>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="section-title">Recent Activity</div>
      {entries.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-md)' }}>
          No activity yet
        </div>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Score</th>
              <th>vs Avg</th>
              <th>Lvl</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const delta = formatDelta(entry.score, entry.playerAverage)
              return (
                <tr key={`${entry.playerId}-${entry.createdAt}-${index}`}>
                  <td className="player">{entry.playerName}</td>
                  <td className="score">{formatNumber(entry.score)}</td>
                  <td>
                    {delta.text && (
                      <span className={`activity-delta ${delta.className}`}>
                        {delta.text}
                      </span>
                    )}
                  </td>
                  <td className="level">{entry.level}</td>
                  <td className="date">{formatTimeAgo(entry.createdAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
