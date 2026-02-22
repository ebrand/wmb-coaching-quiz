import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/users/lead - Create or find a user from lead capture form
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const { firstName, lastName, email } = await request.json();

  if (!firstName || !lastName || !email) {
    return NextResponse.json(
      { error: 'First name, last name, and email are required' },
      { status: 400 }
    );
  }

  const name = `${firstName.trim()} ${lastName.trim()}`.trim();
  const normalizedEmail = email.trim().toLowerCase();

  // Check if user with this email already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .ilike('email', normalizedEmail)
    .single();

  if (existingUser) {
    // Update name in case it changed
    await supabase
      .from('users')
      .update({ name })
      .eq('id', existingUser.id);

    return NextResponse.json({ user_id: existingUser.id });
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      email: normalizedEmail,
      name,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user_id: newUser.id }, { status: 201 });
}
