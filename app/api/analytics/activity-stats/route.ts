import { NextResponse } from 'next/server'
import { getScores } from '@/lib/sheets-db'
import { requireAuth } from '@/lib/api-auth'
import { ActivityStats } from '@/lib/analytics.types'

export async function GET() {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  try {
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000

    let thisCount = 0
    let lastCount = 0
    const dayCounts: Record<string, number> = {}
    const dayPlayerCounts: Record<string, Record<string, { name: string; count: number }>> = {}

    for (const s of await getScores()) {
      const t = new Date(s.createdAt).getTime()
      if (t >= thirtyDaysAgo) {
        thisCount++
        const dateKey = s.createdAt.split('T')[0]
        dayCounts[dateKey] = (dayCounts[dateKey] || 0) + 1
        const players = (dayPlayerCounts[dateKey] ??= {})
        players[s.playerId] ??= { name: s.playerName, count: 0 }
        players[s.playerId].count++
      } else if (t >= sixtyDaysAgo) {
        lastCount++
      }
    }

    const percentChange = lastCount > 0
      ? Math.round(((thisCount - lastCount) / lastCount) * 100)
      : thisCount > 0 ? 100 : 0

    let mostActiveDate = ''
    let maxCount = 0
    for (const [dateKey, count] of Object.entries(dayCounts)) {
      if (count > maxCount) {
        maxCount = count
        mostActiveDate = dateKey
      }
    }

    let mostActiveDayFormatted = 'N/A'
    if (mostActiveDate) {
      const date = new Date(mostActiveDate + 'T12:00:00') // noon avoids timezone rollover
      mostActiveDayFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const playerBreakdown = Object.values(dayPlayerCounts[mostActiveDate] || {})
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const stats: ActivityStats = {
      gamesThisMonth: thisCount,
      gamesLastMonth: lastCount,
      percentChange,
      mostActiveDay: mostActiveDayFormatted,
      mostActiveDayPlayers: playerBreakdown,
    }

    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  } catch (error) {
    console.error('Activity stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity stats' }, { status: 500 })
  }
}
