import type { APIRoute } from 'astro';
import { invalidateUserCache } from '../../../lib/redis';

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: No token found' }),
      { status: 401 }
    );
  }

  try {
    // Get the update data from the request
    const updateData = await request.json();

    // Forward the update to Payload CMS
    const payloadUrl = import.meta.env.PAYLOAD_URL;
    const response = await fetch(`${payloadUrl}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(
        JSON.stringify({ message: errorData.message || 'Failed to update profile' }),
        { status: response.status }
      );
    }

    const updatedUser = await response.json();
    const userId = updatedUser.doc?.id || updatedUser.id;

    // Invalidate all caches for this user
    if (userId) {
      await invalidateUserCache(userId, token);
    }

    return new Response(
      JSON.stringify(updatedUser),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error updating profile:', error);
    return new Response(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
};
