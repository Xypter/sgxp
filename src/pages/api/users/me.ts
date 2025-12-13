// src/pages/api/users/me.ts
import type { APIRoute } from 'astro';
import { getCached, setCached, cacheKey, hashString, CACHE_TTL } from '$lib/redis';

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
    // OPTIMIZATION: Try Redis cache first
    const tokenHash = hashString(token);
    const authCacheKey = cacheKey.auth(tokenHash);
    const cachedUser = await getCached<any>(authCacheKey);

    if (cachedUser) {
      console.log('[API Auth] Cache HIT - returning cached user');
      return new Response(JSON.stringify(cachedUser), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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

    // Extract user object to match SSR caching format
    const userData = data.user || data;

    // Cache the user data for future requests
    await setCached(authCacheKey, userData, CACHE_TTL.AUTH);
    console.log('[API Auth] Fetched and cached user');

    // If the token is valid, Payload returns the user data.
    // Send this data back to your Svelte component.
    return new Response(JSON.stringify(userData), {
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