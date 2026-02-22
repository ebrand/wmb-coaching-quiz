import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withAdminAuth } from '@/lib/auth/admin';

// GET /api/app-settings - Get app-wide settings
export const GET = withAdminAuth(async () => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
});

// PATCH /api/app-settings - Update app-wide settings
export const PATCH = withAdminAuth(async (request: NextRequest) => {
  const supabase = createAdminClient();
  const body = await request.json();

  const updateData: Record<string, unknown> = {};

  if (body.notify_admin !== undefined) {
    updateData.notify_admin = body.notify_admin;
  }

  if (body.admin_notification_email !== undefined) {
    updateData.admin_notification_email = body.admin_notification_email || null;
  }

  // Get the single row's ID first
  const { data: existing } = await supabase
    .from('app_settings')
    .select('id')
    .limit(1)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'App settings not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('app_settings')
    .update(updateData)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
});
