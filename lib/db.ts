import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

const pool = new Pool({
  // Your PostgreSQL connection config
});

export async function getDbClient(supabaseToken: string) {
  const client = await pool.connect();
  
  // Set the JWT claim in the PostgreSQL session
  await client.query(`
    SET LOCAL request.jwt.claim.sub = '${supabaseToken}';
  `);
  
  return client;
} 