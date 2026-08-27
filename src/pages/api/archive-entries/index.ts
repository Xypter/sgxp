// src/pages/api/archive-entries/index.ts
import type { APIRoute } from 'astro';

const PAYLOAD_URL = import.meta.env.PAYLOAD_URL;

export const GET: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(JSON.stringify({ message: 'Unauthorized: No token found' }), { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const queryParams = url.searchParams.toString();

    const response = await fetch(
      `${PAYLOAD_URL}/api/archive-entries${queryParams ? `?${queryParams}` : ''}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `payload-token=${token}`,
        },
      }
    );

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /api/archive-entries:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
};
