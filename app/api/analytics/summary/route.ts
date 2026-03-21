import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { AnalyticsSummary } from '@/lib/analytics.types'

export async function GET() {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseServerClient()

    // Get total games count
    const { count: totalGames } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })

    // Get high score with player info
    const { data: highScoreData } = await supabase
      .from('scores')
      .select(`
        score,
        created_at,
        player:players!scores_player_id_fkey(name)
      `)
      .order('score', { ascending: false })
      .limit(1)
      .single()

    const summary: AnalyticsSummary = {
      highScore: highScoreData ? {
        score: highScoreData.score,
        playerName: (highScoreData.player as { name: string })?.name || 'Unknown',
        date: highScoreData.created_at,
      } : {
        score: 0,
        playerName: 'N/A',
        date: new Date().toISOString(),
      },
      totalGames: totalGames || 0,
    }

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('Analytics summary error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    )
  }
}
