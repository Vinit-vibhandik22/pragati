import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit, AuditActions } from '@/lib/audit'

/**
 * POST /api/applications/batch
 * 
 * Officer bulk actions — approve or reject multiple applications at once.
 * Body: { ids: string[], action: 'approve' | 'reject' | 'in_review' }
 * 
 * This is critical for the hackathon demo: showing an officer clearing
 * a queue of 10 low-risk applications in one click.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify officer role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'officer') {
      return NextResponse.json({ error: 'Only officers can perform batch operations' }, { status: 403 })
    }

    const { ids, action } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing or empty ids array' }, { status: 400 })
    }

    if (ids.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 items per batch' }, { status: 400 })
    }

    const statusMap: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      in_review: 'in_review',
    }

    const newStatus = statusMap[action]
    if (!newStatus) {
      return NextResponse.json({ error: 'Invalid action. Use: approve, reject, in_review' }, { status: 400 })
    }

    // Fetch current states for audit trail
    const { data: currentApps } = await supabase
      .from('applications')
      .select('id, app_id, status')
      .in('id', ids)

    // Perform batch update
    const { data, error } = await supabase
      .from('applications')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        assigned_officer_id: user.id,
      })
      .in('id', ids)
      .select('id, app_id, status')

    if (error) {
      console.error('[batch] Update error:', error)
      return NextResponse.json({ error: 'Batch update failed' }, { status: 500 })
    }

    // Fire-and-forget audit logs for each item
    if (currentApps) {
      for (const app of currentApps) {
        logAudit(supabase, AuditActions.applicationStatusChanged(
          user.id, app.app_id, app.status, newStatus
        ))
      }
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
      action: newStatus,
      ids: data?.map(d => d.app_id),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
