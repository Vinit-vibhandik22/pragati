import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeDocumentWithPaddleOCR } from '@/lib/ocr-service';
import { evaluateDocumentWithMistral } from '@/lib/nim-evaluator';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { application_id } = body;

    if (!application_id) {
      return NextResponse.json({ error: 'Missing application_id' }, { status: 400 });
    }

    // 1. Fetch Application & Farmer Details
    const { data: app, error: fetchError } = await supabase
      .from('applications')
      .select(`
        *,
        farmer:farmers(*)
      `)
      .eq('id', application_id)
      .single();

    if (fetchError || !app) {
      throw new Error('Application or Farmer record not found.');
    }

    // 2. Fetch Documents for this application
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('application_id', application_id);

    if (docsError || !docs || docs.length === 0) {
      throw new Error('No documents found for this application.');
    }

    // 3. OCR Pipeline: Process each document with PaddleOCR
    console.log(`[AI Pipeline] Starting OCR for ${docs.length} documents...`);
    let combinedOcrText = '';
    const processedDocIds: string[] = [];

    for (const doc of docs) {
      try {
        // Generate signed URL to fetch file for OCR
        const { data: signData } = await supabase.storage
          .from('private_docs')
          .createSignedUrl(doc.storage_path, 60);

        if (!signData?.signedUrl) continue;

        const fileRes = await fetch(signData.signedUrl);
        const blob = await fileRes.blob();
        const formData = new FormData();
        formData.append('file', blob, doc.storage_path.split('/').pop());

        const ocrResult = await analyzeDocumentWithPaddleOCR(formData);
        if (ocrResult.success) {
          combinedOcrText += `\n--- DOCUMENT: ${doc.document_type} ---\n${ocrResult.fullText}\n`;
          processedDocIds.push(doc.id);
          
          // Store OCR text back to document record for future reference
          await supabase.from('documents').update({ ocr_text: ocrResult.fullText }).eq('id', doc.id);
        }
      } catch (err) {
        console.error(`[AI Pipeline] OCR Failed for doc ${doc.id}:`, err);
      }
    }

    if (!combinedOcrText) {
      throw new Error('Failed to extract text from any documents.');
    }

    // 4. NIM Evaluator: Mistral Large 3 Verification
    console.log(`[AI Pipeline] Invoking Mistral NIM for verdict...`);
    const nimVerdict = await evaluateDocumentWithMistral(combinedOcrText, {
      name: app.farmer.full_name_english,
      full_name_marathi: app.farmer.full_name_marathi,
      aadhaar_number: app.farmer.aadhaar_number,
      survey_number: app.survey_number,
      land_area_ha: app.land_area_ha,
      caste_category: app.farmer.caste_category,
      annual_income: app.farmer.annual_income,
      village: app.village_id
    });

    // 5. Write to ai_verification_runs
    const { data: run, error: runError } = await supabase
      .from('ai_verification_runs')
      .insert({
        application_id,
        triggered_by: user.id,
        status: 'completed',
        verdict: nimVerdict.verdict,
        verdict_reason: nimVerdict.reason,
        extracted_data: nimVerdict.extractedData,
        document_ids: processedDocIds,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (runError) throw runError;

    // 6. State Machine: Auto-transition based on verdict
    const newState = nimVerdict.verdict === 'Verified' ? 'AI_VERIFIED' : 
                     nimVerdict.verdict === 'Rejected' ? 'AI_REJECTED' : 'PENDING_MANUAL_REVIEW';

    await supabase.rpc('transition_application_status', {
      p_app_id: application_id,
      p_new_state: newState,
      p_actor_id: user.id,
      p_metadata: { ai_run_id: run.id, verdict: nimVerdict.verdict }
    });

    // 7. Update latest_ai_run_id on application
    await supabase.from('applications').update({ latest_ai_run_id: run.id }).eq('id', application_id);

    return NextResponse.json({ 
      success: true, 
      verdict: nimVerdict.verdict, 
      reason: nimVerdict.reason,
      run_id: run.id
    });

  } catch (error: any) {
    console.error('[Deep Audit] Pipeline Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
