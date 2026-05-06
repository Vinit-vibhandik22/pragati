import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiJSON } from '@/lib/gemini'
import { GRIEVANCE_PROMPT } from '@/lib/claude'
import { generateGrievanceId, GRIEVANCE_SLA_CONFIG } from '@/lib/constants'
import { logAudit, AuditActions } from '@/lib/audit'
import type { Grievance, GrievanceAnalysisResponse } from '@/types'

/**
 * GET /api/grievances
 * Lists grievances with filters: status, priority, district
 * Sorted by priority DESC, sla_deadline ASC (overdue first)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const minPriority = searchParams.get('min_priority')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('grievances')
      .select('*', { count: 'exact' })
      .order('priority', { ascending: false })
      .order('sla_deadline', { ascending: true })
      .limit(limit)

    if (status) query = query.eq('status', status)
    if (minPriority) query = query.gte('priority', parseInt(minPriority))

    const { data, error, count } = await query

    if (error) {
      console.error('[grievances] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch grievances' }, { status: 500 })
    }

    // Enrich with overdue flag
    const now = new Date()
    const enriched = data?.map(g => ({
      ...g,
      is_overdue: g.sla_deadline ? new Date(g.sla_deadline) < now && g.status !== 'resolved' : false,
    }))

    return NextResponse.json({ data: enriched, total: count })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/grievances
 * Registers a new grievance with AI-powered category & priority detection
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { farmer_name, aadhaar_last4, village, taluka, district, complaint_text } = body

    if (!farmer_name || !complaint_text) {
      return NextResponse.json({ error: 'Missing name or complaint text' }, { status: 400 })
    }

    // Step 1: AI Analysis
    const analysis = await geminiJSON<GrievanceAnalysisResponse>(
      GRIEVANCE_PROMPT,
      `Complaint Text:\n${complaint_text}`
    )

    // Step 2: SLA Calculation
    const slaDays = GRIEVANCE_SLA_CONFIG[analysis.category] || 7
    const slaDeadline = new Date()
    slaDeadline.setDate(slaDeadline.getDate() + slaDays)

    const grievanceId = generateGrievanceId()

    // Step 3: Save to DB
    const { data, error } = await supabase
      .from('grievances')
      .insert({
        grievance_id: grievanceId,
        farmer_name,
        aadhaar_last4,
        village,
        taluka,
        district,
        complaint_text,
        category: analysis.category,
        priority: analysis.priority,
        priority_reason: analysis.priorityReason,
        status: 'open',
        sla_days: slaDays,
        sla_deadline: slaDeadline.toISOString(),
        registered_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('[grievances] DB insert error:', error)
      return NextResponse.json({ error: 'Failed to register grievance' }, { status: 500 })
    }

    // Audit log
    logAudit(supabase, AuditActions.grievanceRegistered(user.id, grievanceId))

    return NextResponse.json({
      success: true,
      grievance: data,
      analysis
    })
  } catch (error: any) {
    console.error('[grievances] POST error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
