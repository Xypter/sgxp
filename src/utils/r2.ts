import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

console.log('Environment variables status:', {
    bucketName: process.env.PUBLIC_R2_BUCKET_NAME || 'not set',
    accountId: process.env.PUBLIC_R2_ACCOUNT_ID || 'not set',
    accessKeyId: process.env.PUBLIC_R2_ACCESS_KEY_ID ? 'set' : 'not set',
    secretAccessKey: process.env.PUBLIC_R2_SECRET_ACCESS_KEY ? 'set' : 'not set'
  });

const getEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
};

const R2_CONFIG = {
  accountId: getEnvVar('PUBLIC_R2_ACCOUNT_ID'),
  accessKeyId: getEnvVar('PUBLIC_R2_ACCESS_KEY_ID'),
  secretAccessKey: getEnvVar('PUBLIC_R2_SECRET_ACCESS_KEY'),
  bucketName: getEnvVar('PUBLIC_R2_BUCKET_NAME'),
};

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

// Validate required environment variables
if (!process.env.PUBLIC_R2_BUCKET_NAME) {
  throw new Error('R2_BUCKET_NAME environment variable is not set');
}
if (!process.env.PUBLIC_R2_ACCOUNT_ID) {
  throw new Error('R2_ACCOUNT_ID environment variable is not set');
}

export async function deleteOldAvatars(userId: string) {
  try {
    const objects = await s3Client.send(new ListObjectsCommand({
      Bucket: process.env.PUBLIC_R2_BUCKET_NAME,
      Prefix: `avatars/${userId}/`
    }));

    if (objects.Contents) {
      for (const object of objects.Contents) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.PUBLIC_R2_BUCKET_NAME,
          Key: object.Key
        }));
      }
    }
  } catch (error) {
    console.error('Error cleaning up old avatars:', error);
  }
}

export async function uploadToR2(
  file: File | Buffer,
  key: string,
  contentType?: string,
  options: { cleanup?: boolean; userId?: string } = {}
): Promise<string> {
  console.log('Starting R2 upload with params:', {
    bucketName: process.env.PUBLIC_R2_BUCKET_NAME,
    key,
    contentType,
    bufferSize: file instanceof Buffer ? file.length : undefined,
    endpoint: s3Client.config.endpoint
  });

  try {
    // If cleanup is enabled and userId provided, delete old files
    if (options.cleanup && options.userId) {
      await deleteOldAvatars(options.userId);
    }

    const bucketName = process.env.PUBLIC_R2_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('Bucket name is not available');
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
    });

    console.log('Sending PutObject command to R2...');
    const result = await s3Client.send(command);
    console.log('R2 upload result:', result);

    // Generate the public URL
    const publicUrl = `https://cdn.sgxp.me/${key}`;
    console.log('Generated public URL:', publicUrl);

    return publicUrl;
  } catch (error) {
    console.error('R2 upload error details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      config: {
        endpoint: s3Client.config.endpoint,
        bucket: process.env.PUBLIC_R2_BUCKET_NAME,
        accountId: process.env.PUBLIC_R2_ACCOUNT_ID
      }
    });
    throw error; // Throw the original error for better debugging
  }
} 