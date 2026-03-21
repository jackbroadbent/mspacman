import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { LeaderboardEntry } from '@/lib/analytics.types'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('scores')
      .select(`
        id,
        score,
        level,
        created_at,
        player_id,
        player:players!scores_player_id_fkey(id, name)
      `)
      .order('score', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Leaderboard query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      )
    }

    const entries: LeaderboardEntry[] = (data || []).map((score, index) => ({
      rank: offset + index + 1,
      playerId: score.player_id,
      playerName: (score.player as { name: string })?.name || 'Unknown',
      score: score.score,
      level: score.level,
      createdAt: score.created_at,
    }))

    return NextResponse.json({
      entries,
      hasMore: data?.length === limit,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
