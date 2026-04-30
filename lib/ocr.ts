import { PDFParse } from 'pdf-parse'
import Tesseract from 'tesseract.js'

export interface OcrResult {
  text: string
  method: 'pdf-parse' | 'tesseract' | 'pdf-parse+tesseract-fallback'
  confidence: number // 0-100 estimate
}

/**
 * Extract text from a file buffer. Supports PDF (digital + scanned) and images.
 *
 * Strategy:
 *  - Digital PDFs → pdf-parse v2 (fast, accurate)
 *  - Scanned PDFs → pdf-parse first; if <50 chars, fallback to Tesseract
 *  - JPG/PNG → Tesseract directly with eng+mar language pack
 */
export async function extractText(
  fileBuffer: Buffer,
  mimeType: string
): Promise<OcrResult> {
  if (mimeType === 'application/pdf') {
    return extractFromPdf(fileBuffer)
  }

  if (mimeType.startsWith('image/')) {
    return extractFromImage(fileBuffer)
  }

  throw new Error(`Unsupported MIME type for OCR: ${mimeType}`)
}

async function extractFromPdf(buffer: Buffer): Promise<OcrResult> {
  try {
    // pdf-parse v2 TS types mark some methods as private even though they're 
    // part of the public API. Cast through `any` to access them safely.
    const parser: any = new PDFParse({ verbosity: 0 })
    await parser.load(buffer)

    const text: string = (await parser.getText() || '').trim()
    parser.destroy()

    // If meaningful text was extracted, PDF has embedded text
    if (text.length >= 50) {
      return { text, method: 'pdf-parse', confidence: 95 }
    }

    // Scanned PDF — fallback to Tesseract
    console.info('[OCR] PDF has <50 chars from pdf-parse, falling back to Tesseract')
    const tesseractResult = await runTesseract(buffer)
    return {
      text: tesseractResult.text,
      method: 'pdf-parse+tesseract-fallback',
      confidence: tesseractResult.confidence,
    }
  } catch (err) {
    // pdf-parse crashed entirely (corrupted PDF, etc.) — pure Tesseract
    console.warn('[OCR] pdf-parse failed, using Tesseract:', (err as Error).message)
    const tesseractResult = await runTesseract(buffer)
    return {
      text: tesseractResult.text,
      method: 'tesseract',
      confidence: tesseractResult.confidence,
    }
  }
}

async function extractFromImage(buffer: Buffer): Promise<OcrResult> {
  const result = await runTesseract(buffer)
  return { text: result.text, method: 'tesseract', confidence: result.confidence }
}

async function runTesseract(
  buffer: Buffer
): Promise<{ text: string; confidence: number }> {
  const { data } = await Tesseract.recognize(buffer, 'eng+mar')
  return {
    text: (data.text || '').trim(),
    confidence: data.confidence ?? 50,
  }
}

/**
 * Determine the simple file type key for the DB `file_type` column.
 */
export function getFileTypeKey(mimeType: string): 'pdf' | 'jpg' | 'png' | null {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  return null
}
