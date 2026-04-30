import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/notifications
 * 
 * Returns real-time notification feed for officers:
 * - HIGH risk applications that need review
 * - Overdue SLA grievances
 * - CRITICAL distress alerts (un-acknowledged)
 * - Recent escalations
 * 
 * This powers the notification bell in the officer dashboard header.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Run all notification queries in parallel
    const [highRiskApps, overdueGrievances, criticalDistress, recentEscalations] = await Promise.all([
      // HIGH risk apps submitted in last 24h
      supabase
        .from('applications')
        .select('app_id, farmer_name, risk_score, irregularity_flags, submitted_at')
        .eq('risk_score', 'HIGH')
        .eq('status', 'held')
        .gte('submitted_at', oneDayAgo)
        .order('submitted_at', { ascending: false })
        .limit(10),

      // Overdue grievances
      supabase
        .from('grievances')
        .select('grievance_id, farmer_name, category, priority, sla_deadline, status')
        .neq('status', 'resolved')
        .lt('sla_deadline', now.toISOString())
        .order('priority', { ascending: false })
        .limit(10),

      // Un-acknowledged CRITICAL distress
      supabase
        .from('distress_scores')
        .select('farmer_identifier, farmer_name, score, risk_level, signals')
        .in('risk_level', ['CRITICAL', 'HIGH'])
        .eq('officer_alerted', false)
        .order('score', { ascending: false })
        .limit(5),

      // Recent escalations (last 48h)
      supabase
        .from('grievances')
        .select('grievance_id, farmer_name, category, priority, registered_at')
        .eq('status', 'escalated')
        .gte('registered_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .order('registered_at', { ascending: false })
        .limit(5),
    ])

    // Build notification objects
    const notifications = [
      ...(highRiskApps.data || []).map(app => ({
        id: `risk-${app.app_id}`,
        type: 'high_risk' as const,
        severity: 'error' as const,
        title: 'Fraud Alert',
        message: `${app.farmer_name} — ${(app.irregularity_flags as unknown[])?.length || 0} irregularity flags detected`,
        targetUrl: `/officer/applications/${app.app_id}`,
        timestamp: app.submitted_at,
      })),

      ...(overdueGrievances.data || []).map(g => ({
        id: `sla-${g.grievance_id}`,
        type: 'sla_breach' as const,
        severity: 'warning' as const,
        title: 'SLA Overdue',
        message: `${g.farmer_name} — ${g.category?.replace(/_/g, ' ')} (P${g.priority}) past deadline`,
        targetUrl: `/officer/grievances/${g.grievance_id}`,
        timestamp: g.sla_deadline,
      })),

      ...(criticalDistress.data || []).map(d => ({
        id: `distress-${d.farmer_identifier}`,
        type: 'distress_alert' as const,
        severity: 'critical' as const,
        title: 'Farmer Distress',
        message: `${d.farmer_name} — Score ${d.score} (${d.risk_level}). ${(d.signals as unknown[])?.length || 0} risk signals.`,
        targetUrl: `/officer/distress/${d.farmer_identifier}`,
        timestamp: new Date().toISOString(),
      })),

      ...(recentEscalations.data || []).map(e => ({
        id: `esc-${e.grievance_id}`,
        type: 'escalation' as const,
        severity: 'error' as const,
        title: 'Escalated Grievance',
        message: `${e.farmer_name} — ${e.category?.replace(/_/g, ' ')} (P${e.priority})`,
        targetUrl: `/officer/grievances/${e.grievance_id}`,
        timestamp: e.registered_at,
      })),
    ].sort((a, b) => {
      // Sort: critical first, then by timestamp
      const severityOrder = { critical: 0, error: 1, warning: 2 }
      const aSev = severityOrder[a.severity] ?? 3
      const bSev = severityOrder[b.severity] ?? 3
      if (aSev !== bSev) return aSev - bSev
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return NextResponse.json({
      notifications,
      unreadCount: notifications.length,
      hasUrgent: notifications.some(n => n.severity === 'critical'),
    })
  } catch (error) {
    console.error('[notifications] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
