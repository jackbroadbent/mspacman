import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { PlayerStats } from '@/lib/analytics.types'
import { FIXED_LEVELS, FruitKey } from '@/lib/constants'

// Get fruit for a level (fixed for 1-7, needs lookup for 8+)
function getFruitForLevel(level: number): FruitKey | null {
  if (level <= 7) {
    const fixedLevel = FIXED_LEVELS.find(l => l.level === level)
    return fixedLevel?.fruit || null
  }
  return null
}

export async function GET() {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseServerClient()

    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, is_active')
      .eq('is_active', true)

    if (playersError) {
      console.error('Players query error:', playersError)
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
    }

    // Get all scores using pagination (Supabase has a hard 1000 row limit per request)
    let allScores: { id: string; player_id: string; score: number; level: number; created_at: string }[] = []
    let offset = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: pageScores, error: scoresError } = await supabase
        .from('scores')
        .select('id, player_id, score, level, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (scoresError) {
        console.error('Scores query error:', scoresError)
        return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
      }

      if (pageScores && pageScores.length > 0) {
        allScores = allScores.concat(pageScores)
        offset += pageSize
        hasMore = pageScores.length === pageSize
      } else {
        hasMore = false
      }
    }


    // Process each player
    const playerStatsMap: Map<string, {
      playerId: string
      playerName: string
      highScore: number
      highScoreDate: string
      totalScore: number
      totalGames: number
      recentScores: { score: number; level: number; date: string }[]
      levelCounts: Map<number, number>
    }> = new Map()

    // Initialize player data
    for (const player of players || []) {
      playerStatsMap.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        highScore: 0,
        highScoreDate: '',
        totalScore: 0,
        totalGames: 0,
        recentScores: [],
        levelCounts: new Map(),
      })
    }

    // Process scores
    for (const score of allScores || []) {
      const playerData = playerStatsMap.get(score.player_id)
      if (!playerData) continue

      playerData.totalGames++
      playerData.totalScore += score.score

      // Track high score
      if (score.score > playerData.highScore) {
        playerData.highScore = score.score
        playerData.highScoreDate = score.created_at
      }

      // Track recent scores (first 5 since sorted desc by date)
      if (playerData.recentScores.length < 5) {
        playerData.recentScores.push({
          score: score.score,
          level: score.level,
          date: score.created_at,
        })
      }

      // Track level counts for most common death level
      const count = playerData.levelCounts.get(score.level) || 0
      playerData.levelCounts.set(score.level, count + 1)
    }

    // Calculate final stats for each player
    const playerStats: PlayerStats[] = []

    for (const [, data] of playerStatsMap) {
      if (data.totalGames === 0) continue

      const averageScore = Math.round(data.totalScore / data.totalGames)

      // Calculate 50-game moving average (or all games if less than 50)
      const playerScores = (allScores || [])
        .filter(s => s.player_id === data.playerId)
        .slice(0, 50)

      const movingAverage50 = playerScores.length > 0
        ? Math.round(playerScores.reduce((sum, s) => sum + s.score, 0) / playerScores.length)
        : 0

      // Calculate trend (last 5 vs 50-game avg)
      const last5Scores = data.recentScores.slice(0, 5)
      const last5Avg = last5Scores.length > 0
        ? last5Scores.reduce((sum, s) => sum + s.score, 0) / last5Scores.length
        : 0

      const trendPercentage = movingAverage50 > 0
        ? Math.round(((last5Avg - movingAverage50) / movingAverage50) * 1000) / 10
        : 0

      // Find most common death level
      let mostCommonLevel = 1
      let maxLevelCount = 0
      for (const [level, count] of data.levelCounts) {
        if (count > maxLevelCount) {
          maxLevelCount = count
          mostCommonLevel = level
        }
      }

      // Get fruit for most common death level
      const mostCommonDeathFruit = getFruitForLevel(mostCommonLevel) || 'cherry'

      // Calculate delta from avg for recent games
      const recentGames = data.recentScores.map(s => ({
        ...s,
        deltaFromAvg: movingAverage50 > 0
          ? Math.round(((s.score - movingAverage50) / movingAverage50) * 1000) / 10
          : 0,
      }))

      playerStats.push({
        playerId: data.playerId,
        playerName: data.playerName,
        rank: 0, // Will be set after sorting
        highScore: data.highScore,
        highScoreDate: data.highScoreDate,
        averageScore,
        totalGames: data.totalGames,
        movingAverage50,
        recentGames,
        trendPercentage,
        mostCommonDeathFruit,
      })
    }

    // Sort by high score descending and assign ranks
    playerStats.sort((a, b) => b.highScore - a.highScore)
    playerStats.forEach((p, i) => {
      p.rank = i + 1
    })

    return NextResponse.json({ players: playerStats }, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('Player stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch player stats' }, { status: 500 })
  }
}
