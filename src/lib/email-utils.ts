import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter && GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendMagicCodeEmail(email: string, code: string): Promise<boolean> {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.error('Email transporter not configured - missing GMAIL_APP_PASSWORD');
      return false;
    }

    const result = await transporter.sendMail({
      from: GMAIL_USER,
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
    });

    console.log('Email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}
