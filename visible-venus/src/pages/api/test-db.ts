// This file should be removed or renamed to avoid conflicts

import type { APIRoute } from 'astro';
import { getClientWithUserContext, supabase } from '../../../lib/db';

export const GET: APIRoute = async () => {
  const testResults: Record<string, { success: boolean; error?: string }> = {};
  let client;

  try {
    // Test 1: Supabase Authentication
    testResults.auth = { success: false };
    const { data: session } = await supabase.auth.getSession();
    if (!session) throw new Error('No authenticated session');
    testResults.auth.success = true;

    // Test 2: Database Connection
    testResults.dbConnection = { success: false };
    client = await getClientWithUserContext(session.session?.user.id!);
    testResults.dbConnection.success = true;

    // Test 3: RLS Policies
    testResults.rlsPolicies = { success: false };
    const rlsTest = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM user_data 
        WHERE user_id != $1 
        LIMIT 1
      )`, [session.session?.user.id]
    );
    testResults.rlsPolicies.success = !rlsTest.rows[0].exists;

    // Test 4: CRUD Operations
    testResults.crud = { success: false };
    
    // Create
    const insertResult = await client.query(
      'INSERT INTO user_data (user_id, title, content) VALUES ($1, $2, $3) RETURNING id',
      [session.session?.user.id, 'Test Title', 'Test Content']
    );
    const testId = insertResult.rows[0].id;

    // Read
    const readResult = await client.query(
      'SELECT * FROM user_data WHERE id = $1',
      [testId]
    );

    // Update
    await client.query(
      'UPDATE user_data SET content = $1 WHERE id = $2',
      ['Updated Content', testId]
    );

    // Delete
    await client.query(
      'DELETE FROM user_data WHERE id = $1',
      [testId]
    );

    testResults.crud.success = true;

    // Test 5: Enum Types
    testResults.enums = { success: false };
    const enumTest = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'approval_status_enum'
      )`
    );
    testResults.enums.success = enumTest.rows[0].exists;

    // Test 6: Triggers
    testResults.triggers = { success: false };
    const triggerTest = await client.query(`
      INSERT INTO user_data (user_id, title, content) 
      VALUES ($1, 'Trigger Test', 'Test Content') 
      RETURNING created_at, updated_at
    `, [session.session?.user.id]);
    
    const { created_at, updated_at } = triggerTest.rows[0];
    testResults.triggers.success = created_at && updated_at;

    // Cleanup trigger test data
    await client.query(
      'DELETE FROM user_data WHERE title = $1',
      ['Trigger Test']
    );

    return new Response(JSON.stringify({
      success: true,
      tests: testResults,
      message: 'All database integration tests completed'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Test Error:', error);
    return new Response(JSON.stringify({
      success: false,
      tests: testResults,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}; 