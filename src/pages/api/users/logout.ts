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

    // Clear the HttpOnly cookie by setting it to expire
    cookies.delete('payload-token', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
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