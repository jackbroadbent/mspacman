import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ActivePlayerStats } from '@/lib/analytics.types'

export async function GET() {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseServerClient()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Get all scores with player info
    const { data: allScores, error: scoresError } = await supabase
      .from('scores')
      .select(`
        score,
        created_at,
        player_id,
        player:players!scores_player_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false })

    if (scoresError) {
      console.error('Active players query error:', scoresError)
      return NextResponse.json(
        { error: 'Failed to fetch active players' },
        { status: 500 }
      )
    }

    // Group scores by player
    const playerScores = new Map<string, {
      name: string
      allScores: number[]
      recentScores: number[]
      lastPlayed: string
    }>()

    for (const score of allScores || []) {
      const playerId = score.player_id
      const playerName = (score.player as { name: string })?.name || 'Unknown'
      const isRecent = new Date(score.created_at) >= sixMonthsAgo

      if (!playerScores.has(playerId)) {
        playerScores.set(playerId, {
          name: playerName,
          allScores: [],
          recentScores: [],
          lastPlayed: score.created_at,
        })
      }

      const playerData = playerScores.get(playerId)!
      playerData.allScores.push(score.score)
      if (isRecent) {
        playerData.recentScores.push(score.score)
      }
    }

    // Calculate stats and sort by last played
    const activePlayers: ActivePlayerStats[] = []

    for (const [playerId, data] of playerScores.entries()) {
      if (data.recentScores.length === 0) continue // Skip inactive players

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

    // Sort by last played and take top 5
    activePlayers.sort((a, b) =>
      new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
    )

    return NextResponse.json({
      players: activePlayers.slice(0, 5),
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('Active players error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active players' },
      { status: 500 }
    )
  }
}
