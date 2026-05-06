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
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'tao') {
      return NextResponse.json({ error: 'Only TAO can grant final sanction' }, { status: 403 });
    }

    const body = await req.json();
    const { application_id } = body;

    // 1. Fetch application and budget allocation
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('*, budget_allocation_id')
      .eq('id', application_id)
      .single();

    if (appError || !app) throw new Error('Application not found');

    const { data: budget, error: budgetError } = await supabase
      .from('budget_allocations')
      .select('*')
      .eq('id', app.budget_allocation_id)
      .single();

    if (budgetError || !budget) throw new Error('Budget record not found');

    const SANCTION_AMOUNT = 250000;

    // 2. Atomic Sanction Update
    // In a real app, this should be a transaction. 
    // Here we use a sequence of updates.
    
    // Update application state
    await supabase.rpc('transition_application_status', {
      p_app_id: application_id,
      p_new_state: 'APPROVED_FOR_DISBURSEMENT',
      p_actor_id: user.id,
      p_metadata: { sanction_amount: SANCTION_AMOUNT }
    });

    // Move budget from committed to disbursed
    await supabase
      .from('budget_allocations')
      .update({ 
        committed_amount: budget.committed_amount - SANCTION_AMOUNT,
        disbursed_amount: budget.disbursed_amount + SANCTION_AMOUNT
      })
      .eq('id', budget.id);

    // 3. Create first disbursement phase (Initial Installment)
    await supabase
      .from('disbursement_phases')
      .insert({
        application_id,
        phase_number: 1,
        amount: 100000, // First installment example
        status: 'pending',
        description: 'Initial excavation subsidy'
      });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Final Sanction] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
