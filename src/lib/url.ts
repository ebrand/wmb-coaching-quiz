import { NextRequest } from 'next/server';

/**
 * Builds a redirect URL using the public-facing origin.
 *
 * On Railway (and other reverse-proxy hosts), request.url resolves to the
 * internal address (e.g. http://localhost:8080). This helper reads the
 * x-forwarded-host / x-forwarded-proto headers set by the reverse proxy
 * to reconstruct the public URL.
 */
export function publicUrl(path: string, request: NextRequest): URL {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost) {
    return new URL(path, `${forwardedProto}://${forwardedHost}`);
  }

  // Fallback for local dev (no reverse proxy)
  return new URL(path, request.url);
}
