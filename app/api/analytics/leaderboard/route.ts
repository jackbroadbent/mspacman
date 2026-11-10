import { NextResponse } from 'next/server'
import { getScores } from '@/lib/sheets-db'
import { requireAuth } from '@/lib/api-auth'
import { LeaderboardEntry } from '@/lib/analytics.types'

export async function GET(request: Request) {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    const sorted = [...(await getScores())].sort((a, b) => b.score - a.score)
    const page = sorted.slice(offset, offset + limit)

    const entries: LeaderboardEntry[] = page.map((s, index) => ({
      rank: offset + index + 1,
      playerId: s.playerId,
      playerName: s.playerName,
      score: s.score,
      level: s.level,
      createdAt: s.createdAt,
    }))

    return NextResponse.json({
      entries,
      hasMore: offset + limit < sorted.length,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
