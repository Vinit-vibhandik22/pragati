'use server';

/**
 * PRAGATI AI OCR Service — V2
 * Connects Next.js server to the local Python PaddleOCR microservice.
 * Uses OCR_SERVICE_URL env var (default: http://localhost:8000).
 */
export async function analyzeDocumentWithPaddleOCR(formData: FormData): Promise<{
  success: true;
  text: string[];
  fullText: string;
  filename: string;
} | {
  success: false;
  error: string;
  errorDetails: string;
  fallbackStatus: 'Manual_Review_Required';
}> {
  const ocrUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8000';
  const endpoint = `${ocrUrl}/extract-text`;

  try {
    console.log(`[OCR Service] Sending document to PaddleOCR microservice at ${endpoint}...`);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(10000), // 10s hard limit per master prompt spec
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `OCR Service failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log(`[OCR Service] Successfully extracted ${data.count} text segments.`);

    return {
      success: true,
      text: data.text as string[],
      fullText: (data.text as string[]).join(' '),
      filename: data.filename
    };

  } catch (error: any) {
    // Per master prompt: OCR service unreachable → explicit error, NOT silent Manual_Review
    console.error('[OCR Service] Connection Error:', error.message);

    return {
      success: false,
      error: error.message || 'OCR service is currently offline.',
      errorDetails: error.message || 'No specific error message available',
      fallbackStatus: 'Manual_Review_Required'
    };
  }
}
