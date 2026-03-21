'use client'

import { useEffect, useState, useCallback } from 'react'
import { ActivityHeatmapMonth, ActivityHeatmapDay } from '@/lib/analytics.types'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface HeatmapDetail {
  days: ActivityHeatmapDay[]
  daysInMonth: number
  firstDayOfWeek: number
  year: number
  month: number
}

export function ActivityHeatmap() {
  const [months, setMonths] = useState<ActivityHeatmapMonth[]>([])
  const [maxCount, setMaxCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedMonth, setExpandedMonth] = useState<{ year: number; month: number } | null>(null)
  const [detail, setDetail] = useState<HeatmapDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showAllYears, setShowAllYears] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics/activity-heatmap')
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setMonths(data.months)
        setMaxCount(data.maxCount)
      } catch (err) {
        setError('Failed to load heatmap')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const fetchDetail = useCallback(async (year: number, month: number) => {
    setLoadingDetail(true)
    try {
      const response = await fetch(`/api/analytics/activity-heatmap-detail?year=${year}&month=${month}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setDetail(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const handleMonthClick = useCallback((year: number, month: number) => {
    if (expandedMonth?.year === year && expandedMonth?.month === month) {
      setExpandedMonth(null)
      setDetail(null)
    } else {
      setExpandedMonth({ year, month })
      fetchDetail(year, month)
    }
  }, [expandedMonth, fetchDetail])

  const getMonthColor = (count: number): string => {
    if (count === 0) return 'var(--background)'
    const ratio = count / maxCount
    // Interpolate: light yellow (255,255,180) → orange → dark red (139,0,0)
    const r = Math.round(255 - 116 * ratio)  // 255 → 139
    const g = Math.round(255 - 255 * ratio)  // 255 → 0
    const b = Math.round(180 - 180 * ratio)  // 180 → 0
    return `rgb(${r}, ${g}, ${b})`
  }

  const getDayColor = (count: number, maxDayCount: number): string => {
    if (count === 0) return 'var(--background)'
    const ratio = count / Math.max(maxDayCount, 1)
    // Interpolate: light yellow (255,255,180) → orange → dark red (139,0,0)
    const r = Math.round(255 - 116 * ratio)  // 255 → 139
    const g = Math.round(255 - 255 * ratio)  // 255 → 0
    const b = Math.round(180 - 180 * ratio)  // 180 → 0
    return `rgb(${r}, ${g}, ${b})`
  }

  if (loading) {
    return (
      <div className="section">
        <div className="section-title">Activity Heatmap</div>
        <div className="chart-skeleton" style={{ height: '150px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="section">
        <div className="section-title">Activity Heatmap</div>
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-md)' }}>
          {error}
        </div>
      </div>
    )
  }

  // Group months by year
  const monthsByYear: Record<number, ActivityHeatmapMonth[]> = {}
  const monthLookup: Record<string, number> = {}

  for (const m of months) {
    if (!monthsByYear[m.year]) monthsByYear[m.year] = []
    monthsByYear[m.year].push(m)
    monthLookup[`${m.year}-${m.month}`] = m.count
  }

  const allYears = Object.keys(monthsByYear).map(Number).sort((a, b) => b - a) // descending
  const currentYear = 2025
  const displayYears = showAllYears ? allYears : allYears.filter(y => y === currentYear)

  // For daily view, find max count
  const maxDayCount = detail ? Math.max(...detail.days.map(d => d.count), 1) : 1

  return (
    <div className="section">
      <div className="section-title">Activity Heatmap</div>
      <div className="heatmap-container">
        {displayYears.map(year => (
          <div key={year} className="heatmap-year">
            <div className="heatmap-year-label">{year}</div>
            <div className="heatmap-months">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                const count = monthLookup[`${year}-${month}`] || 0
                const isExpanded = expandedMonth?.year === year && expandedMonth?.month === month
                return (
                  <button
                    key={month}
                    className={`heatmap-month ${isExpanded ? 'expanded' : ''}`}
                    style={{ backgroundColor: getMonthColor(count) }}
                    onClick={() => handleMonthClick(year, month)}
                    title={`${MONTH_NAMES[month - 1]} ${year}: ${count} games`}
                  >
                    <span className="heatmap-month-label">{MONTH_NAMES[month - 1]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {allYears.length > 1 && (
        <button
          className="see-more-button"
          onClick={() => setShowAllYears(!showAllYears)}
        >
          {showAllYears ? 'Show less' : 'See more'}
        </button>
      )}

      {expandedMonth && (
        <div className="heatmap-detail">
          <div className="heatmap-detail-header">
            {MONTH_NAMES[expandedMonth.month - 1]} {expandedMonth.year}
          </div>
          {loadingDetail ? (
            <div className="chart-skeleton" style={{ height: '120px' }} />
          ) : detail ? (
            <>
              <div className="heatmap-day-labels">
                {DAY_NAMES.map(day => (
                  <div key={day} className="heatmap-day-label">{day}</div>
                ))}
              </div>
              <div className="heatmap-days">
                {/* Empty cells for offset */}
                {Array.from({ length: detail.firstDayOfWeek }, (_, i) => (
                  <div key={`empty-${i}`} className="heatmap-day empty" />
                ))}
                {/* Day cells */}
                {detail.days.map(day => (
                  <div
                    key={day.day}
                    className="heatmap-day"
                    style={{ backgroundColor: getDayColor(day.count, maxDayCount) }}
                    title={`${MONTH_NAMES[detail.month - 1]} ${day.day}: ${day.count} games`}
                  >
                    <span className="heatmap-day-num">{day.day}</span>
                    {day.count > 0 && <span className="heatmap-day-count">{day.count}</span>}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
