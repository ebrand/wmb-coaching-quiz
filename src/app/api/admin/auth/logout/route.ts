import { NextRequest, NextResponse } from 'next/server';
import { getStytchClient } from '@/lib/stytch/server';
import { publicUrl } from '@/lib/url';

const COOKIE_NAME = 'stytch_session_token';

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;

  if (sessionToken) {
    try {
      const stytch = getStytchClient();
      await stytch.sessions.revoke({ session_token: sessionToken });
    } catch {
      // Best-effort revocation — cookie gets cleared regardless
    }
  }

  const response = NextResponse.redirect(
    publicUrl('/admin/login', request),
    { status: 303 }
  );
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
