'use client'

import { useEffect, useState } from 'react'
import { LeaderboardEntry } from '@/lib/analytics.types'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchData(offset = 0) {
    try {
      const response = await fetch(`/api/analytics/leaderboard?limit=10&offset=${offset}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      return data
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  useEffect(() => {
    async function loadInitial() {
      try {
        const data = await fetchData(0)
        setEntries(data.entries)
        setHasMore(data.hasMore)
      } catch {
        setError('Failed to load leaderboard')
      } finally {
        setLoading(false)
      }
    }
    loadInitial()
  }, [])

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const data = await fetchData(entries.length)
      setEntries(prev => [...prev, ...data.entries])
      setHasMore(data.hasMore)
    } catch {
      // Silently fail for load more
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return (
      <div className="section">
        <div className="section-title">Leaderboard</div>
        <div className="chart-skeleton" style={{ height: '200px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="section">
        <div className="section-title">Leaderboard</div>
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-md)' }}>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="section-title">Leaderboard</div>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Score</th>
            <th>Lvl</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={`${entry.playerId}-${entry.createdAt}`}>
              <td className="rank">{entry.rank}</td>
              <td className="player">{entry.playerName}</td>
              <td className="score">{formatNumber(entry.score)}</td>
              <td className="level">{entry.level}</td>
              <td className="date">{formatDate(entry.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <button
          className="load-more-btn"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  )
}
