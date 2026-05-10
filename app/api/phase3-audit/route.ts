import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 300; // Allow maximum Vercel timeout for heavy image audits

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { appId, receiptUrl, farmerName, subsidyReason, documentUrls, inspectionPhotoUrl } = await req.json();

    if (!receiptUrl) {
      return NextResponse.json({ success: false, error: "Missing receipt document" }, { status: 400 });
    }
    if (!inspectionPhotoUrl) {
      return NextResponse.json({ success: false, error: "Missing inspection photo" }, { status: 400 });
    }

    const fetchImage = async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download document from storage (HTTP ${response.status}). URL may be expired or invalid.`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: response.headers.get('content-type') || 'image/jpeg'
        }
      };
    };

    const receiptPart = await fetchImage(receiptUrl);
    const inspectionPhotoPart = await fetchImage(inspectionPhotoUrl);
    
    // We intentionally SKIP loading initialDocParts to reduce AI processing time.
    // Initial documents (7/12, Aadhaar, etc.) were already verified in Phase 1 (deep-audit).
    // Phase 3 is exclusively for verifying the GST Receipt and the Inspection Photo.
    // This reduces the image count from ~6 to 2, significantly speeding up the API response.

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // Per-subsidy rule matrix for BAKSY scheme
    const s = (subsidyReason || '').toLowerCase();

    // Rule 9: Water source check — does the subsidy care about water source?
    const needsWaterSourceCheck =
      /new well|navin vihir|old well|juni vihir|boring|pump set|electricity/i.test(s);
    // Rule 9 specifics: for new well, water must NOT exist. For others, water MUST exist.
    const waterSourceMustBeAbsent = /new well|navin vihir/i.test(s);

    // Rule 10: Land type check — does the subsidy care about Jirayat vs Bagayat?
    const needsLandTypeCheck =
      /new well|navin vihir|old well|juni vihir|boring|pump set|electricity|farm pond/i.test(s);
    // Rule 10 specifics: which land type is required?
    const requiredLandType = (() => {
      if (/new well|navin vihir|farm pond/i.test(s)) return 'Jirayat';
      if (/old well|juni vihir|boring|pump set|electricity/i.test(s)) return 'Bagayat';
      return null; // no restriction
    })();

    // Build instruction note to inject into prompt
    const waterSourceNote = !needsWaterSourceCheck
      ? `Rule 9 (Water Source Check) is NOT APPLICABLE for this subsidy. Set waterSourceCheck to "NOT_APPLICABLE". Do not show or penalise for water source.`
      : waterSourceMustBeAbsent
        ? `Rule 9: For a "New Well" subsidy, the 7/12 MUST NOT show an existing well. If a well exists, set waterSourceCheck to "FAIL" and reject.`
        : `Rule 9: This subsidy requires an existing water source. If no water source is shown in 7/12, set waterSourceCheck to "FAIL" and reject.`;

    const landTypeNote = !needsLandTypeCheck
      ? `Rule 10 (Land Type Check) is NOT APPLICABLE for this subsidy. Set landTypeCheck to "NOT_APPLICABLE". Do not show or penalise for Jirayat/Bagayat.`
      : `Rule 10: For this subsidy, land MUST be ${requiredLandType}. If the 7/12 shows a different land type, set landTypeCheck to "FAIL" and flag as LAND_TYPE_MISMATCH.`;

    const prompt = `
    You are Pragati AI, an expert agricultural subsidy auditor for the Government of Maharashtra.
    Your task is to analyze the provided documents for a farmer's subsidy application. 
    You will receive EXACTLY TWO images:
    1. The Payment Receipt/Invoice
    2. The Inspection Photo (last image), which is a geo-tagged photo taken on site.

    Farmer Details:
    - Name: ${farmerName}
    - Applying for: ${subsidyReason}
    - Location: Maharashtra

    Verification Rules:
    1. Identity Consistency: The farmer's name must match or be a close variation of "${farmerName}" ON THE RECEIPT.
    2. GST Validation: The receipt/invoice MUST contain a valid Maharashtra GST Number starting with '27'.
    3. Currency: The currency must be INR. No foreign currency allowed.
    4. Price limits: Check if the price seems reasonable for a ${subsidyReason}.
    5. Inspection Photo Checks:
       - Humans: The photo MUST have a minimum of 2 humans visible (one representing the Krushi Sahayak and one representing the farmer). You do not need to verify their faces or clothing specifically, just the presence of at least 2 people. If fewer than 2 people are present, flag as "PHOTO_MISSING_PEOPLE".
       - Equipment/Context: The equipment or site shown in the photo must look similar to the requested subsidy (${subsidyReason}). If it completely mismatches (e.g., applying for a pump set but showing a tractor), flag as "PHOTO_EQUIPMENT_MISMATCH".
       - Location & Date: If there is a GPS/timestamp overlay on the photo, verify that the date looks recent and the location seems like a farm. If it looks fake or heavily edited, flag it. If no stamp is visible, but it generally looks like a farm, you can pass this check.

    Extract the following details from the documents:
    - farmerNameOnDoc: The farmer/customer name found on the receipt
    - gstNumber: GST number from the receipt/invoice
    - receiptItem: The main item/equipment described in the Receipt
    - receiptPrice: The total amount shown on the Receipt (numeric value)
    - photoPeopleCount: Number of people detected in the inspection photo (e.g. "2", "1", "0")
    - photoEquipmentMatch: "Yes" or "No" based on whether the photo matches the subsidy reason

    Respond ONLY with a JSON object (no markdown code blocks, no extra text, just raw JSON):
    {
      "verdict": "Verified" or "Rejected",
      "flag": "CLEAN" or "INVALID_GST_FORMAT" or "IDENTITY_MISMATCH" or "OUT_OF_JURISDICTION" or "INVALID_CURRENCY" or "EQUIPMENT_MISMATCH" or "ITEM_MISMATCH" or "PRICE_MISMATCH" or "INITIAL_DOCS_INVALID" or "WATER_SOURCE_MISMATCH" or "LAND_TYPE_MISMATCH" or "PHOTO_MISSING_PEOPLE" or "PHOTO_EQUIPMENT_MISMATCH",
      "reason": "Detailed explanation of your findings",
      "extractedDetails": {
        "farmerNameOnDoc": "...",
        "gstNumber": "...",
        "receiptItem": "...",
        "receiptPrice": "...",
        "photoPeopleCount": "...",
        "photoEquipmentMatch": "..."
      }
    }
    `;

    const executeWithRetry = async (maxRetries = 3) => {
      let attempt = 0;
      let delay = 3000;

      while (attempt < maxRetries) {
        try {
          // Timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Gemini service timeout (>90s)")), 90000)
          );

          const result = await Promise.race([
            model.generateContent([
              prompt,
              receiptPart,
              inspectionPhotoPart
            ]),
            timeoutPromise
          ]) as any;
          return await result.response;
        } catch (error: any) {
          if (error.message?.includes('503') || error.message?.includes('timeout') || error.message?.includes('429') || error.status === 503 || error.status === 429) {
            attempt++;
            if (attempt >= maxRetries) throw error;
            // If it's a rate limit error, wait at least 25 seconds
            let currentDelay = error.message?.includes('429') ? Math.max(delay, 25000) : delay;
            console.warn(`[Phase 3 Audit] Attempt ${attempt} failed with 503/429/timeout. Retrying in ${currentDelay}ms...`);
            await new Promise(res => setTimeout(res, currentDelay));
            delay = currentDelay * 2;
          } else {
            throw error;
          }
        }
      }
    };

    const response = await executeWithRetry();
    const responseText = response.text();
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

    // ---- Additional server-side validation as a safety net ----
    if (auditResult.verdict === "Verified") {
      const details = auditResult.extractedDetails || {};

      // 1. Equipment vs subsidy mismatch
      if (details.receiptItem) {
        const itemDesc = details.receiptItem.toLowerCase();
        const expected = subsidyReason?.toLowerCase() || "";
        // Cross-check: Ensure receipt makes sense for the subsidy
        const mismatch =
          (expected.includes('pump') && itemDesc.includes('pipe')) ||
          (expected.includes('well') && itemDesc.includes('solar'));
        if (mismatch) {
          auditResult = {
            ...auditResult,
            verdict: "Rejected",
            flag: "EQUIPMENT_MISMATCH",
            reason: `Receipt item (${details.receiptItem}) does not match the requested subsidy (${subsidyReason}).`,
          };
        }
      }

      // 4. Farmer name consistency
      if (auditResult.verdict === "Verified" && details.farmerNameOnDoc && farmerName) {
        const nameOnDoc = details.farmerNameOnDoc.trim().toLowerCase();
        const expectedName = farmerName.trim().toLowerCase();
        // Only flag if clearly different (not a substring match)
        if (nameOnDoc !== expectedName && !nameOnDoc.includes(expectedName) && !expectedName.includes(nameOnDoc)) {
          auditResult = {
            ...auditResult,
            verdict: "Rejected",
            flag: "IDENTITY_MISMATCH",
            reason: `Farmer name on documents (${details.farmerNameOnDoc}) does not match provided name (${farmerName}).`,
          };
        }
      }
    }

    return NextResponse.json({ success: true, audit: auditResult });

  } catch (error: any) {
    console.error("Phase 3 Audit Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
