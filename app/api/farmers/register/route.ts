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
      return NextResponse.json({ error: 'Only Krushi Sahayaks can register farmers' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      aadhaar_number, 
      full_name_marathi, 
      full_name_english, 
      village_id, 
      caste_category, 
      annual_income 
    } = body;

    // Validation
    if (!aadhaar_number || !full_name_marathi || !village_id || !caste_category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if village is assigned to this KS
    if (!profile.assigned_village_ids?.includes(village_id)) {
      return NextResponse.json({ error: 'Village not assigned to you' }, { status: 403 });
    }

    // Register farmer
    const { data: farmer, error: registerError } = await supabase
      .from('farmers')
      .insert({
        aadhaar_number,
        full_name_marathi,
        full_name_english,
        village_id,
        caste_category,
        annual_income,
        registered_by: user.id
      })
      .select()
      .single();

    if (registerError) {
      if (registerError.code === '23505') {
        return NextResponse.json({ error: 'Farmer with this Aadhaar already registered' }, { status: 409 });
      }
      throw registerError;
    }

    return NextResponse.json({ success: true, farmer });

  } catch (error: any) {
    console.error('[Farmer Registration] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
