import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export interface GeminiVerdict {
  verdict: 'Verified' | 'Rejected' | 'Manual_Review_Required';
  reason: string;
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

STRICT RULES:
1. Each image has a label. If image does not match its label → Rejected, reason: "Wrong document type"
2. Land area: 0.20 to 6.0 Ha only. 1 Hectare = 100 Aar. हेव्टर/हेव्टार = हेक्टर
3. Caste must be SC or Nav-Boudha only
4. Income must be below ₹1,50,000
5. Farmer name must appear in document (allow Marathi spelling variation)
6. Joint ownership (सामायिक खातेदार): acceptable if farmer name present in list
7. Official govt seal or signature must be visible — if absent → Manual_Review_Required
8. If any required field unreadable due to scan quality → Manual_Review_Required (never guess numbers)
9. Random photo, blank page, non-govt document → Rejected immediately

DEFAULT STANCE: Skeptical. Verified only when ALL rules pass clearly.

Return ONLY valid JSON. No markdown. No explanation outside JSON.

{
  "verdict": "Verified" | "Rejected" | "Manual_Review_Required",
  "reason": "One sentence in English explaining decision",
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

    // Map buffers to labeled parts
    const imageParts: any[] = [];
    imageBuffers.forEach((buffer, index) => {
      const type = documentTypes[index] || "Unknown Document";
      imageParts.push({ text: `Document ${index + 1} - ${type}:` });
      imageParts.push({
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: "image/jpeg"
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
      extractedData: null,
      failureReasons: [error.message]
    };
  }
}

