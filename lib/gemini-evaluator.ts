import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

function getMimeType(buffer: Buffer): string {
  if (buffer.length > 4) {
    // PDF Magic Number: %PDF (25 50 44 46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return "application/pdf";
    }
    // PNG Magic Number: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return "image/png";
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
  }
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

RULES FOR INDIVIDUAL DOCUMENTS:
1. Evaluate EACH document individually.
2. Aadhaar Card: Mark "Verified" if name mostly matches and last 4 digits match. Ignore land area or caste constraints for this document.
3. 7/12 Extract: 7/12 extracts often have multiple joint owners (सामायिक खातेदार). You MUST find the specific farmer whose name matches the Aadhaar card/database. Then, find their INDIVIDUAL land holding. Mark "Verified" if their name is present. If their specific individual land holding is less than 0.20 Ha or greater than 6.0 Ha, mark this specific document as "Rejected".
4. 8A Holding/Ledger: Mark "Verified" if name matches. However, if their total individual land area is less than 0.20 Ha or greater than 6.0 Ha, mark this specific document as "Rejected" (just like the 7/12 extract).
5. Caste Certificate: Mark "Verified" if the caste is clearly SC (Scheduled Caste) or Nav-Boudha, and the name matches. If the caste is anything else, mark this specific document as "Rejected".
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
      imageParts.push({ text: `Document ${index + 1} - ${type}:` });
      imageParts.push({
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: getMimeType(buffer)
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

