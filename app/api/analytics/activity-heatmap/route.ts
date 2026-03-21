import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ActivityHeatmapMonth } from '@/lib/analytics.types'

export async function GET() {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseServerClient()

    // Filter to only include 2018-2026
    const startDate = new Date(2018, 0, 1)
    const endDate = new Date(2027, 0, 1) // Start of 2027 = end of 2026

    // Fetch all scores with pagination (Supabase has 1000 row default limit)
    let allScores: { created_at: string }[] = []
    let offset = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from('scores')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (error) {
        console.error('Heatmap query error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch heatmap data' },
          { status: 500 }
        )
      }

      if (!data || data.length === 0) break

      allScores = allScores.concat(data)
      if (data.length < pageSize) break
      offset += pageSize
    }

    // Group by year-month
    const monthCounts: Record<string, { year: number; month: number; count: number }> = {}

    for (const score of allScores) {
      const date = new Date(score.created_at)
      const year = date.getFullYear()
      const month = date.getMonth() + 1 // 1-indexed
      const key = `${year}-${month}`

      if (!monthCounts[key]) {
        monthCounts[key] = { year, month, count: 0 }
      }
      monthCounts[key].count++
    }

    // Convert to array and find max
    const months: ActivityHeatmapMonth[] = Object.values(monthCounts)
    const maxCount = Math.max(...months.map(m => m.count), 1)

    return NextResponse.json({ months, maxCount }, {
      headers: {
        'Cache-Control': 'private, max-age=120',
      },
    })
  } catch (error) {
    console.error('Heatmap error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch heatmap data' },
      { status: 500 }
    )
  }
}
