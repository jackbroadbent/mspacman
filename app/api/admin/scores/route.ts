import { NextResponse } from 'next/server'
import { getScores } from '@/lib/sheets-db'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    // Admin edits need fresh row ids, so don't serve from the browser cache
    const scores = (await getScores()).slice(0, limit).map(s => ({
      id: s.id,
      player_id: s.playerId,
      player_name: s.playerName,
      score: s.score,
      level: s.level,
      level_fruits: s.levelFruits,
      features: s.features,
      created_at: s.createdAt,
    }))

    return NextResponse.json({ scores }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Admin scores error:', error)
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }
}
