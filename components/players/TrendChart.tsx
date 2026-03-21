'use client'

interface TrendChartProps {
  recentGames: {
    score: number
    level: number
    date: string
    deltaFromAvg: number
  }[]
  movingAverage50: number
  trendPercentage: number
}

export function TrendChart({ recentGames, movingAverage50, trendPercentage }: TrendChartProps) {
  if (recentGames.length === 0) {
    return (
      <div className="trend-chart">
        <div className="trend-chart-title">TREND (50-GAME AVG)</div>
        <div className="trend-chart-empty">No games yet</div>
      </div>
    )
  }

  // Calculate max deviation from average for scaling
  const deviations = recentGames.slice(0, 5).map(g => g.score - movingAverage50)
  const maxDeviation = Math.max(...deviations.map(d => Math.abs(d)), 1)

  const isPositiveTrend = trendPercentage >= 0

  return (
    <div className="trend-chart">
      <div className="trend-chart-title">TREND (50-GAME AVG)</div>
      <div className="trend-chart-avg-label">
        {movingAverage50.toLocaleString()} avg
      </div>

      <div className="trend-chart-container">
        {/* Average line - centered at 50% */}
        <div className="trend-chart-avg-line" />

        {/* Bars - diverging from center */}
        <div className="trend-chart-bars">
          {recentGames.slice(0, 5).reverse().map((game, index) => {
            const deviation = game.score - movingAverage50
            const isAboveAvg = deviation >= 0
            // Bar height as percentage of half the container (max 50%)
            const barHeight = Math.min((Math.abs(deviation) / maxDeviation) * 45, 45)

            return (
              <div key={index} className="trend-chart-bar-container">
                <div
                  className={`trend-chart-bar ${isAboveAvg ? 'above-avg' : 'below-avg'}`}
                  style={{
                    height: `${barHeight}%`,
                    [isAboveAvg ? 'bottom' : 'top']: '50%',
                  }}
                />
                <div className={`trend-chart-arrow ${isAboveAvg ? 'up' : 'down'}`}>
                  {isAboveAvg ? '↑' : '↓'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={`trend-chart-summary ${isPositiveTrend ? 'positive' : 'negative'}`}>
        Trending {isPositiveTrend ? '↑' : '↓'} {isPositiveTrend ? '+' : ''}{trendPercentage.toFixed(1)}%
      </div>
    </div>
  )
}
