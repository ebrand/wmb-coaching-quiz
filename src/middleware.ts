import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if this is an admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Try to get key from multiple sources
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('key') ||
                     request.headers.get('x-admin-key') ||
                     request.cookies.get('admin_key')?.value;

    const validAdminKey = process.env.ADMIN_SECRET_KEY;

    // If admin key is provided and valid, set a cookie and continue
    if (adminKey && validAdminKey && adminKey === validAdminKey) {
      const response = NextResponse.next();

      // Set cookie for future requests (so user doesn't need key in URL every time)
      if (!request.cookies.get('admin_key')?.value) {
        response.cookies.set('admin_key', adminKey, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 1 week
        });
      }

      return response;
    }

    // No valid admin key - show unauthorized
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
