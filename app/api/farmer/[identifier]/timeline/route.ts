import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/farmer/[identifier]/timeline
 * 
 * Aggregate a complete farmer timeline — every interaction across
 * applications, grievances, eligibility checks, and distress scores.
 * 
 * This is a key hackathon differentiator: showing a 360° farmer view
 * that no paper-based system could ever provide.
 * 
 * Identifier: Aadhaar last-4 digits
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { identifier } = await params

    if (!identifier || identifier.length !== 4) {
      return NextResponse.json({ error: 'Identifier must be 4-digit Aadhaar suffix' }, { status: 400 })
    }

    // Run all timeline queries in parallel
    const [appsResult, grievancesResult, eligibilityResult, distressResult] = await Promise.all([
      // All applications by this farmer
      supabase
        .from('applications')
        .select('app_id, farmer_name, document_type, scheme_name, claimed_amount, status, risk_score, irregularity_flags, submitted_at, updated_at')
        .eq('aadhaar_last4', identifier)
        .order('submitted_at', { ascending: false }),

      // All grievances by this farmer
      supabase
        .from('grievances')
        .select('grievance_id, farmer_name, category, priority, priority_reason, status, sla_deadline, registered_at, resolved_at')
        .eq('aadhaar_last4', identifier)
        .order('registered_at', { ascending: false }),

      // Eligibility checks
      supabase
        .from('eligibility_checks')
        .select('matched_schemes, checked_at')
        .eq('farmer_name', (await supabase
          .from('applications')
          .select('farmer_name')
          .eq('aadhaar_last4', identifier)
          .limit(1)
          .single()
        ).data?.farmer_name || '__none__')
        .order('checked_at', { ascending: false })
        .limit(5),

      // Current distress score
      supabase
        .from('distress_scores')
        .select('*')
        .eq('farmer_identifier', identifier)
        .single(),
    ])

    const apps = appsResult.data || []
    const grievances = grievancesResult.data || []
    const eligibility = eligibilityResult.data || []
    const distress = distressResult.data || null

    // Build unified timeline events sorted by date
    const now = new Date()
    const timelineEvents = [
      ...apps.map(a => ({
        type: 'application' as const,
        id: a.app_id,
        title: `${a.document_type?.replace(/_/g, ' ')} — ${a.scheme_name || 'General'}`,
        status: a.status,
        risk: a.risk_score,
        flagCount: Array.isArray(a.irregularity_flags) ? a.irregularity_flags.length : 0,
        amount: a.claimed_amount,
        timestamp: a.submitted_at,
      })),
      ...grievances.map(g => ({
        type: 'grievance' as const,
        id: g.grievance_id,
        title: `${g.category?.replace(/_/g, ' ')} (Priority ${g.priority})`,
        status: g.status,
        risk: g.priority >= 4 ? 'HIGH' : g.priority >= 3 ? 'MEDIUM' : 'LOW',
        flagCount: 0,
        amount: null,
        timestamp: g.registered_at,
        slaDeadline: g.sla_deadline,
        isOverdue: g.sla_deadline ? new Date(g.sla_deadline) < now && g.status !== 'resolved' : false,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Summary stats
    const summary = {
      farmerName: apps[0]?.farmer_name || grievances[0]?.farmer_name || 'Unknown',
      aadhaarLast4: identifier,
      totalApplications: apps.length,
      totalGrievances: grievances.length,
      approvedApps: apps.filter(a => a.status === 'approved').length,
      rejectedApps: apps.filter(a => a.status === 'rejected').length,
      pendingApps: apps.filter(a => ['pending', 'in_review'].includes(a.status)).length,
      heldApps: apps.filter(a => a.status === 'held').length,
      openGrievances: grievances.filter(g => g.status !== 'resolved').length,
      overdueGrievances: grievances.filter(g =>
        g.sla_deadline && new Date(g.sla_deadline) < now && g.status !== 'resolved'
      ).length,
      totalClaimedAmount: apps.reduce((sum, a) => sum + (a.claimed_amount || 0), 0),
      schemesChecked: eligibility.length > 0 ? (eligibility[0].matched_schemes as unknown[])?.length || 0 : 0,
      distressScore: distress?.score ?? null,
      distressLevel: distress?.risk_level ?? null,
    }

    return NextResponse.json({
      summary,
      timeline: timelineEvents,
      distress,
      eligibilityHistory: eligibility,
    })
  } catch (error) {
    console.error('[farmer-timeline] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
