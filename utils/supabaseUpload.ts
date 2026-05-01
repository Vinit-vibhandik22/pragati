import { createClient } from '@supabase/supabase-js';
import { analyzeFile } from './fileTypeDetector';

// Note: In a real Next.js app, consider passing the supabase instance or using the appropriate server/client Supabase client creation utility.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export type UploadResult = {
  path: string;
  url: string;
  originalName: string;
  finalName: string;
  detectedMime: string;
  isDisguised: boolean;
};

/**
 * Uploads a document to Supabase Storage, bypassing extension spoofing.
 * It detects the true MIME type, corrects the extension if disguised,
 * appends a unique ID to prevent collisions, and provides a flag for the Audit Log.
 *
 * @param file The File object directly from the form input.
 * @param bucketName The target Supabase storage bucket (e.g., 'farmer_documents').
 * @param farmerId Used to organize the folder structure (optional).
 */
export async function uploadDocument(
  file: File,
  bucketName: string,
  farmerId?: string
): Promise<UploadResult> {
  // 1. Analyze the file for true type and potential spoofing
  const analysis = await analyzeFile(file);

  // 2. Handle corrupted or highly malicious (non-whitelisted format) files
  if (!analysis.isValid || !analysis.detectedType) {
    // Provide a highly transparent error message for the UI
    throw new Error(analysis.error || 'UNEXPECTED_FILE_ERROR: Unable to process the document.');
  }

  const { detectedType, isDisguised } = analysis;
  const originalName = file.name;
  
  // Extract base name safely
  const lastDotIndex = originalName.lastIndexOf('.');
  let baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
  
  // Clean base name to prevent path traversal or weird URL characters
  baseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');

  // 3. Construct a collision-resistant, accurate filename
  // Using crypto.randomUUID() for a secure, random suffix
  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15);
  
  const finalFileName = `${baseName}_${uniqueId}.${detectedType.ext}`;

  // 4. Create a fresh File object. This ensures the browser/fetch API 
  // sends the CORRECT Content-Type header to Supabase, bypassing the original spoofed one.
  const finalFile = new File([file], finalFileName, { type: detectedType.mime });

  // 5. Construct the storage path
  const folderPath = farmerId ? `${farmerId}/` : '';
  const storagePath = `${folderPath}${finalFileName}`;

  // 6. Execute the upload to Supabase
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, finalFile, {
      contentType: detectedType.mime,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`UPLOAD_FAILED: ${error.message}`);
  }

  // Generate public URL (assuming the bucket is public; if private, generate signed URL instead)
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  // 7. Return metadata for the database & Audit Log
  return {
    path: data.path,
    url: publicUrlData.publicUrl,
    originalName,
    finalName: finalFileName,
    detectedMime: detectedType.mime,
    // The caller (API route/Server Action) should log this flag in the DB for the Clerk Exception Dashboard
    isDisguised, 
  };
}
