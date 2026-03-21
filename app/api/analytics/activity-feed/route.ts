import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ActivityFeedEntry } from '@/lib/analytics.types'

export async function GET() {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseServerClient()

    // Get 10 most recent scores
    const { data, error } = await supabase
      .from('scores')
      .select(`
        score,
        level,
        created_at,
        player_id,
        player:players!scores_player_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Activity feed query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activity feed' },
        { status: 500 }
      )
    }

    // Get unique player IDs from recent scores
    const playerIds = [...new Set((data || []).map(s => s.player_id))]

    // Calculate averages per player by fetching each player's scores individually
    // This avoids the Supabase 1000 row default limit issue
    const playerAverages: Record<string, number> = {}
    for (const playerId of playerIds) {
      const { data: playerScores, error: avgError } = await supabase
        .from('scores')
        .select('score')
        .eq('player_id', playerId)

      if (avgError) {
        console.error('Player average query error for', playerId, avgError)
        continue
      }

      if (playerScores && playerScores.length > 0) {
        const sum = playerScores.reduce((acc, s) => acc + s.score, 0)
        playerAverages[playerId] = Math.round(sum / playerScores.length)
      }
    }

    const entries: ActivityFeedEntry[] = (data || []).map((score) => ({
      playerId: score.player_id,
      playerName: (score.player as { name: string })?.name || 'Unknown',
      score: score.score,
      level: score.level,
      createdAt: score.created_at,
      playerAverage: playerAverages[score.player_id] || 0,
    }))

    return NextResponse.json({ entries }, {
      headers: {
        'Cache-Control': 'private, max-age=30',
      },
    })
  } catch (error) {
    console.error('Activity feed error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    )
  }
}
