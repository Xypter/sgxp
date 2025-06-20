import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabaseClient';

export const post: APIRoute = async ({ request }) => {
  try {
    const { user } = await request.json();

    if (!user?.id) {
      throw new Error('No user ID provided');
    }

    // Set default avatar
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { 
        avatar_url: 'https://cdn.sgxp.me/sgxp_default.png'
      }
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200
    });
  } catch (error) {
    console.error('Error setting default avatar:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to set default avatar'
    }), {
      status: 500
    });
  }
}; 