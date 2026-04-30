import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/export/applications
 * 
 * Export applications as CSV for officer download/reporting.
 * Query params: status, district, risk_score (optional filters)
 * 
 * Returns: text/csv with proper headers for browser download.
 */
export async function GET(request: Request) {
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
      return NextResponse.json({ error: 'Only officers can export data' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const district = searchParams.get('district')
    const riskScore = searchParams.get('risk_score')

    let query = supabase
      .from('applications')
      .select('app_id, farmer_name, aadhaar_last4, village, taluka, district, document_type, scheme_name, claimed_amount, status, risk_score, department, submitted_at, updated_at')
      .order('submitted_at', { ascending: false })
      .limit(1000)

    if (status) query = query.eq('status', status)
    if (district) query = query.eq('district', district)
    if (riskScore) query = query.eq('risk_score', riskScore)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Export failed' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return new Response('No data to export', { status: 204 })
    }

    // Build CSV
    const headers = [
      'Application ID', 'Farmer Name', 'Aadhaar Last 4', 'Village', 'Taluka',
      'District', 'Document Type', 'Scheme', 'Claimed Amount', 'Status',
      'Risk Score', 'Department', 'Submitted At', 'Updated At'
    ]

    const csvRows = [
      headers.join(','),
      ...data.map(row => [
        row.app_id,
        `"${(row.farmer_name || '').replace(/"/g, '""')}"`,
        row.aadhaar_last4 || '',
        row.village || '',
        row.taluka || '',
        row.district || '',
        row.document_type || '',
        `"${(row.scheme_name || '').replace(/"/g, '""')}"`,
        row.claimed_amount ?? '',
        row.status,
        row.risk_score,
        row.department || '',
        row.submitted_at,
        row.updated_at,
      ].join(','))
    ]

    const csv = csvRows.join('\n')
    const timestamp = new Date().toISOString().slice(0, 10)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pragati_applications_${timestamp}.csv"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
