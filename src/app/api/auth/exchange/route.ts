import { NextRequest, NextResponse } from 'next/server';
import { getStytchClient } from '@/lib/stytch/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

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
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      userId = newUser.id;
    }

    return NextResponse.json({ user_id: userId });
  } catch (error) {
    console.error('OAuth exchange error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    );
  }
}
