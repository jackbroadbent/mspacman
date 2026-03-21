import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ActivityStats } from '@/lib/analytics.types'

export async function GET() {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseServerClient()
    const now = new Date()

    // Use 30-day windows instead of calendar months
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Get games in last 30 days
    const { count: gamesLast30Days } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Get games in previous 30 days (30-60 days ago)
    const { count: gamesPrevious30Days } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString())

    // Calculate percent change
    const thisCount = gamesLast30Days || 0
    const lastCount = gamesPrevious30Days || 0
    const percentChange = lastCount > 0
      ? Math.round(((thisCount - lastCount) / lastCount) * 100)
      : thisCount > 0 ? 100 : 0

    // Get scores from last 30 days to find most active calendar day
    const { data: recentScores } = await supabase
      .from('scores')
      .select('created_at, player_id, player:players!scores_player_id_fkey(name)')
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Count games by calendar date (YYYY-MM-DD)
    const dayCounts: Record<string, number> = {}
    const dayPlayerCounts: Record<string, Record<string, { name: string; count: number }>> = {}

    for (const score of recentScores || []) {
      const dateKey = new Date(score.created_at).toISOString().split('T')[0]
      dayCounts[dateKey] = (dayCounts[dateKey] || 0) + 1

      if (!dayPlayerCounts[dateKey]) {
        dayPlayerCounts[dateKey] = {}
      }
      const playerId = score.player_id
      const playerName = (score.player as { name: string })?.name || 'Unknown'
      if (!dayPlayerCounts[dateKey][playerId]) {
        dayPlayerCounts[dateKey][playerId] = { name: playerName, count: 0 }
      }
      dayPlayerCounts[dateKey][playerId].count++
    }

    // Find most active calendar day
    let mostActiveDate = ''
    let maxCount = 0
    for (const [dateKey, count] of Object.entries(dayCounts)) {
      if (count > maxCount) {
        maxCount = count
        mostActiveDate = dateKey
      }
    }

    // Format the date nicely (e.g., "Dec 15")
    let mostActiveDayFormatted = 'N/A'
    if (mostActiveDate) {
      const date = new Date(mostActiveDate + 'T12:00:00') // Use noon to avoid timezone issues
      mostActiveDayFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    // Get player breakdown for most active day, sorted by count
    const playerBreakdown = Object.values(dayPlayerCounts[mostActiveDate] || {})
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // Top 5 players

    const stats: ActivityStats = {
      gamesThisMonth: thisCount,
      gamesLastMonth: lastCount,
      percentChange,
      mostActiveDay: mostActiveDayFormatted,
      mostActiveDayPlayers: playerBreakdown,
    }

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('Activity stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity stats' },
      { status: 500 }
    )
  }
}
