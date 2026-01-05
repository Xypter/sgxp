// src/pages/api/users/logout.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    // Get the token from the secure, HttpOnly cookie
    const token = cookies.get('payload-token')?.value;

    if (token) {
      // Call Payload's logout endpoint to invalidate the token server-side
      const payloadUrl = import.meta.env.PAYLOAD_URL;
      
      await fetch(`${payloadUrl}/api/users/logout`, {
        method: 'POST',
        headers: {
          'Cookie': `payload-token=${token}`
        }
      });
    }

    // Clear the HttpOnly cookie by setting it to expire immediately
    // Using set() with maxAge: 0 is more reliable than delete() across environments
    const isProduction = import.meta.env.PROD;

    cookies.set('payload-token', '', {
      path: '/',
      httpOnly: true,
      secure: isProduction, // Only use secure flag in production (HTTPS)
      sameSite: 'strict',
      maxAge: 0 // Immediately expire the cookie
    });

    return new Response(JSON.stringify({ message: 'Logged out successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in /api/users/logout endpoint:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }), 
      { status: 500 }
    );
  }
};