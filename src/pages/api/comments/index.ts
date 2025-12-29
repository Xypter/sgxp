// src/pages/api/comments/index.ts
  import type { APIRoute } from 'astro';

  export const GET: APIRoute = async ({ url, cookies }) => {
    const payloadUrl = import.meta.env.PAYLOAD_URL;
    // Forward the token so payload knows who is asking (needed for permissions/drafts)
    const token = cookies.get('payload-token')?.value;

    // Forward all query parameters
    const queryString = url.search;

    try {
      const headers: HeadersInit = {};
      if (token) {
          headers['Cookie'] = `payload-token=${token}`;
      }

      const fullUrl = `${payloadUrl}/api/comments${queryString}`;
      console.log('[GET /api/comments] Fetching:', fullUrl);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers
      });

      console.log('[GET /api/comments] Response status:', response.status, response.statusText);

      let data;
      const responseText = await response.text();

      if (responseText.length > 500) {
        console.log('[GET /api/comments] Response body (truncated):', responseText.substring(0, 500) + '...');
      } else {
        console.log('[GET /api/comments] Response body:', responseText);
      }

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[GET /api/comments] Failed to parse response as JSON:', parseError);
        return new Response(
          JSON.stringify({
            message: 'Invalid JSON response from Payload CMS',
            details: responseText.substring(0, 200)
          }),
          { status: 502 }
        );
      }

      if (!response.ok) {
        console.error('[GET /api/comments] Payload returned error:', data);
      }

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error("[GET /api/comments] Unexpected error:", error);
      console.error("[GET /api/comments] Error stack:", error instanceof Error ? error.stack : 'N/A');
      console.error("[GET /api/comments] Query string:", queryString);
      return new Response(
        JSON.stringify({
          message: 'Internal Server Error',
          error: error instanceof Error ? error.message : String(error)
        }),
        { status: 500 }
      );
    }
  };

  export const POST: APIRoute = async ({ request, cookies }) => {
    const token = cookies.get('payload-token')?.value;

    if (!token) {
      console.error('[POST /api/comments] Unauthorized: No token found');
      return new Response(
        JSON.stringify({ message: 'Unauthorized: No token found' }),
        { status: 401 }
      );
    }

    let requestBody;
    try {
      requestBody = await request.json();
      console.log('[POST /api/comments] Request body:', JSON.stringify(requestBody, null, 2));

      const payloadUrl = import.meta.env.PAYLOAD_URL;
      console.log('[POST /api/comments] Payload URL:', payloadUrl);

      // Get the authenticated user first
      const userResponse = await fetch(`${payloadUrl}/api/users/me`, {
        headers: {
          'Cookie': `payload-token=${token}`
        }
      });

      if (!userResponse.ok) {
        console.error('[POST /api/comments] Failed to get authenticated user');
        return new Response(
          JSON.stringify({ message: 'Failed to authenticate user' }),
          { status: 401 }
        );
      }

      const userData = await userResponse.json();
      console.log('[POST /api/comments] Authenticated user:', userData.user?.id);

      // Auto-inject the author field from authenticated user
      const commentData = {
        ...requestBody,
        author: userData.user.id
      };

      console.log('[POST /api/comments] Sending to Payload:', JSON.stringify(commentData, null, 2));

      const response = await fetch(`${payloadUrl}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `payload-token=${token}`
        },
        body: JSON.stringify(commentData)
      });

      console.log('[POST /api/comments] Response status:', response.status, response.statusText);

      let data;
      const responseText = await response.text();
      console.log('[POST /api/comments] Response body:', responseText);

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[POST /api/comments] Failed to parse response as JSON:', parseError);
        return new Response(
          JSON.stringify({
            message: 'Invalid JSON response from Payload CMS',
            details: responseText.substring(0, 200)
          }),
          { status: 502 }
        );
      }

      if (!response.ok) {
        console.error('[POST /api/comments] Payload returned error:', data);
      }

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error("[POST /api/comments] Unexpected error:", error);
      console.error("[POST /api/comments] Error stack:", error instanceof Error ? error.stack : 'N/A');
      console.error("[POST /api/comments] Request body was:", requestBody);
      return new Response(
        JSON.stringify({
          message: 'Internal Server Error',
          error: error instanceof Error ? error.message : String(error)
        }),
        { status: 500 }
      );
    }
  };