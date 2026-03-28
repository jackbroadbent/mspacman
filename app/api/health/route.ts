import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { count, error } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json(
        { status: 'error', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      supabase: 'connected',
      scores: count,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json(
      { status: 'error', error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
