import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabaseClient';

console.log('Update profile endpoint loaded');

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get session tokens from cookies
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      throw new Error('Auth session missing!');
    }

    // Set the session for the Supabase client
    const { data: { session }, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (sessionError || !session) {
      throw new Error('Failed to set session');
    }

    // Get the update data
    const data = await request.json();

    // Update the user profile
    const { error } = await supabase.auth.updateUser(data);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update profile'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 