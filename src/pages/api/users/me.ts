// src/pages/api/users/me.ts
import type { APIRoute } from 'astro';
import { USER_COOKIE, toCachedUser, userCookieOptions, resolveUser } from '$lib/userCache';

export const GET: APIRoute = async ({ cookies, url }) => {
  const token = cookies.get('payload-token')?.value;

  // If no token exists, the user is not logged in.
  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: No token found' }),
      { status: 401 }
    );
  }

  // A depth query means the caller needs populated relations the shallow
  // display cache can't provide - always do a real Payload fetch for those,
  // and refresh the cache from the result while we're at it.
  const depth = url.searchParams.get('depth');
  if (depth) {
    try {
      const payloadUrl = import.meta.env.PAYLOAD_URL;
      const response = await fetch(`${payloadUrl}/api/users/me?depth=${depth}`, {
        headers: { 'Cookie': `payload-token=${token}` }
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ message: 'Unauthorized: Invalid token' }),
          { status: 401 }
        );
      }

      const data = await response.json();
      const userData = data.user || data;

      cookies.set(USER_COOKIE, JSON.stringify(toCachedUser(userData)), userCookieOptions());

      return new Response(JSON.stringify(userData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error in /api/users/me endpoint:', error);
      return new Response(
        JSON.stringify({ message: 'Internal Server Error' }),
        { status: 500 }
      );
    }
  }

  try {
    const { user } = await resolveUser(cookies);

    if (!user) {
      return new Response(
        JSON.stringify({ message: 'Unauthorized: Invalid token' }),
        { status: 401 }
      );
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in /api/users/me endpoint:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500 }
    );
  }
};
