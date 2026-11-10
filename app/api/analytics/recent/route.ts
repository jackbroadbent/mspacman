import { NextResponse } from 'next/server'
import { getScores } from '@/lib/sheets-db'
import { requireAuth } from '@/lib/api-auth'
import { playerAverages } from '@/lib/score-stats'
import { RecentScore } from '@/lib/analytics.types'

export async function GET(request: Request) {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20)

    const all = await getScores()
    const averages = playerAverages(all)

    const scores: RecentScore[] = all.slice(0, limit).map(s => ({
      playerId: s.playerId,
      playerName: s.playerName,
      score: s.score,
      level: s.level,
      createdAt: s.createdAt,
      playerAverage: averages[s.playerId] || 0,
    }))

    return NextResponse.json({ scores }, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    })
  } catch (error) {
    console.error('Recent scores error:', error)
    return NextResponse.json({ error: 'Failed to fetch recent scores' }, { status: 500 })
  }
}
