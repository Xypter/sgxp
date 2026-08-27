// src/pages/api/archive-entries/[id].ts
import type { APIRoute } from 'astro';

const PAYLOAD_URL = import.meta.env.PAYLOAD_URL;

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(JSON.stringify({ message: 'Unauthorized: No token found' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = params;

    const response = await fetch(`${PAYLOAD_URL}/api/archive-entries/${id}?depth=1`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in PATCH /api/archive-entries/[id]:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
};
