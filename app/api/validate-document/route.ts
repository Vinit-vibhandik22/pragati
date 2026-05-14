import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Use the same model that works across the rest of this codebase
const GEMINI_MODEL = 'gemini-flash-latest'; // Same model as gemini-evaluator.ts (confirmed working)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

function detectMimeType(buffer: Buffer, fileMime: string): string {
  if (fileMime && fileMime !== 'application/octet-stream') return fileMime;
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return 'application/pdf';
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[4] === 0x57) return 'image/webp';
  return 'image/jpeg';
}

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('[validate-document] GOOGLE_GENERATIVE_AI_API_KEY is not set');
      return NextResponse.json({ error: 'AI service not configured.' }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const expectedDocType = formData.get('expectedDocType') as string;
    const expectedName = formData.get('expectedName') as string | null;
    const expectedAadhaar = formData.get('expectedAadhaar') as string | null;

    if (!file || !expectedDocType) {
      return NextResponse.json({ error: 'Missing file or expectedDocType.' }, { status: 400 });
    }

    console.log(`[validate-document] File: ${file.name} (${file.type}, ${file.size} bytes) | Expected: ${expectedDocType}`);

    // 10 MB hard limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max size is 10 MB.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = detectMimeType(fileBuffer, file.type);
    const base64Data = fileBuffer.toString('base64');

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are an AI document validator for a Maharashtra government agricultural scheme portal (MahaDBT).

A farmer is uploading a document for the slot: "${expectedDocType}"

Your task has TWO parts:

---
PART 1 — IMAGE QUALITY CHECK
Assess whether the document image is usable. Check for:
- Is the text blurry, out of focus, or shaky?
- Is the image too dark, overexposed, or poorly lit?
- Are important parts cropped out or cut off?
- Is the resolution so low that key text is unreadable?

A document is "blurry" if a human officer would struggle to read the key information (name, numbers, dates).
Minor graininess is acceptable. Only flag if it truly impedes readability.

---
PART 2 — DOCUMENT TYPE IDENTIFICATION
Identify what type of government document this actually is from the visual content. Match against these known types:

- "7/12 Extract" (सातबारा उतारा): Land record showing survey/gat number, khata number, owner name, crop details. Usually has a table format with land details. Often has "७/१२" or "7/12" printed on it.
- "8A Holding" (८अ उतारा): Land holding register / khata showing total land. Has "8A" or "८अ" marking.
- "Aadhaar Card" (आधार कार्ड): UIDAI card with 12-digit Aadhaar number shown as XXXX XXXX XXXX, has a photo, QR code, name, DOB, address. Blue/white design with UIDAI logo.
- "Caste Certificate" (जातीचा दाखला): Government issued certificate mentioning caste category (SC/ST/OBC/NT), has official seal, signature of Tehsildar/SDO.
- "Bank Passbook Copy": First page of bank passbook showing account holder name, account number, IFSC, bank branch.
- "Income Certificate": Government income certificate showing annual income amount.
- "Other/Unknown": If it doesn't match any above.

---
Expected document type for this upload slot: "${expectedDocType}"

Determine if the detected document type matches the expected type. Be strict but fair:
- An Aadhaar Card uploaded for a "Caste Certificate" slot = WRONG TYPE
- A 7/12 Extract for a "7/12 Extract" slot = CORRECT
- A photo of a blank paper or completely illegible scan = WRONG TYPE

${expectedName && expectedAadhaar ? `
---
PART 3 — IDENTITY VERIFICATION
The user's registered identity is:
Name: "${expectedName}"
Aadhaar Number: "${expectedAadhaar}"

If the detected document is an "Aadhaar Card", you MUST verify that the Name and Aadhaar Number on the card match the registered identity.
- Minor spelling variations in name are acceptable.
- If the Aadhaar Number is completely different OR the Name is clearly a different person, set "isCorrectType" to false, "overallStatus" to "wrong_type", and "typeMismatchReason" to "Name or Aadhaar number does not match registered profile. Please upload the correct Aadhaar card."
` : ''}

---
PART 4 — DATA EXTRACTION
Extract key metadata from the document to build the farmer's profile for the eligibility engine. 
- If the document is an "8A Holding" or "7/12 Extract", try to extract the land size in hectares. Return it as a number (e.g., 1.5).
- If the document is a "Caste Certificate", extract the caste category (e.g., "SC", "ST", "Nav-Boudha", "OBC", "Open").
- If the document is an "Aadhaar Card", extract the following:
  - "gender" (e.g., "Male", "Female")
  - "dob" (Date of birth, e.g., "20/10/2006")
  - "age" (Calculate age from DOB, return as number)
  - "address" (Full address)
  - "name" (Full name of the person)
  - "aadhaarNumber" (12-digit Aadhaar number)
If the document does not contain this information, return null for those fields.

Return ONLY valid JSON with no markdown, no explanation outside the JSON:
{
  "isBlurry": true or false,
  "blurDescription": "short description of quality issue, or null if image is clear",
  "detectedDocType": "the document type you identified from the image",
  "isCorrectType": true or false,
  "typeMismatchReason": "short explanation if wrong type was uploaded, or null if correct",
  "overallStatus": "clean" | "blurry" | "wrong_type" | "blurry_and_wrong_type",
  "feedback": "One concise, helpful, farmer-friendly sentence summarizing the check result",
  "extractedData": {
    "landSizeHectares": number | null,
    "caste": string | null,
    "gender": string | null,
    "dob": string | null,
    "age": number | null,
    "address": string | null,
    "name": string | null,
    "aadhaarNumber": string | null
  }
}`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ]);

    const rawText = result.response.text();
    console.log('[validate-document] Gemini raw response:', rawText.slice(0, 400));
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    let validation: any;
    try {
      validation = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('[validate-document] JSON parse failed. Raw text:', rawText.slice(0, 500));
      return NextResponse.json({ error: 'AI returned an unexpected response format.' }, { status: 500 });
    }

    // Sanitize the response to ensure required fields are present
    const sanitized = {
      isBlurry: Boolean(validation.isBlurry),
      blurDescription: validation.blurDescription || null,
      detectedDocType: validation.detectedDocType || 'Unknown',
      isCorrectType: Boolean(validation.isCorrectType),
      typeMismatchReason: validation.typeMismatchReason || null,
      overallStatus: ['clean', 'blurry', 'wrong_type', 'blurry_and_wrong_type'].includes(validation.overallStatus)
        ? validation.overallStatus
        : 'clean',
      feedback: validation.feedback || 'Document checked.',
      extractedData: validation.extractedData || null
    };

    console.log(`[validate-document] Result: ${sanitized.overallStatus} | Detected: ${sanitized.detectedDocType} | Data:`, sanitized.extractedData);
    return NextResponse.json({ success: true, validation: sanitized });

  } catch (error: any) {
    console.error('[validate-document] Unhandled error:', error?.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during validation.' },
      { status: 500 }
    );
  }
}
