'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { evaluateDocumentsWithGemini } from '@/lib/gemini-evaluator';

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
 * AI Document Audit Pipeline (Gemini 1.5 Flash)
 * 1. Collect all document images
 * 2. Vision-Language Verification (Gemini 1.5 Flash)
 * 3. Database Sync (Supabase)
 */
export async function processDocumentAudit(applicationId: string, formData: FormData) {
  try {
    console.log(`[Audit Pipeline] Starting Gemini 1.5 Flash audit for application: ${applicationId}`);

    const files = formData.getAll('files') as File[];
    const docTypes = formData.getAll('types') as string[];

    if (!files || files.length === 0) {
      console.warn("[Audit Pipeline] No documents provided for audit.");
      return { success: false, reason: "No documents provided." };
    }

    // Step 1: Convert files to buffers for Gemini
    const imageBuffers: Buffer[] = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      imageBuffers.push(Buffer.from(arrayBuffer));
    }

    // Step 2: Fetch Farmer Details for cross-reference
    const { data: appData } = await supabaseAdmin
      .from('farmer_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    // In a real app, you'd fetch the actual farmer profile. 
    // Here we extract details from the application or use defaults.
    const farmerDetails = {
      name: appData?.farmer_id?.split('_')[1] || "Farmer", 
      survey_number: appData?.survey_number || "123/A",
      land_area: appData?.land_area || "1.50",
      aadhaar_last4: appData?.farmer_id?.split('_').pop() || "0000"
    };

    // Step 3: Gemini 1.5 Flash Vision Evaluation
    const auditVerdict = await evaluateDocumentsWithGemini(imageBuffers, docTypes, farmerDetails);

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

/**
 * Bypasses RLS for document uploads during hackathon/demo.
 * Uploads file to Supabase Storage using admin client.
 */
export async function uploadDocumentAction(fileName: string, fileData: string, contentType: string) {
  try {
    const buffer = Buffer.from(fileData, 'base64');
    
    const { data, error } = await supabaseAdmin.storage
      .from('schemes')
      .upload(fileName, buffer, {
        contentType,
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabaseAdmin.storage.from('schemes').getPublicUrl(fileName);
    
    return { success: true, publicUrl: urlData.publicUrl };
  } catch (error: any) {
    console.error("[Upload Action] Error:", error.message);
    return { success: false, error: error.message };
  }
}
