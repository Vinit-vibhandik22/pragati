import { NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * Sanity Test Route for NVIDIA NIM Mistral Integration
 * Hit http://localhost:3000/api/test-nim to verify API connectivity.
 */
export async function GET() {
  try {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        status: "ERROR", 
        message: "NVIDIA_NIM_API_KEY is missing from .env.local" 
      }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });

    console.log("[Test NIM] Sending sanity request to Mistral Large 3...");

    const completion = await openai.chat.completions.create({
      model: "mistralai/mistral-large-3-675b-instruct-2512",
      messages: [
        { role: "user", content: "Respond with exactly the word 'SUCCESS' in JSON format: { 'status': 'SUCCESS' }" }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    console.log("[Test NIM] Received response:", responseContent);

    return NextResponse.json({
      status: "CONNECTED",
      model: completion.model,
      response: JSON.parse(responseContent || "{}"),
      usage: completion.usage
    });

  } catch (error: any) {
    console.error("[Test NIM] Connection Failed:", error);
    
    return NextResponse.json({
      status: "FAILED",
      error: error.message,
      details: error.response?.data || "Check console for full stack trace"
    }, { status: 500 });
  }
}
