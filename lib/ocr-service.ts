'use server';

/**
 * PRAGATI AI OCR Service
 * Connects the Next.js server to the local Python PaddleOCR microservice.
 */
export async function analyzeDocumentWithPaddleOCR(formData: FormData) {
  try {
    const pythonOcrUrl = "http://localhost:8000/extract-text";

    console.log("[OCR Service] Sending document to PaddleOCR microservice...");
    
    const response = await fetch(pythonOcrUrl, {
      method: "POST",
      body: formData,
      // Increase timeout for OCR processing (PaddleOCR can be heavy)
      signal: AbortSignal.timeout(30000), 
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
      fullText: (data.text as string[]).join(" "),
      filename: data.filename
    };

  } catch (error: any) {
    console.error("[OCR Service] Connection Error:", error.message);
    
    // Return a structured error to prevent app crash
    return {
      success: false,
      error: error.message || "OCR service is currently offline.",
      errorDetails: error.message || "No specific error message available",
      fallbackStatus: "Manual_Review_Required"
    };
  }
}
