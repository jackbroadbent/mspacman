import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { password } = await request.json()
  const sitePassword = process.env.SITE_PASSWORD

  // Debug: check if env var exists
  if (!sitePassword) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  if (password === sitePassword) {
    const cookieStore = await cookies()
    cookieStore.set('site-auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
}
