import type { APIRoute } from 'astro';

const PAYLOAD_URL = import.meta.env.PAYLOAD_URL;

// Bookmarks are private to their owner (enforced by the CMS's access rules),
// so every request needs the viewer's own token - there's no anonymous read.
function forward(path: string, token: string, init: RequestInit = {}) {
  return fetch(`${PAYLOAD_URL}/api/bookmarks${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `payload-token=${token}`,
    },
  });
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const token = cookies.get('payload-token')?.value;
  if (!token) return json({ errors: [{ message: 'Not authenticated' }] }, 401);

  try {
    const query = url.searchParams.toString();
    const response = await forward(query ? `?${query}` : '', token);
    return json(await response.json(), response.status);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return json({ errors: [{ message: 'Failed to fetch bookmarks' }] }, 500);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('payload-token')?.value;
  if (!token) return json({ errors: [{ message: 'Not authenticated' }] }, 401);

  try {
    const body = await request.json();
    const response = await forward('', token, { method: 'POST', body: JSON.stringify(body) });
    return json(await response.json(), response.status);
  } catch (error) {
    console.error('Error creating bookmark:', error);
    return json({ errors: [{ message: 'Failed to create bookmark' }] }, 500);
  }
};
