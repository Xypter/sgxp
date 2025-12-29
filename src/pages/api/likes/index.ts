// src/pages/api/likes/index.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, cookies }) => {
  const payloadUrl = import.meta.env.PAYLOAD_URL;
  const token = cookies.get('payload-token')?.value;
  const queryString = url.search;

  try {
    const headers: HeadersInit = {};
    if (token) {
        headers['Cookie'] = `payload-token=${token}`;
    }

    const response = await fetch(`${payloadUrl}/api/likes${queryString}`, {
      method: 'GET',
      headers
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in GET /api/likes:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500 }
    );
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: No token found' }),
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const payloadUrl = import.meta.env.PAYLOAD_URL;

    const response = await fetch(`${payloadUrl}/api/likes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in POST /api/likes:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500 }
    );
  }
};