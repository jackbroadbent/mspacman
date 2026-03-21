import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { PlayerFullStats } from '@/lib/analytics.types'
import { FIXED_LEVELS, FruitKey } from '@/lib/constants'

function getFruitForLevel(level: number): FruitKey | null {
  if (level <= 7) {
    const fixedLevel = FIXED_LEVELS.find(l => l.level === level)
    return fixedLevel?.fruit || null
  }
  return null
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')

    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Get player info
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, name')
      .eq('id', playerId)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Get all scores for this player
    const { data: scores, error: scoresError } = await supabase
      .from('scores')
      .select('id, score, level, created_at')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })

    if (scoresError) {
      console.error('Scores query error:', scoresError)
      return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
    }

    const allScores = scores || []
    if (allScores.length === 0) {
      return NextResponse.json({ error: 'No scores found for player' }, { status: 404 })
    }

    // Get rank by high score
    const { data: rankData } = await supabase
      .from('scores')
      .select('player_id, score')
      .order('score', { ascending: false })

    // Find unique players and their best scores
    const playerBestScores = new Map<string, number>()
    for (const score of rankData || []) {
      if (!playerBestScores.has(score.player_id) || score.score > playerBestScores.get(score.player_id)!) {
        playerBestScores.set(score.player_id, score.score)
      }
    }

    // Sort and find rank
    const sortedPlayers = [...playerBestScores.entries()].sort((a, b) => b[1] - a[1])
    const rank = sortedPlayers.findIndex(([id]) => id === playerId) + 1

    // Calculate basic stats
    const totalGames = allScores.length
    const totalScore = allScores.reduce((sum, s) => sum + s.score, 0)
    const averageScore = Math.round(totalScore / totalGames)

    // High score
    const sortedByScore = [...allScores].sort((a, b) => b.score - a.score)
    const highScore = sortedByScore[0].score
    const highScoreDate = sortedByScore[0].created_at

    // 50-game moving average
    const recentScores = allScores.slice(0, 50)
    const movingAverage50 = Math.round(
      recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length
    )

    // Recent games with delta
    const recentGames = allScores.slice(0, 5).map(s => ({
      score: s.score,
      level: s.level,
      date: s.created_at,
      deltaFromAvg: movingAverage50 > 0
        ? Math.round(((s.score - movingAverage50) / movingAverage50) * 1000) / 10
        : 0,
    }))

    // Trend percentage
    const last5Avg = recentGames.length > 0
      ? recentGames.reduce((sum, g) => sum + g.score, 0) / recentGames.length
      : 0
    const trendPercentage = movingAverage50 > 0
      ? Math.round(((last5Avg - movingAverage50) / movingAverage50) * 1000) / 10
      : 0

    // Most common death fruit
    const levelCounts = new Map<number, number>()
    for (const score of allScores) {
      const count = levelCounts.get(score.level) || 0
      levelCounts.set(score.level, count + 1)
    }
    let mostCommonLevel = 1
    let maxLevelCount = 0
    for (const [level, count] of levelCounts) {
      if (count > maxLevelCount) {
        maxLevelCount = count
        mostCommonLevel = level
      }
    }
    const mostCommonDeathFruit = getFruitForLevel(mostCommonLevel) || 'cherry'

    // Yearly stats
    const yearlyData = new Map<number, { scores: number[]; levels: number[]; highScore: number; highScoreDate: string }>()
    for (const score of allScores) {
      const year = new Date(score.created_at).getFullYear()
      if (!yearlyData.has(year)) {
        yearlyData.set(year, { scores: [], levels: [], highScore: 0, highScoreDate: '' })
      }
      const yearData = yearlyData.get(year)!
      yearData.scores.push(score.score)
      yearData.levels.push(score.level)
      if (score.score > yearData.highScore) {
        yearData.highScore = score.score
        yearData.highScoreDate = score.created_at
      }
    }

    const yearlyStats = [...yearlyData.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, data]) => ({
        year,
        gamesPlayed: data.scores.length,
        averageScore: Math.round(data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length),
        highScore: data.highScore,
        highScoreDate: data.highScoreDate,
      }))

    // Best level and average level
    const bestLevel = Math.max(...allScores.map(s => s.level))
    const avgLevelReached = Math.round(
      (allScores.reduce((sum, s) => sum + s.level, 0) / totalGames) * 10
    ) / 10

    // Games this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const gamesThisMonth = allScores.filter(s => new Date(s.created_at) >= startOfMonth).length

    // Longest session (most games in one day)
    const dayGames = new Map<string, number>()
    for (const score of allScores) {
      const day = score.created_at.split('T')[0]
      dayGames.set(day, (dayGames.get(day) || 0) + 1)
    }
    let longestSessionDate = ''
    let longestSessionCount = 0
    for (const [day, count] of dayGames) {
      if (count > longestSessionCount) {
        longestSessionCount = count
        longestSessionDate = day
      }
    }
    const longestSession = {
      date: longestSessionDate,
      gamesPlayed: longestSessionCount,
    }

    // Hot and cold streaks
    // Sort by date ascending for streak analysis
    const sortedByDate = [...allScores].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    let longestHotStreak = { startDate: '', endDate: '', gamesCount: 0 }
    let longestColdStreak = { startDate: '', endDate: '', gamesCount: 0 }
    let currentHotStreak = { startDate: '', endDate: '', gamesCount: 0 }
    let currentColdStreak = { startDate: '', endDate: '', gamesCount: 0 }

    for (const score of sortedByDate) {
      const isAboveAvg = score.score >= movingAverage50

      if (isAboveAvg) {
        // Hot streak
        if (currentHotStreak.gamesCount === 0) {
          currentHotStreak.startDate = score.created_at
        }
        currentHotStreak.endDate = score.created_at
        currentHotStreak.gamesCount++

        // End cold streak
        if (currentColdStreak.gamesCount > longestColdStreak.gamesCount) {
          longestColdStreak = { ...currentColdStreak }
        }
        currentColdStreak = { startDate: '', endDate: '', gamesCount: 0 }
      } else {
        // Cold streak
        if (currentColdStreak.gamesCount === 0) {
          currentColdStreak.startDate = score.created_at
        }
        currentColdStreak.endDate = score.created_at
        currentColdStreak.gamesCount++

        // End hot streak
        if (currentHotStreak.gamesCount > longestHotStreak.gamesCount) {
          longestHotStreak = { ...currentHotStreak }
        }
        currentHotStreak = { startDate: '', endDate: '', gamesCount: 0 }
      }
    }

    // Check final streaks
    if (currentHotStreak.gamesCount > longestHotStreak.gamesCount) {
      longestHotStreak = { ...currentHotStreak }
    }
    if (currentColdStreak.gamesCount > longestColdStreak.gamesCount) {
      longestColdStreak = { ...currentColdStreak }
    }

    // All games for expanded list
    const allGames = allScores.map(s => ({
      score: s.score,
      level: s.level,
      date: s.created_at,
    }))

    const stats: PlayerFullStats = {
      playerId: player.id,
      playerName: player.name,
      rank,
      highScore,
      highScoreDate,
      averageScore,
      totalGames,
      movingAverage50,
      recentGames,
      trendPercentage,
      mostCommonDeathFruit,
      yearlyStats,
      bestLevel,
      avgLevelReached,
      gamesThisMonth,
      longestSession,
      longestHotStreak,
      longestColdStreak,
      allGames,
    }

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('Player full stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch player stats' }, { status: 500 })
  }
}
