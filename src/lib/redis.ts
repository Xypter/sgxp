/**
 * Redis caching utility for SGXP
 *
 * Provides caching for:
 * - User authentication (token validation)
 * - API responses (sprites, games, etc.)
 */

import Redis from 'ioredis';

// Redis client singleton
let redis: Redis | null = null;
let isConnecting = false;
let connectionFailed = false;

// Default TTL values (in seconds)
export const CACHE_TTL = {
  AUTH: 60 * 5,           // 5 minutes for auth tokens
  SPRITES_LIST: 60 * 2,   // 2 minutes for sprite list (changes frequently)
  SPRITE_DETAIL: 60 * 10, // 10 minutes for individual sprite details
  GAMES: 60 * 60,         // 1 hour for games (rarely changes)
  SERIES: 60 * 60,        // 1 hour for series
  SECTIONS: 60 * 60,      // 1 hour for sections
  CHARACTERS: 60 * 30,    // 30 minutes for characters
  USERS: 60 * 15,         // 15 minutes for user profiles
  MESSAGES_LIST: 60 * 1,      // 1 minute for message lists
  MESSAGE_CONVERSATION: 60 * 2, // 2 minutes for conversation threads
  MESSAGE_UNREAD_COUNT: 30,    // 30 seconds for unread count
};

/**
 * Get or create Redis client with persistent connection
 */
export function getRedisClient(): Redis | null {
  // If connection previously failed, don't retry every request
  if (connectionFailed) {
    return null;
  }

  // Return existing connected client
  if (redis && redis.status === 'ready') {
    return redis;
  }

  // If we're already trying to connect, return null for now
  if (isConnecting) {
    return null;
  }

  const redisUrl = import.meta.env.REDIS_URL || process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('[Redis] No REDIS_URL configured, caching disabled');
    connectionFailed = true;
    return null;
  }

  try {
    isConnecting = true;

    redis = new Redis(redisUrl, {
      // Keep connection alive
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: false,

      // Reconnection settings
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) {
          console.error('[Redis] Max retries reached, disabling cache');
          connectionFailed = true;
          return null; // Stop retrying
        }
        const delay = Math.min(times * 200, 2000);
        console.log(`[Redis] Retry ${times} in ${delay}ms`);
        return delay;
      },

      // Timeouts
      connectTimeout: 10000, // 10 second connection timeout
      commandTimeout: 5000,  // 5 second command timeout

      // Keep alive
      keepAlive: 30000, // Send keepalive every 30 seconds
    });

    redis.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
      // Don't mark as failed for temporary errors
      if (err.message.includes('ECONNREFUSED') || err.message.includes('WRONGPASS')) {
        connectionFailed = true;
      }
    });

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
      isConnecting = false;
      connectionFailed = false;
    });

    redis.on('ready', () => {
      console.log('[Redis] Ready for commands');
      isConnecting = false;
    });

    redis.on('close', () => {
      console.log('[Redis] Connection closed');
    });

    redis.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
      isConnecting = true;
    });

    return redis;
  } catch (err) {
    console.error('[Redis] Failed to create client:', err);
    connectionFailed = true;
    isConnecting = false;
    return null;
  }
}

/**
 * Get cached value with automatic JSON parsing
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  // Check if client is ready
  if (client.status !== 'ready') {
    console.log(`[Redis] Client not ready (status: ${client.status}), skipping cache GET`);
    return null;
  }

  try {
    const cached = await client.get(key);
    if (cached) {
      console.log(`[Redis] Cache HIT: ${key}`);
      return JSON.parse(cached) as T;
    }
    console.log(`[Redis] Cache MISS: ${key}`);
    return null;
  } catch (err: any) {
    console.error(`[Redis] Error getting key ${key}:`, err.message || err);
    return null;
  }
}

/**
 * Set cached value with automatic JSON stringification
 */
export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  // Check if client is ready
  if (client.status !== 'ready') {
    console.log(`[Redis] Client not ready (status: ${client.status}), skipping cache SET`);
    return false;
  }

  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
    console.log(`[Redis] Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
    return true;
  } catch (err: any) {
    console.error(`[Redis] Error setting key ${key}:`, err.message || err);
    return false;
  }
}

/**
 * Delete cached value(s)
 */
export async function deleteCached(pattern: string): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;

  try {
    if (pattern.includes('*')) {
      // Pattern delete using scan
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        const deleted = await client.del(...keys);
        console.log(`[Redis] Deleted ${deleted} keys matching: ${pattern}`);
        return deleted;
      }
      return 0;
    } else {
      // Single key delete
      const deleted = await client.del(pattern);
      console.log(`[Redis] Deleted key: ${pattern}`);
      return deleted;
    }
  } catch (err) {
    console.error(`[Redis] Error deleting ${pattern}:`, err);
    return 0;
  }
}

/**
 * Cache key generators for consistent naming
 */
export const cacheKey = {
  auth: (tokenHash: string) => `auth:${tokenHash}`,
  spritesList: (page: number, sort: string, filters: string) =>
    `sprites:list:${page}:${sort}:${filters}`,
  spriteDetail: (id: string | number) => `sprites:detail:${id}`,
  game: (id: string | number) => `games:${id}`,
  series: (id: string | number) => `series:${id}`,
  section: (id: string | number) => `sections:${id}`,
  character: (id: string | number) => `characters:${id}`,
  user: (id: string | number) => `users:${id}`,
  messagesInbox: (userId: string, page: number, filters: string) =>
    `messages:inbox:${userId}:${page}:${filters}`,
  messagesSent: (userId: string, page: number, filters: string) =>
    `messages:sent:${userId}:${page}:${filters}`,
  messageConversation: (conversationId: string) =>
    `messages:conversation:${conversationId}`,
  messageUnreadCount: (userId: string) =>
    `messages:unread:${userId}`,
};

/**
 * Hash a string (for token hashing)
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Cached fetch wrapper - fetches and caches API responses
 */
export async function cachedFetch<T>(
  url: string,
  cacheKeyStr: string,
  ttlSeconds: number,
  fetchOptions?: RequestInit
): Promise<T | null> {
  // Try cache first
  const cached = await getCached<T>(cacheKeyStr);
  if (cached) return cached;

  // Fetch from API
  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) return null;

    const data = await response.json() as T;

    // Cache the response (don't await - fire and forget)
    setCached(cacheKeyStr, data, ttlSeconds);

    return data;
  } catch (err) {
    console.error(`[cachedFetch] Error fetching ${url}:`, err);
    return null;
  }
}

/**
 * Fetch with timeout utility
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 3000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Invalidate all cached data for a specific user
 */
export async function invalidateUserCache(userId: string | number, token?: string): Promise<void> {
  console.log(`[Cache Invalidation] Invalidating cache for user ${userId}`);

  // Delete user profile cache
  await deleteCached(cacheKey.user(userId));

  // Delete auth cache if token is provided
  if (token) {
    const tokenHash = hashString(token);
    await deleteCached(cacheKey.auth(tokenHash));
  }

  console.log(`[Cache Invalidation] User ${userId} cache invalidated`);
}

/**
 * Invalidate all sprite-related cache
 * Call this when a sprite is created, updated, or status changes (e.g., approved)
 */
export async function invalidateSpriteCache(spriteId?: string | number): Promise<void> {
  console.log(`[Cache Invalidation] Invalidating sprite cache${spriteId ? ` for sprite ${spriteId}` : ''}`);

  // Delete all sprite list caches (all pages, sorts, filters)
  await deleteCached('sprites:list:*');

  // Delete specific sprite detail if ID provided
  if (spriteId) {
    await deleteCached(cacheKey.spriteDetail(spriteId));
  }

  console.log(`[Cache Invalidation] Sprite cache invalidated`);
}

/**
 * Invalidate all message-related cache for a user
 * Call this when messages are created, read, or deleted
 */
export async function invalidateMessageCache(userId: string, conversationId?: string): Promise<void> {
  console.log(`[Cache Invalidation] Invalidating message cache for user ${userId}`);

  // Delete all inbox and sent caches for user
  await deleteCached(`messages:inbox:${userId}:*`);
  await deleteCached(`messages:sent:${userId}:*`);

  // Delete unread count cache
  await deleteCached(cacheKey.messageUnreadCount(userId));

  // Delete specific conversation cache if provided
  if (conversationId) {
    await deleteCached(cacheKey.messageConversation(conversationId));
  }

  console.log(`[Cache Invalidation] Message cache invalidated`);
}
