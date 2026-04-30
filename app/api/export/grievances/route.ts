import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/export/grievances
 * 
 * Export grievances as CSV for officer reporting.
 * Query params: status, min_priority (optional filters)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'officer') {
      return NextResponse.json({ error: 'Only officers can export data' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const minPriority = searchParams.get('min_priority')

    let query = supabase
      .from('grievances')
      .select('grievance_id, farmer_name, aadhaar_last4, phone, village, taluka, district, category, priority, priority_reason, status, sla_days, sla_deadline, registered_at, resolved_at')
      .order('priority', { ascending: false })
      .limit(1000)

    if (status) query = query.eq('status', status)
    if (minPriority) query = query.gte('priority', parseInt(minPriority))

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Export failed' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return new Response('No data to export', { status: 204 })
    }

    const now = new Date()
    const headers = [
      'Grievance ID', 'Farmer Name', 'Aadhaar Last 4', 'Phone', 'Village',
      'Taluka', 'District', 'Category', 'Priority', 'Priority Reason',
      'Status', 'SLA Days', 'SLA Deadline', 'Is Overdue', 'Registered At', 'Resolved At'
    ]

    const csvRows = [
      headers.join(','),
      ...data.map(row => {
        const isOverdue = row.sla_deadline && new Date(row.sla_deadline) < now && row.status !== 'resolved'
        return [
          row.grievance_id,
          `"${(row.farmer_name || '').replace(/"/g, '""')}"`,
          row.aadhaar_last4 || '',
          row.phone || '',
          row.village || '',
          row.taluka || '',
          row.district || '',
          row.category || '',
          row.priority,
          `"${(row.priority_reason || '').replace(/"/g, '""')}"`,
          row.status,
          row.sla_days,
          row.sla_deadline || '',
          isOverdue ? 'YES' : 'NO',
          row.registered_at,
          row.resolved_at || '',
        ].join(',')
      })
    ]

    const csv = csvRows.join('\n')
    const timestamp = new Date().toISOString().slice(0, 10)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pragati_grievances_${timestamp}.csv"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
