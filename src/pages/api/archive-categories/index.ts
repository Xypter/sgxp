// src/pages/api/archive-categories/index.ts
import type { APIRoute } from 'astro';

const PAYLOAD_URL = import.meta.env.PAYLOAD_URL;

export const GET: APIRoute = async ({ cookies }) => {
  // Public read (matches Payload's access config) - the cookie is forwarded
  // when present just for consistency, not because it's required.
  const token = cookies.get('payload-token')?.value;

  try {
    const response = await fetch(`${PAYLOAD_URL}/api/archive-categories?limit=500&sort=name`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Cookie: `payload-token=${token}` } : {}),
      },
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in GET /api/archive-categories:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
};

// Creates a new shared category, or returns the existing one if a
// case-insensitive match already exists - archivists can race to add the
// same category, and the unique constraint on `name` is case-sensitive in
// Postgres, so this dedupes what the DB constraint alone wouldn't catch.
export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(JSON.stringify({ message: 'Unauthorized: No token found' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const name = String(body?.name ?? '').trim();

    if (!name) {
      return new Response(JSON.stringify({ message: 'Category name is required' }), { status: 400 });
    }

    const existingRes = await fetch(`${PAYLOAD_URL}/api/archive-categories?limit=500`, {
      headers: { Cookie: `payload-token=${token}` },
    });
    const existingData = await existingRes.json().catch(() => ({}));
    const existingMatch = (existingData.docs || []).find(
      (doc: { name: string }) => doc.name.toLowerCase() === name.toLowerCase()
    );

    if (existingMatch) {
      return new Response(JSON.stringify({ doc: existingMatch }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`${PAYLOAD_URL}/api/archive-categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `payload-token=${token}`,
      },
      body: JSON.stringify({ name }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST /api/archive-categories:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
};
