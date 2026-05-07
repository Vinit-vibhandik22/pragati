
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function submitTaoReview(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const applicationId = formData.get('applicationId') as string;
  const verdict = formData.get('verdict') as 'APPROVED' | 'REJECTED';
  const remarks = formData.get('remarks') as string;

  if (!remarks || remarks.trim().length < 5) {
    return { error: 'Remarks are mandatory (min 5 characters)' };
  }

  try {
    let sanctionOrderNumber = null;
    if (verdict === 'APPROVED') {
      const year = new Date().getFullYear();
      const random = Math.floor(10000 + Math.random() * 90000);
      sanctionOrderNumber = `PRAG-SANC-${year}-${random}`;
    }

    // 1. Insert into tao_reviews
    const { error: reviewError } = await supabase
      .from('tao_reviews')
      .insert({
        application_id: applicationId,
        officer_id: user.id,
        verdict,
        remarks,
        sanction_order_number: sanctionOrderNumber
      });

    if (reviewError) throw reviewError;

    // 2. Call RPC to transition status
    const newState = verdict === 'APPROVED' ? 'TAO_APPROVED' : 'TAO_REJECTED';
    const { error: transitionError } = await supabase.rpc('transition_application_status', {
      p_application_id: applicationId,
      p_new_state: newState,
      p_actor_id: user.id,
      p_remarks: remarks
    });

    if (transitionError) throw transitionError;

    revalidatePath('/tao');
    return { 
      success: true, 
      verdict, 
      sanctionOrderNumber 
    };

  } catch (err: any) {
    console.error('[TAO Review Action] Error:', err);
    return { error: err.message || 'Failed to process review' };
  }
}
