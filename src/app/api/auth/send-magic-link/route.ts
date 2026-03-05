import { NextRequest, NextResponse } from 'next/server';
import { isAllowedEmail, generateCode, saveMagicLink, deleteOldMagicLinks } from '@/lib/auth-utils';
import { sendMagicCodeEmail } from '@/lib/email-utils';

// Simple rate limiting in memory
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }

  if (entry.count >= 3) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email is allowed
    if (!isAllowedEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Email not authorized for this application' },
        { status: 403 },
      );
    }

    // Check rate limit
    if (!checkRateLimit(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in 1 hour.' },
        { status: 429 },
      );
    }

    // Generate code
    const code = generateCode();

    // Get client IP and user agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const userAgent = req.headers.get('user-agent');

    // Delete old unused codes for this email
    await deleteOldMagicLinks(normalizedEmail);

    // Save magic link to database
    const saved = await saveMagicLink(normalizedEmail, code, ipAddress || undefined, userAgent || undefined);

    if (!saved) {
      return NextResponse.json({ error: 'Failed to save magic link' }, { status: 500 });
    }

    // Send email with code
    const emailSent = await sendMagicCodeEmail(normalizedEmail, code);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send email. Please check your email configuration.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Magic code sent to email',
    });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 });
  }
}
