import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/answer-weights - Create or update answer weight
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();

  // Upsert the weight (create or update if exists)
  const { data, error } = await supabase
    .from('answer_result_weights')
    .upsert(
      {
        answer_id: body.answer_id,
        result_id: body.result_id,
        weight: body.weight,
      },
      {
        onConflict: 'answer_id,result_id',
      }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/answer-weights - Delete answer weight
export async function DELETE(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const answerId = searchParams.get('answer_id');
  const resultId = searchParams.get('result_id');

  if (!answerId || !resultId) {
    return NextResponse.json(
      { error: 'answer_id and result_id are required' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('answer_result_weights')
    .delete()
    .eq('answer_id', answerId)
    .eq('result_id', resultId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
