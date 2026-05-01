import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    // Defensive check: If simulated data lacks URLs, use a realistic fallback 7/12 image to prevent demo crashes
    if (!app.document_urls || app.document_urls.length === 0) {
      isMockFallback = true;
      documentUrl = 'https://upload.wikimedia.org/wikipedia/commons/e/e0/7-12_Extract_Sample.jpg'; // Public domain sample or fallback
    } else {
      documentUrl = app.document_urls[0];
    }

    // 2. Fetch the actual file from the URL to pass to Gemini
    const fileResponse = await fetch(documentUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch document from storage: ${fileResponse.statusText}`);
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Guess MIME type, defaulting to pdf for safety if it's an octet stream
    let mimeType = fileResponse.headers.get('content-type') || 'application/pdf';
    if (mimeType === 'application/octet-stream') {
      if (documentUrl.toLowerCase().endsWith('.jpg') || documentUrl.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (documentUrl.toLowerCase().endsWith('.png')) mimeType = 'image/png';
      else if (documentUrl.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
      else mimeType = 'image/jpeg'; // Fallback
    }

    // 3. Initialize Gemini 1.5 Flash (Fast, Multimodal, Native PDF support)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let fallbackNotice = isMockFallback ? "\n\n(System Note: No physical document attached to DB. Auditing system fallback sample.)" : "";

    const prompt = `You are an expert Maharashtrian agricultural auditor and fraud-detection AI. 
Analyze the provided document (such as a 7/12 extract, 8A holding, or Aadhaar).
The farmer is applying for the scheme: "${app.scheme_name || 'Agricultural Subsidy'}".

Instructions:
1. Check for any discrepancies, forged text, blurry sections, or mismatching areas.
2. Provide a short, highly analytical audit report in English and Marathi.
3. Format the output strictly as a professional raw terminal log. 
4. Keep it concise but deeply analytical, ending with a FINAL VERDICT (APPROVE / MANUAL REVIEW).${fallbackNotice}`;

    const imageParts = [
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType,
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ audit_report: text, document_url: documentUrl, is_fallback: isMockFallback });

  } catch (error: any) {
    console.error('Deep Audit Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to run Deep AI Audit.' }, { status: 500 });
  }
}
