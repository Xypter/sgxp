// src/pages/api/comments/[id]/like.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ params, cookies }) => {
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: No token found' }),
      { status: 401 }
    );
  }

  try {
    const payloadUrl = import.meta.env.PAYLOAD_URL;
    const { id } = params;

    const response = await fetch(`${payloadUrl}/api/comments/${id}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`
      }
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in POST /api/comments/[id]/like:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500 }
    );
  }
};
