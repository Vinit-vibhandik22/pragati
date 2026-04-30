import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiJSON } from '@/lib/gemini'
import { CLASSIFY_PROMPT, PREREJECT_PROMPT } from '@/lib/claude'
import { checkIrregularities } from '@/lib/fraud'
import { extractText, getFileTypeKey } from '@/lib/ocr'
import { generateAppId, SLA_CONFIG } from '@/lib/constants'
import { logAudit, AuditActions } from '@/lib/audit'
import type { ClassifyDocumentResponse, NewApplication, PreRejectionWarning } from '@/types'

export const maxDuration = 30 // Vercel serverless timeout in seconds

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const farmerName = formData.get('farmerName') as string
    const aadhaarLast4 = formData.get('aadhaarLast4') as string
    const village = formData.get('village') as string
    const taluka = formData.get('taluka') as string
    const district = formData.get('district') as string

    if (!file || !farmerName || !district) {
      return NextResponse.json(
        { error: 'Missing required fields: file, farmerName, district' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileTypeKey = getFileTypeKey(file.type)

    if (!fileTypeKey) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload PDF, JPG, or PNG.' },
        { status: 400 }
      )
    }

    // ─── Step 1: OCR + Storage Upload (parallel) ────────────────────────────

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const [ocrResult, uploadResult] = await Promise.all([
      extractText(fileBuffer, file.type),
      supabase.storage.from('documents').upload(fileName, fileBuffer, {
        contentType: file.type,
      }),
    ])

    let fileUrl = ''
    if (!uploadResult.error && uploadResult.data) {
      const { data } = supabase.storage.from('documents').getPublicUrl(uploadResult.data.path)
      fileUrl = data.publicUrl
    }

    const extractedText = ocrResult.text

    if (!extractedText || extractedText.length < 10) {
      return NextResponse.json({
        error: 'Could not extract readable text from document. Please upload a clearer scan.',
        ocrConfidence: ocrResult.confidence,
      }, { status: 422 })
    }

    // ─── Step 2: Claude Classification + Pre-Rejection (PARALLEL) ───────────
    // Running both AI calls at the same time saves ~4 seconds

    const preRejectionWarnings: PreRejectionWarning[] = []

    // Rule-based pre-rejection checks (instant, no API cost)
    if (aadhaarLast4 && !/^\d{4}$/.test(aadhaarLast4)) {
      preRejectionWarnings.push({
        field: 'Aadhaar Last 4',
        issue: 'Invalid format — must be exactly 4 digits',
        suggestedFix: 'Re-enter the last 4 digits of the Aadhaar card.',
        severity: 'error',
      })
    }

    // Check for survey number format (Maharashtra Gat/Survey No)
    const hasSurveyNo = /(?:gat|survey|gut|sur)[\s.]*(?:no|number|num)?[\s.]*\d/i.test(extractedText)

    const [classification, nameCheck] = await Promise.all([
      geminiJSON<ClassifyDocumentResponse>(
        CLASSIFY_PROMPT,
        `Extracted Text:\n${extractedText.slice(0, 3000)}` // Limit to 3000 chars to control cost
      ),
      geminiJSON<{ nameMatch: boolean; issue: string | null }>(
        PREREJECT_PROMPT,
        `Document text:\n${extractedText.slice(0, 2000)}\n\nProfile name entered by clerk: ${farmerName}`
      ),
    ])

    if (!nameCheck.nameMatch) {
      preRejectionWarnings.push({
        field: 'Name Mismatch',
        issue: nameCheck.issue || 'Name in document does not match profile entry',
        suggestedFix: 'Verify the name on the physical document and correct the profile entry.',
        severity: 'warning',
      })
    }

    // ─── Step 3: Build application & run fraud check (parallel-ready) ───────

    const appId = generateAppId()

    const newApp: NewApplication = {
      app_id: appId,
      farmer_name: farmerName,
      aadhaar_last4: aadhaarLast4 || null,
      village: village || null,
      taluka: taluka || null,
      district,
      document_type: classification.documentType,
      scheme_name: classification.schemeName,
      claimed_amount: classification.claimedAmount,
      extracted_text: extractedText,
      file_url: fileUrl,
      risk_score: 'LOW',
      irregularity_flags: [],
      status: 'pending',
      department: classification.department,
      submitted_by: user.id,
      pre_rejection_warnings: preRejectionWarnings,
    }

    const irregularityResult = await checkIrregularities(supabase, newApp)
    newApp.risk_score = irregularityResult.riskScore
    newApp.irregularity_flags = irregularityResult.flags

    if (newApp.risk_score === 'HIGH') {
      newApp.status = 'held'
    }

    // ─── Step 4: Save to DB ─────────────────────────────────────────────────

    const { data: dbData, error: dbError } = await supabase
      .from('applications')
      .insert({
        ...newApp,
        file_type: fileTypeKey,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[classify-document] DB insert error:', dbError)
      return NextResponse.json({ error: 'Failed to save application' }, { status: 500 })
    }

    // Fire-and-forget audit logging
    logAudit(supabase, AuditActions.applicationCreated(user.id, appId))
    if (newApp.risk_score !== 'LOW') {
      logAudit(supabase, AuditActions.irregularityDetected(
        user.id, appId, newApp.risk_score, newApp.irregularity_flags.length
      ))
    }

    return NextResponse.json({
      success: true,
      application: dbData,
      classification,
      ocrConfidence: ocrResult.confidence,
      ocrMethod: ocrResult.method,
      preRejectionWarnings,
    })
  } catch (error: any) {
    console.error('[classify-document] Pipeline error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
