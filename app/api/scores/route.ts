import { NextResponse } from 'next/server'
import { LevelFruitCounts } from '@/lib/constants'
import { appendScore, errorResponseInit } from '@/lib/sheets-db'
import { requireAuth } from '@/lib/api-auth'

interface ScoreSubmission {
  playerId: string
  score: number
  level: number
  levelFruits?: Record<number, LevelFruitCounts>
  features?: string[]
  customFeature?: string
}

export async function POST(request: Request) {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  try {
    const body: ScoreSubmission = await request.json()

    if (!body.playerId || typeof body.score !== 'number' || !body.level) {
      return NextResponse.json(
        { error: 'Missing required fields: playerId, score, level' },
        { status: 400 }
      )
    }

    const data = await appendScore({
      playerId: body.playerId,
      score: body.score,
      level: body.level,
      levelFruits: body.levelFruits,
      features: body.features || [],
      customFeature: body.customFeature,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Save score error:', error)
    const { status, message } = errorResponseInit(error, 'Failed to save score')
    return NextResponse.json({ error: message }, { status })
  }
}
