'use server';

import { randomBytes } from 'crypto';
import { getDb } from './db';

const ALLOWED_EMAILS = ['chip@turbotenant.com', 'chip.hanna@gmail.com'];
const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export function isAllowedEmail(email: string): boolean {
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function createMagicLink(
  email: string,
  token: string,
  code: string,
  ipAddress?: string,
  userAgent?: string,
) {
  const now = Date.now();
  const expiresAt = now + MAGIC_LINK_EXPIRY;

  try {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO magic_links (id, email, token, code, expires_at, created_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = `ml_${randomBytes(8).toString('hex')}`;
    stmt.run(id, email.toLowerCase(), token, code, expiresAt, now, ipAddress, userAgent);
    return { id, token, code, expiresAt };
  } catch (error) {
    console.error('Failed to create magic link:', error);
    throw error;
  }
}

export function verifyMagicLink(token: string): { email: string } | null {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT email, expires_at, confirmed
      FROM magic_links
      WHERE token = ?
      LIMIT 1
    `);

    const row = stmt.get(token) as { email: string; expires_at: number; confirmed: number } | undefined;

    if (!row) {
      return null;
    }

    if (Date.now() > row.expires_at) {
      // Delete expired token
      db.prepare('DELETE FROM magic_links WHERE token = ?').run(token);
      return null;
    }

    // Mark as used
    db.prepare('UPDATE magic_links SET confirmed = 1, used_at = ? WHERE token = ?').run(Date.now(), token);

    return { email: row.email };
  } catch (error) {
    console.error('Failed to verify magic link:', error);
    return null;
  }
}

export function verifyMagicCode(code: string): { email: string } | null {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT email, expires_at, confirmed
      FROM magic_links
      WHERE code = ?
      LIMIT 1
    `);

    const row = stmt.get(code) as { email: string; expires_at: number; confirmed: number } | undefined;

    if (!row) {
      return null;
    }

    if (Date.now() > row.expires_at) {
      db.prepare('DELETE FROM magic_links WHERE code = ?').run(code);
      return null;
    }

    // Mark as used
    db.prepare('UPDATE magic_links SET confirmed = 1, used_at = ? WHERE code = ?').run(Date.now(), code);

    return { email: row.email };
  } catch (error) {
    console.error('Failed to verify magic code:', error);
    return null;
  }
}

export function createSession(
  email: string,
  ipAddress?: string,
  userAgent?: string,
): { id: string; token: string; expiresAt: number } {
  try {
    const db = getDb();
    const now = Date.now();
    const expiresAt = now + SESSION_EXPIRY;
    const id = `sess_${randomBytes(12).toString('hex')}`;
    const token = randomBytes(32).toString('hex');

    const stmt = db.prepare(`
      INSERT INTO sessions (id, email, token, created_at, expires_at, last_active_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, email.toLowerCase(), token, now, expiresAt, now, ipAddress, userAgent);

    return { id, token, expiresAt };
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
}

export function verifySession(token: string): { email: string; expiresAt: number } | null {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT email, expires_at
      FROM sessions
      WHERE token = ?
      LIMIT 1
    `);

    const row = stmt.get(token) as { email: string; expires_at: number } | undefined;

    if (!row) {
      return null;
    }

    if (Date.now() > row.expires_at) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return null;
    }

    // Update last_active_at
    db.prepare('UPDATE sessions SET last_active_at = ? WHERE token = ?').run(Date.now(), token);

    return { email: row.email, expiresAt: row.expires_at };
  } catch (error) {
    console.error('Failed to verify session:', error);
    return null;
  }
}

export function revokeSession(token: string): boolean {
  try {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return true;
  } catch (error) {
    console.error('Failed to revoke session:', error);
    return false;
  }
}
