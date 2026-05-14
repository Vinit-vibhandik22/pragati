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
    
    const initialDocParts: { inlineData: { data: string; mimeType: string } }[] = [];
    if (documentUrls && Array.isArray(documentUrls)) {
      for (const url of documentUrls) {
        try {
          const part = await fetchImage(url);
          initialDocParts.push(part);
        } catch(e) {
          console.error("Failed to fetch initial doc:", url);
        }
      }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // Per-subsidy rule matrix for BAKSY scheme
    const s = (subsidyReason || '').toLowerCase();

    // Rule 9: Water source check.
    // Drip/Sprinkler, Water Supply Pipe, and Storage Tank are DOWNSTREAM components —
    // they require an existing water source (well/pump) to function. Water MUST exist.
    // New Well is the only case where water must NOT exist.
    const needsWaterSourceCheck =
      /new well|navin vihir|old well|juni vihir|boring|pump set|electricity connection|drip|sprinkler|water supply pipe|storage tank/i.test(s);
    const waterSourceMustBeAbsent = /new well|navin vihir/i.test(s);

    // Rule 10: Land type check — only original well/pump/pond components have Jirayat/Bagayat rules.
    // Drip/Sprinkler, Water Supply Pipe, and Storage Tank have NO land type restriction.
    const needsLandTypeCheck =
      /new well|navin vihir|old well|juni vihir|boring|pump set|electricity connection|farm pond|plastic lining/i.test(s);
    const requiredLandType = (() => {
      if (/new well|navin vihir|farm pond|plastic lining/i.test(s)) return 'Jirayat';
      if (/old well|juni vihir|boring|pump set|electricity connection/i.test(s)) return 'Bagayat';
      return null; // no restriction — Drip/Sprinkler, Water Supply Pipe, Storage Tank
    })();

    // Build instruction note to inject into prompt
    const waterSourceNote = !needsWaterSourceCheck
      ? `Rule 9 (Water Source Check) is NOT APPLICABLE for this subsidy. Set waterSourceCheck to "NOT_APPLICABLE". Do not show or penalise for water source.`
      : waterSourceMustBeAbsent
        ? `Rule 9: For a "New Well" subsidy, the 7/12 MUST NOT show an existing well. If a well exists, set waterSourceCheck to "FAIL" and reject.`
        : `Rule 9: This subsidy requires an existing water source. If no water source is shown in 7/12, set waterSourceCheck to "FAIL" and reject.`;

    const landTypeNote = !needsLandTypeCheck
      ? `Rule 10 (Land Type Check) is NOT APPLICABLE for this subsidy. Set landTypeCheck to "NOT_APPLICABLE". Do not show or penalise for Jirayat/Bagayat.`
      : `Rule 10: For this subsidy, land MUST be ${requiredLandType}. CRITICAL INSTRUCTION: If the waterSourceCheck is "PASS" (meaning you found a well/vhir), then the land is physically Bagayat. You MUST automatically set landTypeCheck to "PASS" if waterSourceCheck is "PASS". Do not overthink the text classification.`;

    const prompt = `
    You are Pragati AI, an expert agricultural subsidy auditor for the Government of Maharashtra.
    Your task is to analyze the provided documents for a farmer's subsidy application. 
    You will receive several images:
    - Any initial documents provided (Aadhaar, 7/12 land records, etc.)
    - The Payment Receipt/Invoice
    - The Inspection Photo (last image), which is a geo-tagged photo taken on site.

    Farmer Details:
    - Name: ${farmerName}
    - Applying for: ${subsidyReason}
    - Location: Maharashtra

    Verification Rules:
    1. Identity Consistency: The farmer's name must match or be a close variation of "${farmerName}" ACROSS ALL DOCUMENTS (Aadhaar, 7/12, and Receipt).
    2. GST Validation: The receipt/invoice MUST contain a valid Maharashtra GST Number starting with '27'.
    3. Currency: The currency must be INR. No foreign currency allowed.
    4. Price limits: Check if the price seems reasonable for a ${subsidyReason}. For "Drip/Sprinkler Irrigation", the maximum acceptable receipt amount is Rs. 97,000. For "Water Supply Pipe" or "Storage Tank", the maximum acceptable receipt amount is Rs. 50,000. Flag as "PRICE_MISMATCH" if it vastly exceeds this without justification.
    5. Initial Document Checks: Ensure Aadhaar shows proper ID. For 7/12 and 8A land records, verify land ownership: If the subsidy is "Drip/Sprinkler Irrigation", "Water Supply Pipe", or "Storage Tank", land ownership must be between 0.40 Ha and 6.0 Ha. For other subsidies, it must be between 0.20 Ha and 6.0 Ha. For Caste Certificate, ensure the caste is SC (Scheduled Caste) or Nav-Boudha. If any initial document violates these constraints, flag it.
    6. Inspection Photo Checks:
       - Humans: The photo MUST have a minimum of 2 humans visible (one representing the Krushi Sahayak and one representing the farmer). You do not need to verify their faces or clothing specifically, just the presence of at least 2 people. If fewer than 2 people are present, flag as "PHOTO_MISSING_PEOPLE".
       - Equipment/Context: The equipment or site shown in the photo must look similar to the requested subsidy (${subsidyReason}). If it completely mismatches (e.g., applying for a pump set but showing a tractor), flag as "PHOTO_EQUIPMENT_MISMATCH".
       - Location & Date: If there is a GPS/timestamp overlay on the photo, verify that the date looks recent and the location seems like a farm. If it looks fake or heavily edited, flag it. If no stamp is visible, but it generally looks like a farm, you can pass this check.
    8. Subsidy-Specific Water Source Checks (BAKSY Rules):
       - "New Well" (Navin Vihir): The 7/12 MUST NOT show any existing well. REJECT if a well is already present.
       - "Old Well Repair", "In-well Boring", "Pump Set", "Electricity Connection": The 7/12 MUST show an existing water source. REJECT if absent.
       - "Drip/Sprinkler Irrigation", "Water Supply Pipe", "Storage Tank/Sump": These are DOWNSTREAM components that feed from an existing well or pump. The 7/12 MUST show an existing water source. REJECT with "WATER_SOURCE_MISMATCH" if no water source is present.
       - "Tractor", "Implements": No water source restriction. Set waterSourceCheck to "NOT_APPLICABLE".
       - If the 7/12 fails the applicable water source rule, set waterSourceCheck to "FAIL" and flag as "WATER_SOURCE_MISMATCH".
     9. Jirayat/Bagayat Land Type Check (BAKSY Rules):
        - CRITICAL OVERRIDE: The top 'Area, Unit & Assessment' box is often outdated. Do not trust it blindly.
        - You MUST look at the 'Village namuna bara (pikanchi nondavhi)' (Form 12) table at the bottom of the page. 
        - IGNORE all older years (e.g. 2023-24). Only look at the MOST RECENT year (e.g. 2025-26) in Form 12.
        - DO NOT attempt to match Khata numbers! Any well or irrigated crop in Form 12 applies to the whole parcel.
        - If you see ANY numbers in the 'Irrigated' column or ANY mention of a well (vhir, vihir) in the MOST RECENT year of Form 12, you MUST classify the entire land as Bagayat (Irrigated).
        - Rules based on subsidy type:
          * "New Well" (Navin Vihir): Land MUST be Jirayat. Bagayat means irrigation already exists -- REJECT if Form 12 shows Bagayat.
          * "Farm Pond" (Plastic Lining): Land MUST be Jirayat. Rainwater collection for dryland -- REJECT if Form 12 shows Bagayat.
          * "Old Well Repair", "In-well Boring", "Pump Set", "Electricity Connection": Land MUST be Bagayat -- REJECT ONLY if Form 12 is purely Non-Irrigated.
          * "Drip/Sprinkler Irrigation", "Water Supply Pipe", "Storage Tank/Sump": Either type acceptable, but a water source must be present.
          * "Tractor", "Implements": Either land type acceptable. No restriction.
        - If land type does not match requirements, set landTypeCheck to "FAIL" and flag as "LAND_TYPE_MISMATCH".

    ${waterSourceNote}
    ${landTypeNote}

    Extract the following details from the documents:
    - farmerNameOnDoc: The farmer/customer name found on the documents
    - gstNumber: GST number from the receipt/invoice
    - receiptItem: The main item/equipment described in the Receipt
    - receiptPrice: The total amount shown on the Receipt (numeric value)
    - landHolding712: The land holding area found specifically in the 7/12 extract (e.g. "1.5 Ha")
    - landHolding8A: The total land holding area found specifically in the 8A ledger (e.g. "1.5 Ha")
    - cropType: The type of crop grown, if visible in the 7/12 extract (e.g. "Soybean, Cotton")
    - landType712: "Jirayat" or "Bagayat" or "Mixed" (IMPORTANT: MUST match the Form 12 conclusion above! Do not just copy the top box.)
    - waterSourceOn712: "Well Present" or "Borewell Present" or "No Water Source" (IMPORTANT: Look at Form 12 equipment like 'vhir'!)
    - waterSourceCheck: "PASS" or "FAIL" or "NOT_APPLICABLE" — based on Rule 9 above
    - landTypeCheck: "PASS" or "FAIL" or "NOT_APPLICABLE" — based on Rule 10 above
    - casteDetected: The caste found in the Caste Certificate
    - aadhaarValid: "Yes" or "No"
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
        "landHolding712": "...",
        "landHolding8A": "...",
        "cropType": "...",
        "landType712": "...",
        "waterSourceOn712": "...",
        "waterSourceCheck": "...",
        "landTypeCheck": "...",
        "casteDetected": "...",
        "aadhaarValid": "...",
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
              ...initialDocParts,
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

    // ---- SERVER-SIDE LAND TYPE OVERRIDE ----
    // The AI often gets confused by the top summary box on the 7/12.
    // We deterministically override: if the AI found a water source (well/vhir),
    // it physically means the land is Bagayat, so landTypeCheck MUST pass.
    {
      const details = auditResult.extractedDetails || {};
      const waterSourceResult = (details.waterSourceCheck || '').toUpperCase();
      const landTypeResult = (details.landTypeCheck || '').toUpperCase();
      const waterSourceOnDoc = (details.waterSourceOn712 || '').toLowerCase();
      // Also scan the AI's reason text — it often writes "found vhir for Khata 15268"
      // even when it incorrectly sets waterSourceCheck to FAIL due to Khata mismatch.
      const reasonText = (auditResult.reason || '').toLowerCase();
      const hasWell = waterSourceResult === 'PASS' || 
                      waterSourceOnDoc.includes('well') || 
                      waterSourceOnDoc.includes('vhir') ||
                      waterSourceOnDoc.includes('vihir') ||
                      reasonText.includes('vhir') ||
                      reasonText.includes('vihir') ||
                      reasonText.includes('well present') ||
                      reasonText.includes('water source');

      // For subsidies that require Bagayat: if a well exists anywhere in the doc,
      // the land IS Bagayat. Auto-correct landTypeCheck = FAIL to PASS.
      if (hasWell && requiredLandType === 'Bagayat' && landTypeResult === 'FAIL') {
        console.log('[Phase3 Override] Well found in doc/reason, auto-correcting landTypeCheck FAIL → PASS');
        auditResult.extractedDetails.landTypeCheck = 'PASS';
        auditResult.extractedDetails.landType712 = 'Bagayat';
        // If the ONLY reason for rejection was LAND_TYPE_MISMATCH, flip to Verified
        if (auditResult.verdict === 'Rejected' && auditResult.flag === 'LAND_TYPE_MISMATCH') {
          auditResult.verdict = 'Verified';
          auditResult.flag = 'CLEAN';
          auditResult.reason = `Land verified as Bagayat based on existing water source (well/vhir) found in crop records. ${auditResult.reason}`;
        }
      }
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
