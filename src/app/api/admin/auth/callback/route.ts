import { NextRequest, NextResponse } from 'next/server';
import { getStytchClient } from '@/lib/stytch/server';
import { publicUrl } from '@/lib/url';

const COOKIE_NAME = 'stytch_session_token';
const ADMIN_ROLE = process.env.STYTCH_ADMIN_ROLE || 'quiz_admin';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const tokenType = searchParams.get('stytch_token_type');

  if (!token || tokenType !== 'oauth') {
    return NextResponse.redirect(
      publicUrl('/admin/login?error=auth_failed', request)
    );
  }

  try {
    const stytch = getStytchClient();

    const authResponse = await stytch.oauth.authenticate({
      token,
      session_duration_minutes: 60 * 24, // 24 hours
    });

    // Check for admin role
    const roles: string[] = authResponse.user_session?.roles || [];

    if (!roles.includes(ADMIN_ROLE)) {
      // Revoke the session since they're not an admin
      if (authResponse.session_token) {
        try {
          await stytch.sessions.revoke({
            session_token: authResponse.session_token,
          });
        } catch {
          // Best-effort revocation
        }
      }
      return NextResponse.redirect(
        publicUrl('/admin/login?error=unauthorized', request)
      );
    }

    // Set session cookie and redirect to admin
    const response = NextResponse.redirect(publicUrl('/admin', request));
    response.cookies.set(COOKIE_NAME, authResponse.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Admin OAuth callback error:', error);
    return NextResponse.redirect(
      publicUrl('/admin/login?error=auth_failed', request)
    );
  }
}
