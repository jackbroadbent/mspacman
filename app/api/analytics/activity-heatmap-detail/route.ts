import { NextResponse } from 'next/server'
import { getScores } from '@/lib/sheets-db'
import { requireAuth } from '@/lib/api-auth'
import { ActivityHeatmapDay } from '@/lib/analytics.types'

export async function GET(request: Request) {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
    }

    const startDate = new Date(year, month - 1, 1)
    const daysInMonth = new Date(year, month, 0).getDate()

    const dayCounts: Record<number, number> = {}
    for (let d = 1; d <= daysInMonth; d++) dayCounts[d] = 0

    for (const s of await getScores()) {
      const date = new Date(s.createdAt)
      if (date.getFullYear() === year && date.getMonth() === month - 1) {
        dayCounts[date.getDate()]++
      }
    }

    const days: ActivityHeatmapDay[] = Object.entries(dayCounts).map(([day, count]) => ({
      day: parseInt(day),
      count,
    }))

    return NextResponse.json({
      days,
      daysInMonth,
      firstDayOfWeek: startDate.getDay(),
      year,
      month,
    }, {
      headers: { 'Cache-Control': 'private, max-age=120' },
    })
  } catch (error) {
    console.error('Heatmap detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch heatmap detail' }, { status: 500 })
  }
}
