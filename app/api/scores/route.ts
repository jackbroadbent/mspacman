import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { LevelFruitsJson } from '@/lib/database.types'
import { FruitKey, LevelFruitCounts } from '@/lib/constants'
import { appendScoreToSheet } from '@/lib/google-sheets'

// Request body type - levelFruits uses counts format from frontend
interface ScoreSubmission {
  playerId: string
  score: number
  level: number
  levelFruits?: Record<number, LevelFruitCounts>
  features: string[]
  loggedBy: string
}

// Convert fruit counts { cherry: 1, banana: 1 } to tuple ["cherry", "banana"]
function countsToTuple(counts: LevelFruitCounts): [FruitKey | null, FruitKey | null] {
  const result: FruitKey[] = []
  for (const [fruit, count] of Object.entries(counts)) {
    if (count && count > 0) {
      for (let i = 0; i < count; i++) {
        result.push(fruit as FruitKey)
      }
    }
  }
  return [result[0] || null, result[1] || null]
}

export async function POST(request: Request) {
  // Verify authentication (check for site-auth cookie)
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: ScoreSubmission = await request.json()

    // Validate required fields
    if (!body.playerId || typeof body.score !== 'number' || !body.level) {
      return NextResponse.json(
        { error: 'Missing required fields: playerId, score, level' },
        { status: 400 }
      )
    }

    // Validate score is non-negative
    if (body.score < 0) {
      return NextResponse.json(
        { error: 'Score must be non-negative' },
        { status: 400 }
      )
    }

    // Validate level range
    if (body.level < 1 || body.level > 136) {
      return NextResponse.json(
        { error: 'Level must be between 1 and 136' },
        { status: 400 }
      )
    }

    // Convert levelFruits counts to tuple format for Supabase JSONB
    let levelFruitsJson: LevelFruitsJson | null = null
    if (body.levelFruits) {
      levelFruitsJson = {}
      for (const [level, counts] of Object.entries(body.levelFruits)) {
        levelFruitsJson[level] = countsToTuple(counts)
      }
    }

    const supabase = createSupabaseServerClient()

    // Insert score
    const { data, error } = await supabase
      .from('scores')
      .insert({
        player_id: body.playerId,
        score: body.score,
        level: body.level,
        level_fruits: levelFruitsJson,
        features: body.features || [],
        logged_by: body.loggedBy || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save score' },
        { status: 500 }
      )
    }

    // Append to Google Sheets (non-blocking, errors logged but don't fail request)
    // Convert numeric keys to string keys for Google Sheets
    let levelFruitsForSheet: Record<string, LevelFruitCounts> | undefined
    if (body.levelFruits) {
      levelFruitsForSheet = {}
      for (const [level, counts] of Object.entries(body.levelFruits)) {
        levelFruitsForSheet[level] = counts
      }
    }
    appendScoreToSheet({
      playerId: body.playerId,
      score: body.score,
      level: body.level,
      levelFruits: levelFruitsForSheet,
    }).catch(err => console.error('Google Sheets append failed:', err))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
