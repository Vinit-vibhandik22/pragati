import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Fetch all applications. We select reviewed_by_clerk_id but handle
    // gracefully if the column doesn't exist yet (migration not run).
    const { data: apps, error } = await supabase
      .from('farmer_applications')
      .select('id, status, discrepancy_reason, created_at, updated_at, reviewed_by_clerk_id')
      .order('updated_at', { ascending: false });

    // If the column doesn't exist yet, Supabase returns a column-not-found error.
    // Fall back to fetching without that column so the page still loads.
    if (error) {
      const isColumnMissing = error.message?.toLowerCase().includes('column') ||
                              error.message?.toLowerCase().includes('does not exist') ||
                              error.code === '42703';

      if (isColumnMissing) {
        // Migration hasn't been run — return empty state, don't crash
        return NextResponse.json({
          clerks: [],
          summary: { total: 0, approved: 0, rejected: 0, pending: 0 },
          warning: 'reviewed_by_clerk_id column not found. Run the SQL migration first.'
        });
      }

      console.error('[clerk-performance] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    if (!apps || apps.length === 0) {
      return NextResponse.json({
        clerks: [],
        summary: { total: 0, approved: 0, rejected: 0, pending: 0 }
      });
    }

    // -----------------------------------------------------------------------
    // Group by real reviewed_by_clerk_id. Apps without a clerk ID are counted
    // in summary totals only. New clerk IDs are auto-added dynamically.
    // -----------------------------------------------------------------------
    const clerkMap: Record<string, {
      clerkId: string;
      approved: number;
      rejected: number;
      overrides: number;
      aiAudits: number;
      pending: number;
      processingTimes: number[];
      lastActive: string;
      recentActions: { appId: string; action: string; date: string; reason: string; status: string }[];
      statusBreakdown: Record<string, number>;
    }> = {};

    apps.forEach((app: any) => {
      const clerkId: string | null = app.reviewed_by_clerk_id || null;
      const status: string = app.status || '';
      const reason: string = (app.discrepancy_reason || '').toUpperCase();

      if (!clerkId) return; // unattributed — counted in summary, not in clerk cards

      if (!clerkMap[clerkId]) {
        clerkMap[clerkId] = {
          clerkId,
          approved: 0, rejected: 0, overrides: 0, aiAudits: 0, pending: 0,
          processingTimes: [],
          lastActive: '',
          recentActions: [],
          statusBreakdown: {},
        };
      }

      const clerk = clerkMap[clerkId];

      // Processing time (capped at 30 days)
      const diffHours = Math.round(
        ((new Date(app.updated_at).getTime() - new Date(app.created_at).getTime()) / (1000 * 60 * 60)) * 10
      ) / 10;
      if (diffHours > 0 && diffHours < 720) clerk.processingTimes.push(diffHours);

      // Categorise
      if (status === 'Verified_by_Clerk') {
        reason.includes('OVERRIDDEN') ? clerk.overrides++ : clerk.approved++;
      } else if (status === 'Rejected') {
        clerk.rejected++;
      } else if (status === 'Verified_by_AI' || reason.includes('DEEP_AUDIT')) {
        clerk.aiAudits++;
      } else if (status === 'Pending' || status === 'Action_Required') {
        clerk.pending++;
      } else {
        clerk.approved++; // Phase 3 / TAO onwards — clerk did their job
      }

      clerk.statusBreakdown[status] = (clerk.statusBreakdown[status] || 0) + 1;
      if (!clerk.lastActive || app.updated_at > clerk.lastActive) clerk.lastActive = app.updated_at;

      if (clerk.recentActions.length < 5) {
        let actionLabel = 'Reviewed';
        if (status === 'Verified_by_Clerk') actionLabel = reason.includes('OVERRIDDEN') ? 'Override Approved' : 'Approved';
        else if (status === 'Rejected') actionLabel = 'Rejected';
        else if (reason.includes('DEEP_AUDIT')) actionLabel = 'AI Audited';
        else if (status === 'Pending') actionLabel = 'Queued';

        clerk.recentActions.push({
          appId: app.id.slice(0, 8).toUpperCase(),
          action: actionLabel,
          date: app.updated_at,
          reason: app.discrepancy_reason || 'N/A',
          status,
        });
      }
    });

    const clerks = Object.values(clerkMap).map(clerk => {
      const totalProcessed = clerk.approved + clerk.rejected + clerk.overrides + clerk.aiAudits;
      const avgProcessingHrs = clerk.processingTimes.length > 0
        ? Math.round((clerk.processingTimes.reduce((a, b) => a + b, 0) / clerk.processingTimes.length) * 10) / 10
        : 0;
      const approvalRate  = totalProcessed > 0 ? Math.round(((clerk.approved + clerk.overrides) / totalProcessed) * 100) : 0;
      const overrideRate  = totalProcessed > 0 ? Math.round((clerk.overrides / totalProcessed) * 100) : 0;
      const throughputScore   = Math.min(totalProcessed * 2, 50);
      const qualityScore      = Math.max(0, 50 - overrideRate * 3);
      const performanceScore  = Math.min(100, throughputScore + qualityScore);

      const idUpper = clerk.clerkId.toUpperCase();
      const displayName =
        idUpper === 'CLERK_DESHMUKH' ? 'C. Deshmukh' :
        idUpper === 'CLERK_MORE'     ? 'K. More'     :
        idUpper === 'CLERK_SHINDE'   ? 'S. Shinde'   :
        clerk.clerkId.replace(/_/g, ' ').replace(/^CLERK /i, '');

      return {
        clerkId: clerk.clerkId,
        name: displayName,
        totalProcessed, approved: clerk.approved, rejected: clerk.rejected,
        overrides: clerk.overrides, aiAudits: clerk.aiAudits, pending: clerk.pending,
        avgProcessingHrs, approvalRate, overrideRate, performanceScore,
        lastActive: clerk.lastActive,
        recentActions: clerk.recentActions,
        statusBreakdown: clerk.statusBreakdown,
      };
    }).sort((a, b) => b.totalProcessed - a.totalProcessed);

    const summary = {
      total:    apps.length,
      approved: apps.filter((a: any) => a.status === 'Verified_by_Clerk').length,
      rejected: apps.filter((a: any) => a.status === 'Rejected').length,
      pending:  apps.filter((a: any) => a.status === 'Pending' || a.status === 'Action_Required').length,
    };

    return NextResponse.json({ clerks, summary });
  } catch (err: any) {
    console.error('[clerk-performance] Unhandled error:', err);
    // Never crash the page — return safe empty state
    return NextResponse.json({
      clerks: [],
      summary: { total: 0, approved: 0, rejected: 0, pending: 0 },
      error: err.message || 'Internal server error'
    });
  }
}
