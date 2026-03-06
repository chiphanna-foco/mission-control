import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/auth'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public auth routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow all API routes (temp: for debugging)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = req.cookies.get('mc_session')?.value;

  if (!session) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
