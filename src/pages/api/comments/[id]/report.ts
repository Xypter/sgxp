// src/pages/api/comments/[id]/report.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ params, request, cookies }) => {
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
    const { id } = params;

    const response = await fetch(`${payloadUrl}/api/comments/${id}/report`, {
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
    console.error("Error in POST /api/comments/[id]/report:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500 }
    );
  }
};
