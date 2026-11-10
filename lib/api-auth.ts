import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/** Returns a 401 response if the site-auth cookie is missing, otherwise null */
export async function requireAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  if (cookieStore.get('site-auth')?.value === 'authenticated') return null
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
