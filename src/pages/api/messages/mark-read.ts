// src/pages/api/messages/mark-read.ts
import type { APIRoute } from 'astro';
import { invalidateMessageCache } from '$lib/redis';

export const POST: APIRoute = async ({ cookies, request }) => {
  // Get the token from the secure, HttpOnly cookie
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: No token found' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get current user ID for cache invalidation
    const payloadUrl = import.meta.env.PAYLOAD_URL;
    const meResponse = await fetch(`${payloadUrl}/api/users/me`, {
      headers: { 'Cookie': `payload-token=${token}` }
    });

    if (!meResponse.ok) {
      return new Response(
        JSON.stringify({ message: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const meData = await meResponse.json();
    const userId = meData.user?.id || meData.id;

    // Get request body
    const body = await request.json();

    // Forward to Payload CMS
    const response = await fetch(`${payloadUrl}/api/messages/mark-read`, {
      method: 'POST',
      headers: {
        'Cookie': `payload-token=${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify(data),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Invalidate cache for user (inbox and unread count)
    await invalidateMessageCache(userId);
    console.log('[API Messages Mark Read] Messages marked as read, cache invalidated');

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API Messages Mark Read] Error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
