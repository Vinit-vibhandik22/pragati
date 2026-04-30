import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeDistressScore } from '@/lib/distress'

/**
 * GET /api/distress
 * 
 * Returns top distressed farmers. Supports configurable limit.
 * Officer-only endpoint.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const minRisk = searchParams.get('min_risk') // LOW, MEDIUM, HIGH, CRITICAL

    let query = supabase
      .from('distress_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(limit)

    if (minRisk) {
      const riskLevels: Record<string, string[]> = {
        CRITICAL: ['CRITICAL'],
        HIGH: ['CRITICAL', 'HIGH'],
        MEDIUM: ['CRITICAL', 'HIGH', 'MEDIUM'],
        LOW: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      }
      const allowedLevels = riskLevels[minRisk] || riskLevels.LOW
      query = query.in('risk_level', allowedLevels)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch distress scores' }, { status: 500 })
    }

    // Enrich with urgency indicators
    const enriched = data?.map(d => ({
      ...d,
      needs_immediate_attention: d.risk_level === 'CRITICAL' && !d.officer_alerted,
      score_label: d.score >= 120 ? 'Critical' : d.score >= 70 ? 'High' : d.score >= 30 ? 'Moderate' : 'Low',
    }))

    return NextResponse.json({
      topDistress: enriched,
      total: enriched?.length || 0,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/distress
 * 
 * Compute (or recompute) distress score for a specific farmer.
 * Auto-upserts into distress_scores table.
 * Body: { farmerName, district, taluka?, identifier }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { farmerName, district, taluka, identifier } = await request.json()

    if (!farmerName || !district || !identifier) {
      return NextResponse.json({ error: 'Missing required parameters: farmerName, district, identifier' }, { status: 400 })
    }

    const distressScore = await computeDistressScore(
      supabase,
      farmerName,
      district,
      taluka || '',
      identifier
    )

    // Upsert the computed score
    const { data, error } = await supabase
      .from('distress_scores')
      .upsert({
        farmer_identifier: identifier,
        farmer_name: farmerName,
        district,
        taluka,
        score: distressScore.score,
        risk_level: distressScore.risk_level,
        signals: distressScore.signals,
        computed_at: new Date().toISOString(),
        officer_alerted: false, // Reset alert flag on recompute
      }, { onConflict: 'farmer_identifier' })
      .select()
      .single()

    if (error) {
      console.error('[distress] Upsert error:', error)
      // Still return computed score even if save fails
    }

    return NextResponse.json({
      success: true,
      distressScore: data || distressScore,
    })
  } catch (error) {
    console.error('[distress] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/distress
 * 
 * Mark a farmer's distress as "officer alerted" (acknowledged by officer).
 * Body: { farmer_identifier: string }
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { farmer_identifier } = await request.json()

    if (!farmer_identifier) {
      return NextResponse.json({ error: 'Missing farmer_identifier' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('distress_scores')
      .update({ officer_alerted: true })
      .eq('farmer_identifier', farmer_identifier)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true, distressScore: data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
