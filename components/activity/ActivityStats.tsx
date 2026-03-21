'use client'

import { useEffect, useState } from 'react'
import { ActivityStats as ActivityStatsType } from '@/lib/analytics.types'

export function ActivityStats() {
  const [data, setData] = useState<ActivityStatsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics/activity-stats')
        if (!response.ok) throw new Error('Failed to fetch')
        const stats = await response.json()
        setData(stats)
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

  const changeClass = data.percentChange > 0 ? 'delta-positive' : data.percentChange < 0 ? 'delta-negative' : 'delta-neutral'
  const changeText = data.percentChange > 0 ? `+${data.percentChange}%` : `${data.percentChange}%`

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-card-title">Games in Last 30 Days</div>
        <div className="stat-card-value">{data.gamesThisMonth}</div>
        <div className="stat-card-subtitle">
          <span className={changeClass}>{changeText}</span> vs previous 30 days
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-card-title">Most Active Last 30 Days</div>
        <div className="stat-card-value" style={{ fontSize: '22px' }}>{data.mostActiveDay}</div>
        <div className="stat-card-subtitle">
          {data.mostActiveDayPlayers.map((p, i) => (
            <span key={p.name}>
              {i > 0 && ', '}
              {p.name}: {p.count}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
