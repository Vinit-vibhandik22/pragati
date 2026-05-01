'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// We use the service role key here to bypass RLS for administrative actions in the demo
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function updateApplicationStatus(id: string, status: string, justification?: string) {
  try {
    const updatePayload: any = { status };
    
    if (justification) {
      updatePayload.discrepancy_reason = justification;
      if (justification.startsWith('OVERRIDDEN')) {
        updatePayload.is_manually_overridden = true;
      }
    }

    const { error } = await supabaseAdmin
      .from('farmer_applications')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;

    // This invalidates the Next.js cache for the clerk queue
    revalidatePath('/clerk/queue');
    
    return { success: true };
  } catch (error: any) {
    console.error('Action Error:', error);
    return { success: false, error: error.message };
  }
}
