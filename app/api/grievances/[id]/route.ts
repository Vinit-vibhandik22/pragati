import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit, AuditActions } from '@/lib/audit'

/**
 * PATCH /api/grievances/[id]
 * Officer actions: update status, resolve, escalate
 * Body: { status: 'in_progress' | 'resolved' | 'escalated', assigned_officer_id?: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json({ error: 'Only officers can update grievances' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const allowedStatuses = ['registered', 'in_progress', 'resolved', 'escalated']
    if (body.status && !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Fetch current state for audit
    const { data: current } = await supabase
      .from('grievances')
      .select('grievance_id, status')
      .eq('id', id)
      .single()

    const updateData: Record<string, any> = {}
    if (body.status) updateData.status = body.status
    if (body.status === 'resolved') updateData.resolved_at = new Date().toISOString()
    if (body.assigned_officer_id) updateData.assigned_officer_id = body.assigned_officer_id

    const { data, error } = await supabase
      .from('grievances')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[grievances] Update error:', error)
      return NextResponse.json({ error: 'Failed to update grievance' }, { status: 500 })
    }

    // Audit log
    if (current && body.status) {
      logAudit(supabase, AuditActions.grievanceStatusChanged(
        user.id, current.grievance_id, current.status, body.status
      ))
    }

    return NextResponse.json({ success: true, grievance: data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
