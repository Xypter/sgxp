const PAYLOAD_URL = process.env.PAYLOAD_URL;

async function payloadFetch(path) {
  const res = await fetch(`${PAYLOAD_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Payload request failed: ${path} -> ${res.status}`);
  }
  return res.json();
}

/**
 * Grants archivist access to a user, called from the "Grant Archivist
 * Access" button on the archivist.requested DM (see index.js /
 * archivistActions.js). Requires PAYLOAD_API_KEY - an API key generated on
 * an admin/king-of-mobius Payload user (Payload's users collection auth
 * config needs useAPIKey: true; generate the key from that user's edit
 * page in the admin panel). The PATCH authenticates as that user, so
 * Users.ts's field-level access check for isArchivist passes.
 */
export async function grantArchivistAccess(userId) {
  const apiKey = process.env.PAYLOAD_API_KEY;
  if (!apiKey) {
    throw new Error('PAYLOAD_API_KEY is not configured');
  }

  const res = await fetch(`${PAYLOAD_URL}/api/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `users API-Key ${apiKey}`,
    },
    body: JSON.stringify({ isArchivist: true }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.errors?.[0]?.message || data?.message || `Payload request failed: ${res.status}`);
  }

  return res.json();
}

export async function getTopSprites({ limit = 5, since } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    sort: '-likes',
  });
  if (since) {
    params.set('where[createdAt][greater_than]', since);
  }
  const data = await payloadFetch(`/api/sprites?${params.toString()}`);
  return data.docs ?? [];
}

export async function getSiteStats() {
  const [sprites, users] = await Promise.all([
    payloadFetch('/api/sprites?limit=1'),
    payloadFetch('/api/users?limit=1'),
  ]);
  return {
    totalSprites: sprites.totalDocs ?? 0,
    totalUsers: users.totalDocs ?? 0,
  };
}
