
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

async function testModel() {
  console.log("Key starting with:", (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').substring(0, 5));
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    console.log("gemini-1.5-flash works:", result.response.text());
  } catch (err: any) {
    console.error("gemini-1.5-flash failed:", err.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent("Hello");
    console.log("gemini-flash-latest works:", result.response.text());
  } catch (err: any) {
    console.error("gemini-flash-latest failed:", err.message);
  }
}

testModel();
