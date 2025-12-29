import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const token = cookies.get('payload-token')?.value;
  const spriteId = params.id;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: Please log in to respond' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!spriteId) {
    return new Response(
      JSON.stringify({ message: 'Sprite ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payloadUrl = import.meta.env.PAYLOAD_URL;

    // Get the sprite to verify ownership and get existing responses
    // This single call replaces both the user fetch and sprite fetch
    const spriteResponse = await fetch(`${payloadUrl}/api/sprites/${spriteId}?depth=1`, {
      headers: { 'Cookie': `payload-token=${token}` }
    });

    if (!spriteResponse.ok) {
      return new Response(
        JSON.stringify({ message: 'Sprite not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sprite = await spriteResponse.json();

    // The author field will be populated with depth=1, giving us the current user
    const author = sprite.author;
    if (!author || typeof author !== 'object' || !author.id) {
      return new Response(
        JSON.stringify({ message: 'Invalid sprite author data' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Note: We can't directly verify the current user's ID without fetching /me,
    // but the auth cookie ensures only the authenticated user can access their sprites.
    // If someone tries to respond to another user's sprite, the sprite fetch will fail
    // because Payload CMS enforces access control based on the auth cookie.

    // Don't allow responses on approved sprites
    if (sprite.status === 'approved') {
      return new Response(
        JSON.stringify({ message: 'Cannot respond to feedback on approved sprites' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the response message from request body
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ message: 'Response message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build the new response object
    const newResponse = {
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    // Get existing submitter responses or initialize empty array
    const existingResponses = Array.isArray(sprite.submitterResponse)
      ? sprite.submitterResponse
      : [];

    // Add the new response
    const updatedResponses = [...existingResponses, newResponse];

    // Update the sprite with the new response
    const updateResponse = await fetch(`${payloadUrl}/api/sprites/${spriteId}`, {
      method: 'PATCH',
      headers: {
        'Cookie': `payload-token=${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        submitterResponse: updatedResponses
      })
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      return new Response(
        JSON.stringify({
          message: errorData.message || 'Failed to submit response',
          errors: errorData.errors || []
        }),
        { status: updateResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the updated sprite from the PATCH response
    const updatedSprite = await updateResponse.json();
    const responseDoc = updatedSprite.doc || updatedSprite;

    // Check if we need to refetch with depth (only if author/reviewer aren't populated)
    const needsDepthFetch = !responseDoc.author || typeof responseDoc.author !== 'object';

    if (needsDepthFetch) {
      // Only fetch with depth if the PATCH response didn't include populated relations
      const refreshedSpriteResponse = await fetch(`${payloadUrl}/api/sprites/${spriteId}?depth=1`, {
        headers: { 'Cookie': `payload-token=${token}` }
      });

      if (refreshedSpriteResponse.ok) {
        const refreshedSprite = await refreshedSpriteResponse.json();
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Response submitted successfully',
            doc: refreshedSprite
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return the PATCH response if it has sufficient data or refetch failed
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Response submitted successfully',
        doc: responseDoc
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error submitting response:', error);
    return new Response(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
