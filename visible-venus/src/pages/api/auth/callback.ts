// In your callback.ts file:

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const requestUrl = new URL(request.url);
  console.log('Callback URL:', requestUrl.toString());
  
  // Get all the parameters
  const params = Object.fromEntries(requestUrl.searchParams.entries());
  console.log('All parameters:', params);

  try {
    // Get session from URL
    const { data, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    if (data?.session) {
      const user = data.session.user;
      const isNewUser = user.app_metadata.provider === 'discord' && 
                       user.created_at === user.last_sign_in_at;

      // If this is a new Discord user, create their profile
      if (isNewUser) {
        try {
          const metadata = user.user_metadata;
          const defaultUsername = user.email ? user.email.split('@')[0] : `user_${Date.now()}`;

          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email ?? '',
            username: metadata.full_name || metadata.preferred_username || defaultUsername,
            avatar_url: metadata.avatar_url
          }).single();
        } catch (profileError) {
          console.error('Profile creation error:', profileError);
          // Continue anyway since auth succeeded
        }
      }

      // Set the cookies
      cookies.set('sb-access-token', data.session.access_token, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });

      cookies.set('sb-refresh-token', data.session.refresh_token, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });

      return redirect('/profile');
    }

    return redirect('/login?error=no_session');
  } catch (error) {
    console.error('Auth error:', error);
    return redirect('/login?error=auth_failed');
  }
};

// Keep the POST handler the same as before
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    
    if (!body.access_token || !body.refresh_token) {
      throw new Error('Missing tokens');
    }

    cookies.set('sb-access-token', body.access_token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    cookies.set('sb-refresh-token', body.refresh_token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
};