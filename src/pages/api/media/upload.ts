import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(
      JSON.stringify({ message: 'Unauthorized: No token found' }),
      { status: 401 }
    );
  }

  try {
    // Get the form data from the request
    const formData = await request.formData();

    // Forward the upload to Payload CMS
    const payloadUrl = import.meta.env.PAYLOAD_URL;
    const response = await fetch(`${payloadUrl}/api/media`, {
      method: 'POST',
      headers: {
        'Cookie': `payload-token=${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(
        JSON.stringify({ message: errorData.message || 'Failed to upload media' }),
        { status: response.status }
      );
    }

    const uploadedMedia = await response.json();

    return new Response(
      JSON.stringify(uploadedMedia),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error uploading media:', error);
    return new Response(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
};
