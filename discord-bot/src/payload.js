const PAYLOAD_URL = process.env.PAYLOAD_URL;

async function payloadFetch(path) {
  const res = await fetch(`${PAYLOAD_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Payload request failed: ${path} -> ${res.status}`);
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
