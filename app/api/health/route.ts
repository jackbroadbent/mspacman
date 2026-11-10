import { NextResponse } from 'next/server'
import { getScores } from '@/lib/sheets-db'

export async function GET() {
  try {
    const scores = await getScores()
    return NextResponse.json({
      status: 'ok',
      database: 'google-sheets',
      scores: scores.length,
      latest: scores[0]?.createdAt ?? null,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Health check error:', e)
    return NextResponse.json(
      { status: 'error', error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
