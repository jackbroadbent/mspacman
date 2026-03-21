import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ActivityHeatmapDay } from '@/lib/analytics.types'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('site-auth')?.value === 'authenticated'

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid year or month' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // Calculate month boundaries
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Last day of month
    const daysInMonth = endDate.getDate()

    // Get scores for this month
    const { data: scores, error } = await supabase
      .from('scores')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', new Date(year, month - 1, daysInMonth, 23, 59, 59).toISOString())

    if (error) {
      console.error('Heatmap detail query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch heatmap detail' },
        { status: 500 }
      )
    }

    // Initialize all days with 0 count
    const dayCounts: Record<number, number> = {}
    for (let d = 1; d <= daysInMonth; d++) {
      dayCounts[d] = 0
    }

    // Count games per day
    for (const score of scores || []) {
      const day = new Date(score.created_at).getDate()
      dayCounts[day]++
    }

    // Convert to array
    const days: ActivityHeatmapDay[] = Object.entries(dayCounts).map(([day, count]) => ({
      day: parseInt(day),
      count,
    }))

    // Also return info about the month structure for rendering
    const firstDayOfWeek = startDate.getDay() // 0 = Sunday

    return NextResponse.json({
      days,
      daysInMonth,
      firstDayOfWeek,
      year,
      month,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=120',
      },
    })
  } catch (error) {
    console.error('Heatmap detail error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch heatmap detail' },
      { status: 500 }
    )
  }
}
