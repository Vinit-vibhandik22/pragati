const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  
  try {
    const models = ['gemini-1.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro'];
    
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        console.log(`Testing model: ${m}...`);
        const result = await model.generateContent("hi");
        console.log(`  [${m}] Success!`);
      } catch (e) {
        console.log(`  [${m}] Failed: ${e.message}`);
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

listModels();
