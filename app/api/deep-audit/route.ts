import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { evaluateDocumentsWithGemini } from '@/lib/gemini-evaluator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { application_id } = body;

    if (!application_id) {
      return NextResponse.json({ error: 'Missing application_id' }, { status: 400 });
    }

    // Initialize Supabase admin client to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createAdminClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 1. Fetch Application Details
    const { data: app, error: fetchError } = await supabase
      .from('farmer_applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (fetchError || !app) {
      throw new Error('Application or Farmer record not found.');
    }

    // 2. Fetch Document Buffers
    const imageBuffers: Buffer[] = [];
    const docTypes: string[] = [];
    const mimeTypes: string[] = [];

    // CASE A: Application has entries in the 'documents' table (KS Flow)
    const { data: docs, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('application_id', application_id);

    if (docs && docs.length > 0) {
      for (const doc of docs) {
        const bucket = doc.file_url.includes('pragati-documents') ? 'documents' : 'schemes';
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(doc.file_url);
        
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          imageBuffers.push(Buffer.from(arrayBuffer));
          docTypes.push(doc.document_type || 'Document');
          mimeTypes.push(data.type);
        }
      }
    }

    // CASE B: Fallback to document_urls array (Farmer Portal Flow)
    if (imageBuffers.length === 0) {
      const docUrls = (app.document_urls || []) as string[];
      for (let i = 0; i < docUrls.length; i++) {
          const url = docUrls[i];
          try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/public/');
            if (pathParts.length < 2) continue;
            
            const fullPath = pathParts[1];
            const bucket = fullPath.split('/')[0];
            const filePath = decodeURIComponent(fullPath.split('/').slice(1).join('/'));

            const { data, error } = await supabase.storage.from(bucket).download(filePath);
            if (!error && data) {
              imageBuffers.push(Buffer.from(await data.arrayBuffer()));
              // Extract a human-readable name from the filename in the URL
              const decodedPath = decodeURIComponent(filePath).replace(/_/g, ' ');
              const knownTypes = ['7/12 Extract', '8A Holding', 'Aadhaar Card', 'Caste Certificate', 'Bank Passbook Copy', 'Income Certificate', 'Quotation', 'Receipt'];
              
              let readableName = `Document ${i + 1}`;
              for (const kt of knownTypes) {
                if (decodedPath.toLowerCase().includes(kt.toLowerCase()) || 
                    decodedPath.toLowerCase().includes(kt.replace(/\//g, ' ').toLowerCase())) {
                  readableName = kt;
                  break;
                }
              }
              
              if (readableName === `Document ${i + 1}`) {
                const rawFileName = filePath.split('/').pop() || '';
                const nameParts = rawFileName.split('_').slice(2).join('_').split('.')[0];
                if (nameParts.length > 2) {
                  readableName = nameParts.replace(/-/g, ' ').replace(/_/g, ' ');
                }
              }
              docTypes.push(readableName);
              mimeTypes.push(data.type);
            }
          } catch (e) {
            console.error('[Deep Audit] Error downloading doc:', e);
          }
      }
    }

    let audit_report: any;

    if (imageBuffers.length > 0) {
      // 3. Prepare farmer details for Gemini
      const farmerDetails = {
        name: app.farmer_name || app.farmer_id?.split('_')[1] || "Farmer",
        aadhaar_last4: app.aadhaar_last4 || app.farmer_id?.split('_').pop() || "0000",
        survey_number: app.survey_number || "Not Specified",
        land_area: app.land_area || "Not Specified",
        subsidy_reason: app.subsidy_reason || app.scheme_name || "Not Specified"
      };

      // 4. Send all documents to Gemini 1.5 Flash for cross-referencing
      const nimVerdict = await evaluateDocumentsWithGemini(imageBuffers, docTypes, farmerDetails, mimeTypes);

      const statusMapped = nimVerdict.verdict === 'Verified' ? 'Safe' : (nimVerdict.verdict === 'Rejected' ? 'Rejected' : 'Manual_Review');

      // 5. Structure report for the UI
      audit_report = {
        overall_verdict: statusMapped,
        document_evaluations: docTypes.map((type, idx) => {
          const docEval = nimVerdict.document_evaluations?.[idx];
          const docStatus = docEval?.status === 'Verified' ? 'Safe' : (docEval?.status === 'Rejected' ? 'Rejected' : 'Manual_Review');
          return {
            document_name: docEval?.detected_document_type && docEval.detected_document_type !== 'Unknown' ? docEval.detected_document_type : (type || `Uploaded Document ${idx + 1}`),
            status: docStatus || statusMapped,
            clerk_explanation: docEval?.reason || nimVerdict.reason
          };
        })
      };

      // 6. Update database status
      await supabase
        .from('farmer_applications')
        .update({
          status: nimVerdict.verdict === 'Verified' ? 'Verified_by_AI' : 'Action_Required',
          discrepancy_reason: `DEEP_AUDIT: ${nimVerdict.reason}`,
          extracted_text: JSON.stringify(audit_report)
        })
        .eq('id', application_id);

    } else {
      // Fallback if no documents found
      audit_report = {
        overall_verdict: 'Manual_Review',
        document_evaluations: [
          {
            document_name: 'No Documents Found',
            status: 'Manual_Review',
            clerk_explanation: `No document uploads were found for ${app.farmer_id}. Manual review is required.`
          }
        ]
      };
      
      await supabase
        .from('farmer_applications')
        .update({
          status: 'Action_Required',
          discrepancy_reason: `DEEP_AUDIT: No documents found`
        })
        .eq('id', application_id);
    }

    return NextResponse.json({ 
      success: true, 
      audit_report
    });

  } catch (error: any) {
    console.error('[Deep Audit] Pipeline Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
