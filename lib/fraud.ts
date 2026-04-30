import { SupabaseClient } from '@supabase/supabase-js'
import type { NewApplication, IrregularityResult, IrregularityFlag } from '@/types'

/**
 * Deterministic irregularity detection engine.
 * 
 * Runs 5 checks in parallel (no AI cost, ~200ms total):
 *  1. Duplicate Aadhaar — same last-4 in same district
 *  2. Claim amount anomaly — >2.5x district average for same doc type
 *  3. Village cluster — abnormal daily submission volume
 *  4. Duplicate land survey — same Gat/Survey No in existing applications
 *  5. Same-scheme duplicate — same person applying for same scheme twice
 */
export async function checkIrregularities(
  supabase: SupabaseClient,
  application: NewApplication
): Promise<IrregularityResult> {
  // Run all checks in parallel for speed
  const [
    aadhaarFlags,
    amountFlags,
    clusterFlags,
    landFlags,
    schemeFlags,
  ] = await Promise.all([
    checkDuplicateAadhaar(supabase, application),
    checkAmountAnomaly(supabase, application),
    checkVillageCluster(supabase, application),
    checkDuplicateLand(supabase, application),
    checkDuplicateScheme(supabase, application),
  ])

  const flags: IrregularityFlag[] = [
    ...aadhaarFlags,
    ...amountFlags,
    ...clusterFlags,
    ...landFlags,
    ...schemeFlags,
  ]

  const highFlags = flags.filter(f => f.severity === 'high')
  const riskScore = highFlags.length > 0 ? 'HIGH' : flags.length > 0 ? 'MEDIUM' : 'LOW'

  return { riskScore, flags } as IrregularityResult
}

// ─── Check 1: Duplicate Aadhaar ─────────────────────────────────────────────

async function checkDuplicateAadhaar(
  supabase: SupabaseClient,
  app: NewApplication
): Promise<IrregularityFlag[]> {
  if (!app.aadhaar_last4 || !app.district) return []

  const { data } = await supabase
    .from('applications')
    .select('id, app_id, farmer_name, scheme_name')
    .eq('aadhaar_last4', app.aadhaar_last4)
    .eq('district', app.district)
    .neq('status', 'rejected')
    .limit(5)

  if (!data || data.length === 0) return []

  // If same aadhaar + different name → high severity (possible identity theft)
  const differentName = data.find(
    d => d.farmer_name.toLowerCase().trim() !== app.farmer_name.toLowerCase().trim()
  )

  if (differentName) {
    return [{
      type: 'duplicate_aadhaar',
      detail: `Same Aadhaar last-4 used by "${differentName.farmer_name}" in ${differentName.app_id}`,
      severity: 'high',
      matched_app_id: differentName.app_id,
    }]
  }

  // Same aadhaar + same name → just informational (same farmer, multiple apps)
  if (data.length >= 3) {
    return [{
      type: 'duplicate_aadhaar',
      detail: `${data.length} existing applications from same Aadhaar (${app.aadhaar_last4})`,
      severity: 'medium',
    }]
  }

  return []
}

// ─── Check 2: Claim Amount Anomaly ──────────────────────────────────────────

async function checkAmountAnomaly(
  supabase: SupabaseClient,
  app: NewApplication
): Promise<IrregularityFlag[]> {
  if (!app.claimed_amount || !app.document_type || !app.district) return []

  const { data } = await supabase
    .from('applications')
    .select('claimed_amount')
    .eq('district', app.district)
    .eq('document_type', app.document_type)
    .not('claimed_amount', 'is', null)

  if (!data || data.length < 5) return [] // Not enough data for statistical baseline

  const amounts = data.map(r => r.claimed_amount as number).sort((a, b) => a - b)
  const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length

  // Also compute median for more robust comparison
  const median = amounts[Math.floor(amounts.length / 2)]
  const threshold = Math.min(avg * 2.5, median * 4) // Use whichever is lower

  if (app.claimed_amount > threshold) {
    return [{
      type: 'amount_anomaly',
      detail: `Claim ₹${app.claimed_amount.toLocaleString('en-IN')} vs district avg ₹${Math.round(avg).toLocaleString('en-IN')} (median ₹${Math.round(median).toLocaleString('en-IN')})`,
      severity: 'high',
    }]
  }

  return []
}

// ─── Check 3: Village Cluster ───────────────────────────────────────────────

async function checkVillageCluster(
  supabase: SupabaseClient,
  app: NewApplication
): Promise<IrregularityFlag[]> {
  if (!app.village) return []

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('village', app.village)
    .gte('submitted_at', yesterday)

  if (count && count >= 10) {
    return [{
      type: 'village_cluster',
      detail: `${count} applications from ${app.village} in last 24 hours`,
      severity: count >= 20 ? 'high' : 'medium',
    }]
  }

  return []
}

// ─── Check 4: Duplicate Land Survey Number ──────────────────────────────────

async function checkDuplicateLand(
  supabase: SupabaseClient,
  app: NewApplication
): Promise<IrregularityFlag[]> {
  if (!app.extracted_text) return []

  // Match Maharashtra survey number patterns: Gat No. 45, Survey No 123/2, Gut No 67, etc.
  const surveyMatch = app.extracted_text.match(
    /(?:gat|survey|sur|gut|s\.no)[\s.]*(?:no|number|num|n)?[\s.]*(\d+(?:\/\d+)?)/i
  )

  if (!surveyMatch?.[1]) return []

  const surveyNum = surveyMatch[1]

  const { data } = await supabase
    .from('applications')
    .select('id, app_id, farmer_name')
    .ilike('extracted_text', `%${surveyNum}%`)
    .neq('status', 'rejected')
    .limit(3)

  if (!data || data.length === 0) return []

  // If different farmer name → higher severity
  const differentOwner = data.find(
    d => d.farmer_name.toLowerCase().trim() !== app.farmer_name.toLowerCase().trim()
  )

  if (differentOwner) {
    return [{
      type: 'possible_duplicate_land_record',
      detail: `Survey/Gat No ${surveyNum} also claimed by "${differentOwner.farmer_name}" in ${differentOwner.app_id}`,
      severity: 'high',
      matched_app_id: differentOwner.app_id,
    }]
  }

  return [{
    type: 'possible_duplicate_land_record',
    detail: `Survey/Gat No ${surveyNum} appears in ${data.length} existing application(s)`,
    severity: 'medium',
    matched_app_id: data[0].app_id,
  }]
}

// ─── Check 5: Same-Scheme Duplicate Application ─────────────────────────────

async function checkDuplicateScheme(
  supabase: SupabaseClient,
  app: NewApplication
): Promise<IrregularityFlag[]> {
  if (!app.scheme_name || !app.farmer_name) return []

  const { data } = await supabase
    .from('applications')
    .select('id, app_id, status, submitted_at')
    .eq('farmer_name', app.farmer_name)
    .eq('scheme_name', app.scheme_name)
    .neq('status', 'rejected')
    .limit(3)

  if (!data || data.length === 0) return []

  // Active (non-rejected) application for same scheme exists
  const activeApp = data.find(d => ['pending', 'in_review', 'approved'].includes(d.status))

  if (activeApp) {
    return [{
      type: 'duplicate_scheme_application',
      detail: `Already has ${activeApp.status} application for "${app.scheme_name}" (${activeApp.app_id})`,
      severity: activeApp.status === 'approved' ? 'high' : 'medium',
      matched_app_id: activeApp.app_id,
    }]
  }

  return []
}
