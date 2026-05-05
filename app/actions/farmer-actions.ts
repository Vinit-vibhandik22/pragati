'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { analyzeDocumentWithPaddleOCR } from '@/lib/ocr-service';
import { evaluateDocumentWithMistral } from '@/lib/nim-evaluator';

// Service Role Key bypasses RLS — fine for hackathon demo
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function submitFarmerApplication(prevState: any, formData: FormData) {
  try {
    const farmerName = formData.get('farmerName') as string;
    const aadhaarNumber = formData.get('aadhaarNumber') as string;
    const surveyNumber = formData.get('surveyNumber') as string;
    const district = formData.get('district') as string;
    const taluka = formData.get('taluka') as string;
    const schemeName = formData.get('schemeName') as string;

    // Validation
    if (!farmerName || !aadhaarNumber || !district) {
      return { success: false, error: 'Farmer Name, Aadhaar, and District are required.' };
    }

    // Generate a human-readable farmer_id
    const farmerId = `FARMER_${farmerName.replace(/\s+/g, '_').toUpperCase()}_${aadhaarNumber.slice(-4)}`;

    // Insert into farmer_applications with status 'Pending'
    // The AI batch processor picks up 'Pending' applications and routes them
    const { data, error } = await supabaseAdmin
      .from('farmer_applications')
      .insert({
        farmer_id: farmerId,
        scheme_id: 'SCH_PRAGATI_001',
        scheme_name: schemeName || 'Namo Shetkari Mahasanman Nidhi',
        status: 'Pending',
        discrepancy_reason: null,
        is_manually_overridden: false,
        document_urls: [],
      })
      .select('id')
      .single();

    if (error) throw error;

    // Bust the cache so the clerk sees it immediately after AI batch runs
    revalidatePath('/clerk/queue');
    revalidatePath('/clerk');
    revalidatePath('/tao/dashboard');

    return { 
      success: true, 
      applicationId: data?.id,
      farmerId: farmerId,
    };
  } catch (error: any) {
    console.error('Farmer Application Submit Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * AI Document Audit Pipeline
 * 1. OCR Extraction (PaddleOCR)
 * 2. Land Record Verification (Mistral Large 3 via NVIDIA NIM)
 * 3. Database Sync (Supabase)
 */
export async function processDocumentAudit(applicationId: string, formData: FormData) {
  try {
    console.log(`[Audit Pipeline] Starting audit for application: ${applicationId}`);

    // Step 1: Marathi OCR Extraction
    const ocrResult = await analyzeDocumentWithPaddleOCR(formData);
    
    if (!ocrResult.success || !ocrResult.fullText) {
      console.warn("[Audit Pipeline] OCR Failed or returned no text.");
      await supabaseAdmin
        .from('farmer_applications')
        .update({ 
          status: 'Action_Required', 
          discrepancy_reason: 'OCR_FAILURE: No Marathi text could be extracted from the document.' 
        })
        .eq('id', applicationId);
      
      return { success: false, verdict: "Manual_Review_Required", reason: "OCR Extraction failed." };
    }

    // Step 2: Fetch Farmer Details for cross-reference
    // Mocking the details fetch for the current application context
    const { data: appData } = await supabaseAdmin
      .from('farmer_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    const farmerDetails = {
      name: appData?.farmer_id?.split('_')[1] || "Farmer", 
      survey_number: appData?.survey_number || "123/A",
      land_area: appData?.land_area || "1.50",
      aadhaar_last4: appData?.farmer_id?.split('_').pop() || "0000"
    };

    // Step 3: Mistral Large 3 Evaluation (NVIDIA NIM)
    const auditVerdict = await evaluateDocumentWithMistral(ocrResult.fullText, farmerDetails);

    // Step 4: Save Verdict to Supabase
    const finalStatus = auditVerdict.verdict === 'Verified' ? 'Verified_by_AI' : 'Action_Required';
    const finalReason = `AI_AUDIT (${auditVerdict.verdict}): ${auditVerdict.reason}`;

    const { error: updateError } = await supabaseAdmin
      .from('farmer_applications')
      .update({
        status: finalStatus,
        discrepancy_reason: finalReason
      })
      .eq('id', applicationId);

    if (updateError) throw updateError;

    // Step 5: Refresh UI states
    revalidatePath('/clerk/queue');
    revalidatePath('/tao/dashboard');

    return {
      success: true,
      verdict: auditVerdict.verdict,
      reason: auditVerdict.reason,
      extractedData: auditVerdict.extractedData
    };

  } catch (error: any) {
    console.error('[Audit Pipeline] Critical System Error:', error.message);
    return { success: false, error: error.message };
  }
}
