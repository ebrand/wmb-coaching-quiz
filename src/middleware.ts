import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { publicUrl } from '@/lib/url';

const COOKIE_NAME = 'stytch_session_token';

// Public API prefixes that never require admin auth
const PUBLIC_API_PREFIXES = [
  '/api/sessions',
  '/api/auth',
  '/api/admin/auth',
];

function isPublicRoute(pathname: string): boolean {
  // Static/internal Next.js routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return true;
  }

  // Public pages
  if (pathname === '/' || pathname.startsWith('/q/') || pathname === '/auth-complete' || pathname === '/auth-error') {
    return true;
  }

  // Admin login page is public
  if (pathname === '/admin/login') {
    return true;
  }

  // Public API routes
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Everything below requires admin auth
  const hasSession = request.cookies.has(COOKIE_NAME);

  if (!hasSession) {
    // API routes get a 401 JSON response
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Page routes redirect to login
    return NextResponse.redirect(publicUrl('/admin/login', request));
  }

  // Cookie exists — let the request through.
  // Real validation happens in withAdminAuth (API) or requireAdminPage (pages).
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/quizzes/:path*',
    '/api/questions/:path*',
    '/api/answers/:path*',
    '/api/quiz-results/:path*',
    '/api/answer-weights/:path*',
    '/api/analytics/:path*',
    '/api/upload/:path*',
  ],
};
