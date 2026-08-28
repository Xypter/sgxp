import type { APIRoute } from 'astro';
import { USER_COOKIE, toCachedUser, userCookieOptions } from '$lib/userCache';
import { notifyDiscordBot } from '$lib/discordBot';

const PAYLOAD_URL = import.meta.env.PAYLOAD_URL;

/**
 * Lets a logged-in user request archivist access from the archive triage
 * page. Notifies the site owner over Discord DM (see discord-bot's
 * archivist.requested handler) and stamps archivistRequestedAt so the
 * button doesn't re-send on every click/reload.
 */
export const POST: APIRoute = async ({ cookies }) => {
  const token = cookies.get('payload-token')?.value;

  if (!token) {
    return new Response(JSON.stringify({ message: 'Unauthorized: No token found' }), { status: 401 });
  }

  try {
    const meResponse = await fetch(`${PAYLOAD_URL}/api/users/me`, {
      headers: { Cookie: `payload-token=${token}` },
    });

    if (!meResponse.ok) {
      return new Response(JSON.stringify({ message: 'Unauthorized: Invalid token' }), { status: 401 });
    }

    const meData = await meResponse.json();
    const user = meData.user || meData;

    if (!user?.id) {
      return new Response(JSON.stringify({ message: 'Could not determine user ID' }), { status: 400 });
    }

    const isAlreadyArchivist =
      user.role === 'archivist' || user.role === 'admin' || user.role === 'king-of-mobius' || user.isArchivist === true;

    if (isAlreadyArchivist) {
      return new Response(JSON.stringify({ message: 'You already have archivist access.' }), { status: 400 });
    }

    if (user.archivistRequestedAt) {
      // Idempotent - already requested, don't re-notify or overwrite the timestamp.
      return new Response(JSON.stringify({ success: true, archivistRequestedAt: user.archivistRequestedAt }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const archivistRequestedAt = new Date().toISOString();

    const patchResponse = await fetch(`${PAYLOAD_URL}/api/users/${user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `payload-token=${token}`,
      },
      body: JSON.stringify({ archivistRequestedAt }),
    });

    if (!patchResponse.ok) {
      const errorData = await patchResponse.json().catch(() => ({}));
      return new Response(
        JSON.stringify({ message: errorData.errors?.[0]?.message || errorData.message || 'Failed to save request' }),
        { status: patchResponse.status }
      );
    }

    const patched = await patchResponse.json();
    const updatedUserDoc = patched.doc || patched;
    cookies.set(USER_COOKIE, JSON.stringify(toCachedUser(updatedUserDoc)), userCookieOptions());

    await notifyDiscordBot('archivist.requested', {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
    });

    return new Response(JSON.stringify({ success: true, archivistRequestedAt }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[request-archivist-access] Error:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
};
