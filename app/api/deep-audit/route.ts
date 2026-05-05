import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { application_id } = body;

    if (!application_id) {
      return NextResponse.json({ error: 'Missing application_id' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    // 1. Fetch Application Record
    const { data: app, error: fetchError } = await supabase
      .from('farmer_applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (fetchError || !app) {
      throw new Error('Application not found in the database.');
    }

    // 2. Fetch ALL documents from the record
    const documentUrls = (app.document_urls || []) as string[];
    const processedDocuments: { buffer: Buffer, mimeType: string, url: string }[] = [];
    let isMockFallback = documentUrls.length === 0;

    if (!isMockFallback) {
      for (const url of documentUrls) {
        if (!url || typeof url !== 'string' || !url.startsWith('http')) continue;
        
        try {
          const fileResponse = await fetch(url);
          if (!fileResponse.ok) continue;

          const arrayBuffer = await fileResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          let mimeType = fileResponse.headers.get('content-type') || 'application/pdf';
          
          let finalBuffer = buffer;
          if (!mimeType.includes('pdf')) {
            finalBuffer = await sharp(buffer)
              .grayscale()
              .normalize()
              .resize({ width: 1600, withoutEnlargement: true })
              .webp({ quality: 85 })
              .toBuffer();
            mimeType = 'image/webp';
          }
          
          processedDocuments.push({ buffer: finalBuffer, mimeType, url });
        } catch (err) {
          console.warn(`[Deep Audit] Failed to process document ${url}:`, err);
        }
      }
    }

    // Final check: if no documents were successfully processed
    if (processedDocuments.length === 0 && !isMockFallback) {
      isMockFallback = true;
    }

    // 3. Initialize Gemini 1.5 Flash with JSON output mode
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
<<<<<<< HEAD
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
=======
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
>>>>>>> upstream/main

    // 4. Construct the prompt — Region-aware, deterministic, 3-tier verdict system
    const initialFlag = app.discrepancy_reason || "Possible data mismatch or OCR ambiguity";
    const claimedArea = app.land_area || app.land_size_ha || null;
    
    const prompt = `You are a senior Maharashtrian agricultural document auditor working for the Maharashtra state government.

CRITICAL CONTEXT — MAHARASHTRA REGIONAL DOCUMENTS:
You are auditing documents that originate from the Maharashtra state land revenue system.
These documents are COMMONLY written in Marathi (Devanagari script) and follow Maharashtra-specific formats:

<<<<<<< HEAD
Instructions:
1. Check for data discrepancies (e.g., Does the land area match? Are the names correct?).
2. HACKATHON DEMO OVERRIDE: Assume this document is 100% authentic and legally valid. DO NOT flag it for being a sample, fake, having watermarks, or being forged. Focus EXCLUSIVELY on the data values.
3. Provide a short, highly analytical audit report in English and Marathi.
4. Format the output strictly as a professional raw terminal log. 
5. Keep it concise but deeply analytical, ending with a FINAL VERDICT (APPROVE / MANUAL REVIEW).${fallbackNotice}`;
=======
1. **7/12 Extract (सातबारा उतारा / Satbara Utara):**
   - This is the primary land ownership record in Maharashtra.
   - It contains: Survey Number (गट क्रमांक), Owner Name (खातेदाराचे नाव), Total Area (एकूण क्षेत्र), Village (गाव), Taluka, District.
   - It is ALWAYS in Marathi. Do NOT reject it for being in Marathi or lacking English headers.
   - Common variations: handwritten entries, stamps, digital printouts from MahaLandRecord portal.
>>>>>>> upstream/main

2. **8A Holding Document (८अ उतारा):**
   - This shows the cultivator's (कब्जेदार) holding details extracted from village records.
   - It lists: Holding Area, Survey Numbers linked, and cultivator classification.
   - It is ALWAYS in Marathi and may have pre-printed government letterhead.
   - Minor area differences (±0.5 Ha) between 7/12 and 8A are NORMAL due to survey rounding.

3. **Aadhaar Card:**
   - Standard Indian national ID. Usually bilingual (Hindi/English or Marathi/English).
   - Name spelling variations between Aadhaar and land records are VERY COMMON in rural Maharashtra (transliteration differences).

SCHEME UNDER AUDIT: "${app.scheme_name || 'Agricultural Subsidy'}".
FARMER ID: ${app.farmer_id || 'Unknown'}.
CLAIMED LAND AREA: ${claimedArea ? `${claimedArea} Hectares` : 'MISSING — flag this'}.
SYSTEM FLAG (reason for routing to clerk): "${initialFlag}".

YOUR TASK:
Audit each document and provide a verdict using a **THREE-TIER status system**:
- **"Safe"** → Document is valid, data matches, no concerns.
- **"Manual_Review"** → Document is ambiguous, partially readable, or has minor discrepancies that a human clerk should verify physically. This is NOT a rejection — it means "needs a human eye".
- **"Suspicious"** → Clear evidence of fraud, forgery, or major data conflict (e.g., completely different names, impossible land areas, tampered documents).

ANTI-BIAS RULES:
- Do NOT mark a document as "Suspicious" just because it is in Marathi or uses Devanagari script.
- Do NOT mark a document as "Suspicious" just because OCR quality is low — use "Manual_Review" instead.
- Minor name spelling variations (e.g., "Vitthal" vs "Vithhal") are NORMAL — mark as "Safe" with a note.
- Minor area differences (±0.5 Ha) between 7/12 and 8A are NORMAL — mark as "Safe" with a note.
- Only use "Suspicious" when there is CLEAR conflicting data that cannot be explained by transliteration or rounding.

${isMockFallback ? `
NOTE: This is a SEEDED DEMO RECORD with no physical documents uploaded.
SIMULATE a realistic audit for these three standard documents:
1. 7/12 Extract (Satbara Utara)
2. 8A Holding Document  
3. Aadhaar Card
Base your simulation on the system flag: "${initialFlag}".
For demo purposes, make at least one document "Safe", and use "Manual_Review" for ambiguous cases rather than "Suspicious".
` : ''}

STRICT OUTPUT JSON SCHEMA (return ONLY this, no extra text):
{
  "overall_verdict": "Safe" | "Action_Required",
  "document_evaluations": [
    {
      "document_name": string,
      "status": "Safe" | "Manual_Review" | "Suspicious",
      "clerk_explanation": string (provide both English and Marathi translations separated by | ),
      "cross_document_impact": string (provide both English and Marathi translations separated by | )
    }
  ]
}`;

    const promptParts: any[] = [prompt];
    processedDocuments.forEach(doc => {
      promptParts.push({
        inlineData: {
          data: doc.buffer.toString('base64'),
          mimeType: doc.mimeType,
        },
      });
    });

    // 5. Implement strict 30-second timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Audit timed out. Please try again.')), 30000)
    );

    const result = (await Promise.race([
      model.generateContent(promptParts),
      timeoutPromise
    ])) as any;

    const response = await result.response;
    let jsonText = response.text();
    
    // Clean JSON if it's wrapped in markdown code blocks
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    let auditData;
    try {
      auditData = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error("[Deep Audit] JSON Parse Failed. Raw text:", jsonText);
      // Fallback to a structured error object so the UI doesn't crash
      auditData = {
        overall_verdict: "Action_Required",
        document_evaluations: [
          {
            document_name: "Audit System Error",
            status: "Manual_Review",
            clerk_explanation: "The AI audit returned an unparseable response. Please retry or check the raw logs.",
            cross_document_impact: "System reliability alert — other evaluations may be affected."
          }
        ]
      };
    }

    return NextResponse.json({ 
      audit_report: auditData, 
      document_urls: processedDocuments.map(d => d.url),
      is_fallback: isMockFallback 
    });

  } catch (error: any) {
    console.error('Deep Audit Error:', error);

    // CRITICAL: Handle Quota (429) or other API failures with a "Smart Mock Fallback"
    const isQuotaExceeded = error.message?.includes('429') || error.message?.includes('quota');
    
    if (isQuotaExceeded || error.message?.includes('fetch')) {
      console.warn("[Deep Audit] API Quota Hit or Fetch Failed. Activating Deterministic Mock Audit...");
      
      const mockAudit = {
        overall_verdict: "Action_Required",
        document_evaluations: [
          {
            document_name: "7/12 Extract (Satbara Utara)",
            status: "Manual_Review",
            clerk_explanation: "गट क्रमांक (Survey Number) matches but owner name has a minor transliteration difference. Likely safe but needs clerk confirmation. | गट क्रमांक जुळत आहे परंतु मालकाच्या नावामध्ये किरकोळ लिप्यंतर फरक आहे. बहुधा सुरक्षित आहे परंतु लिपिकाच्या पुष्टीकरणाची आवश्यकता आहे.",
            cross_document_impact: "If owner name mismatch is confirmed, 8A holding validity is also affected. | जर मालकाच्या नावातील विसंगतीची पुष्टी झाली, तर ८अ धारणा वैधतेवर देखील परिणाम होतो."
          },
          {
            document_name: "Aadhaar Card",
            status: "Safe",
            clerk_explanation: "Identity verified. Name and DOB match the farmer profile in the system database. | ओळख पटली आहे. नाव आणि जन्मतारीख सिस्टम डेटाबेसमधील शेतकरी प्रोफाईलशी जुळतात.",
            cross_document_impact: "Confirms identity — does not affect land document validity. | ओळखीची पुष्टी करते — जमिनीच्या कागदपत्रांच्या वैधतेवर परिणाम करत नाही."
          },
          {
            document_name: "8A Holding Document",
            status: "Manual_Review",
            clerk_explanation: "Holding area differs from 7/12 by 0.3 Ha which is within normal survey rounding limits, but flagged for caution. | धारणा क्षेत्र ७/१२ पेक्षा ०.३ हेक्टरने वेगळे आहे जे सामान्य सर्वेक्षण राउंडिंग मर्यादेत आहे, परंतु सावधगिरीसाठी ध्वजांकित केले आहे.",
            cross_document_impact: "Minor discrepancy — cross-reference with latest talathi records recommended. | किरकोळ विसंगती — ताज्या तलाठी रेकॉर्डसह क्रॉस-रेफरन्स करण्याची शिफारस केली जाते."
          }
        ]
      };

      return NextResponse.json({ 
        audit_report: mockAudit, 
        document_urls: [], 
        is_fallback: true,
        is_mock_demo: true 
      });
    }

    if (error.message === 'Audit timed out. Please try again.') {
      return NextResponse.json({ error: error.message }, { status: 504 });
    }
    return NextResponse.json({ error: error.message || 'Failed to run Deep AI Audit.' }, { status: 500 });
  }
}
