import { SupabaseClient } from '@supabase/supabase-js'
import type { AuditLogEntry } from '@/types'

/**
 * Write an entry to the audit log.
 * Fire-and-forget: errors are logged but never block the calling operation.
 */
export async function logAudit(
  supabase: SupabaseClient,
  entry: Omit<AuditLogEntry, 'id' | 'created_at'>
): Promise<void> {
  try {
    await supabase.from('audit_log').insert(entry)
  } catch (err) {
    // Never let audit logging crash the main operation
    console.error('[audit] Failed to write log entry:', err)
  }
}

/**
 * Convenience helpers for common audit events
 */
export const AuditActions = {
  applicationCreated: (actorId: string, appId: string) =>
    ({ actor_id: actorId, action: 'application_created', target_type: 'application' as const, target_id: appId }),

  applicationStatusChanged: (actorId: string, appId: string, oldStatus: string, newStatus: string) =>
    ({
      actor_id: actorId,
      action: 'status_changed',
      target_type: 'application' as const,
      target_id: appId,
      details: { old_status: oldStatus, new_status: newStatus },
    }),

  grievanceFiled: (actorId: string, grievanceId: string) =>
    ({ actor_id: actorId, action: 'grievance_filed', target_type: 'grievance' as const, target_id: grievanceId }),

  grievanceStatusChanged: (actorId: string, grievanceId: string, oldStatus: string, newStatus: string) =>
    ({
      actor_id: actorId,
      action: 'grievance_status_changed',
      target_type: 'grievance' as const,
      target_id: grievanceId,
      details: { old_status: oldStatus, new_status: newStatus },
    }),

  eligibilityChecked: (actorId: string, farmerName: string, matchCount: number) =>
    ({
      actor_id: actorId,
      action: 'eligibility_checked',
      target_type: 'eligibility_check' as const,
      target_id: farmerName,
      details: { matched_count: matchCount },
    }),

  irregularityDetected: (actorId: string, appId: string, riskScore: string, flagCount: number) =>
    ({
      actor_id: actorId,
      action: 'irregularity_detected',
      target_type: 'application' as const,
      target_id: appId,
      details: { risk_score: riskScore, flag_count: flagCount },
    }),
}
