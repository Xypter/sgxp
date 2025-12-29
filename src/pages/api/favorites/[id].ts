import type { APIRoute } from 'astro';

const PAYLOAD_URL = import.meta.env.PUBLIC_PAYLOAD_URL;

export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Favorite ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Get the payload-token cookie
    const payloadToken = cookies.get('payload-token');

    if (!payloadToken) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Cookie': `payload-token=${payloadToken.value}`,
    };

    const response = await fetch(`${PAYLOAD_URL}/api/favorites/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return new Response(JSON.stringify(errorData), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete favorite' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
