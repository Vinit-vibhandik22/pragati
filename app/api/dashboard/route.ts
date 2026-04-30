import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/dashboard
 * 
 * Returns the complete Officer Command Center payload:
 *  - 8 KPI cards
 *  - 3 chart datasets (status, document types, risk distribution)
 *  - SLA compliance metrics
 *  - Recent activity feed
 *  - Taluka-level heatmap data
 * 
 * All queries run in parallel for sub-200ms response time.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // ─── Run all queries in parallel ────────────────────────────────────────

    const [
      pendingResult,
      heldResult,
      approvedTodayResult,
      totalAppsResult,
      openGrievancesResult,
      overdueGrievancesResult,
      escalatedResult,
      resolvedThisWeekResult,
      allAppsResult,
      allGrievancesResult,
      distressResult,
      recentAppsResult,
      recentGrievancesResult,
    ] = await Promise.all([
      // KPI 1: Pending applications
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'in_review']),

      // KPI 2: High risk held
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('risk_score', 'HIGH')
        .eq('status', 'held'),

      // KPI 3: Approved today
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('updated_at', todayStart),

      // KPI 4: Total applications
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true }),

      // KPI 5: Open grievances
      supabase
        .from('grievances')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'resolved'),

      // KPI 6: Overdue grievances
      supabase
        .from('grievances')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'resolved')
        .lt('sla_deadline', now.toISOString()),

      // KPI 7: Escalated grievances
      supabase
        .from('grievances')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'escalated'),

      // KPI 8: Resolved this week
      supabase
        .from('grievances')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'resolved')
        .gte('resolved_at', sevenDaysAgo),

      // Chart data: all applications (status + doc_type + risk + taluka)
      supabase
        .from('applications')
        .select('status, document_type, risk_score, taluka, district'),

      // Chart data: all grievances (status + category + priority + taluka)
      supabase
        .from('grievances')
        .select('status, category, priority, taluka, sla_deadline'),

      // Distress data: top 5
      supabase
        .from('distress_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(5),

      // Activity feed: recent applications
      supabase
        .from('applications')
        .select('app_id, farmer_name, status, risk_score, submitted_at')
        .order('submitted_at', { ascending: false })
        .limit(5),

      // Activity feed: recent grievances
      supabase
        .from('grievances')
        .select('grievance_id, farmer_name, category, priority, status, registered_at')
        .order('registered_at', { ascending: false })
        .limit(5),
    ])

    // ─── Aggregate chart data ───────────────────────────────────────────────

    const apps = allAppsResult.data || []
    const grievances = allGrievancesResult.data || []

    // Status distribution
    const statusCounts = aggregateField(apps, 'status')
    const statusChart = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

    // Document type distribution
    const docTypeCounts = aggregateField(apps, 'document_type')
    const docTypeChart = Object.entries(docTypeCounts).map(([name, count]) => ({ name, count }))

    // Risk distribution
    const riskCounts = aggregateField(apps, 'risk_score')
    const riskChart = Object.entries(riskCounts).map(([name, count]) => ({ name, count }))

    // Grievance category distribution
    const categoryCounts = aggregateField(grievances, 'category')
    const categoryChart = Object.entries(categoryCounts).map(([name, count]) => ({ name, count }))

    // Grievance priority distribution
    const priorityCounts = aggregateField(grievances, 'priority')
    const priorityChart = Object.entries(priorityCounts)
      .map(([name, count]) => ({ priority: parseInt(name), count }))
      .sort((a, b) => b.priority - a.priority)

    // ─── SLA Compliance ─────────────────────────────────────────────────────

    const totalGrievances = grievances.length
    const overdueCount = grievances.filter(
      g => g.sla_deadline && new Date(g.sla_deadline) < now && g.status !== 'resolved'
    ).length
    const slaCompliance = totalGrievances > 0
      ? Math.round(((totalGrievances - overdueCount) / totalGrievances) * 100)
      : 100

    // ─── Taluka Heatmap ─────────────────────────────────────────────────────

    const talukaCounts = aggregateField(apps, 'taluka')
    const talukaGrievanceCounts = aggregateField(grievances, 'taluka')
    const talukaHeatmap = Object.keys({ ...talukaCounts, ...talukaGrievanceCounts }).map(name => ({
      taluka: name || 'Unknown',
      applications: talukaCounts[name] || 0,
      grievances: talukaGrievanceCounts[name] || 0,
    }))

    // ─── Activity Feed ──────────────────────────────────────────────────────

    const recentActivity = [
      ...(recentAppsResult.data || []).map(a => ({
        type: 'application' as const,
        id: a.app_id,
        label: `${a.farmer_name} — ${a.status}`,
        risk: a.risk_score,
        timestamp: a.submitted_at,
      })),
      ...(recentGrievancesResult.data || []).map(g => ({
        type: 'grievance' as const,
        id: g.grievance_id,
        label: `${g.farmer_name} — ${g.category} (P${g.priority})`,
        risk: g.priority >= 4 ? 'HIGH' : g.priority >= 3 ? 'MEDIUM' : 'LOW',
        timestamp: g.registered_at,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 8)

    return NextResponse.json({
      kpis: {
        pendingApps: pendingResult.count || 0,
        highRiskHeld: heldResult.count || 0,
        approvedToday: approvedTodayResult.count || 0,
        totalApps: totalAppsResult.count || 0,
        openGrievances: openGrievancesResult.count || 0,
        overdueGrievances: overdueGrievancesResult.count || 0,
        escalatedGrievances: escalatedResult.count || 0,
        resolvedThisWeek: resolvedThisWeekResult.count || 0,
        slaCompliance,
      },
      charts: {
        status: statusChart,
        documentTypes: docTypeChart,
        riskDistribution: riskChart,
        grievanceCategories: categoryChart,
        grievancePriorities: priorityChart,
      },
      talukaHeatmap,
      topDistress: distressResult.data || [],
      recentActivity,
      generatedAt: now.toISOString(),
    })
  } catch (error) {
    console.error('[dashboard] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Helper: aggregate a field into a count map.
 */
function aggregateField(rows: any[], field: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    const key = String(row[field] ?? 'unknown')
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}
