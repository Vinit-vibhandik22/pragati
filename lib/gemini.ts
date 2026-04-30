import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

// Use Gemini 3.1 Flash Lite Preview as requested (Free & Advanced)
const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview'

/**
 * Call Gemini and parse the response as typed JSON.
 * Includes cleaning of markdown fences.
 */
export async function geminiJSON<T>(
  systemPrompt: string,
  userContent: string
): Promise<T> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable.')
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
    })

    const result = await model.generateContent(userContent)
    const response = await result.response
    const text = response.text()

    // Clean markdown code blocks
    const clean = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()

    return JSON.parse(clean) as T
  } catch (error: any) {
    console.error('[Gemini] Generation failed:', error)
    throw error
  }
}
