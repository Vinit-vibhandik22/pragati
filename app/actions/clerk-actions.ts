'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { sendFarmerEmail } from '@/lib/sendNotification';

// We use the service role key here to bypass RLS for administrative actions in the demo
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function updateApplicationStatus(
  applicationId: string,
  status: string,
  justification?: string,
  clerkId?: string          // ← real clerk ID passed from the UI
) {
  try {
    const resolvedClerkId = clerkId || 'CLERK_UNKNOWN';
    const updatePayload: any = {
      status,
      reviewed_by_clerk_id: resolvedClerkId,  // ← persisted for analytics
    };
    
    // Determine action type for audit trail
    let actionType = 'STATUS_UPDATE';
    
    if (justification) {
      updatePayload.discrepancy_reason = justification;
      if (justification.startsWith('OVERRIDDEN')) {
        updatePayload.is_manually_overridden = true;
        actionType = 'MANUAL_OVERRIDE';
      } else if (justification.startsWith('DIRECT_APPROVAL')) {
        actionType = 'DIRECT_APPROVAL';
      }
    }

    // 1. STRICT UPDATE: Ensure we strictly update and NEVER upsert/insert the application
    const { error } = await supabaseAdmin
      .from('farmer_applications')
      .update(updatePayload)
      .eq('id', applicationId);

    if (error) throw error;

    // 2. Insert immutable audit log entry
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        application_id: applicationId,
        action_taken: actionType,
        performed_by: resolvedClerkId,
        ip_address: 'demo_session',
        details: {
          new_status: status,
          justification: justification || null,
          clerk_id: resolvedClerkId,
          timestamp_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        }
      });

    if (auditError) {
      // Non-blocking: log but don't fail the primary action
      console.error('Audit log insert failed (non-blocking):', auditError.message);
    }

    // Invalidate cache for clerk queue and audit views
    revalidatePath('/clerk/queue');
    revalidatePath('/clerk/audit');

    // 3. Fire-and-forget email notification (NEVER blocks approval)
    void sendFarmerEmail("Honored Farmer", actionType).catch(console.error);
    
    return { success: true };
  } catch (error: any) {
    console.error('Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function executeBulkRouting(decisions: { id: string, status: string, reason?: string | null }[]) {
  try {
    // Use .update() per row so we only patch decision fields
    // and never touch scheme_id or other NOT NULL columns
    const results = await Promise.all(
      decisions.map(d =>
        supabaseAdmin
          .from('farmer_applications')
          .update({
            status: d.status,
            discrepancy_reason: d.reason || null,
            is_manually_overridden: d.status === 'Verified_by_Clerk',
          })
          .eq('id', d.id)
      )
    );

    const failed = results.find(r => r.error);
    if (failed?.error) throw failed.error;

    // Log the bulk action (optional, but good for demo)
    await supabaseAdmin.from('audit_logs').insert({
      action_taken: 'BULK_ROUTING',
      performed_by: 'Clerk_Deshmukh',
      ip_address: 'demo_session',
      details: {
        processed_count: decisions.length,
        timestamp_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      }
    });

    revalidatePath('/clerk/queue');
    revalidatePath('/tao/dashboard');

    return { success: true };
  } catch (error: any) {
    console.error('Bulk Routing Error:', error);
    return { success: false, error: error.message };
  }
}
