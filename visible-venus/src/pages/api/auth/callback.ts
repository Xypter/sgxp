import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { access_token, refresh_token } = await request.json();

  if (access_token) {
    cookies.set('sb-access-token', access_token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  if (refresh_token) {
    cookies.set('sb-refresh-token', refresh_token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return new Response(JSON.stringify({
    message: 'Auth tokens stored',
    success: true
  }), {
    status: 200
  });
};

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/dashboard';
  
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
      return redirect(next);
    }
  
    return redirect('/login?error=no_code');
  };