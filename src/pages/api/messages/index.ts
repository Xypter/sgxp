// src/pages/api/messages/index.ts
import type { APIRoute } from 'astro';
import { getCached, setCached, cacheKey, CACHE_TTL, invalidateMessageCache } from '$lib/redis';

export const GET: APIRoute = async ({ cookies, url }) => {
  // Get the token from the secure, HttpOnly cookie
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: No token found' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Extract query parameters
    const tab = url.searchParams.get('tab') || 'inbox'; // inbox or sent
    const page = url.searchParams.get('page') || '1';
    const limit = url.searchParams.get('limit') || '20';
    const unreadOnly = url.searchParams.get('unreadOnly') || 'false';
    const messageType = url.searchParams.get('messageType') || 'all';
    const search = url.searchParams.get('search') || '';
    const archived = url.searchParams.get('archived') || 'false';

    // Get current user ID for cache key
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

    // Build cache key with filters
    const filters = JSON.stringify({
      unreadOnly,
      messageType,
      search,
      archived
    });

    const cacheKeyStr = tab === 'inbox'
      ? cacheKey.messagesInbox(userId, parseInt(page), filters)
      : cacheKey.messagesSent(userId, parseInt(page), filters);

    // Try cache first
    const cached = await getCached<any>(cacheKeyStr);
    if (cached) {
      console.log('[API Messages] Cache HIT');
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build query params for Payload CMS
    const params = new URLSearchParams({
      page,
      limit,
      unreadOnly,
      messageType,
      search,
      archived
    });

    // Forward to Payload CMS inbox or sent endpoint
    const endpoint = tab === 'inbox' ? 'inbox' : 'sent';
    const response = await fetch(
      `${payloadUrl}/api/messages/${endpoint}?${params.toString()}`,
      {
        headers: { 'Cookie': `payload-token=${token}` }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return new Response(
        JSON.stringify(errorData),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Cache the result
    await setCached(cacheKeyStr, data, CACHE_TTL.MESSAGES_LIST);
    console.log('[API Messages] Fetched and cached messages');

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API Messages] Error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

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
    const senderId = meData.user?.id || meData.id;

    // Get request body
    const body = await request.json();

    // Forward to Payload CMS
    const response = await fetch(`${payloadUrl}/api/messages`, {
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

    // Invalidate cache for both sender and recipient
    await invalidateMessageCache(senderId);
    if (body.recipient && typeof body.recipient === 'string') {
      await invalidateMessageCache(body.recipient);
    }

    console.log('[API Messages] Message created, cache invalidated');

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API Messages POST] Error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
