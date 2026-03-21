import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { RollingAverageDataPoint } from '@/lib/analytics.types'

// Hardcoded player IDs for SMB, HSG, JMB
const TRACKED_PLAYERS = [
  { id: '8f6c5b3a-2e1d-4f9a-b8c7-1a2b3c4d5e6f', name: 'SMB' },
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'HSG' },
  { id: '529dd0be-df3a-4135-a86d-dd8ede641eb8', name: 'JMB' },
]

const ROLLING_WINDOW = 50

export async function GET() {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseServerClient()

    // First, get the actual player names from the database
    const { data: players } = await supabase
      .from('players')
      .select('id, name')
      .in('name', TRACKED_PLAYERS.map(p => p.name))

    if (!players || players.length === 0) {
      return NextResponse.json({ data: [] }, {
        headers: { 'Cache-Control': 'private, max-age=300' },
      })
    }

    const dataPoints: RollingAverageDataPoint[] = []

    for (const player of players) {
      // Get all scores for this player ordered by date
      const { data: scores } = await supabase
        .from('scores')
        .select('score, created_at')
        .eq('player_id', player.id)
        .order('created_at', { ascending: true })

      if (!scores || scores.length < ROLLING_WINDOW) continue

      // Calculate rolling average for each point after reaching the window size
      for (let i = ROLLING_WINDOW - 1; i < scores.length; i++) {
        let sum = 0
        for (let j = i - ROLLING_WINDOW + 1; j <= i; j++) {
          sum += scores[j].score
        }
        const rollingAvg = sum / ROLLING_WINDOW

        dataPoints.push({
          gameNumber: i + 1,
          playerId: player.id,
          playerName: player.name,
          rollingAvg: Math.round(rollingAvg),
        })
      }
    }

    return NextResponse.json({ data: dataPoints }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    console.error('Rolling average error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rolling average' },
      { status: 500 }
    )
  }
}
