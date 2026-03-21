'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
} from 'recharts'
import { RollingAverageDataPoint } from '@/lib/analytics.types'
import { ChartSkeleton } from './ChartSkeleton'

// Player colors
const PLAYER_COLORS: Record<string, string> = {
  SMB: '#FFD700', // Yellow (primary)
  HSG: '#FF69B4', // Pink (secondary)
  JMB: '#87CEEB', // Light blue
}

interface ChartDataPoint {
  gameNumber: number
  [playerName: string]: number
}

interface ZoomDomain {
  startIndex: number
  endIndex: number
}

interface TouchState {
  type: 'none' | 'pan' | 'pinch'
  startX: number
  startDistance: number
  startDomain: ZoomDomain
}

// Calculate distance between two touch points
function getTouchDistance(touches: React.TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

// Get center X of two touch points
function getTouchCenterX(touches: React.TouchList): number {
  return (touches[0].clientX + touches[1].clientX) / 2
}

export function RollingAverageChart() {
  const [data, setData] = useState<RollingAverageDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const touchStateRef = useRef<TouchState>({ type: 'none', startX: 0, startDistance: 0, startDomain: { startIndex: 0, endIndex: 0 } })

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    async function fetchData() {
      try {
        const response = await fetch('/api/analytics/rolling-average')
        if (!response.ok) throw new Error('Failed to fetch')
        const result = await response.json()
        setData(result.data)
      } catch (err) {
        setError('Failed to load chart')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isVisible])

  // Handle fullscreen mode - lock body scroll, handle escape key, and track viewport size
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
      setViewportHeight(window.innerHeight)

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsFullscreen(false)
          setZoomDomain(null)
        }
      }
      const handleResize = () => {
        setViewportHeight(window.innerHeight)
      }

      window.addEventListener('keydown', handleEscape)
      window.addEventListener('resize', handleResize)
      window.addEventListener('orientationchange', handleResize)

      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleEscape)
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('orientationchange', handleResize)
      }
    }
  }, [isFullscreen])

  const openFullscreen = useCallback(() => {
    if (!loading && !error && data.length > 0) {
      setIsFullscreen(true)
      setZoomDomain(null) // Reset zoom when opening
    }
  }, [loading, error, data.length])

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false)
    setZoomDomain(null) // Reset zoom when closing
  }, [])

  // Transform data for Recharts
  const chartData: ChartDataPoint[] = []
  const players = new Set<string>()

  for (const point of data) {
    players.add(point.playerName)
  }

  // Group by game number
  const byGameNumber = new Map<number, Record<string, number>>()
  for (const point of data) {
    if (!byGameNumber.has(point.gameNumber)) {
      byGameNumber.set(point.gameNumber, {})
    }
    byGameNumber.get(point.gameNumber)![point.playerName] = point.rollingAvg
  }

  // Create chart data
  const sortedGameNumbers = Array.from(byGameNumber.keys()).sort((a, b) => a - b)
  for (const gameNumber of sortedGameNumbers) {
    chartData.push({
      gameNumber,
      ...byGameNumber.get(gameNumber),
    })
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}k`
    }
    return num.toString()
  }

  // Get the visible data based on zoom
  const getVisibleData = useCallback(() => {
    if (!zoomDomain || chartData.length === 0) return chartData
    const start = Math.max(0, zoomDomain.startIndex)
    const end = Math.min(chartData.length, zoomDomain.endIndex)
    return chartData.slice(start, end)
  }, [zoomDomain, chartData])

  const visibleData = getVisibleData()
  const isZoomed = zoomDomain !== null && (zoomDomain.endIndex - zoomDomain.startIndex) < chartData.length

  // Touch handlers for pinch-to-zoom and pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (chartData.length === 0) return

    const currentDomain = zoomDomain || { startIndex: 0, endIndex: chartData.length }

    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault()
      touchStateRef.current = {
        type: 'pinch',
        startX: getTouchCenterX(e.touches),
        startDistance: getTouchDistance(e.touches),
        startDomain: currentDomain,
      }
    } else if (e.touches.length === 1) {
      // Pan start
      touchStateRef.current = {
        type: 'pan',
        startX: e.touches[0].clientX,
        startDistance: 0,
        startDomain: currentDomain,
      }
    }
  }, [chartData.length, zoomDomain])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (chartData.length === 0) return
    const state = touchStateRef.current
    const containerWidth = chartContainerRef.current?.offsetWidth || 1

    if (state.type === 'pinch' && e.touches.length === 2) {
      e.preventDefault()
      const currentDistance = getTouchDistance(e.touches)
      const scale = currentDistance / state.startDistance
      const currentCenterX = getTouchCenterX(e.touches)

      // Calculate the domain range
      const originalRange = state.startDomain.endIndex - state.startDomain.startIndex
      const newRange = Math.max(10, Math.min(chartData.length, originalRange / scale))

      // Calculate center point as fraction of container width
      const centerFraction = currentCenterX / containerWidth
      // Map to data index
      const centerIndex = state.startDomain.startIndex + centerFraction * originalRange

      // Pan adjustment based on finger movement
      const panDelta = (state.startX - currentCenterX) / containerWidth * originalRange

      // Calculate new domain centered on pinch point
      let newStart = centerIndex - (centerFraction * newRange) + panDelta
      let newEnd = newStart + newRange

      // Clamp to valid range
      if (newStart < 0) {
        newStart = 0
        newEnd = newRange
      }
      if (newEnd > chartData.length) {
        newEnd = chartData.length
        newStart = Math.max(0, chartData.length - newRange)
      }

      setZoomDomain({
        startIndex: Math.round(newStart),
        endIndex: Math.round(newEnd),
      })
    } else if (state.type === 'pan' && e.touches.length === 1 && isZoomed) {
      // Only allow pan when zoomed in
      const deltaX = state.startX - e.touches[0].clientX
      const domainRange = state.startDomain.endIndex - state.startDomain.startIndex
      const panAmount = (deltaX / containerWidth) * domainRange

      let newStart = state.startDomain.startIndex + panAmount
      let newEnd = state.startDomain.endIndex + panAmount

      // Clamp to valid range
      if (newStart < 0) {
        newEnd -= newStart
        newStart = 0
      }
      if (newEnd > chartData.length) {
        newStart -= (newEnd - chartData.length)
        newEnd = chartData.length
      }
      newStart = Math.max(0, newStart)

      setZoomDomain({
        startIndex: Math.round(newStart),
        endIndex: Math.round(newEnd),
      })
    }
  }, [chartData.length, isZoomed])

  const handleTouchEnd = useCallback(() => {
    touchStateRef.current = { type: 'none', startX: 0, startDistance: 0, startDomain: { startIndex: 0, endIndex: 0 } }
  }, [])

  const resetZoom = useCallback(() => {
    setZoomDomain(null)
  }, [])

  const renderChart = (height: number, isFullscreenMode: boolean) => {
    const dataToRender = isFullscreenMode ? visibleData : chartData

    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={dataToRender} margin={{ top: 5, right: isFullscreenMode ? 20 : 10, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="gameNumber"
            tick={{ fill: '#a0a0b0', fontSize: isFullscreenMode ? 12 : 11 }}
            tickLine={{ stroke: '#404060' }}
            axisLine={{ stroke: '#404060' }}
            tickFormatter={(value) => `#${value}`}
          />
          <YAxis
            tick={{ fill: '#a0a0b0', fontSize: isFullscreenMode ? 12 : 11 }}
            tickLine={{ stroke: '#404060' }}
            axisLine={{ stroke: '#404060' }}
            tickFormatter={formatNumber}
            width={isFullscreenMode ? 55 : 45}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#2d2d4a',
              border: '1px solid #404060',
              borderRadius: '8px',
              color: '#ffffff',
            }}
            formatter={(value) => [Number(value).toLocaleString(), '']}
            labelFormatter={(label) => `Game #${label}`}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => <span style={{ color: '#a0a0b0', fontSize: isFullscreenMode ? '14px' : '12px' }}>{value}</span>}
          />
          {Array.from(players).map((playerName) => (
            <Line
              key={playerName}
              type="monotone"
              dataKey={playerName}
              stroke={PLAYER_COLORS[playerName] || '#888888'}
              strokeWidth={isFullscreenMode ? 3 : 2}
              dot={false}
              name={playerName}
              animationDuration={isFullscreenMode ? 0 : 300}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`chart-container ${data.length > 0 && !loading && !error ? 'chart-tappable' : ''}`}
        onClick={openFullscreen}
      >
        <div className="chart-title">
          50-Game Rolling Average
          {data.length > 0 && !loading && !error && (
            <span className="chart-expand-hint">Tap to expand</span>
          )}
        </div>
        {!isVisible || loading ? (
          <ChartSkeleton height={250} />
        ) : error ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>
            Not enough data (need 50+ games per player)
          </div>
        ) : (
          renderChart(250, false)
        )}
      </div>

      {isFullscreen && (
        <div className="chart-fullscreen-overlay" onClick={closeFullscreen}>
          <div className="chart-fullscreen-container" onClick={(e) => e.stopPropagation()}>
            <div className="chart-fullscreen-header">
              <div className="chart-fullscreen-title">50-Game Rolling Average</div>
              <div className="chart-fullscreen-actions">
                {isZoomed && (
                  <button
                    className="chart-reset-zoom"
                    onClick={resetZoom}
                    aria-label="Reset zoom"
                  >
                    Reset
                  </button>
                )}
                <button
                  className="chart-fullscreen-close"
                  onClick={closeFullscreen}
                  aria-label="Close fullscreen"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="chart-fullscreen-hint">
              {isZoomed ? 'Pinch to zoom • Drag to pan' : 'Pinch to zoom in'}
            </div>
            <div
              ref={chartContainerRef}
              className="chart-fullscreen-content"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none' }}
            >
              {renderChart(Math.max(viewportHeight * 0.7, 300), true)}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
