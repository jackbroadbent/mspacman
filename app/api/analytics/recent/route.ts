import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { RecentScore } from '@/lib/analytics.types'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20)

    const supabase = createSupabaseServerClient()

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
      .limit(limit)

    if (error) {
      console.error('Recent scores query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recent scores' },
        { status: 500 }
      )
    }

    // Get unique player IDs from recent scores
    const playerIds = [...new Set((data || []).map(s => s.player_id))]

    // Fetch all scores for these players to calculate averages
    const { data: allPlayerScores, error: avgError } = await supabase
      .from('scores')
      .select('player_id, score')
      .in('player_id', playerIds)

    if (avgError) {
      console.error('Player averages query error:', avgError)
    }

    // Calculate averages per player
    const playerAverages: Record<string, number> = {}
    if (allPlayerScores) {
      const playerScores: Record<string, number[]> = {}
      for (const s of allPlayerScores) {
        if (!playerScores[s.player_id]) playerScores[s.player_id] = []
        playerScores[s.player_id].push(s.score)
      }
      for (const [playerId, scores] of Object.entries(playerScores)) {
        playerAverages[playerId] = Math.round(
          scores.reduce((sum, s) => sum + s, 0) / scores.length
        )
      }
    }

    const scores: RecentScore[] = (data || []).map((score) => ({
      playerId: score.player_id,
      playerName: (score.player as { name: string })?.name || 'Unknown',
      score: score.score,
      level: score.level,
      createdAt: score.created_at,
      playerAverage: playerAverages[score.player_id] || 0,
    }))

    return NextResponse.json({ scores }, {
      headers: {
        'Cache-Control': 'private, max-age=30',
      },
    })
  } catch (error) {
    console.error('Recent scores error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent scores' },
      { status: 500 }
    )
  }
}
