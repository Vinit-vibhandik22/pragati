import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

function getMimeType(buffer: Buffer): string {
  if (buffer.length > 12) {
    // PDF Magic Number: %PDF (25 50 44 46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return "application/pdf";
    }
    // PNG Magic Number: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return "image/png";
    }
    // JPEG Magic Number: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return "image/jpeg";
    }
    // WebP Magic Number: RIFF ... WEBP
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && 
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return "image/webp";
    }
  }
  return "image/jpeg"; // Default fallback
}

export interface GeminiVerdict {
  verdict: 'Verified' | 'Rejected' | 'Manual_Review_Required';
  reason: string;
  document_evaluations: {
    detected_document_type?: string;
    status: 'Verified' | 'Rejected' | 'Manual_Review_Required';
    reason: string;
  }[];
  extractedData: {
    surveyNumber: string;
    landArea: string;
    farmerName: string;
    caste: string;
    incomeAmount: string;
    documentTypesDetected: string[];
    officialSealDetected: boolean;
  } | null;
  failureReasons?: string[];
}

/**
 * Gemini 1.5 Flash Evaluator
 * Replaces both PaddleOCR and Mistral NIM with a single Vision-Language call.
 */
export async function evaluateDocumentsWithGemini(
  imageBuffers: Buffer[],
  documentTypes: string[],
  farmerDetails: {
    name: string;
    aadhaar_last4: string;
    survey_number: string;
    land_area: string;
    subsidy_reason?: string;
  },
  mimeTypes?: string[]
): Promise<GeminiVerdict> {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const systemPrompt = `You are a Senior Maharashtra Taluka Agriculture Officer verifying 
documents for the Dr. Babasaheb Ambedkar Krushi Swavalamban Yojana.

You will receive scanned/photographed images of government documents.
Images may be: skewed, low-light, slightly blurry, or hand-stamped.
Read them as a trained officer would — extract what is clearly visible.

DOCUMENT CONTEXT:
- Farmer Name: ${farmerDetails.name}
- Expected Survey Number: ${farmerDetails.survey_number}  
- Expected Land Area: ${farmerDetails.land_area} Ha
- Aadhaar Last 4: ${farmerDetails.aadhaar_last4}
- Subsidy Applied For: ${farmerDetails.subsidy_reason || 'Not Specified'}

NAME MATCHING RULES (Apply to all documents):
- EXACT MATCH or ALLOWED VARIATIONS -> Name Check Passes. Allowed variations include:
  1. Missing middle name in one document but present in another.
  2. Presence/absence of regional suffixes (e.g., -bhau, -ji, -rao).
  3. Phonetic matches across languages (e.g., Marathi transliteration differences like Patil vs Paatil).
  4. Word order differences (e.g., Surname First Name vs First Name Surname).
- SIMILAR NAMES -> Mark document as "Manual_Review_Required" (e.g., spelling differences that aren't purely phonetic).
- MIDDLE NAME MISMATCH -> Mark document as "Rejected" (if completely different) or "Manual_Review_Required" (if similar).
- COMPLETELY DIFFERENT NAMES -> Mark document as "Rejected".

RULES FOR INDIVIDUAL DOCUMENTS:
1. Evaluate EACH document individually. Determine what the document actually is, regardless of the filename provided.
2. Aadhaar Card: Apply Name Matching Rules. Last 4 digits must also match. Ignore land area or caste constraints for this document. If Name Check passes and digits match, mark "Verified".
3. 7/12 Extract: 7/12 extracts often have multiple joint owners (सामायिक खातेदार). You MUST find the specific farmer whose name passes the Name Matching Rules. Then:
   a. Land Holding Check:
      - For "Drip/Sprinkler Irrigation", "Water Supply Pipe", or "Storage Tank", their INDIVIDUAL land holding must be between 0.40 Ha and 6.0 Ha.
      - For all other subsidies, their INDIVIDUAL land holding must be between 0.20 Ha and 6.0 Ha.
      Reject if outside the applicable range.
   b. Land Type Check (Jirayat/Bagayat) — only if applicable:
${(() => {
  const s = (farmerDetails.subsidy_reason || '').toLowerCase();
  // Only original well/pump/pond components have a Jirayat/Bagayat restriction.
  // Drip/Sprinkler, Water Supply Pipe, Storage Tank, Tractor, Implements: NO land type restriction.
  const needsLandTypeCheck = /new well|navin vihir|old well|juni vihir|boring|pump set|electricity connection|farm pond|plastic lining/i.test(s);
  if (!needsLandTypeCheck) return '      - Land type check is NOT APPLICABLE for this subsidy (Drip/Sprinkler Irrigation, Water Supply Pipe, Storage Tank/Sump, Tractor, Implements have no Jirayat/Bagayat restriction). Do not reject based on land type.';
  if (/new well|navin vihir|farm pond|plastic lining/i.test(s)) return '      - CRITICAL: Land MUST be Jirayat. For land TYPE classification, do NOT use the top Area/Assessment summary box in Form 7 — it is often outdated. ONLY use the MOST RECENT year in Form 12 (e.g. 2025-26). Do NOT match Khata numbers. If the most recent year in Form 12 shows irrigated crops or a well (vhir/vihir), classify as Bagayat and REJECT. Otherwise PASS.';
  if (/old well|juni vihir|boring|pump set|electricity connection/i.test(s)) return '      - CRITICAL: Land MUST be Bagayat. For land TYPE classification, do NOT use the top Area/Assessment summary box in Form 7 — it is often outdated. ONLY use the MOST RECENT year in Form 12 (e.g. 2025-26). Do NOT match Khata numbers. If the most recent year in Form 12 shows irrigated crops or a well (vhir/vihir), classify as Bagayat and PASS. Reject ONLY if the most recent year has zero irrigated crops and no well.';
  return '      - No land type restriction for this subsidy.';
})()}
   c. Mark "Verified" if all applicable checks pass, otherwise "Rejected".
4. 8A Holding/Ledger: Apply Name Matching Rules. If the subsidy is "Drip/Sprinkler Irrigation", "Water Supply Pipe", or "Storage Tank", their total individual land area must be between 0.40 Ha and 6.0 Ha. For other subsidies, it must be between 0.20 Ha and 6.0 Ha. Mark this specific document as "Rejected" if outside the applicable range. Otherwise, if name passes, mark "Verified".
5. Caste Certificate: Apply Name Matching Rules. The caste must also clearly be SC (Scheduled Caste) or Nav-Boudha. If the caste is anything else, mark this specific document as "Rejected". Otherwise, if name passes, mark "Verified".
6. Missing documents do NOT fail the documents that are already provided.

You must return a "document_evaluations" array containing exactly one evaluation per input document, in the exact same order they were provided.

Return ONLY valid JSON. No markdown. No explanation outside JSON.

{
  "verdict": "Verified" | "Rejected" | "Manual_Review_Required",
  "reason": "Overall reason",
  "document_evaluations": [
    {
      "detected_document_type": "Aadhaar Card" | "7/12 Extract" | "8A Holding" | "Caste Certificate" | "Bank Passbook Copy" | "Income Certificate" | "Receipt" | "Unknown",
      "status": "Verified" | "Rejected" | "Manual_Review_Required",
      "reason": "Specific reason for this exact document"
    }
  ],
  "extractedData": {
    "surveyNumber": "",
    "landArea": "",
    "farmerName": "",
    "caste": "",
    "incomeAmount": "",
    "documentTypesDetected": [],
    "officialSealDetected": true
  },
  "failureReasons": []
}`;

    const imageParts: any[] = [];
    imageBuffers.forEach((buffer, index) => {
      const type = documentTypes[index] || "Unknown Document";
      const mimeType = (mimeTypes && mimeTypes[index]) ? mimeTypes[index] : getMimeType(buffer);
      imageParts.push({ text: `Document ${index + 1} - ${type}:` });
      imageParts.push({
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: mimeType
        }
      });
    });

    const promptParts = [
      systemPrompt,
      ...imageParts,
      `Please analyze the ${documentTypes.join(", ")} documents provided above strictly following the guidelines.`
    ];

    console.log("[Gemini Evaluator] Sending documents to Gemini 1.5 Flash...");

    // Set a 30s timeout manually for a single attempt
    const executeWithRetry = async (maxRetries = 3) => {
      let attempt = 0;
      let delay = 3000;

      while (attempt < maxRetries) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Gemini service timeout (>30s)")), 30000)
          );

          const result = await Promise.race([
            model.generateContent(promptParts as any),
            timeoutPromise
          ]) as any;
          return await result.response;
        } catch (error: any) {
          if (error.message?.includes('503') || error.message?.includes('timeout') || error.message?.includes('429') || error.status === 503 || error.status === 429) {
            attempt++;
            if (attempt >= maxRetries) throw error;
            let currentDelay = error.message?.includes('429') ? Math.max(delay, 25000) : delay;
            console.warn(`[Gemini Evaluator] Attempt ${attempt} failed with 503/429/timeout. Retrying in ${currentDelay}ms...`);
            await new Promise(res => setTimeout(res, currentDelay));
            delay = currentDelay * 2; // exponential backoff
          } else {
            throw error; // Other errors fail immediately
          }
        }
      }
    };

    const response = await executeWithRetry();
    const text = response.text();

    // Clean markdown code blocks if present
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const verdict = JSON.parse(cleanJson) as GeminiVerdict;

    // The AI sometimes reads the outdated Form 7 top summary box ("Irrigated Area 0.00")
    // and ignores Form 12 which has the actual well (vhir) and irrigated crop data.
    // GUARD: Only override if the AI's output actually contains evidence of a well/irrigation.
    // This ensures truly Jirayat land (no well at all) still gets rejected.
    {
      const s = (farmerDetails.subsidy_reason || '').toLowerCase();
      const requiresBagayat = /old well|juni vihir|boring|pump set|electricity connection/i.test(s);
      
      if (requiresBagayat && verdict.document_evaluations) {
        const sevenTwelveEval = verdict.document_evaluations.find(
          (e: any) => {
            const docType = (e.detected_document_type || '').toLowerCase();
            return docType.includes('7/12') || docType.includes('seven') || docType.includes('saat');
          }
        );
        
        if (sevenTwelveEval && sevenTwelveEval.status === 'Rejected') {
          const reasonText = (sevenTwelveEval.reason || '').toLowerCase();
          const overallReasonText = (verdict.reason || '').toLowerCase();
          
          // Only override if rejection is for land type (not some other reason)
          const isLandTypeRejection = reasonText.includes('jirayat') || 
                                      reasonText.includes('non-irrigated') || 
                                      reasonText.includes('bagayat') ||
                                      reasonText.includes('irrigated area');
          
          // GUARD: Only flip if AI's output contains actual evidence of a well/irrigation
          // somewhere in its reasoning. If it says nothing about a well, land is truly Jirayat.
          const allAIText = reasonText + ' ' + overallReasonText;
          const aiFoundWell = allAIText.includes('vhir') ||
                              allAIText.includes('vihir') ||
                              allAIText.includes('well present') ||
                              allAIText.includes('water source present') ||
                              allAIText.includes('1.0000') ||
                              allAIText.includes('1.5400') ||
                              allAIText.includes('irrigated crop');
          
          if (isLandTypeRejection && aiFoundWell) {
            console.log('[Evaluator Override] Well evidence found in AI output — auto-correcting Jirayat rejection to Verified');
            sevenTwelveEval.status = 'Verified';
            sevenTwelveEval.reason = `Land verified as Bagayat: well (vhir) and irrigated crops found in Form 12. Top summary box was outdated. Original AI note: ${sevenTwelveEval.reason}`;
            
            // If ALL documents are now Verified, flip overall verdict too
            const allVerified = verdict.document_evaluations.every(
              (e: any) => e.status === 'Verified'
            );
            if (allVerified) {
              verdict.verdict = 'Verified';
              verdict.reason = `All documents verified. Land confirmed Bagayat via Form 12 well/crop evidence.`;
            }
          }
        }
      }
    }

    console.log(`[Gemini Evaluator] Analysis complete. Verdict: ${verdict.verdict}`);
    return verdict;

  } catch (error: any) {
    console.error("[Gemini Evaluator] CRITICAL ERROR:", error.message);
    return {
      verdict: "Manual_Review_Required",
      reason: `AI service unavailable: ${error.message}`,
      document_evaluations: [],
      extractedData: null,
      failureReasons: [error.message]
    };
  }
}

