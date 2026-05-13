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

    // Fetch all applications that have been acted on by a clerk
    // (any that have reviewed_by_clerk_id set, or any status beyond Pending)
    const { data: apps, error } = await supabase
      .from('farmer_applications')
      .select('id, farmer_id, status, discrepancy_reason, created_at, updated_at, scheme_name, subsidy_reason, reviewed_by_clerk_id')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[clerk-performance] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    if (!apps || apps.length === 0) {
      return NextResponse.json({ clerks: [], summary: { total: 0, approved: 0, rejected: 0, pending: 0 } });
    }

    // -----------------------------------------------------------------------
    // Group by REAL clerk ID from reviewed_by_clerk_id column.
    // Apps without a clerk ID (still Pending / never touched by a clerk) go
    // into the summary totals but are NOT attributed to any clerk card.
    // Any NEW clerk ID written in the future automatically gets its own card.
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
      const clerkId: string = app.reviewed_by_clerk_id || null;
      const status: string = app.status || '';
      const reason: string = (app.discrepancy_reason || '').toUpperCase();

      // Apps with no clerk ID and still Pending are counted in summary but
      // not attributed to a clerk card.
      if (!clerkId) return;

      // Initialise slot on first encounter — supports any future clerk ID automatically
      if (!clerkMap[clerkId]) {
        clerkMap[clerkId] = {
          clerkId,
          approved: 0,
          rejected: 0,
          overrides: 0,
          aiAudits: 0,
          pending: 0,
          processingTimes: [],
          lastActive: '',
          recentActions: [],
          statusBreakdown: {},
        };
      }

      const clerk = clerkMap[clerkId];

      // Processing time (created → updated, capped at 30 days)
      const created = new Date(app.created_at).getTime();
      const updated = new Date(app.updated_at).getTime();
      const diffHours = Math.round(((updated - created) / (1000 * 60 * 60)) * 10) / 10;
      if (diffHours > 0 && diffHours < 720) clerk.processingTimes.push(diffHours);

      // Categorise action
      if (status === 'Verified_by_Clerk') {
        if (reason.includes('OVERRIDDEN')) clerk.overrides++;
        else clerk.approved++;
      } else if (status === 'Rejected') {
        clerk.rejected++;
      } else if (status === 'Verified_by_AI' || reason.includes('DEEP_AUDIT')) {
        clerk.aiAudits++;
      } else if (status === 'Pending' || status === 'Action_Required') {
        clerk.pending++;
      } else {
        // Phase 3 / TAO states — count as processed by clerk
        clerk.approved++;
      }

      // Status breakdown
      clerk.statusBreakdown[status] = (clerk.statusBreakdown[status] || 0) + 1;

      // Last active
      if (!clerk.lastActive || app.updated_at > clerk.lastActive) {
        clerk.lastActive = app.updated_at;
      }

      // Recent actions (cap at 5)
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

    // Build final per-clerk response
    const clerks = Object.values(clerkMap).map(clerk => {
      const totalProcessed = clerk.approved + clerk.rejected + clerk.overrides + clerk.aiAudits;
      const avgProcessingHrs = clerk.processingTimes.length > 0
        ? Math.round((clerk.processingTimes.reduce((a, b) => a + b, 0) / clerk.processingTimes.length) * 10) / 10
        : 0;
      const approvalRate = totalProcessed > 0
        ? Math.round(((clerk.approved + clerk.overrides) / totalProcessed) * 100)
        : 0;
      const overrideRate = totalProcessed > 0
        ? Math.round((clerk.overrides / totalProcessed) * 100)
        : 0;

      // Performance score: throughput (max 50) + quality/override penalty (max 50)
      const throughputScore = Math.min(totalProcessed * 2, 50);
      const qualityScore    = Math.max(0, 50 - overrideRate * 3);
      const performanceScore = Math.min(100, throughputScore + qualityScore);

      // Human-readable name: derive from clerk ID or display raw ID
      const displayName = (() => {
        const idUpper = clerk.clerkId.toUpperCase();
        if (idUpper === 'CLERK_DESHMUKH') return 'C. Deshmukh';
        if (idUpper === 'CLERK_MORE')     return 'K. More';
        if (idUpper === 'CLERK_SHINDE')   return 'S. Shinde';
        // Fallback: format raw ID nicely
        return clerk.clerkId.replace(/_/g, ' ').replace(/^CLERK /i, '');
      })();

      return {
        clerkId: clerk.clerkId,
        name: displayName,
        totalProcessed,
        approved: clerk.approved,
        rejected: clerk.rejected,
        overrides: clerk.overrides,
        aiAudits: clerk.aiAudits,
        pending: clerk.pending,
        avgProcessingHrs,
        approvalRate,
        overrideRate,
        performanceScore,
        lastActive: clerk.lastActive,
        recentActions: clerk.recentActions,
        statusBreakdown: clerk.statusBreakdown,
      };
    });

    // Sort by totalProcessed descending
    clerks.sort((a, b) => b.totalProcessed - a.totalProcessed);

    const summary = {
      total:    apps.length,
      approved: apps.filter((a: any) => a.status === 'Verified_by_Clerk').length,
      rejected: apps.filter((a: any) => a.status === 'Rejected').length,
      pending:  apps.filter((a: any) => a.status === 'Pending' || a.status === 'Action_Required').length,
    };

    return NextResponse.json({ clerks, summary });
  } catch (err: any) {
    console.error('[clerk-performance] Unhandled error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
