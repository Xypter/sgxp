// src/pages/api/messages/unread-count.ts
import type { APIRoute } from 'astro';
import { getCached, setCached, cacheKey, CACHE_TTL } from '$lib/redis';

export const GET: APIRoute = async ({ cookies }) => {
  // Get the token from the secure, HttpOnly cookie
  const token = cookies.get('payload-token')?.value;

  // If no token, return 0 unread count (don't error - used in navbar)
  if (!token) {
    return new Response(
      JSON.stringify({ unreadCount: 0, lastChecked: new Date().toISOString() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get current user ID for cache key
    const payloadUrl = import.meta.env.PAYLOAD_URL;
    const meResponse = await fetch(`${payloadUrl}/api/users/me`, {
      headers: { 'Cookie': `payload-token=${token}` }
    });

    // If invalid token, return 0 (graceful fallback)
    if (!meResponse.ok) {
      return new Response(
        JSON.stringify({ unreadCount: 0, lastChecked: new Date().toISOString() }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const meData = await meResponse.json();
    const userId = meData.user?.id || meData.id;

    // Try cache first
    const cacheKeyStr = cacheKey.messageUnreadCount(userId);
    const cached = await getCached<any>(cacheKeyStr);
    if (cached) {
      console.log('[API Messages Unread Count] Cache HIT');
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch from Payload CMS
    const response = await fetch(`${payloadUrl}/api/messages/unread-count`, {
      headers: { 'Cookie': `payload-token=${token}` }
    });

    if (!response.ok) {
      // Fallback to 0 if error
      return new Response(
        JSON.stringify({ unreadCount: 0, lastChecked: new Date().toISOString() }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Cache for 30 seconds
    await setCached(cacheKeyStr, data, CACHE_TTL.MESSAGE_UNREAD_COUNT);
    console.log('[API Messages Unread Count] Fetched and cached');

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API Messages Unread Count] Error:', error);
    // Return 0 on error (graceful fallback)
    return new Response(
      JSON.stringify({ unreadCount: 0, lastChecked: new Date().toISOString() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
