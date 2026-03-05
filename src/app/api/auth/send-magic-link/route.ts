import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_EMAILS = ['chip@turbotenant.com', 'chip.hanna@gmail.com'];

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !ALLOWED_EMAILS.includes(email.toLowerCase())) {
      return NextResponse.json({ error: 'Email not authorized' }, { status: 403 });
    }

    // TODO: Generate code and send email via Gmail

    return NextResponse.json({
      success: true,
      message: 'Magic link sent to email',
    });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 });
  }
}
