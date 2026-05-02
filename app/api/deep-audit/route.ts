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

    let documentUrl = '';
    let isMockFallback = false;

    if (!app.document_urls || app.document_urls.length === 0) {
      isMockFallback = true;
    } else {
      documentUrl = app.document_urls[0];
      // Handle cases where the URL is empty or invalid string
      if (!documentUrl || typeof documentUrl !== 'string' || !documentUrl.startsWith('http')) {
        isMockFallback = true;
      }
    }

    let finalBuffer: Buffer | null = null;
    let mimeType = 'application/pdf';

    if (!isMockFallback && documentUrl) {
      try {
        // 2. Fetch the actual file from the URL to pass to Gemini
        const fileResponse = await fetch(documentUrl);
        
        if (!fileResponse.ok) {
          console.warn(`[Deep Audit] Failed to fetch document from storage (${fileResponse.status}). Falling back to text-only mode.`);
          isMockFallback = true;
        } else {
          const arrayBuffer = await fileResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Guess MIME type
          mimeType = fileResponse.headers.get('content-type') || 'application/pdf';
          
          // PREPROCESS WITH SHARP for "Wow Factor" OCR reliability
          finalBuffer = buffer;
          if (!mimeType.includes('pdf')) {
            finalBuffer = await sharp(buffer)
              .grayscale()
              .normalize()
              .resize({ width: 1600, withoutEnlargement: true })
              .webp({ quality: 85 })
              .toBuffer();
            mimeType = 'image/webp';
          }
        }
      } catch (err) {
        console.warn(`[Deep Audit] Exception while fetching document: ${err}. Falling back to text-only mode.`);
        isMockFallback = true;
      }
    }

    // 3. Initialize Gemini 2.5 Flash (Latest stable model supporting generateContent on v1beta)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 4. Construct the prompt - Rigged for Demo consistency
    const initialFlag = app.discrepancy_reason || "Possible data mismatch or OCR ambiguity";
    const claimedArea = app.land_area || app.land_size_ha || null;
    const fallbackNotice = isMockFallback ? "\n\n(System Note: No physical document attached to DB. This is a seeded demo record. Please evaluate the textual data and the initial scanner flag directly to produce a valid response.)" : "";
    
    const prompt = `You are an expert Maharashtrian agricultural auditor and fraud-detection AI. 
Analyze the provided document (such as a 7/12 extract, 8A holding, or Aadhaar).
The farmer is applying for the scheme: "${app.scheme_name || 'Agricultural Subsidy'}".

Farmer's Claimed Data:
- Claimed Land Area: ${claimedArea ? `${claimedArea} Hectares` : 'MISSING / NULL'}

SYSTEM ALERT: This application was initially flagged by the PRAGATI lightweight scanner for: "${initialFlag}".

Instructions:
1. HACKATHON DEMO OVERRIDE: Your job is ONLY to elaborate technically on the existing system flag: "${initialFlag}". Do NOT contradict it. 
2. Analyze the document provided (if any) and identify evidence that supports the system flag.
3. INCOMPLETE FORM FALLBACK: If the farmer's claimed area is MISSING or NULL, explicitly point out that "The application form is incomplete as the claimed land area is missing," rather than solely blaming the document for a mismatch.
4. BLURRY/LOW-CONTRAST HANDLING: If the document is blurry or difficult to read due to poor scan quality, attempt your best to extract the core numeric values (like land area in Hectares). If it is completely illegible, return exactly this specific error flag: 'OCR_FAILED_POOR_QUALITY' instead of hallucinating data.
5. Provide a short, highly analytical audit report in English and Marathi, explaining exactly WHY this error is valid.
6. Format the output strictly as a professional raw terminal log.
7. FINAL VERDICT: If not illegible, you MUST end your report with "FINAL VERDICT: MANUAL REVIEW (System Flag Confirmed)".

${fallbackNotice}`;

    const promptParts: any[] = [prompt];
    
    if (finalBuffer) {
      promptParts.push({
        inlineData: {
          data: finalBuffer.toString('base64'),
          mimeType,
        },
      });
    }

    // 5. Implement strict 25-second timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Audit timed out. Please try again.')), 25000)
    );

    const result = (await Promise.race([
      model.generateContent(promptParts),
      timeoutPromise
    ])) as any;

    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ audit_report: text, document_url: documentUrl, is_fallback: isMockFallback });

  } catch (error: any) {
    console.error('Deep Audit Error:', error);
    // Explicitly handle the timeout error message
    if (error.message === 'Audit timed out. Please try again.') {
      return NextResponse.json({ error: error.message }, { status: 504 }); // 504 Gateway Timeout
    }
    return NextResponse.json({ error: error.message || 'Failed to run Deep AI Audit.' }, { status: 500 });
  }
}
