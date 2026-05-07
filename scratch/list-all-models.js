const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function listAllModels() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  
  try {
    // There is no listModels on the genAI object directly in the browser/node SDK usually.
    // It's in the GenerativeAIClient or similar.
    // However, we can try to use the fetch API to list models if we have the key.
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.models) {
      console.log("Available models:");
      data.models.forEach(m => console.log(` - ${m.name}`));
    } else {
      console.log("No models found or error:", data);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

listAllModels();
