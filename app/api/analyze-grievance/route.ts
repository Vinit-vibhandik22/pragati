import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiJSON } from '@/lib/gemini'
import { GRIEVANCE_PROMPT } from '@/lib/claude'
import { GRIEVANCE_SLA_CONFIG, generateGrievanceId } from '@/lib/constants'
import { logAudit, AuditActions } from '@/lib/audit'
import { computeDistressScore } from '@/lib/distress'
import type { GrievanceAnalysisResponse, GrievanceCategory } from '@/types'

export const maxDuration = 15

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { complaintText, farmerDetails } = await request.json()

    if (!complaintText || !farmerDetails?.name) {
      return NextResponse.json(
        { error: 'Missing complaint text or farmer name' },
        { status: 400 }
      )
    }

    // Gemini NLP Analysis
    const analysis = await geminiJSON<GrievanceAnalysisResponse>(
      GRIEVANCE_PROMPT,
      `Complaint Text:\n${complaintText}`
    )

    // SLA Calculation
    const category = analysis.category as GrievanceCategory
    const slaDays = GRIEVANCE_SLA_CONFIG[category] ?? 7
    const slaDeadline = new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000).toISOString()
    const grievanceId = generateGrievanceId()

    // Auto-escalate priority 5
    const status = analysis.priority === 5 ? 'escalated' : 'registered'

    const newGrievance = {
      grievance_id: grievanceId,
      farmer_name: farmerDetails.name,
      aadhaar_last4: farmerDetails.aadhaarLast4 || null,
      phone: farmerDetails.phone || null,
      village: farmerDetails.village || null,
      taluka: farmerDetails.taluka || null,
      district: farmerDetails.district || null,
      complaint_text: complaintText,
      category,
      priority: analysis.priority,
      priority_reason: analysis.priorityReason,
      status,
      sla_days: slaDays,
      sla_deadline: slaDeadline,
      registered_by: user.id,
    }

    const { data: dbData, error: dbError } = await supabase
      .from('grievances')
      .insert(newGrievance)
      .select()
      .single()

    if (dbError) {
      console.error('[analyze-grievance] DB insert error:', dbError)
      return NextResponse.json({ error: 'Failed to save grievance' }, { status: 500 })
    }

    // Fire-and-forget: audit log + distress recompute
    logAudit(supabase, AuditActions.grievanceFiled(user.id, grievanceId))

    // Auto-recompute distress score if we have an identifier
    let distressAlert = null
    if (farmerDetails.aadhaarLast4 && farmerDetails.district) {
      try {
        const distress = await computeDistressScore(
          supabase,
          farmerDetails.name,
          farmerDetails.district,
          farmerDetails.taluka || '',
          farmerDetails.aadhaarLast4
        )

        // Upsert the new score
        await supabase
          .from('distress_scores')
          .upsert({
            farmer_identifier: farmerDetails.aadhaarLast4,
            farmer_name: farmerDetails.name,
            district: farmerDetails.district,
            taluka: farmerDetails.taluka || null,
            score: distress.score,
            risk_level: distress.risk_level,
            signals: distress.signals,
            computed_at: new Date().toISOString(),
          }, { onConflict: 'farmer_identifier' })

        // Alert if CRITICAL or HIGH
        if (distress.risk_level === 'CRITICAL' || distress.risk_level === 'HIGH') {
          distressAlert = {
            risk_level: distress.risk_level,
            score: distress.score,
            message: `⚠️ Farmer ${farmerDetails.name} distress score: ${distress.score} (${distress.risk_level})`,
            signals: distress.signals,
          }
        }
      } catch (err) {
        console.error('[analyze-grievance] Distress compute failed (non-blocking):', err)
      }
    }

    return NextResponse.json({
      success: true,
      grievance: dbData,
      analysis,
      slaDeadline,
      slaDays,
      distressAlert,
    })
  } catch (error: any) {
    console.error('[analyze-grievance] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
