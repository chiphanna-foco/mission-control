'use server';

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from './lib/auth';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/auth', '/api/auth'];

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = req.cookies.get('mc_session')?.value;

  if (!sessionToken) {
    // Redirect to login if accessing protected route without session
    if (pathname !== '/' && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    
    // For API routes without session, return 401
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For root path, redirect to login
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // Verify session is still valid
  const session = verifySession(sessionToken);

  if (!session) {
    // Session expired, redirect to login
    const response = NextResponse.redirect(new URL('/auth/login', req.url));
    response.cookies.delete('mc_session');
    return response;
  }

  // Session is valid, allow request
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
