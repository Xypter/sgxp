// src/pages/api/users/me.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies }) => {
  // Get the token from the secure, HttpOnly cookie sent by the browser
  const token = cookies.get('payload-token')?.value;

  // If no token exists, the user is not logged in.
  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: No token found' }), 
      { status: 401 }
    );
  }

  try {
    // This is a server-to-server request.
    // We forward the user's token to your Payload CMS to verify it.
    const payloadUrl = import.meta.env.PAYLOAD_URL;
    
    const response = await fetch(`${payloadUrl}/api/users/me`, {
      headers: {
        // Forward the cookie to the Payload API for authentication
        'Cookie': `payload-token=${token}`
      }
    });

    const data = await response.json();

    // If Payload responds with an error (e.g., token is invalid/expired),
    // return an unauthorized status.
    if (!response.ok) {
      return new Response(
        JSON.stringify({ message: 'Unauthorized: Invalid token' }), 
        { status: 401 }
      );
    }

    // If the token is valid, Payload returns the user data.
    // Send this data back to your React component.
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in /api/users/me endpoint:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }), 
      { status: 500 }
    );
  }
};