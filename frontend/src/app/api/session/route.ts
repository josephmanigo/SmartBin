/**
 * /api/session
 *
 * POST  – set the smartbin_token cookie from a Supabase access token
 * DELETE – clear the smartbin_token cookie (logout)
 */
import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'smartbin_token';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: NextRequest) {
  const { idToken } = await req.json() as { idToken?: string };
  if (!idToken) {
    return NextResponse.json({ error: 'idToken required' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, idToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   MAX_AGE,
    path:     '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
