// src/pages/api/reports/index.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    console.error('[POST /api/reports] Unauthorized: No token found');
    return new Response(
      JSON.stringify({ message: 'Unauthorized: No token found' }),
      { status: 401 }
    );
  }

  let requestBody;
  try {
    requestBody = await request.json();
    console.log('[POST /api/reports] Request body:', JSON.stringify(requestBody, null, 2));

    const payloadUrl = import.meta.env.PAYLOAD_URL;
    console.log('[POST /api/reports] Payload URL:', payloadUrl);

    const response = await fetch(`${payloadUrl}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[POST /api/reports] Response status:', response.status, response.statusText);

    let data;
    const responseText = await response.text();
    console.log('[POST /api/reports] Response body:', responseText);

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[POST /api/reports] Failed to parse response as JSON:', parseError);
      return new Response(
        JSON.stringify({
          message: 'Invalid JSON response from Payload CMS',
          details: responseText.substring(0, 200)
        }),
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error('[POST /api/reports] Payload returned error:', data);
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("[POST /api/reports] Unexpected error:", error);
    console.error("[POST /api/reports] Error stack:", error instanceof Error ? error.stack : 'N/A');
    console.error("[POST /api/reports] Request body was:", requestBody);
    return new Response(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500 }
    );
  }
};
