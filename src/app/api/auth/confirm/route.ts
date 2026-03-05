import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink, verifyMagicCode, createSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    const code = req.nextUrl.searchParams.get('code');

    if (!token && !code) {
      return NextResponse.json({ error: 'Token or code required' }, { status: 400 });
    }

    let email: string | null = null;

    // Try token first
    if (token) {
      const result = verifyMagicLink(token);
      if (!result) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
      email = result.email;
    }
    // Then try code
    else if (code) {
      const result = verifyMagicCode(code);
      if (!result) {
        return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
      }
      email = result.email;
    }

    if (!email) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // Create session
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const userAgent = req.headers.get('user-agent') || undefined;
    const session = createSession(email, ipAddress || undefined, userAgent || undefined);

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      email,
      sessionToken: session.token,
      expiresAt: session.expiresAt,
    });

    // Set secure session cookie
    response.cookies.set({
      name: 'mc_session',
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Confirmation error:', error);
    return NextResponse.json({ error: 'Failed to confirm login' }, { status: 500 });
  }
}
