// src/pages/api/users/login.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { email, password } = await request.json();
  
  const payloadUrl = import.meta.env.PAYLOAD_URL;
  
  try {
    const response = await fetch(`${payloadUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Extract the cookie from Payload's response
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        // Parse and set the cookie on your domain
        cookies.set('payload-token', data.token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict', // Can use strict since it's same-origin now
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/'
        });
      }
      
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data), { status: response.status });
  } catch (error) {
    return new Response(
      JSON.stringify({ message: 'Login failed' }), 
      { status: 500 }
    );
  }
};