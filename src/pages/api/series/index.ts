import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: Please log in' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payloadUrl = import.meta.env.PAYLOAD_URL;
    const body = await request.json();

    const response = await fetch(`${payloadUrl}/api/series`, {
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

    return new Response(
      JSON.stringify(data),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating series:', error);
    return new Response(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
