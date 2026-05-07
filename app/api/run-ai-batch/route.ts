import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { evaluateDocumentsWithGemini } from '@/lib/gemini-evaluator';

// Initialize Supabase admin client to bypass RLS for server-side batch processing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

/**
 * Real AI Classification using Gemini 1.5 Flash.
 * Fetches documents from storage and evaluates them against farmer profile.
 */
async function classifyApplicationWithGemini(app: any) {
  try {
    // 1. Fetch documents for this application
    const { data: docs, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('application_id', app.id);

    if (docError || !docs || docs.length === 0) {
      // Fallback for applications that might only have document_urls array
      const docUrls = (app.document_urls || []) as string[];
      if (docUrls.length === 0) {
        return {
          verdict: 'Manual_Review_Required',
          proposed_status: 'Action_Required',
          discrepancy_reason: 'No documents found for this application.',
          extractedData: null
        };
      }
      // If we have URLs but no documents table entries, we'd need to download from URLs.
      // For the demo, we assume the KS flow (documents table) is used.
    }

    // 2. Download document buffers from Storage
    const imageBuffers: Buffer[] = [];
    const docTypes: string[] = [];

    // CASE A: Application has entries in the 'documents' table (KS Flow)
    if (docs && docs.length > 0) {
      for (const doc of docs) {
        const bucket = doc.file_url.includes('pragati-documents') ? 'documents' : 'schemes';
        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .download(doc.file_url);
        
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          imageBuffers.push(Buffer.from(arrayBuffer));
          docTypes.push(doc.document_type);
        }
      }
    } 
    
    // CASE B: Fallback to document_urls array (Farmer Portal Flow)
    if (imageBuffers.length === 0) {
      const docUrls = (app.document_urls || []) as string[];
      for (const url of docUrls) {
        try {
          // Extract path from public URL: https://.../object/public/BUCKET/PATH
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/public/');
          if (pathParts.length < 2) continue;
          
          const fullPath = pathParts[1];
          const bucket = fullPath.split('/')[0];
          const filePath = fullPath.split('/').slice(1).join('/');

          const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .download(filePath);
          
          if (!error && data) {
            const arrayBuffer = await data.arrayBuffer();
            imageBuffers.push(Buffer.from(arrayBuffer));
            // Try to infer type from filename
            const type = filePath.includes('7/12') ? '7/12 Extract' : 
                         filePath.includes('8A') ? '8A Ledger' : 
                         filePath.includes('Aadhaar') ? 'Aadhaar Card' : 'Document';
            docTypes.push(type);
          }
        } catch (e) {
          console.error("[Batch AI] URL Parse Error:", e);
        }
      }
    }

    if (imageBuffers.length === 0) {

      return {
        verdict: 'Manual_Review_Required',
        proposed_status: 'Action_Required',
        discrepancy_reason: 'Documents were found but could not be downloaded from storage.',
        extractedData: null
      };
    }

    // 3. Prepare Farmer Details
    const farmerDetails = {
      name: app.farmer_name || app.farmer_id?.split('_')[1] || "Farmer",
      aadhaar_last4: app.aadhaar_last4 || app.farmer_id?.split('_').pop() || "0000",
      survey_number: app.survey_number || "123/A",
      land_area: app.land_area || "1.50"
    };

    // 4. Call Gemini 1.5 Flash
    console.log(`[Batch AI] Processing application ${app.id} with Gemini...`);
    const result = await evaluateDocumentsWithGemini(imageBuffers, docTypes, farmerDetails);

    return {
      verdict: result.verdict,
      proposed_status: result.verdict === 'Verified' ? 'Verified_by_AI' : 'Action_Required',
      discrepancy_reason: result.reason,
      extractedData: result.extractedData
    };

  } catch (error: any) {
    console.error(`[Batch AI] Error processing application ${app.id}:`, error.message);
    return {
      verdict: 'Manual_Review_Required',
      proposed_status: 'Action_Required',
      discrepancy_reason: `AI Pipeline Error: ${error.message}`,
      extractedData: null
    };
  }
}

async function runAIBatch() {
  try {
    // 1. Fetch pending applications
    const { data: pendingApps, error: fetchError } = await supabaseAdmin
      .from('farmer_applications')
      .select('*')
      .eq('status', 'Pending');

    if (fetchError) {
      throw new Error(`Database fetch error: ${fetchError.message}`);
    }

    if (!pendingApps || pendingApps.length === 0) {
      return NextResponse.json({ message: "No pending applications found." }, { status: 200 });
    }

    let routedToOfficer = 0;
    let routedToClerk = 0;

    // 2. Real AI Processing via Gemini 1.5 Flash
    const evaluations = await Promise.all(pendingApps.map(async (app) => {
      const result = await classifyApplicationWithGemini(app);

      // PERSIST: Update the database with the real AI verdict
      const { error: updateError } = await supabaseAdmin
        .from('farmer_applications')
        .update({
          status: result.proposed_status,
          discrepancy_reason: `AI_BATCH_AUDIT: ${result.discrepancy_reason}`
        })
        .eq('id', app.id);

      if (updateError) console.error(`[Batch AI] DB Update Error for ${app.id}:`, updateError.message);

      if (result.proposed_status === 'Verified_by_AI') {
        routedToOfficer++;
      } else {
        routedToClerk++;
      }

      return {
        ...app,
        verdict: result.verdict,
        proposed_status: result.proposed_status,
        discrepancy_reason: result.discrepancy_reason,
        extracted_data: result.extractedData
      };
    }));

    // Return evaluations for the Human-in-the-Loop modal
    return NextResponse.json({
      message: "AI Batch Processing Complete. Awaiting Human Review.",
      processed_count: evaluations.length,
      routed_to_officer: routedToOfficer,
      routed_to_clerk: routedToClerk,
      evaluations,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error("AI Batch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Export Handlers
export async function GET() {
  return runAIBatch();
}

export async function POST() {
  return runAIBatch();
}
