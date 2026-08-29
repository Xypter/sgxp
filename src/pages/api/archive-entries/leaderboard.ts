// src/pages/api/archive-entries/leaderboard.ts
import type { APIRoute } from 'astro';

const PAYLOAD_URL = import.meta.env.PAYLOAD_URL;

export const GET: APIRoute = async ({ request, cookies }) => {
  // The leaderboard is publicly viewable - the cookie is forwarded when
  // present just for consistency, not because it's required.
  const token = cookies.get('payload-token')?.value;

  try {
    const url = new URL(request.url);
    const queryParams = url.searchParams.toString();

    const response = await fetch(
      `${PAYLOAD_URL}/api/archive-entries/leaderboard${queryParams ? `?${queryParams}` : ''}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Cookie: `payload-token=${token}` } : {}),
        },
      }
    );

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /api/archive-entries/leaderboard:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
};
