import { S3Client, ListObjectsCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import postgres from 'postgres';

async function migrateFiles() {
  const sql = postgres(process.env.POSTGRES_HOST!);
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  try {
    // List all objects in bucket
    const objects = await s3.send(new ListObjectsCommand({
      Bucket: process.env.R2_BUCKET_NAME
    }));

    // For each object
    for (const object of objects.Contents || []) {
      // Example: Move from old path to new path
      const newKey = object.Key?.replace('sprites/', 'new-structure/');
      
      // Copy to new location
      await s3.send(new CopyObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        CopySource: `${process.env.R2_BUCKET_NAME}/${object.Key}`,
        Key: newKey
      }));

      // Update database with new URL
      await sql`
        UPDATE sprite_sheets 
        SET url = ${`${process.env.R2_PUBLIC_URL}/${newKey}`}
        WHERE url = ${`${process.env.R2_PUBLIC_URL}/${object.Key}`}
      `;

      // Optionally delete old file
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: object.Key
      }));
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
} 