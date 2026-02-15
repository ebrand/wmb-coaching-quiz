import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

interface SendResultEmailParams {
  to: string;
  userName: string | null;
  quizTitle: string;
  resultTitle: string;
  resultDescription: string | null;
  emailContent: string | null;
}

export async function sendResultEmail({
  to,
  userName,
  quizTitle,
  resultTitle,
  resultDescription,
  emailContent,
}: SendResultEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@resend.dev';
    const fromName = process.env.RESEND_FROM_NAME || 'Quiz Results';

    // Build email HTML
    const html = buildEmailHtml({
      userName,
      quizTitle,
      resultTitle,
      resultDescription,
      emailContent,
    });

    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: `Your Quiz Results: ${resultTitle}`,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function buildEmailHtml({
  userName,
  quizTitle,
  resultTitle,
  resultDescription,
  emailContent,
}: {
  userName: string | null;
  quizTitle: string;
  resultTitle: string;
  resultDescription: string | null;
  emailContent: string | null;
}): string {
  const greeting = userName ? `Hi ${userName},` : 'Hi there,';

  // If custom email content is provided, use it wrapped in a template
  if (emailContent) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quiz Results</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
      margin-bottom: 20px;
    }
    .result-title {
      color: #3b82f6;
      font-size: 24px;
      margin: 0;
    }
    .quiz-name {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .content {
      padding: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="result-title">${resultTitle}</h1>
    <p class="quiz-name">${quizTitle}</p>
  </div>
  <p>${greeting}</p>
  <p>Thank you for completing the quiz! Here are your personalized results:</p>
  <div class="content">
    ${emailContent}
  </div>
  <div class="footer">
    <p>This email was sent because you completed a quiz.</p>
  </div>
</body>
</html>`;
  }

  // Default email template if no custom content
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quiz Results</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 30px 0;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
    }
    .header p {
      color: rgba(255,255,255,0.9);
      margin: 10px 0 0;
    }
    .content {
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${resultTitle}</h1>
    <p>${quizTitle}</p>
  </div>
  <p>${greeting}</p>
  <p>Thank you for completing the quiz!</p>
  ${resultDescription ? `
  <div class="content">
    <p>${resultDescription}</p>
  </div>
  ` : ''}
  <div class="footer">
    <p>This email was sent because you completed a quiz.</p>
  </div>
</body>
</html>`;
}
