import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiJSON } from '@/lib/gemini'
import { LEGAL_PROMPT } from '@/lib/claude'
import { extractText, getFileTypeKey } from '@/lib/ocr'
import type { LegalAnalysisResponse } from '@/types'

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

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

    const ocrResult = await extractText(fileBuffer, file.type)

    if (!ocrResult.text || ocrResult.text.length < 10) {
      return NextResponse.json({
        error: 'Could not extract readable text from document.',
        ocrConfidence: ocrResult.confidence,
      }, { status: 422 })
    }

    // Gemini Legal Analysis — use higher max_tokens for clause-level analysis
    const analysis = await geminiJSON<LegalAnalysisResponse>(
      LEGAL_PROMPT,
      `Legal Document Text:\n${ocrResult.text.slice(0, 4000)}`
    )

    return NextResponse.json({
      success: true,
      analysis,
      ocrConfidence: ocrResult.confidence,
      ocrMethod: ocrResult.method,
      disclaimer: 'AI assistance only — not legal advice. Officer/clerk remains signing authority.',
    })
  } catch (error: any) {
    console.error('[legal-analysis] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
