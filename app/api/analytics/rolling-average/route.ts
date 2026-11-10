import { NextResponse } from 'next/server'
import { getScores } from '@/lib/sheets-db'
import { requireAuth } from '@/lib/api-auth'
import { RollingAverageDataPoint } from '@/lib/analytics.types'

const TRACKED_PLAYERS = ['SMB', 'HSG', 'JMB']
const ROLLING_WINDOW = 50

export async function GET() {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  try {
    // Oldest first, ties in sheet order
    const ascending = [...(await getScores())].reverse()
    const dataPoints: RollingAverageDataPoint[] = []

    for (const playerId of TRACKED_PLAYERS) {
      const scores = ascending.filter(s => s.playerId === playerId)
      if (scores.length < ROLLING_WINDOW) continue

      let sum = 0
      for (let i = 0; i < scores.length; i++) {
        sum += scores[i].score
        if (i >= ROLLING_WINDOW) sum -= scores[i - ROLLING_WINDOW].score
        if (i < ROLLING_WINDOW - 1) continue
        dataPoints.push({
          gameNumber: i + 1,
          playerId,
          playerName: scores[i].playerName,
          rollingAvg: Math.round(sum / ROLLING_WINDOW),
        })
      }
    }

    return NextResponse.json({ data: dataPoints }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    })
  } catch (error) {
    console.error('Rolling average error:', error)
    return NextResponse.json({ error: 'Failed to fetch rolling average' }, { status: 500 })
  }
}
