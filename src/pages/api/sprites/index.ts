import type { APIRoute } from 'astro';
import { invalidateSpriteCache } from '../../../lib/redis';

export const POST: APIRoute = async ({ request, cookies }) => {
  console.log('[Sprite Upload API] POST request received');
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: Please log in to submit sprites' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get the current user to set as author
    const payloadUrl = import.meta.env.PAYLOAD_URL;
    console.log('[Sprite Upload API] PAYLOAD_URL:', payloadUrl);
    console.log('[Sprite Upload API] Authenticating user...');
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

    // Build the sprite data object
    const spriteData: Record<string, any> = {
      title: formData.get('title'),
      description: formData.get('description') || '',
      author: currentUser.id,
      styleSourceType: formData.get('styleSourceType'),
      section: parseId(formData.get('section')),
      status: 'pending', // All new submissions start as pending
    };

    // Handle conditional style source (team, official game, fan game, or series)
    const styleSourceType = formData.get('styleSourceType');
    if (styleSourceType === 'team') {
      const styleTeam = formData.get('styleTeam');
      if (styleTeam) spriteData.styleTeam = parseId(styleTeam);
    } else if (styleSourceType === 'officialGame') {
      const styleOfficialGame = formData.get('styleOfficialGame');
      if (styleOfficialGame) spriteData.styleOfficialGame = parseId(styleOfficialGame);
    } else if (styleSourceType === 'fanGame') {
      const styleFanGame = formData.get('styleFanGame');
      if (styleFanGame) spriteData.styleFanGame = parseId(styleFanGame);
    } else if (styleSourceType === 'series') {
      const styleSeries = formData.get('styleSeries');
      if (styleSeries) spriteData.styleSeries = parseId(styleSeries);
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
        // Ignore parse errors
      }
    }

    // Handle additional credits (array)
    const additionalCreditsJson = formData.get('additionalCredits');
    if (additionalCreditsJson && typeof additionalCreditsJson === 'string') {
      try {
        const parsed = JSON.parse(additionalCreditsJson);
        spriteData.additionalCredits = parseIdArray(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Handle characters (array)
    const charactersJson = formData.get('characters');
    if (charactersJson && typeof charactersJson === 'string') {
      try {
        const parsed = JSON.parse(charactersJson);
        spriteData.characters = parseIdArray(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Handle custom tags (array of objects)
    const customTagsJson = formData.get('customTags');
    if (customTagsJson && typeof customTagsJson === 'string') {
      try {
        spriteData.customTags = JSON.parse(customTagsJson);
      } catch (e) {
        // Ignore parse errors
      }
    }

    // First, upload the sprite sheet image
    const spriteImage = formData.get('image') as File;
    if (!spriteImage || spriteImage.size === 0) {
      return new Response(
        JSON.stringify({ message: 'Sprite sheet image is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!['image/png', 'image/gif'].includes(spriteImage.type)) {
      return new Response(
        JSON.stringify({ message: 'Sprite sheet must be PNG or GIF format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Sprite Upload] Uploading sprite image: ${spriteImage.name} (${spriteImage.size} bytes)`);

    // Upload sprite sheet with timeout
    const imageFormData = new FormData();
    imageFormData.append('file', spriteImage);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    console.log(`[Sprite Upload API] Uploading to: ${payloadUrl}/api/media`);
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
        console.error('[Sprite Upload] Non-JSON error response from media upload:', errorText);
        errorMessage = `Media upload failed (${imageUploadResponse.status}): ${errorText || 'Unknown error'}`;
      }
      return new Response(
        JSON.stringify({ message: errorMessage }),
        { status: imageUploadResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const uploadedImage = await imageUploadResponse.json();
    spriteData.image = uploadedImage.doc.id;

    // Upload icon image
    const iconImage = formData.get('iconImage') as File;
    if (!iconImage || iconImage.size === 0) {
      return new Response(
        JSON.stringify({ message: 'Icon image is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate icon file type
    if (!['image/png', 'image/gif'].includes(iconImage.type)) {
      return new Response(
        JSON.stringify({ message: 'Icon must be PNG or GIF format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Sprite Upload] Uploading icon image: ${iconImage.name} (${iconImage.size} bytes)`);

    // Upload icon with timeout
    const iconFormData = new FormData();
    iconFormData.append('file', iconImage);

    const iconController = new AbortController();
    const iconTimeoutId = setTimeout(() => iconController.abort(), 60000); // 60 second timeout

    let iconUploadResponse;
    try {
      iconUploadResponse = await fetch(`${payloadUrl}/api/media`, {
        method: 'POST',
        headers: { 'Cookie': `payload-token=${token}` },
        body: iconFormData,
        signal: iconController.signal
      });
      clearTimeout(iconTimeoutId);
    } catch (error) {
      clearTimeout(iconTimeoutId);
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
        console.error('[Sprite Upload] Non-JSON error response from icon upload:', errorText);
        errorMessage = `Icon upload failed (${iconUploadResponse.status}): ${errorText || 'Unknown error'}`;
      }
      return new Response(
        JSON.stringify({ message: errorMessage }),
        { status: iconUploadResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const uploadedIcon = await iconUploadResponse.json();
    spriteData.iconImage = uploadedIcon.doc.id;

    // Now create the sprite with all the data
    console.log(`[Sprite Upload API] Creating sprite at: ${payloadUrl}/api/sprites`);
    const spriteResponse = await fetch(`${payloadUrl}/api/sprites`, {
      method: 'POST',
      headers: {
        'Cookie': `payload-token=${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(spriteData)
    });

    if (!spriteResponse.ok) {
      const errorData = await spriteResponse.json();
      return new Response(
        JSON.stringify({
          message: errorData.message || 'Failed to create sprite',
          errors: errorData.errors || []
        }),
        { status: spriteResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const createdSprite = await spriteResponse.json();

    // Invalidate sprite cache so new sprite appears in lists
    // (Note: Since new sprites are "pending", they won't show in public lists yet,
    // but this ensures the cache is fresh for when they're approved)
    await invalidateSpriteCache(createdSprite.doc.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sprite submitted successfully',
        doc: createdSprite.doc
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating sprite:', error);
    return new Response(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Also export a GET handler to fetch sprites with filtering
export const GET: APIRoute = async ({ url, cookies }) => {
  const token = cookies.get('payload-token')?.value;
  const payloadUrl = import.meta.env.PAYLOAD_URL;

  try {
    // Forward query parameters to Payload CMS
    const searchParams = new URLSearchParams(url.search);

    // Check if this is a request for a specific author's sprites
    const authorFilter = searchParams.get('where[author][equals]');

    // If querying by author, verify it's the logged-in user
    if (authorFilter && token) {
      // Get the current user to verify they're querying their own sprites
      const meResponse = await fetch(`${payloadUrl}/api/users/me`, {
        headers: { 'Cookie': `payload-token=${token}` }
      });

      if (meResponse.ok) {
        const meData = await meResponse.json();
        const currentUser = meData.user || meData;

        // If user is querying their own sprites, allow all statuses
        // Otherwise, only show approved sprites
        if (currentUser?.id?.toString() !== authorFilter) {
          searchParams.set('where[status][equals]', 'approved');
        }
        // else: user is viewing their own uploads, show all statuses
      } else {
        // Auth failed, only show approved sprites
        searchParams.set('where[status][equals]', 'approved');
      }
    } else {
      // Not filtering by author, only show approved sprites (security: enforced server-side)
      searchParams.set('where[status][equals]', 'approved');
    }

    const response = await fetch(`${payloadUrl}/api/sprites?${searchParams.toString()}`, {
      headers: token ? { 'Cookie': `payload-token=${token}` } : {}
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(
        JSON.stringify({ message: errorData.message || 'Failed to fetch sprites' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching sprites:', error);
    return new Response(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
