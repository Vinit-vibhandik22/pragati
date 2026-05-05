from fastapi import FastAPI, UploadFile, File, HTTPException
from paddleocr import PaddleOCR
import os
import shutil
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ocr-engine")

app = FastAPI(
    title="PRAGATI AI OCR Engine",
    description="High-precision Marathi OCR service for government land records using PaddleOCR",
    version="1.0.0"
)

# Initialize PaddleOCR strictly for Marathi ('mr')
# use_angle_cls=True helps with rotated document scans
try:
    logger.info("Initializing PaddleOCR for Marathi...")
    ocr = PaddleOCR(lang='mr', use_angle_cls=True, show_log=False)
    logger.info("PaddleOCR initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize PaddleOCR: {e}")
    raise

# Ensure temporary storage directory exists
TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

@app.get("/")
async def health_check():
    return {"status": "online", "engine": "PaddleOCR", "language": "Marathi (mr)"}

@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """
    Accepts an image file, runs PaddleOCR for Marathi text extraction,
    and returns a clean JSON array of strings.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    # Generate a unique temporary filename
    file_extension = os.path.splitext(file.filename)[1]
    temp_filename = f"{uuid.uuid4()}{file_extension}"
    temp_path = os.path.join(TEMP_DIR, temp_filename)

    try:
        # Save the uploaded file temporarily
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"Processing OCR for: {file.filename}")

        # Run OCR inference
        # result is a list of [box, (text, confidence)]
        result = ocr.ocr(temp_path, cls=True)

        # Flatten the results into a clean list of strings
        extracted_text = []
        if result and result[0]:
            for line in result[0]:
                text = line[1][0] # Get the text string
                if text.strip():
                    extracted_text.append(text.strip())

        return {
            "filename": file.filename,
            "count": len(extracted_text),
            "text": extracted_text
        }

    except Exception as e:
        logger.error(f"OCR Processing Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Cleanup: Delete the temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)
            logger.info(f"Deleted temporary file: {temp_path}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
