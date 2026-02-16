import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getStytchClient } from '@/lib/stytch/server';

const COOKIE_NAME = 'stytch_session_token';
const ADMIN_ROLE = process.env.STYTCH_ADMIN_ROLE || 'quiz_admin';

/**
 * Extracts roles from a Stytch session JWT payload.
 * The JWT has already been validated by sessions.authenticate() — we're just
 * reading the claims. Stytch puts roles inside the custom claim
 * "https://stytch.com/session" rather than populating session.roles on the
 * REST response.
 */
export function getRolesFromJwt(jwt: string): string[] {
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split('.')[1], 'base64url').toString()
    );
    return payload['https://stytch.com/session']?.roles || [];
  } catch {
    return [];
  }
}

/**
 * Validates the admin session for server component pages.
 * Redirects to /admin/login on failure.
 */
export async function requireAdminPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect('/admin/login');
  }

  const stytch = getStytchClient();

  // Keep redirect() calls OUTSIDE try/catch — redirect() works by throwing
  // a special NEXT_REDIRECT error, and catching it would swallow the redirect.
  let response;
  try {
    response = await stytch.sessions.authenticate({
      session_token: sessionToken,
      session_duration_minutes: 60 * 24,
    });
  } catch (error) {
    console.error('[requireAdminPage] sessions.authenticate failed:', error);
    redirect('/admin/login?error=auth_failed');
  }

  // session.roles is empty in the REST response; roles live in the JWT.
  const roles = getRolesFromJwt(response.session_jwt);

  if (!roles.includes(ADMIN_ROLE)) {
    redirect('/admin/login?error=unauthorized');
  }

  return response;
}
