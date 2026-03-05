import { NextRequest, NextResponse } from 'next/server';
import {
  isAllowedEmail,
  generateToken,
  generateCode,
  createMagicLink,
  verifyMagicLink,
} from '@/lib/auth';
import { sendMagicLinkEmail } from '@/lib/email';

// Rate limit: 3 requests per hour per email
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
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email is allowed
    if (!isAllowedEmail(normalizedEmail)) {
      // Don't reveal which emails are allowed for security
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

    // Generate token and code
    const token = generateToken();
    const code = generateCode();

    // Get IP address and user agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const userAgent = req.headers.get('user-agent') || undefined;

    // Create magic link in database
    const result = createMagicLink(normalizedEmail, token, code, ipAddress || undefined, userAgent || undefined);

    // Send email
    const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.get('host')}`;
    await sendMagicLinkEmail(normalizedEmail, code, token, baseUrl);

    return NextResponse.json({
      success: true,
      message: `Magic link sent to ${normalizedEmail}`,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 });
  }
}
