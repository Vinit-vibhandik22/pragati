'use server';

import OpenAI from 'openai';

/**
 * PRAGATI AI NIM Evaluator — V2
 * Uses Mistral Large 3 via NVIDIA NIM.
 * Returns the full 13-field extracted_data verdict for DBKSY scheme.
 */

export interface NIMVerdict {
  verdict: 'Verified' | 'Rejected' | 'Manual_Review_Required';
  reason: string;
  extractedData: {
    owner_name_712: string;
    survey_number: string;
    land_area_ha: number;
    total_holding_8a: number;
    caste_certificate_holder: string;
    income_certificate_holder: string;
    income_amount: number;
    has_multiple_owners: boolean;
    co_owner_names: string[];
    name_match_712_aadhaar: boolean;
    name_match_caste_aadhaar: boolean;
    area_constraint_passed: boolean;
    income_constraint_passed: boolean;
    caste_constraint_passed: boolean;
  };
  failureReasons: string[];
}

export interface FarmerDetails {
  name?: string;
  full_name_marathi?: string;
  aadhaar_number?: string;
  survey_number?: string;
  land_area_ha?: number;
  caste_category?: string;
  annual_income?: number;
  village?: string;
}

const SYSTEM_PROMPT = `You are a strict Maharashtra government land record verification AI for the Dr. Babasaheb Ambedkar Krushi Swavalamban Yojana scheme (New Well Construction for SC/Nav-Boudha farmers).

You will receive: (1) OCR-extracted Marathi text arrays from 4 documents, (2) the registered farmer record from the database.

SCHEME CONSTRAINTS:
- Land area: 0.20 Ha to 6.0 Ha (1 Hectare = 100 Aar). Reject if outside this range.
- Caste: SC or Nav-Boudha only. Reject if different.
- Annual income: less than ₹1,50,000. Reject if higher.
- Name cross-match: Farmer name must match across Aadhaar, 7/12 Extract, and Caste Certificate.

MARATHI OCR CORRECTION RULES:
- 'हेव्टर', 'हेव्टार', 'हेकटर' → 'हेक्टर' (Hectare)
- 'आर' as area unit → 0.01 Hectare
- Joint ownership indicator: 'सामायिक खातेदार', 'सह-खातेदार', 'हिस्सेदार'
- Accept minor spelling variations in names due to transliteration (allow fuzzy match with 80%+ character similarity)

OUTPUT: Respond ONLY with valid JSON matching this exact schema. No preamble. No explanation outside the JSON.

{
  "verdict": "Verified" | "Rejected" | "Manual_Review_Required",
  "reason": "one sentence in English",
  "extractedData": {
    "owner_name_712": "",
    "survey_number": "",
    "land_area_ha": 0.00,
    "total_holding_8a": 0.00,
    "caste_certificate_holder": "",
    "income_certificate_holder": "",
    "income_amount": 0,
    "has_multiple_owners": false,
    "co_owner_names": [],
    "name_match_712_aadhaar": true,
    "name_match_caste_aadhaar": true,
    "area_constraint_passed": true,
    "income_constraint_passed": true,
    "caste_constraint_passed": true
  },
  "failureReasons": []
}

Use "Manual_Review_Required" when: OCR quality is poor, name similarity is between 60-80%, or any field is unreadable. Never guess on financial amounts or area measurements — if unreadable, flag Manual_Review_Required.`;

export async function evaluateDocumentWithMistral(
  ocrText: string,
  farmerDetails: FarmerDetails
): Promise<NIMVerdict> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY || process.env.NIM_API_KEY;

  if (!apiKey) {
    throw new Error('NVIDIA_NIM_API_KEY is not configured on the server.');
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });

  const farmerContext = `
REGISTERED FARMER RECORD:
- Name (English): ${farmerDetails.name || farmerDetails.full_name_marathi || 'N/A'}
- Aadhaar Number: ${farmerDetails.aadhaar_number ? `****${farmerDetails.aadhaar_number.slice(-4)}` : 'N/A'}
- Survey/Gat Number: ${farmerDetails.survey_number || 'N/A'}
- Claimed Land Area: ${farmerDetails.land_area_ha ?? 'N/A'} Hectares
- Caste Category: ${farmerDetails.caste_category || 'N/A'}
- Declared Annual Income: ₹${farmerDetails.annual_income ?? 'N/A'}
- Village: ${farmerDetails.village || 'N/A'}
`;

  console.log('[NIM Evaluator] Initiating full 13-field cross-check with Mistral Large 3...');
  const startTime = Date.now();

  let retries = 0;
  const maxRetries = 3;

  while (retries <= maxRetries) {
    try {
      const completion = await (openai.chat.completions.create as any)({
        model: process.env.NIM_MODEL || 'mistralai/mistral-large-3-675b-instruct-2512',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `${farmerContext}\n\nRAW MARATHI OCR TEXT FROM DOCUMENTS:\n\n${ocrText}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: 'json_object' }
      });

      const elapsed = Date.now() - startTime;
      console.log(`[NIM Evaluator] Response received in ${elapsed}ms`);

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from NVIDIA NIM.');
      }

      const result = JSON.parse(responseContent) as NIMVerdict;
      console.log(`[NIM Evaluator] Verdict: ${result.verdict} | Failures: ${result.failureReasons?.length ?? 0}`);

      return result;

    } catch (error: any) {
      const isRateLimit = error.status === 429 || error.message?.includes('rate limit');
      const isRetryable = isRateLimit || error.status === 503;

      if (isRetryable && retries < maxRetries) {
        retries++;
        const backoff = retries * 5000; // 5s, 10s, 15s
        console.warn(`[NIM Evaluator] Retry ${retries}/${maxRetries} after ${backoff}ms — ${error.message}`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }

      console.error('[NIM Evaluator] CRITICAL API ERROR:', {
        message: error.message,
        status: error.status,
        retries
      });

      // After exhausting retries → Manual Review Required
      return {
        verdict: 'Manual_Review_Required',
        reason: `NIM Evaluator Error after ${retries} retries: ${error.message}`,
        extractedData: {
          owner_name_712: 'N/A',
          survey_number: 'N/A',
          land_area_ha: 0,
          total_holding_8a: 0,
          caste_certificate_holder: 'N/A',
          income_certificate_holder: 'N/A',
          income_amount: 0,
          has_multiple_owners: false,
          co_owner_names: [],
          name_match_712_aadhaar: false,
          name_match_caste_aadhaar: false,
          area_constraint_passed: false,
          income_constraint_passed: false,
          caste_constraint_passed: false,
        },
        failureReasons: [`API error: ${error.message}`]
      };
    }
  }

  // Should never reach here
  throw new Error('[NIM Evaluator] Unexpected loop exit');
}
