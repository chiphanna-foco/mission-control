import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function getRateLimit(ip: string, limit: number = 100, windowMs: number = 60000) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

// CORS validation
export function validateCors(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Allow same-origin requests

  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
  return allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production';
}

// Validate JSON payload
export function validateJson(data: any): boolean {
  if (!data) return false;
  // Add custom validation rules here
  return typeof data === 'object';
}

// Sanitize input
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .slice(0, 1000); // Limit length
}

// Secure response headers
export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

// Authentication check
export function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  // Implement your auth logic here
  // Compare against session tokens or JWT
  return true;
}
