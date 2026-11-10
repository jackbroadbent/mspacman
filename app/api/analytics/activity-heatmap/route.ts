import { NextResponse } from 'next/server'
import { getScores } from '@/lib/sheets-db'
import { requireAuth } from '@/lib/api-auth'
import { ActivityHeatmapMonth } from '@/lib/analytics.types'

export async function GET() {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  try {
    // Only include 2018-2026
    const startDate = new Date(2018, 0, 1)
    const endDate = new Date(2027, 0, 1)

    const monthCounts: Record<string, ActivityHeatmapMonth> = {}

    for (const s of await getScores()) {
      const date = new Date(s.createdAt)
      if (date < startDate || date >= endDate) continue
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const key = `${year}-${month}`
      monthCounts[key] ??= { year, month, count: 0 }
      monthCounts[key].count++
    }

    const months = Object.values(monthCounts).sort((a, b) => a.year - b.year || a.month - b.month)
    const maxCount = Math.max(...months.map(m => m.count), 1)

    return NextResponse.json({ months, maxCount }, {
      headers: { 'Cache-Control': 'private, max-age=120' },
    })
  } catch (error) {
    console.error('Heatmap error:', error)
    return NextResponse.json({ error: 'Failed to fetch heatmap data' }, { status: 500 })
  }
}
