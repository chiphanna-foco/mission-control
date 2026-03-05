'use server';

import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || 'chip.hanna@gmail.com';
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

export async function sendMagicLinkEmail(
  email: string,
  code: string,
  token: string,
  baseUrl: string,
) {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('Email transporter not configured');
  }

  const confirmLink = `${baseUrl}/auth/confirm?token=${token}`;

  const html = `
    <h2>Mission Control Login</h2>
    <p>Your magic login code: <strong>${code}</strong></p>
    <p>Or click the link below to login directly:</p>
    <p>
      <a href="${confirmLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Login to Mission Control
      </a>
    </p>
    <p>This link expires in 15 minutes.</p>
    <p>If you didn't request this, ignore this email.</p>
  `;

  const text = `
Mission Control Login

Your magic login code: ${code}

Or click the link below to login:
${confirmLink}

This link expires in 15 minutes.

If you didn't request this, ignore this email.
  `;

  return transporter.sendMail({
    from: GMAIL_USER,
    to: email,
    subject: 'Your Mission Control Magic Link',
    text,
    html,
  });
}
