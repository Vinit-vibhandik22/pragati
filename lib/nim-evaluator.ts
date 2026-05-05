'use server';

import OpenAI from 'openai';

/**
 * PRAGATI AI NIM Evaluator
 * Uses Mistral Large 3 via NVIDIA NIM for high-precision verification 
 * of Marathi agricultural records against system database details.
 */
export async function evaluateDocumentWithMistral(ocrText: string, farmerDetails: any) {
  try {
    if (!process.env.NVIDIA_NIM_API_KEY) {
      throw new Error("NVIDIA_NIM_API_KEY is not configured on the server.");
    }

    const openai = new OpenAI({
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });

    console.log("[NIM Evaluator] Initiating cross-check with Mistral Large 3...");

    const systemPrompt = `You are a Senior Maharashtra Taluka Agriculture Officer (AI) specialized in auditing land revenue documents (7/12 and 8A extracts).

TASK:
Cross-check the provided raw Marathi OCR text (extracted via PaddleOCR) against the official farmer registration details in our system.

MAHARASHTRA LAND CONTEXT (CRITICAL):
1. LAND AREA LOGIC:
   - 1 Hectare (हेक्टर) = 100 Aar (आर). 
   - A document showing "1.50" means 1 Hectare and 50 Aar.
   - If the OCR reads "150 Hectares" but the system says "1.50", this is likely an OCR decimal misread.
2. IDENTITY LOGIC:
   - Marathi name spelling variations (e.g., विठ्ठल vs विठल) are common and should be tolerated.
   - Joint family records (सामायिक खातेदार) list multiple owners. If the target farmer's name is present in that list, mark as "Verified".
3. OCR RESILIENCY:
   - PaddleOCR may misread 'हेक्टर' as 'हेव्टर' or 'हक्टर'.
   - It may misread 'गट क्रमांक' (Survey Number) as 'गट कमांक'.
   - Use fuzzy matching to extract data from the noise.

FARMER SYSTEM DETAILS:
- Name: ${farmerDetails.name || 'N/A'}
- Aadhaar (Last 4): ${farmerDetails.aadhaar_last4 || 'N/A'}
- Survey/Gat Number: ${farmerDetails.survey_number || 'N/A'}
- Claimed Area: ${farmerDetails.land_area || 'N/A'} Hectares

OUTPUT CONSTRAINT:
- Return ONLY a JSON object. No preamble. No conversational filler.
- Be highly strict but fair. If you see signs of tampering or complete data mismatch, use "Rejected".

JSON SCHEMA:
{
  "verdict": "Verified" | "Rejected" | "Manual_Review_Required",
  "reason": "Detailed explanation in English explaining the match or mismatch logic",
  "extractedData": {
    "surveyNumber": "string",
    "landArea": "string",
    "farmerName": "string"
  }
}`;

    console.log("[NIM Evaluator] Initiating cross-check with Mistral Large 3...");
    const startTime = Date.now();

    const payload = {
      model: "mistralai/mistral-large-3-675b-instruct-2512",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `RAW MARATHI OCR TEXT:\n\n${ocrText}` }
      ],
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: "json_object" }
    };

    console.log("[NIM Evaluator] Sending request to Mistral NIM...");
    
    const completion = await (openai.chat.completions.create as any)(payload);

    const endTime = Date.now();
    console.log(`[NIM Evaluator] Received response from Mistral NIM in ${endTime - startTime}ms`);

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("Empty response from NVIDIA NIM.");
    }

    const result = JSON.parse(responseContent);
    console.log(`[NIM Evaluator] Analysis complete. Verdict: ${result.verdict}`);
    
    return result;

  } catch (error: any) {
    console.error("[NIM Evaluator] CRITICAL API ERROR:", {
      message: error.message,
      name: error.name,
      status: error.status,
      type: error.type,
      details: error.response?.data || "No additional details"
    });

    return {
      verdict: "Manual_Review_Required",
      reason: `NIM Evaluator Error: ${error.message}`,
      extractedData: { surveyNumber: "N/A", landArea: "N/A", farmerName: "N/A" }
    };
  }
}
