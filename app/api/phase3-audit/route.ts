import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { appId, quotationUrl, receiptUrl, farmerName, subsidyReason } = await req.json();

    if (!quotationUrl || !receiptUrl) {
      return NextResponse.json({ success: false, error: "Missing documents" }, { status: 400 });
    }

    // Function to fetch and convert image to base64
    const fetchImage = async (url: string) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: response.headers.get('content-type') || 'image/jpeg'
        }
      };
    };

    const quotationPart = await fetchImage(quotationUrl);
    const receiptPart = await fetchImage(receiptUrl);

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `
    You are Pragati AI, an expert agricultural subsidy auditor for the Government of Maharashtra.
    Your task is to analyze the provided Quotation and Payment Receipt/Invoice for a farmer's subsidy application.

    Farmer Details:
    - Name: ${farmerName}
    - Applying for: ${subsidyReason}
    - Location: Maharashtra

    Verification Rules:
    1. Identity: The farmer's name on both documents must match or be a close variation of "${farmerName}".
    2. GST Validation: The receipt/invoice MUST contain a valid Maharashtra GST Number starting with '27'.
    3. Technical Compliance: If applying for a Tractor, the HP must be below 45 HP.
    4. Currency: The currency must be INR (₹). No foreign currency allowed.
    5. Price limits: Check if the price seems reasonable for a ${subsidyReason}.

    Respond ONLY with a JSON object in the following format (no markdown code blocks, just raw JSON):
    {
      "verdict": "Verified" | "Rejected",
      "flag": "CLEAN" | "INVALID_GST_FORMAT" | "HP_THRESHOLD_EXCEEDED" | "IDENTITY_MISMATCH" | "OUT_OF_JURISDICTION" | "INVALID_CURRENCY",
      "reason": "Detailed explanation of your findings",
      "extractedDetails": {
        "farmerNameOnDoc": "...",
        "gstNumber": "...",
        "itemDescription": "..."
      }
    }
    `;

    const result = await model.generateContent([
      prompt,
      quotationPart,
      receiptPart
    ]);

    const responseText = result.response.text();
    let auditResult;
    try {
      const jsonStr = responseText.replace(/```json\n?|\n?```/g, '').trim();
      auditResult = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse Gemini output:", responseText);
      auditResult = {
        verdict: "Rejected",
        flag: "PARSE_ERROR",
        reason: "Failed to parse AI response. Please verify manually.",
        extractedDetails: {}
      };
    }

    // ---- New validation: ensure quoted item matches the subsidy reason ----
    if (auditResult.verdict === "Verified" && auditResult.extractedDetails?.itemDescription) {
      const itemDesc = auditResult.extractedDetails.itemDescription.toLowerCase();
      const expected = subsidyReason?.toLowerCase() || "";
      // Simple keyword check – you can expand with a map of allowed terms per subsidy
      if (expected.includes('drip') && itemDesc.includes('tractor')) {
        auditResult = {
          ...auditResult,
          verdict: "Rejected",
          flag: "EQUIPMENT_MISMATCH",
          reason: `Quotation item (${auditResult.extractedDetails.itemDescription}) does not match the requested subsidy (${subsidyReason}).`,
        };
      }
    }

    return NextResponse.json({ success: true, audit: auditResult });

  } catch (error: any) {
    console.error("Phase 3 Audit Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
