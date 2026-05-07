const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  
  try {
    // Note: listModels is not on genAI directly in some SDK versions, it's on a client.
    // But we can try to just call it if it exists or use the discovery API.
    // For now, let's just try to hit 'gemini-1.5-flash' and 'gemini-1.5-flash-latest'
    // and see which one works.
    
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro', 'gemini-pro-vision'];
    
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        console.log(`Testing model: ${m}...`);
        // Simple prompt to check if it's found
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
