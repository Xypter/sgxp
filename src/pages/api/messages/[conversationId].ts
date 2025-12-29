// src/pages/api/messages/[conversationId].ts
import type { APIRoute } from 'astro';
import { getCached, setCached, cacheKey, CACHE_TTL } from '$lib/redis';

export const GET: APIRoute = async ({ cookies, params }) => {
  const { conversationId } = params;

  // Get the token from the secure, HttpOnly cookie
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: No token found' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!conversationId) {
    return new Response(
      JSON.stringify({ message: 'Conversation ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify token is valid
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

    // Try cache first
    const cacheKeyStr = cacheKey.messageConversation(conversationId);
    const cached = await getCached<any>(cacheKeyStr);
    if (cached) {
      console.log('[API Messages Conversation] Cache HIT');
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch from Payload CMS
    const response = await fetch(
      `${payloadUrl}/api/messages/conversation?conversationId=${conversationId}`,
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
    await setCached(cacheKeyStr, data, CACHE_TTL.MESSAGE_CONVERSATION);
    console.log('[API Messages Conversation] Fetched and cached conversation');

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API Messages Conversation] Error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
