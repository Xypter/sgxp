import type { APIRoute } from 'astro';

const PAYLOAD_URL = import.meta.env.PUBLIC_PAYLOAD_URL;

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const url = new URL(request.url);
    const queryParams = url.searchParams.toString();

    // Forward the request to Payload CMS
    const payloadUrl = `${PAYLOAD_URL}/api/favorites${queryParams ? `?${queryParams}` : ''}`;

    // Get the payload-token cookie
    const payloadToken = cookies.get('payload-token');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Include the cookie if it exists
    if (payloadToken) {
      headers['Cookie'] = `payload-token=${payloadToken.value}`;
    }

    const response = await fetch(payloadUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch favorites' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();

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

    const response = await fetch(`${PAYLOAD_URL}/api/favorites`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating favorite:', error);
    return new Response(JSON.stringify({ error: 'Failed to create favorite' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
