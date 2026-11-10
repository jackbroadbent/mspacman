import { NextResponse } from 'next/server'
import { LevelFruitCounts } from '@/lib/constants'
import { deleteScore, errorResponseInit, updateScore } from '@/lib/sheets-db'
import { requireAuth } from '@/lib/api-auth'

interface ScoreUpdate {
  playerId?: string
  score?: number
  level?: number
  levelFruits?: Record<number, LevelFruitCounts>
  features?: string[]
  customFeature?: string
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  const { id } = await params
  try {
    await deleteScore(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete score error:', error)
    const { status, message } = errorResponseInit(error, 'Failed to delete score')
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  const { id } = await params
  try {
    const body: ScoreUpdate = await request.json()
    const patch = {
      playerId: body.playerId,
      score: body.score,
      level: body.level,
      levelFruits: body.levelFruits,
      features: body.features,
      customFeature: body.customFeature,
    }
    if (Object.values(patch).every(v => v === undefined)) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const data = await updateScore(id, patch)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Update score error:', error)
    const { status, message } = errorResponseInit(error, 'Failed to update score')
    return NextResponse.json({ error: message }, { status })
  }
}
