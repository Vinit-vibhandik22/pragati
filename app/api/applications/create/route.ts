import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify actor is a Krushi Sahayak
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, assigned_village_ids')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'krushi_sahayak') {
      return NextResponse.json({ error: 'Only Krushi Sahayaks can create applications' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      farmer_id, 
      scheme_id, 
      village_id,
      survey_number,
      land_area_ha,
      has_multiple_owners
    } = body;

    // 1. Fetch Village & Taluka info
    const { data: village, error: villageError } = await supabase
      .from('villages')
      .select('id, name, taluka:talukas(id, name, is_scheme_eligible)')
      .eq('id', village_id)
      .single();

    if (villageError || !village) {
      return NextResponse.json({ error: 'Village not found' }, { status: 404 });
    }

    const taluka = village.taluka as any;
    if (!taluka.is_scheme_eligible) {
      return NextResponse.json({ error: 'Scheme not active in this Taluka' }, { status: 403 });
    }

    // 2. Budget Check (Headroom)
    const financialYear = '2025-26'; // Should be dynamic in prod
    const { data: budget, error: budgetError } = await supabase
      .from('budget_allocations')
      .select('id, total_amount, committed_amount')
      .eq('scheme_id', scheme_id)
      .eq('taluka_id', taluka.id)
      .eq('financial_year', financialYear)
      .single();

    if (budgetError || !budget) {
      return NextResponse.json({ error: 'No budget allocated for this Taluka/Year' }, { status: 403 });
    }

    const ESTIMATED_SUBSIDY = 250000; // Standard for DBKSY Well
    if (budget.total_amount - budget.committed_amount < ESTIMATED_SUBSIDY) {
      return NextResponse.json({ error: 'Budget exhausted for this Taluka' }, { status: 403 });
    }

    // 3. Generate Application Number: PRAG-YEAR-TALUKA-SEQ
    // We use a raw query to get nextval from sequence
    const { data: seqData, error: seqError } = await supabase.rpc('get_next_app_seq');
    
    if (seqError) {
      // Fallback if RPC doesn't exist yet (we should add it)
      console.warn('RPC get_next_app_seq failed, using timestamp fallback');
    }
    const sequence = seqData || Math.floor(Math.random() * 10000);
    const year = new Date().getFullYear();
    const talukaCode = taluka.name.slice(0, 3).toUpperCase();
    const appNumber = `PRAG-${year}-${talukaCode}-${sequence.toString().padStart(4, '0')}`;

    // 4. Create Application (Atomic with budget commit would be better in a stored proc)
    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert({
        application_number: appNumber,
        scheme_id,
        farmer_id,
        created_by_ks_id: user.id,
        taluka_id: taluka.id,
        village_id: village.id,
        budget_allocation_id: budget.id,
        current_state: 'DRAFT',
        survey_number,
        land_area_ha,
        has_multiple_owners
      })
      .select()
      .single();

    if (appError) throw appError;

    // 5. Update Budget (Committed)
    await supabase
      .from('budget_allocations')
      .update({ committed_amount: budget.committed_amount + ESTIMATED_SUBSIDY })
      .eq('id', budget.id);

    return NextResponse.json({ success: true, application });

  } catch (error: any) {
    console.error('[Application Creation] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
