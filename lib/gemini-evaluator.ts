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
1. Evaluate EACH document individually.
2. Aadhaar Card: Apply Name Matching Rules. Last 4 digits must also match. Ignore land area or caste constraints for this document. If Name Check passes and digits match, mark "Verified".
3. 7/12 Extract: 7/12 extracts often have multiple joint owners (सामायिक खातेदार). You MUST find the specific farmer whose name passes the Name Matching Rules. Then:
   a. Check their INDIVIDUAL land holding is between 0.20 Ha and 6.0 Ha. Reject if outside range.
   b. Land Type Check (Jirayat/Bagayat) — only if applicable:
${(() => {
  const s = (farmerDetails.subsidy_reason || '').toLowerCase();
  const needsLandTypeCheck = /new well|navin vihir|old well|juni vihir|boring|pump set|electricity|farm pond/i.test(s);
  if (!needsLandTypeCheck) return '      - Land type check is NOT APPLICABLE for this subsidy. Do not reject based on Jirayat/Bagayat.';
  if (/new well|navin vihir|farm pond/i.test(s)) return '      - Land MUST be Jirayat. Reject if Bagayat.';
  if (/old well|juni vihir|boring|pump set|electricity/i.test(s)) return '      - Land MUST be Bagayat. Reject if Jirayat.';
  return '      - No land type restriction for this subsidy.';
})()}
   c. Mark "Verified" if all applicable checks pass, otherwise "Rejected".
4. 8A Holding/Ledger: Apply Name Matching Rules. If their total individual land area is less than 0.20 Ha or greater than 6.0 Ha, mark this specific document as "Rejected". Otherwise, if name passes, mark "Verified".
5. Caste Certificate: Apply Name Matching Rules. The caste must also clearly be SC (Scheduled Caste) or Nav-Boudha. If the caste is anything else, mark this specific document as "Rejected". Otherwise, if name passes, mark "Verified".
6. Missing documents do NOT fail the documents that are already provided.

You must return a "document_evaluations" array containing exactly one evaluation per input document, in the exact same order they were provided.

Return ONLY valid JSON. No markdown. No explanation outside JSON.

{
  "verdict": "Verified" | "Rejected" | "Manual_Review_Required",
  "reason": "Overall reason",
  "document_evaluations": [
    {
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

    // Set a 30s timeout manually
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini service timeout (>30s)")), 30000)
    );

    const result = await Promise.race([
      model.generateContent(promptParts as any),
      timeoutPromise
    ]) as any;

    const response = await result.response;
    const text = response.text();

    // Clean markdown code blocks if present
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const verdict = JSON.parse(cleanJson) as GeminiVerdict;

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

