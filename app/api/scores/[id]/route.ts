import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { LevelFruitsJson } from '@/lib/database.types'
import { FruitKey, LevelFruitCounts } from '@/lib/constants'

interface ScoreUpdate {
  playerId?: string
  score?: number
  level?: number
  levelFruits?: Record<number, LevelFruitCounts>
  features?: string[]
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Score ID required' }, { status: 400 })
  }

  try {
    const supabase = createSupabaseServerClient()

    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json({ error: 'Failed to delete score' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Score ID required' }, { status: 400 })
  }

  try {
    const body: ScoreUpdate = await request.json()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (body.playerId !== undefined) {
      updateData.player_id = body.playerId
    }

    if (body.score !== undefined) {
      if (body.score < 0) {
        return NextResponse.json({ error: 'Score must be non-negative' }, { status: 400 })
      }
      updateData.score = body.score
    }

    if (body.level !== undefined) {
      if (body.level < 1 || body.level > 136) {
        return NextResponse.json({ error: 'Level must be between 1 and 136' }, { status: 400 })
      }
      updateData.level = body.level
    }

    if (body.levelFruits !== undefined) {
      const levelFruitsJson: LevelFruitsJson = {}
      for (const [level, counts] of Object.entries(body.levelFruits)) {
        levelFruitsJson[level] = countsToTuple(counts)
      }
      updateData.level_fruits = levelFruitsJson
    }

    if (body.features !== undefined) {
      updateData.features = body.features
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('scores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: 'Failed to update score' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
