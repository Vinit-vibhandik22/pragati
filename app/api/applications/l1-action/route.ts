import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, village_id')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'talathi' && profile.role !== 'gram_sevak')) {
      return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      application_id, 
      action, // 'approved' | 'rejected'
      remarks,
      document_id, // The ID of the uploaded Samaik Patra or Vihir Dakhla
      samaik_patra_stamp_verified,
      samaik_patra_stamp_value
    } = body;

    // 1. Record the L1 action
    const { error: actionError } = await supabase
      .from('l1_actions')
      .insert({
        application_id,
        action_by: user.id,
        role: profile.role,
        action,
        document_id,
        remarks,
        samaik_patra_stamp_verified,
        samaik_patra_stamp_value
      });

    if (actionError) throw actionError;

    // 2. Transition state
    // Talathi -> PENDING_GRAM_SEVAK_CERT
    // Gram Sevak -> L1_COMPLETE
    let newState = '';
    if (profile.role === 'talathi') {
      newState = action === 'approved' ? 'PENDING_GRAM_SEVAK_CERT' : 'AI_REJECTED'; // Or a dedicated rejected state
    } else {
      newState = action === 'approved' ? 'L1_COMPLETE' : 'AI_REJECTED';
    }

    await supabase.rpc('transition_application_status', {
      p_app_id: application_id,
      p_new_state: newState,
      p_actor_id: user.id,
      p_metadata: { l1_role: profile.role, l1_action: action }
    });

    return NextResponse.json({ success: true, newState });

  } catch (error: any) {
    console.error('[L1 Action] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
