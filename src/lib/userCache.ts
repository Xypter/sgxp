// src/lib/userCache.ts
//
// sgxp-user is a display-only cache of a handful of profile fields (used to
// render the navbar/username without re-verifying with Payload on every page
// load). It is NOT httpOnly and is trivially forgeable by the user in their
// own browser. NEVER use it for authorization or to gate access to anything -
// real auth is always the httpOnly `payload-token` cookie, verified by
// Payload itself on every protected request. Tampering with this cookie only
// changes what that same user sees rendered in their own browser.
import type { AstroCookies } from 'astro';

export const USER_COOKIE = 'sgxp-user';
export const CACHE_VERSION = 1;

// How long a cached snapshot is trusted before we re-verify with Payload.
// Independent of the cookie's own maxAge (which mirrors the 7-day session) -
// this bounds how stale things like role changes or bans can appear in the
// UI, and keeps Payload's `afterMe` "last active" heartbeat alive.
export const REVALIDATE_MS = 5 * 60 * 1000; // 5 minutes

export const USER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, mirrors payload-token

const AUTH_TIMEOUT_MS = 1500;

export interface CachedUser {
  v: number;
  t: number;
  id: number;
  email?: string;
  username?: string;
  displayName?: string;
  role?: string;
  roleColor?: string;
  isArchivist?: boolean;
  archivistRequestedAt?: string | null;
  prestigeRole?: string;
  prestigeColor?: string;
}

export type ResolveSource = 'anon' | 'cache' | 'payload' | 'stale' | 'invalid';

export function toCachedUser(u: any): CachedUser {
  return {
    v: CACHE_VERSION,
    t: Date.now(),
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    roleColor: u.roleColor,
    isArchivist: u.isArchivist,
    archivistRequestedAt: u.archivistRequestedAt,
    prestigeRole: u.prestigeRole,
    prestigeColor: u.prestigeColor,
  };
}

export function userCookieOptions() {
  return {
    httpOnly: false,
    secure: import.meta.env.PROD,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: USER_COOKIE_MAX_AGE,
  };
}

export function parseUserCookie(raw: string | undefined): CachedUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.v !== CACHE_VERSION || !parsed?.id) return null;
    return parsed as CachedUser;
  } catch {
    return null;
  }
}

export function isFresh(cached: CachedUser): boolean {
  return Date.now() - cached.t < REVALIDATE_MS;
}

/**
 * Central SSR/API identity resolver. Assumes the user is logged in as long as
 * `payload-token` is present, and only round-trips to Payload when the
 * `sgxp-user` cache is missing, unparseable, or older than REVALIDATE_MS.
 */
export async function resolveUser(
  cookies: AstroCookies,
): Promise<{ user: any | null; source: ResolveSource }> {
  const token = cookies.get('payload-token')?.value;
  if (!token) {
    return { user: null, source: 'anon' };
  }

  const cached = parseUserCookie(cookies.get(USER_COOKIE)?.value);
  if (cached && isFresh(cached)) {
    return { user: cached, source: 'cache' };
  }

  const payloadUrl = import.meta.env.PAYLOAD_URL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${payloadUrl}/api/users/me`, {
      headers: { Cookie: `payload-token=${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const user = data.user || data;
      cookies.set(USER_COOKIE, JSON.stringify(toCachedUser(user)), userCookieOptions());
      return { user, source: 'payload' };
    }

    if (response.status === 401) {
      cookies.delete('payload-token', { path: '/' });
      cookies.delete(USER_COOKIE, { path: '/' });
      return { user: null, source: 'invalid' };
    }

    // Some other error (5xx, rate limit, etc) - degrade to a stale cache
    // rather than cosmetically logging the user out.
    if (cached) return { user: cached, source: 'stale' };
    return { user: null, source: 'invalid' };
  } catch (err) {
    clearTimeout(timeoutId);
    if (cached) return { user: cached, source: 'stale' };
    return { user: null, source: 'invalid' };
  }
}
