'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);

  useEffect(() => {
    const publicToken = process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN;
    const callbackUrl = `${window.location.origin}/api/admin/auth/callback`;
    const isTestEnv = publicToken?.includes('-test-');
    const stytchBaseUrl = isTestEnv
      ? 'https://test.stytch.com'
      : 'https://api.stytch.com';

    setOauthUrl(
      `${stytchBaseUrl}/v1/public/oauth/google/start?public_token=${publicToken}&login_redirect_url=${encodeURIComponent(callbackUrl)}&signup_redirect_url=${encodeURIComponent(callbackUrl)}`
    );
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm space-y-6 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Culture Coach Wendy Admin</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Sign in to manage quizzes
          </p>
        </div>

        {error === 'unauthorized' && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            Your account does not have admin access. Contact the site
            administrator if you believe this is an error.
          </div>
        )}

        {error === 'auth_failed' && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            Authentication failed. Please try again.
          </div>
        )}

        <a
          href={oauthUrl || '#'}
          aria-disabled={!oauthUrl}
          className="flex items-center justify-center gap-3 w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-md shadow-sm text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </a>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <div className="text-neutral-500">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
