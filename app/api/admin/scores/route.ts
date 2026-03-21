import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('scores')
      .select(`
        id,
        score,
        level,
        level_fruits,
        features,
        created_at,
        player_id,
        player:players!scores_player_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Admin scores query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scores' },
        { status: 500 }
      )
    }

    const scores = (data || []).map((score) => ({
      id: score.id,
      player_id: score.player_id,
      player_name: (score.player as { name: string })?.name || 'Unknown',
      score: score.score,
      level: score.level,
      level_fruits: score.level_fruits,
      features: score.features || [],
      created_at: score.created_at,
    }))

    return NextResponse.json({ scores })
  } catch (error) {
    console.error('Admin scores error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scores' },
      { status: 500 }
    )
  }
}
