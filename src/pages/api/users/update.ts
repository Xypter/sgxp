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
    // First, get the current user's ID
    const payloadUrl = import.meta.env.PAYLOAD_URL;
    const meResponse = await fetch(`${payloadUrl}/api/users/me`, {
      headers: {
        'Cookie': `payload-token=${token}`
      }
    });

    if (!meResponse.ok) {
      return new Response(
        JSON.stringify({ message: 'Unauthorized: Invalid token' }),
        { status: 401 }
      );
    }

    const meData = await meResponse.json();
    const userId = meData.user?.id || meData.id;

    if (!userId) {
      return new Response(
        JSON.stringify({ message: 'Could not determine user ID' }),
        { status: 400 }
      );
    }

    // Get the update data from the request
    const updateData = await request.json();

    console.log('[API] Updating user:', userId);
    console.log('[API] Update data:', JSON.stringify(updateData, null, 2));

    // Forward the update to Payload CMS using the user ID
    const response = await fetch(`${payloadUrl}/api/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`
      },
      body: JSON.stringify(updateData)
    });

    console.log('[API] Payload response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[API] Payload error:', errorData);
      return new Response(
        JSON.stringify({
          message: errorData.message || 'Failed to update profile',
          errors: errorData.errors || []
        }),
        { status: response.status }
      );
    }

    const updatedUser = await response.json();
    const updatedUserId = updatedUser.doc?.id || updatedUser.id;

    console.log('[API] Profile updated successfully for user:', updatedUserId);

    // Invalidate all caches for this user
    if (updatedUserId) {
      await invalidateUserCache(updatedUserId, token);
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
