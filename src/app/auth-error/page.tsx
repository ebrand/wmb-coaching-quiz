'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    invalid_token: 'The authentication link was invalid or has expired.',
    db_error: 'There was a problem saving your information.',
    auth_failed: 'Authentication failed. Please try again.',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold">Authentication Error</h2>
          <p className="text-muted-foreground">
            {errorMessages[error || ''] || 'An unknown error occurred.'}
          </p>
          <Button onClick={() => window.close()} variant="outline">
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
