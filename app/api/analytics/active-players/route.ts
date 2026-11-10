import { NextResponse } from 'next/server'
import { getScores } from '@/lib/sheets-db'
import { requireAuth } from '@/lib/api-auth'
import { ActivePlayerStats } from '@/lib/analytics.types'

export async function GET() {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Group scores by player (scores are newest first, so the first seen is last played)
    const playerScores = new Map<string, {
      name: string
      allScores: number[]
      recentScores: number[]
      lastPlayed: string
    }>()

    for (const s of await getScores()) {
      let data = playerScores.get(s.playerId)
      if (!data) {
        data = { name: s.playerName, allScores: [], recentScores: [], lastPlayed: s.createdAt }
        playerScores.set(s.playerId, data)
      }
      data.allScores.push(s.score)
      if (new Date(s.createdAt) >= sixMonthsAgo) data.recentScores.push(s.score)
    }

    const activePlayers: ActivePlayerStats[] = []

    for (const [playerId, data] of playerScores.entries()) {
      if (data.recentScores.length === 0) continue

      const overallAvg = data.allScores.reduce((a, b) => a + b, 0) / data.allScores.length
      const recentAvg = data.recentScores.reduce((a, b) => a + b, 0) / data.recentScores.length
      const bestRecent = Math.max(...data.recentScores)

      let trend: 'up' | 'down' | 'same' = 'same'
      const diff = recentAvg - overallAvg
      if (diff > overallAvg * 0.05) trend = 'up'
      else if (diff < -overallAvg * 0.05) trend = 'down'

      activePlayers.push({
        playerId,
        playerName: data.name,
        gamesLast6Months: data.recentScores.length,
        bestScoreLast6Months: bestRecent,
        avgScoreLast6Months: Math.round(recentAvg),
        overallAvgScore: Math.round(overallAvg),
        trend,
        lastPlayedAt: data.lastPlayed,
      })
    }

    activePlayers.sort((a, b) =>
      new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
    )

    return NextResponse.json({ players: activePlayers.slice(0, 5) }, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  } catch (error) {
    console.error('Active players error:', error)
    return NextResponse.json({ error: 'Failed to fetch active players' }, { status: 500 })
  }
}
