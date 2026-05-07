'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { evaluateDocumentsWithGemini } from '@/lib/gemini-evaluator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});


const DEMO_VERDICT = {
  verdict: "Verified" as const,
  reason: "All documents verified. Land area 1.40 Ha within eligible range. Farmer name matches across documents. Caste: Nav-Boudha. Income: ₹98,000.",
  extractedData: {
    surveyNumber: "142/3",
    landArea: "1.40",
    farmerName: "रमाबाई विठ्ठल पाटील",
    caste: "Nav-Boudha",
    incomeAmount: "₹98,000",
    documentTypesDetected: ["7/12 Extract", "8A Ledger", "Caste Certificate", "Income Certificate"],
    officialSealDetected: true
  },
  failureReasons: []
};

export async function uploadAndVerifyDocuments(applicationId: string, formData: FormData) {
  try {
    const supabase = supabaseAdmin;
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    
    const docTypes = ['7/12 Extract', '8A Ledger', 'Caste Certificate', 'Income Certificate'];
    const docIds: string[] = [];
    const imageBuffers: Buffer[] = [];

    // 1. & 2. Upload to Storage and Insert into documents table
    for (const type of docTypes) {
      const file = formData.get(type) as File;
      if (!file) throw new Error(`Missing file for ${type}`);

      const timestamp = Date.now();
      const fileName = `${applicationId}/${type.replace(/\s+/g, '_')}/${timestamp}`;
      const filePath = `pragati-documents/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          application_id: applicationId,
          document_type: type,
          file_url: filePath,
          status: 'uploaded'
        })
        .select('id')
        .single();

      if (docError) throw docError;
      docIds.push(docData.id);

      // Prepare buffer for Gemini
      const arrayBuffer = await file.arrayBuffer();
      imageBuffers.push(Buffer.from(arrayBuffer));
    }

    let auditVerdict;

    if (isDemoMode) {
      console.log("[KS Action] DEMO MODE: Returning cached verdict.");
      auditVerdict = DEMO_VERDICT;
    } else {
      // 3. Call Gemini Evaluator
      // Fetch application details first
      const { data: appData } = await supabase
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

      auditVerdict = await evaluateDocumentsWithGemini(imageBuffers, docTypes, farmerDetails);
    }

    // 4. Insert result into ai_verification_runs
    const { error: runError } = await supabase
      .from('ai_verification_runs')
      .insert({
        application_id: applicationId,
        verdict: auditVerdict.verdict,
        reason: auditVerdict.reason,
        extracted_data: auditVerdict.extractedData,
        document_ids: docIds
      });

    if (runError) console.error("[KS Action] Error recording AI run:", runError);

    // 5. Transition status using RPC
    let nextStatus = 'PENDING_MANUAL_REVIEW';
    if (auditVerdict.verdict === 'Verified') nextStatus = 'AI_VERIFIED';
    if (auditVerdict.verdict === 'Rejected') nextStatus = 'AI_REJECTED';

    const { error: rpcError } = await supabase.rpc('transition_application_status', {
      app_id: applicationId,
      new_status: nextStatus
    });

    if (rpcError) {
        console.error("[KS Action] RPC Transition Error:", rpcError);
        // Fallback to direct update if RPC fails (some environments might not have it)
        await supabase.from('farmer_applications').update({ status: nextStatus }).eq('id', applicationId);
    }

    revalidatePath(`/applications/${applicationId}/documents`);
    
    return {
      success: true,
      verdict: auditVerdict.verdict,
      reason: auditVerdict.reason,
      extractedData: auditVerdict.extractedData,
      failureReasons: (auditVerdict as any).failureReasons || []
    };

  } catch (error: any) {
    console.error("[KS Action] Pipeline Error:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred during verification."
    };
  }
}
