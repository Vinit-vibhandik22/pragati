require('dotenv').config({ path: 'd:/PRAGATI/.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini3() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
  console.log('Testing gemini-3.1-flash-lite-preview...');
  try {
    const result = await model.generateContent('Hi, say "Gemini 3 is active" if you hear me.');
    console.log('Success:', result.response.text());
  } catch (e) {
    console.log('Error:', e.message);
  }
}

testGemini3();
