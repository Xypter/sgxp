// src/pages/api/auth/callback.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { access_token, refresh_token } = await request.json();

  console.log('Received tokens:', { 
    hasAccessToken: !!access_token, 
    hasRefreshToken: !!refresh_token 
  });

  if (access_token) {
    cookies.set('sb-access-token', access_token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD, // Only use secure in production
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
      maxAge: 60 * 60 * 24 * 7, // 1 week
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
    success: true,
    hasAccessToken: !!access_token,
    hasRefreshToken: !!refresh_token
  }), {
    status: 200,
  });
};