import type { APIRoute } from 'astro';
import { invalidateSpriteCache } from '../../../lib/redis';

export const GET: APIRoute = async ({ params, url, cookies }) => {
  const token = cookies.get('payload-token')?.value;
  const spriteId = params.id;
  const payloadUrl = import.meta.env.PAYLOAD_URL;

  if (!spriteId) {
    return new Response(
      JSON.stringify({ message: 'Sprite ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Forward query parameters to Payload CMS (e.g., depth)
    const searchParams = new URLSearchParams(url.search);

    const response = await fetch(`${payloadUrl}/api/sprites/${spriteId}?${searchParams.toString()}`, {
      headers: token ? { 'Cookie': `payload-token=${token}` } : {}
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ message: 'Sprite not found' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching sprite:', error);
    return new Response(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const token = cookies.get('payload-token')?.value;
  const spriteId = params.id;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: Please log in to delete sprites' }),
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

    // Get the current user
    const meResponse = await fetch(`${payloadUrl}/api/users/me`, {
      headers: { 'Cookie': `payload-token=${token}` }
    });

    if (!meResponse.ok) {
      return new Response(
        JSON.stringify({ message: 'Failed to authenticate user' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const meData = await meResponse.json();
    const currentUser = meData.user || meData;

    if (!currentUser?.id) {
      return new Response(
        JSON.stringify({ message: 'User not found' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the existing sprite to verify ownership
    const spriteResponse = await fetch(`${payloadUrl}/api/sprites/${spriteId}?depth=0`, {
      headers: { 'Cookie': `payload-token=${token}` }
    });

    if (!spriteResponse.ok) {
      return new Response(
        JSON.stringify({ message: 'Sprite not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingSprite = await spriteResponse.json();

    // Verify the current user is the author or an admin
    const authorId = typeof existingSprite.author === 'object' ? existingSprite.author.id : existingSprite.author;
    const isAdmin = currentUser.role === 'admin';

    if (authorId !== currentUser.id && !isAdmin) {
      return new Response(
        JSON.stringify({ message: 'You can only delete your own sprites' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete the sprite
    const deleteResponse = await fetch(`${payloadUrl}/api/sprites/${spriteId}`, {
      method: 'DELETE',
      headers: { 'Cookie': `payload-token=${token}` }
    });

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      return new Response(
        JSON.stringify({
          message: errorData.message || 'Failed to delete sprite',
          errors: errorData.errors || []
        }),
        { status: deleteResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Invalidate sprite cache
    await invalidateSpriteCache(parseInt(spriteId));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sprite deleted successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deleting sprite:', error);
    return new Response(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const token = cookies.get('payload-token')?.value;
  const spriteId = params.id;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: Please log in to update sprites' }),
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

    console.log(`[Sprite Update] Starting update for sprite ${spriteId}`);

    // Get the current user with timeout
    console.log('[Sprite Update] Fetching current user...');
    const meController = new AbortController();
    const meTimeoutId = setTimeout(() => meController.abort(), 30000); // 30 second timeout

    let meResponse;
    try {
      meResponse = await fetch(`${payloadUrl}/api/users/me`, {
        headers: { 'Cookie': `payload-token=${token}` },
        signal: meController.signal
      });
      clearTimeout(meTimeoutId);
    } catch (error) {
      clearTimeout(meTimeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[Sprite Update] User authentication timed out');
        return new Response(
          JSON.stringify({ message: 'Authentication request timed out. Please try again.' }),
          { status: 408, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    if (!meResponse.ok) {
      return new Response(
        JSON.stringify({ message: 'Failed to authenticate user' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const meData = await meResponse.json();
    const currentUser = meData.user || meData;

    if (!currentUser?.id) {
      return new Response(
        JSON.stringify({ message: 'User not found' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Sprite Update] Authenticated as user ${currentUser.id}`);

    // Get the existing sprite to verify ownership with timeout
    console.log('[Sprite Update] Fetching existing sprite...');
    const spriteController = new AbortController();
    const spriteTimeoutId = setTimeout(() => spriteController.abort(), 30000); // 30 second timeout

    let spriteResponse;
    try {
      spriteResponse = await fetch(`${payloadUrl}/api/sprites/${spriteId}?depth=1`, {
        headers: { 'Cookie': `payload-token=${token}` },
        signal: spriteController.signal
      });
      clearTimeout(spriteTimeoutId);
    } catch (error) {
      clearTimeout(spriteTimeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[Sprite Update] Sprite fetch timed out');
        return new Response(
          JSON.stringify({ message: 'Failed to fetch sprite data (timeout). Please try again.' }),
          { status: 408, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    if (!spriteResponse.ok) {
      return new Response(
        JSON.stringify({ message: 'Sprite not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingSprite = await spriteResponse.json();
    console.log('[Sprite Update] Successfully fetched existing sprite');

    // Verify the current user is the author
    const authorId = typeof existingSprite.author === 'object' ? existingSprite.author.id : existingSprite.author;
    if (authorId !== currentUser.id) {
      return new Response(
        JSON.stringify({ message: 'You can only update your own sprites' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();

    // Helper function to convert string ID to number
    const parseId = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = parseInt(String(value), 10);
      return isNaN(parsed) ? null : parsed;
    };

    // Helper function to convert array of string IDs to array of numbers
    const parseIdArray = (arr: any[]): number[] => {
      return arr.map(id => parseId(id)).filter((id): id is number => id !== null);
    };

    // Build the sprite update data object
    const spriteData: Record<string, any> = {
      title: formData.get('title'),
      description: formData.get('description') || '',
      styleSourceType: formData.get('styleSourceType'),
      section: parseId(formData.get('section')),
      // Reset status to pending when user submits edits
      status: 'pending',
    };

    // Handle conditional style source (team, official game, fan game, or series)
    const styleSourceType = formData.get('styleSourceType');
    if (styleSourceType === 'team') {
      const styleTeam = formData.get('styleTeam');
      if (styleTeam) {
        spriteData.styleTeam = parseId(styleTeam);
      } else {
        spriteData.styleTeam = null;
      }
      // Clear other style fields
      spriteData.styleOfficialGame = null;
      spriteData.styleFanGame = null;
      spriteData.styleSeries = null;
    } else if (styleSourceType === 'officialGame') {
      const styleOfficialGame = formData.get('styleOfficialGame');
      if (styleOfficialGame) {
        spriteData.styleOfficialGame = parseId(styleOfficialGame);
      } else {
        spriteData.styleOfficialGame = null;
      }
      // Clear other style fields
      spriteData.styleTeam = null;
      spriteData.styleFanGame = null;
      spriteData.styleSeries = null;
    } else if (styleSourceType === 'fanGame') {
      const styleFanGame = formData.get('styleFanGame');
      if (styleFanGame) {
        spriteData.styleFanGame = parseId(styleFanGame);
      } else {
        spriteData.styleFanGame = null;
      }
      // Clear other style fields
      spriteData.styleTeam = null;
      spriteData.styleOfficialGame = null;
      spriteData.styleSeries = null;
    } else if (styleSourceType === 'series') {
      const styleSeries = formData.get('styleSeries');
      if (styleSeries) {
        spriteData.styleSeries = parseId(styleSeries);
      } else {
        spriteData.styleSeries = null;
      }
      // Clear other style fields
      spriteData.styleTeam = null;
      spriteData.styleOfficialGame = null;
      spriteData.styleFanGame = null;
    }

    // Handle terms of use
    const termsOfUseJson = formData.get('termsOfUse');
    if (termsOfUseJson && typeof termsOfUseJson === 'string') {
      try {
        spriteData.termsOfUse = JSON.parse(termsOfUseJson);
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Handle contributors (array)
    const contributorsJson = formData.get('contributors');
    if (contributorsJson && typeof contributorsJson === 'string') {
      try {
        const parsed = JSON.parse(contributorsJson);
        spriteData.contributors = parseIdArray(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        spriteData.contributors = [];
      }
    } else {
      spriteData.contributors = [];
    }

    // Handle characters (array)
    const charactersJson = formData.get('characters');
    if (charactersJson && typeof charactersJson === 'string') {
      try {
        const parsed = JSON.parse(charactersJson);
        spriteData.characters = parseIdArray(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        spriteData.characters = [];
      }
    } else {
      spriteData.characters = [];
    }

    // Handle custom tags (array of objects)
    const customTagsJson = formData.get('customTags');
    if (customTagsJson && typeof customTagsJson === 'string') {
      try {
        spriteData.customTags = JSON.parse(customTagsJson);
      } catch (e) {
        spriteData.customTags = [];
      }
    } else {
      spriteData.customTags = [];
    }

    // Handle suggestions (for moderator review)
    const suggestionsJson = formData.get('suggestions');
    if (suggestionsJson && typeof suggestionsJson === 'string') {
      try {
        spriteData.suggestions = JSON.parse(suggestionsJson);
      } catch (e) {
        spriteData.suggestions = [];
      }
    } else {
      spriteData.suggestions = [];
    }

    // Handle update history (for tracking sprite image changes)
    const updateHistoryJson = formData.get('updateHistory');
    if (updateHistoryJson && typeof updateHistoryJson === 'string') {
      try {
        spriteData.updateHistory = JSON.parse(updateHistoryJson);
      } catch (e) {
        // If parsing fails, don't include updateHistory
        console.error('[Sprite Update] Failed to parse updateHistory:', e);
      }
    }

    // Handle sprite sheet image upload (only if new file provided)
    const spriteImage = formData.get('image') as File;
    if (spriteImage && spriteImage.size > 0) {
      // Validate file type
      if (!['image/png', 'image/gif'].includes(spriteImage.type)) {
        return new Response(
          JSON.stringify({ message: 'Sprite sheet must be PNG or GIF format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[Sprite Update] Uploading sprite image: ${spriteImage.name} (${spriteImage.size} bytes)`);

      // Upload sprite sheet with timeout
      const imageFormData = new FormData();
      imageFormData.append('file', spriteImage);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      let imageUploadResponse;
      try {
        imageUploadResponse = await fetch(`${payloadUrl}/api/media`, {
          method: 'POST',
          headers: { 'Cookie': `payload-token=${token}` },
          body: imageFormData,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          return new Response(
            JSON.stringify({ message: 'Image upload timed out after 60 seconds. The file may be too large or the server is experiencing issues.' }),
            { status: 408, headers: { 'Content-Type': 'application/json' } }
          );
        }
        throw error;
      }

      if (!imageUploadResponse.ok) {
        // Try to parse as JSON, but fall back to text if it fails
        let errorMessage = 'Failed to upload sprite sheet';
        try {
          const errorData = await imageUploadResponse.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          const errorText = await imageUploadResponse.text();
          console.error('[Sprite Update] Non-JSON error response from media upload:', errorText);
          errorMessage = `Media upload failed (${imageUploadResponse.status}): ${errorText || 'Unknown error'}`;
        }
        return new Response(
          JSON.stringify({ message: errorMessage }),
          { status: imageUploadResponse.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const uploadedImage = await imageUploadResponse.json();
      spriteData.image = uploadedImage.doc.id;
    }

    // Handle icon image upload (only if new file provided)
    const iconImage = formData.get('iconImage') as File;
    if (iconImage && iconImage.size > 0) {
      // Validate icon file type
      if (!['image/png', 'image/gif'].includes(iconImage.type)) {
        return new Response(
          JSON.stringify({ message: 'Icon must be PNG or GIF format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[Sprite Update] Uploading icon image: ${iconImage.name} (${iconImage.size} bytes)`);

      // Upload icon with timeout
      const iconFormData = new FormData();
      iconFormData.append('file', iconImage);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      let iconUploadResponse;
      try {
        iconUploadResponse = await fetch(`${payloadUrl}/api/media`, {
          method: 'POST',
          headers: { 'Cookie': `payload-token=${token}` },
          body: iconFormData,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          return new Response(
            JSON.stringify({ message: 'Icon upload timed out after 60 seconds. The file may be too large or the server is experiencing issues.' }),
            { status: 408, headers: { 'Content-Type': 'application/json' } }
          );
        }
        throw error;
      }

      if (!iconUploadResponse.ok) {
        // Try to parse as JSON, but fall back to text if it fails
        let errorMessage = 'Failed to upload icon';
        try {
          const errorData = await iconUploadResponse.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          const errorText = await iconUploadResponse.text();
          console.error('[Sprite Update] Non-JSON error response from icon upload:', errorText);
          errorMessage = `Icon upload failed (${iconUploadResponse.status}): ${errorText || 'Unknown error'}`;
        }
        return new Response(
          JSON.stringify({ message: errorMessage }),
          { status: iconUploadResponse.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const uploadedIcon = await iconUploadResponse.json();
      spriteData.iconImage = uploadedIcon.doc.id;
    }

    // Update the sprite with all the data
    console.log('[Sprite Update] Sending PATCH request to update sprite...');
    console.log('[Sprite Update] Sprite data being sent:', JSON.stringify(spriteData, null, 2));
    const updateController = new AbortController();
    const updateTimeoutId = setTimeout(() => updateController.abort(), 60000); // 60 second timeout

    let updateResponse;
    try {
      updateResponse = await fetch(`${payloadUrl}/api/sprites/${spriteId}`, {
        method: 'PATCH',
        headers: {
          'Cookie': `payload-token=${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(spriteData),
        signal: updateController.signal
      });
      clearTimeout(updateTimeoutId);
      console.log(`[Sprite Update] PATCH request completed with status ${updateResponse.status}`);
    } catch (error) {
      clearTimeout(updateTimeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[Sprite Update] Sprite update timed out');
        return new Response(
          JSON.stringify({ message: 'Sprite update request timed out after 60 seconds. The server may be experiencing issues.' }),
          { status: 408, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    if (!updateResponse.ok) {
      let errorData;
      try {
        errorData = await updateResponse.json();
      } catch (e) {
        const errorText = await updateResponse.text();
        console.error('[Sprite Update] Non-JSON error response from sprite update:', errorText);
        return new Response(
          JSON.stringify({ message: `Sprite update failed (${updateResponse.status}): ${errorText}` }),
          { status: updateResponse.status, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          message: errorData.message || 'Failed to update sprite',
          errors: errorData.errors || []
        }),
        { status: updateResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updatedSprite = await updateResponse.json();

    // Invalidate sprite cache
    await invalidateSpriteCache(parseInt(spriteId));

    // Fetch the updated sprite with full depth to return complete data
    console.log('[Sprite Update] Fetching refreshed sprite data...');
    const refreshController = new AbortController();
    const refreshTimeoutId = setTimeout(() => refreshController.abort(), 30000); // 30 second timeout

    let refreshedSpriteResponse;
    try {
      refreshedSpriteResponse = await fetch(`${payloadUrl}/api/sprites/${spriteId}?depth=1`, {
        headers: { 'Cookie': `payload-token=${token}` },
        signal: refreshController.signal
      });
      clearTimeout(refreshTimeoutId);
    } catch (error) {
      clearTimeout(refreshTimeoutId);
      // If refresh fails, just return the update response
      console.warn('[Sprite Update] Refresh sprite fetch timed out, using update response');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Sprite updated successfully and resubmitted for review',
          doc: updatedSprite.doc || updatedSprite
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!refreshedSpriteResponse.ok) {
      // Fallback to the update response if refresh fails
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Sprite updated successfully and resubmitted for review',
          doc: updatedSprite.doc || updatedSprite
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const refreshedSprite = await refreshedSpriteResponse.json();
    console.log('[Sprite Update] Successfully completed sprite update');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sprite updated successfully and resubmitted for review',
        doc: refreshedSprite
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating sprite:', error);
    return new Response(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
