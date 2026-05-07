
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function runTest() {
  // Dynamically import to ensure dotenv.config() has run
  const { evaluateDocumentsWithGemini } = await import('../lib/gemini-evaluator');

  console.log("--- Starting Gemini Evaluation Test ---");
  
  const imagePath = 'C:\\Users\\manoj\\.gemini\\antigravity\\brain\\ffd563bb-59e7-4d91-b990-541a80f33f1a\\sample_marathi_document_1778136277226.png';
  
  if (!fs.existsSync(imagePath)) {
    console.error("Image not found at:", imagePath);
    return;
  }

  const imageBuffer = fs.readFileSync(imagePath);
  
  const farmerDetails = {
    name: "Vitthal Rao",
    aadhaar_last4: "1234",
    survey_number: "101",
    land_area: "1.5"
  };

  try {
    const verdict = await evaluateDocumentsWithGemini(
      [imageBuffer],
      ["7/12 Extract"],
      farmerDetails
    );
    
    console.log("\n--- Final Result ---");
    console.log(JSON.stringify(verdict, null, 2));
  } catch (err) {
    console.error("Test execution failed:", err);
  }
}

runTest();
