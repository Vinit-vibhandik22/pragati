export type DetectedFileType = {
  ext: string;
  mime: string;
};

export type FileTypeValidationResult = {
  isValid: boolean;
  detectedType: DetectedFileType | null;
  error?: string;
  isDisguised: boolean;
};

/**
 * Detects the actual file type using Magic Bytes (file signatures).
 * Supports both Browser (File/Blob) and Node (Uint8Array/ArrayBuffer) environments.
 * This is incredibly robust against farmers renaming .jpg to .pdf to bypass validation.
 */
export async function detectFileType(input: File | Blob | Uint8Array | ArrayBuffer): Promise<DetectedFileType | null> {
  let bytes: Uint8Array;

  try {
    if (input instanceof Uint8Array) {
      bytes = input;
    } else if (input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input);
    } else if (typeof File !== 'undefined' && input instanceof File) {
      // Read only the first 16 bytes for efficiency, no need to load the whole file into memory
      const slice = input.slice(0, 16);
      const buffer = await slice.arrayBuffer();
      bytes = new Uint8Array(buffer);
    } else if (typeof Blob !== 'undefined' && input instanceof Blob) {
      const slice = input.slice(0, 16);
      const buffer = await slice.arrayBuffer();
      bytes = new Uint8Array(buffer);
    } else {
      throw new Error('Unsupported input type');
    }
  } catch (error) {
    return null;
  }

  // If the file is completely empty or severely truncated
  if (bytes.length < 4) {
    return null;
  }

  // PDF: %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { ext: 'pdf', mime: 'application/pdf' };
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  // WebP: RIFF ... WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  // GIF: GIF8
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return { ext: 'gif', mime: 'image/gif' };
  }

  // Unknown or unsupported format
  return null;
}

/**
 * Validates the file and checks if the user deliberately disguised the extension.
 * This is useful for our Exception Desk / Audit Logs.
 */
export async function analyzeFile(file: File): Promise<FileTypeValidationResult> {
  const detectedType = await detectFileType(file);

  if (!detectedType) {
    return {
      isValid: false,
      detectedType: null,
      isDisguised: false,
      error: 'FILE_CORRUPTED_OR_UNSUPPORTED: The uploaded file is either completely corrupted or in an unknown format. Please upload a valid PDF, JPG, PNG, or WebP.',
    };
  }

  const originalName = file.name;
  const lastDotIndex = originalName.lastIndexOf('.');
  const originalExt = lastDotIndex !== -1 ? originalName.substring(lastDotIndex + 1).toLowerCase() : '';

  // Mapping edge cases where multiple extensions map to the same magic byte signature
  const normalizedOriginalExt = originalExt === 'jpeg' ? 'jpg' : originalExt;
  
  const isDisguised = normalizedOriginalExt !== detectedType.ext && normalizedOriginalExt !== '';

  return {
    isValid: true,
    detectedType,
    isDisguised,
  };
}
