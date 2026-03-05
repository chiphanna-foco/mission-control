const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_FROM = process.env.MAILGUN_FROM || 'noreply@example.com';

export async function sendMagicCodeEmail(email: string, code: string): Promise<boolean> {
  try {
    if (!MAILGUN_DOMAIN || !MAILGUN_API_KEY) {
      console.error('Mailgun not configured - missing MAILGUN_DOMAIN or MAILGUN_API_KEY');
      return false;
    }

    const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');

    const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from: MAILGUN_FROM,
        to: email,
        subject: 'Your Mission Control Login Code',
        html: `
          <h2>Mission Control</h2>
          <p>Your login code is:</p>
          <p style="font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 4px;">
            ${code}
          </p>
          <p>This code expires in 15 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, ignore this email.</p>
        `,
        text: `Mission Control\n\nYour login code: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, ignore this email.`,
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Mailgun error:', data);
      return false;
    }

    console.log('Email sent via Mailgun:', data.id);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}
