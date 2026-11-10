import { NextResponse } from 'next/server'
import { getScores } from '@/lib/sheets-db'
import { requireAuth } from '@/lib/api-auth'
import { AnalyticsSummary } from '@/lib/analytics.types'

export async function GET() {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  try {
    const scores = await getScores()
    const top = scores.reduce<(typeof scores)[number] | null>(
      (best, s) => (!best || s.score > best.score ? s : best),
      null
    )

    const summary: AnalyticsSummary = {
      highScore: top
        ? { score: top.score, playerName: top.playerName, date: top.createdAt }
        : { score: 0, playerName: 'N/A', date: new Date().toISOString() },
      totalGames: scores.length,
    }

    return NextResponse.json(summary, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  } catch (error) {
    console.error('Analytics summary error:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
