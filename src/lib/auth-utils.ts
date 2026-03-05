import { randomBytes } from 'crypto';
import { getDb } from './db';

const ALLOWED_EMAILS = ['chip@turbotenant.com', 'chip.hanna@gmail.com'];
const CODE_EXPIRY = 15 * 60 * 1000; // 15 minutes
const SESSION_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

export function isAllowedEmail(email: string): boolean {
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function saveMagicLink(
  email: string,
  code: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<boolean> {
  try {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + Math.floor(CODE_EXPIRY / 1000);

    const stmt = db.prepare(`
      INSERT INTO magic_links (id, email, code, expires_at, created_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const id = `ml_${randomBytes(8).toString('hex')}`;
    stmt.run(id, email.toLowerCase(), code, expiresAt, now, ipAddress || null, userAgent || null);

    return true;
  } catch (error) {
    console.error('Failed to save magic link:', error);
    return false;
  }
}

export async function verifyCode(code: string): Promise<string | null> {
  try {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      SELECT email, expires_at, confirmed
      FROM magic_links
      WHERE code = ?
      LIMIT 1
    `);

    const row = stmt.get(code) as any;

    if (!row) {
      return null;
    }

    if (now > row.expires_at) {
      // Clean up expired code
      db.prepare('DELETE FROM magic_links WHERE code = ?').run(code);
      return null;
    }

    // Mark as used
    db.prepare('UPDATE magic_links SET confirmed = 1 WHERE code = ?').run(code);

    return row.email;
  } catch (error) {
    console.error('Failed to verify code:', error);
    return null;
  }
}

export async function createSession(
  email: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<string | null> {
  try {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + SESSION_EXPIRY;
    const sessionId = `sess_${randomBytes(12).toString('hex')}`;
    const token = randomBytes(32).toString('hex');

    const stmt = db.prepare(`
      INSERT INTO sessions (id, email, token, created_at, expires_at, last_active_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(sessionId, email.toLowerCase(), token, now, expiresAt, now, ipAddress || null, userAgent || null);

    return token;
  } catch (error) {
    console.error('Failed to create session:', error);
    return null;
  }
}

export async function verifySession(token: string): Promise<string | null> {
  try {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      SELECT email, expires_at
      FROM sessions
      WHERE token = ?
      LIMIT 1
    `);

    const row = stmt.get(token) as any;

    if (!row) {
      return null;
    }

    if (now > row.expires_at) {
      // Clean up expired session
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return null;
    }

    // Update last_active_at
    db.prepare('UPDATE sessions SET last_active_at = ? WHERE token = ?').run(now, token);

    return row.email;
  } catch (error) {
    console.error('Failed to verify session:', error);
    return null;
  }
}

export async function deleteOldMagicLinks(email: string): Promise<void> {
  try {
    const db = getDb();
    db.prepare('DELETE FROM magic_links WHERE email = ? AND confirmed = 0').run(email.toLowerCase());
  } catch (error) {
    console.error('Failed to delete old magic links:', error);
  }
}
