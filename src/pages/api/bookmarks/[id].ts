import type { APIRoute } from 'astro';

const PAYLOAD_URL = import.meta.env.PAYLOAD_URL;

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function forward(method: 'PATCH' | 'DELETE', id: string | undefined, token: string | undefined, body?: string) {
  if (!token) return json({ errors: [{ message: 'Not authenticated' }] }, 401);
  if (!id || !/^\d+$/.test(id)) return json({ errors: [{ message: 'Bookmark ID is required' }] }, 400);

  try {
    const response = await fetch(`${PAYLOAD_URL}/api/bookmarks/${id}?depth=0`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `payload-token=${token}`,
      },
      body,
    });
    const data = await response.json().catch(() => ({}));
    return json(data, response.status);
  } catch (error) {
    console.error(`Error in ${method} /api/bookmarks/${id}:`, error);
    return json({ errors: [{ message: 'Failed to update bookmark' }] }, 500);
  }
}

// Only reading progress can change; the owner and the bookmarked item are
// fixed at creation (the CMS enforces that too).
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const { lastPage } = await request.json().catch(() => ({}));
  return forward('PATCH', params.id, cookies.get('payload-token')?.value, JSON.stringify({ lastPage }));
};

export const DELETE: APIRoute = async ({ params, cookies }) =>
  forward('DELETE', params.id, cookies.get('payload-token')?.value);
