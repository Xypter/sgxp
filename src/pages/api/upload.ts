import type { APIRoute } from 'astro';
import { uploadToR2 } from '../../utils/r2';
import sharp from 'sharp';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_HOST!);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const AVATAR_SIZE = 100; // pixels

export async function POST({ request }: { request: Request }) {
  console.log('Upload endpoint hit');
  console.log('Environment check:', {
    hasBucket: !!process.env.R2_BUCKET_NAME,
    hasAccountId: !!process.env.R2_ACCOUNT_ID,
    bucket: process.env.R2_BUCKET_NAME,
    accountId: process.env.R2_ACCOUNT_ID
  });
  try {
    const formData = await request.formData();
    console.log('FormData received:', {
      hasFile: !!formData.get('file'),
      userId: formData.get('userId'),
      type: formData.get('type')
    });
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const type = formData.get('type') as string;

    // Validate required fields
    if (!file) throw new Error('No file provided');
    if (!userId) throw new Error('No user ID provided');
    if (!type) throw new Error('No type provided');

    // Validate file
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Invalid file type');
    if (file.size > MAX_FILE_SIZE) throw new Error('File too large');

    // Convert File to Buffer
    let buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch (e) {
      throw new Error('Failed to process file: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }

    // Process image with sharp
    let processed;
    try {
      processed = await sharp(buffer)
        .resize(AVATAR_SIZE, AVATAR_SIZE, {
          fit: 'cover',
          position: 'center'
        })
        .rotate() // Auto-rotate based on EXIF data
        .webp({ quality: 80 })
        .toBuffer();
    } catch (e) {
      throw new Error('Failed to process image: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }

    // Generate unique filename
    const key = `avatars/${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

    // Upload to R2
    let url;
    try {
      url = await uploadToR2(processed, key, 'image/webp', { cleanup: true, userId });
    } catch (e) {
      throw new Error('Failed to upload to R2: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }

    // Store URL in PostgreSQL
    await sql`
      UPDATE users
      SET avatar = ${url}
      WHERE id = ${userId}
    `;

    return new Response(JSON.stringify({ success: true, url }), {
      status: 200,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
    });
  }
} 