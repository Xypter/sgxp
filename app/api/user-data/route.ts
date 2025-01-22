import { NextResponse } from 'next/server';
import { getClientWithUserContext, getDbClient, releaseClient, supabase } from '../../../lib/db';

export async function POST(req: Request) {
  try {
    // Get the user from Supabase auth
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database client with user context
    const client = await getClientWithUserContext(session.user.id);
    
    try {
      const { title, content } = await req.json();
      
      const result = await client.query(
        'INSERT INTO user_data (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
        [session.user.id, title, content]
      );

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release(); // Always release the client back to the pool
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Get the user from Supabase auth
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbClient = await getDbClient(session.user.id);
    
    try {
      const result = await dbClient.query(
        'SELECT * FROM user_data WHERE user_id = $1', 
        [session.user.id]
      );
      return NextResponse.json(result.rows);
    } finally {
      await releaseClient(dbClient);
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 