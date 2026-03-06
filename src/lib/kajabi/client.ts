interface SubmitToZapierParams {
  name: string;
  email: string;
}

export async function submitToZapier({
  name,
  email,
}: SubmitToZapierParams): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;
  if (!webhookUrl) {
    return { success: false, error: 'ZAPIER_WEBHOOK_URL not configured' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Zapier webhook failed:', res.status, text);
      return { success: false, error: `Zapier webhook error (${res.status}): ${text}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Zapier webhook error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
