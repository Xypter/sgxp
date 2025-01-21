import pkg from 'pg';
const { Pool } = pkg;
import { supabase } from '../src/lib/supabaseClient';

// Create pool using connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
});

// Export the existing supabase client
export { supabase };

// Helper to create a client with user context
export async function getClientWithUserContext(userId: string) {
  const client = await pool.connect();
  await client.query(`SET app.current_user_id = '${userId}'`);
  return client;
}

export async function getDbClient(supabaseToken: string) {
  const client = await pool.connect();
  
  // Set the JWT claim in the PostgreSQL session
  await client.query(`
    SET LOCAL request.jwt.claim.sub = '${supabaseToken}';
  `);
  
  return client;
}

// Add a helper to release the client back to the pool
export async function releaseClient(client: any) {
  if (client) {
    client.release();
  }
} 