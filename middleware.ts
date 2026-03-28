import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get('site-auth')?.value === 'authenticated'

  // Allow access to login page, auth API, and health check
  if (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/api/auth' ||
    request.nextUrl.pathname === '/api/health'
  ) {
    return NextResponse.next()
  }

  // API routes return 401 JSON instead of redirect
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
