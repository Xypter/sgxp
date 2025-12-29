import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ params }) => {
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
    const response = await fetch(`${PAYLOAD_URL}/api/sprites/${spriteId}/view`, {
      method: 'POST',
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
    console.error(`Error tracking view for sprite ${spriteId}:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to track view'
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
