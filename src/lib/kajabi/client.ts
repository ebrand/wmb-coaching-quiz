let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.KAJABI_CLIENT_ID;
  const clientSecret = process.env.KAJABI_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('KAJABI_CLIENT_ID and KAJABI_CLIENT_SECRET must be set');
  }

  const res = await fetch('https://api.kajabi.com/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kajabi OAuth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

interface SubmitFormEntryParams {
  formId: string;
  name: string;
  email: string;
}

export async function submitFormEntry({
  formId,
  name,
  email,
}: SubmitFormEntryParams): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAccessToken();

    const res = await fetch(`https://api.kajabi.com/v1/forms/${formId}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'form_submissions',
          attributes: { name, email },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Kajabi form submission failed:', res.status, text);
      return { success: false, error: `Kajabi API error (${res.status}): ${text}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Kajabi submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
