import { NextResponse } from 'next/server'
import { getScores } from '@/lib/sheets-db'
import { requireAuth } from '@/lib/api-auth'
import { playerAverages } from '@/lib/score-stats'
import { ActivityFeedEntry } from '@/lib/analytics.types'

export async function GET() {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  try {
    const all = await getScores()
    const averages = playerAverages(all)

    const entries: ActivityFeedEntry[] = all.slice(0, 10).map(s => ({
      playerId: s.playerId,
      playerName: s.playerName,
      score: s.score,
      level: s.level,
      createdAt: s.createdAt,
      playerAverage: averages[s.playerId] || 0,
    }))

    return NextResponse.json({ entries }, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    })
  } catch (error) {
    console.error('Activity feed error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 })
  }
}
