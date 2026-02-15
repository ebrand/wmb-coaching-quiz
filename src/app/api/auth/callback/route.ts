import { NextRequest, NextResponse } from 'next/server';
import { getStytchClient } from '@/lib/stytch/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const tokenType = searchParams.get('stytch_token_type');
  const sessionId = searchParams.get('session_id');

  if (!token || tokenType !== 'oauth') {
    return NextResponse.redirect(new URL('/auth-error?error=invalid_token', request.url));
  }

  try {
    const stytch = getStytchClient();
    const supabase = createAdminClient();

    // Authenticate the OAuth token
    const authResponse = await stytch.oauth.authenticate({
      token,
      session_duration_minutes: 60 * 24 * 7, // 1 week
    });

    const stytchUser = authResponse.user;
    const googleProvider = stytchUser.providers?.find(p => p.provider_type === 'Google');

    // Create or update user in our database
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('stytch_user_id', stytchUser.user_id)
      .single();

    let userId: string;

    if (existingUser) {
      // Update existing user
      const { data } = await supabase
        .from('users')
        .update({
          email: stytchUser.emails?.[0]?.email || existingUser.email,
          name: stytchUser.name?.first_name
            ? `${stytchUser.name.first_name} ${stytchUser.name.last_name || ''}`.trim()
            : existingUser.name,
          profile_picture_url: googleProvider?.profile_picture_url || existingUser.profile_picture_url,
          google_id: googleProvider?.provider_subject || existingUser.google_id,
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      userId = data?.id || existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          stytch_user_id: stytchUser.user_id,
          email: stytchUser.emails?.[0]?.email,
          name: stytchUser.name?.first_name
            ? `${stytchUser.name.first_name} ${stytchUser.name.last_name || ''}`.trim()
            : null,
          profile_picture_url: googleProvider?.profile_picture_url,
          google_id: googleProvider?.provider_subject,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return NextResponse.redirect(new URL('/auth-error?error=db_error', request.url));
      }

      userId = newUser.id;
    }

    // If we have a session_id, redirect back to complete the quiz
    if (sessionId) {
      const redirectUrl = new URL('/auth-complete', request.url);
      redirectUrl.searchParams.set('user_id', userId);
      redirectUrl.searchParams.set('session_id', sessionId);
      return NextResponse.redirect(redirectUrl);
    }

    // Default redirect
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/auth-error?error=auth_failed', request.url));
  }
}
