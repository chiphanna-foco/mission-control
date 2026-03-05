import { NextRequest, NextResponse } from 'next/server';
import { verifyCode, createSession } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Verify code and get email
    const email = await verifyCode(code);

    if (!email) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
    }

    // Create session
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const userAgent = req.headers.get('user-agent');
    const sessionToken = await createSession(email, ipAddress || undefined, userAgent || undefined);

    if (!sessionToken) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      email,
    });

    // Set secure session cookie
    response.cookies.set({
      name: 'mc_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
