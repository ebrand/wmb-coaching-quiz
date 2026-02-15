'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Suspense } from 'react';

function AuthCompleteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const tokenType = searchParams.get('stytch_token_type');
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [result, setResult] = useState<{ title: string; description: string | null } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function processAuth() {
      // Get session_id from localStorage (stored before OAuth redirect)
      const sessionId = localStorage.getItem('quiz_session_id');

      // If no token, check if we have user_id/session_id from old flow
      if (!token) {
        const urlUserId = searchParams.get('user_id');
        const urlSessionId = searchParams.get('session_id');

        if (urlSessionId) {
          // Old flow - complete with URL params
          await completeQuiz(urlSessionId, urlUserId);
          return;
        }

        setErrorMessage('No authentication token received');
        setStatus('error');
        return;
      }

      if (tokenType !== 'oauth') {
        setErrorMessage('Invalid token type');
        setStatus('error');
        return;
      }

      try {
        // Exchange the token via our API
        const authResponse = await fetch('/api/auth/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!authResponse.ok) {
          const error = await authResponse.json();
          throw new Error(error.error || 'Authentication failed');
        }

        const { user_id: userId } = await authResponse.json();

        if (!sessionId) {
          setErrorMessage('Quiz session not found. Please try taking the quiz again.');
          setStatus('error');
          return;
        }

        // Clear the stored session_id
        localStorage.removeItem('quiz_session_id');

        // Complete the quiz with the user ID
        await completeQuiz(sessionId, userId);
      } catch (error) {
        console.error('Auth error:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
        setStatus('error');
      }
    }

    async function completeQuiz(sessionId: string, userId: string | null) {
      try {
        // Update session with user ID
        if (userId) {
          await fetch(`/api/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId }),
          });
        }

        // Complete the quiz
        const response = await fetch(`/api/sessions/${sessionId}/complete`, {
          method: 'POST',
        });

        if (!response.ok) throw new Error('Failed to complete quiz');

        const data = await response.json();
        setResult(data.primaryResult);
        setStatus('success');

        // Post message to parent window if in iframe
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'quiz_complete',
            result: data.primaryResult,
          }, '*');
        }
      } catch (error) {
        console.error('Error completing quiz:', error);
        setErrorMessage('Failed to complete quiz');
        setStatus('error');
      }
    }

    processAuth();
  }, [token, tokenType, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          {status === 'processing' && (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <p>Processing your results...</p>
            </div>
          )}

          {status === 'success' && result && (
            <div className="space-y-4">
              <div className="text-4xl">🎉</div>
              <h2 className="text-2xl font-bold">{result.title}</h2>
              {result.description && (
                <p className="text-muted-foreground">{result.description}</p>
              )}
            </div>
          )}

          {status === 'success' && !result && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Quiz Completed!</h2>
              <p className="text-muted-foreground">Thanks for taking the quiz.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-4xl">⚠️</div>
              <h2 className="text-xl font-bold">Something went wrong</h2>
              <p className="text-muted-foreground">
                {errorMessage || 'We couldn\'t complete your quiz. Please try again.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    }>
      <AuthCompleteContent />
    </Suspense>
  );
}
