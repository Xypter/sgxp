import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params }) => {
  const PAYLOAD_URL = import.meta.env.PUBLIC_PAYLOAD_URL;
  const spriteId = params.id;

  if (!spriteId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Sprite ID is required'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    const response = await fetch(`${PAYLOAD_URL}/api/sprites/${spriteId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error(`Error fetching sprite ${spriteId}:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch sprite'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
