import sharp from 'sharp';

export interface ProcessedImage {
  data: Buffer;
  format: string;
  size: number;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AVATAR_SIZE = 400; // pixels

export async function processAvatar(file: File): Promise<ProcessedImage> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 5MB.');
  }

  // Convert File to Buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Process image with sharp
  const processed = await sharp(buffer)
    .resize(AVATAR_SIZE, AVATAR_SIZE, {
      fit: 'cover',
      position: 'center'
    })
    .webp({ quality: 80 }) // Convert to WebP for better compression
    .toBuffer();

  return {
    data: processed,
    format: 'webp',
    size: processed.length
  };
} 