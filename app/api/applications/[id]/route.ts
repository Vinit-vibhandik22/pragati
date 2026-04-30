import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit, AuditActions } from '@/lib/audit'

/**
 * GET /api/applications/[id]
 * Fetch a single application by UUID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json({ application: data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/applications/[id]
 * Officer actions: approve, reject, request-info, or update status
 * Body: { status: 'approved' | 'rejected' | 'in_review', notes?: string }
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
      return NextResponse.json({ error: 'Only officers can update applications' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const allowedStatuses = ['pending', 'in_review', 'approved', 'rejected', 'held']
    if (body.status && !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Fetch current state for audit log
    const { data: current } = await supabase
      .from('applications')
      .select('app_id, status')
      .eq('id', id)
      .single()

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (body.status) updateData.status = body.status
    if (body.assigned_officer_id) updateData.assigned_officer_id = body.assigned_officer_id

    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[applications] Update error:', error)
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
    }

    // Audit log
    if (current && body.status) {
      logAudit(supabase, AuditActions.applicationStatusChanged(
        user.id, current.app_id, current.status, body.status
      ))
    }

    return NextResponse.json({ success: true, application: data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
