'use client'

import { useEffect, useState } from 'react'
import { AnalyticsSummary } from '@/lib/analytics.types'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

export function QuickStats() {
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics/summary')
        if (!response.ok) throw new Error('Failed to fetch')
        const summary = await response.json()
        setData(summary)
      } catch (err) {
        setError('Failed to load stats')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="stats-grid">
        <div className="stat-card">
          <div className="chart-skeleton" style={{ height: '80px' }} />
        </div>
        <div className="stat-card">
          <div className="chart-skeleton" style={{ height: '80px' }} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="stat-card">
        <div className="stat-card-title">Error</div>
        <div style={{ color: 'var(--text-muted)' }}>{error || 'No data'}</div>
      </div>
    )
  }

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-card-title">High Score</div>
        <div className="stat-card-value">{formatNumber(data.highScore.score)}</div>
        <div className="stat-card-subtitle">
          {data.highScore.playerName} · {formatDate(data.highScore.date)}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-card-title">Total Games</div>
        <div className="stat-card-value">{formatNumber(data.totalGames)}</div>
        <div className="stat-card-subtitle">logged scores</div>
      </div>
    </div>
  )
}
