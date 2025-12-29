/**
 * Redis Connection Test Script
 * Run with: node test-redis.mjs
 */

import Redis from 'ioredis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('❌ REDIS_URL not found in environment variables');
  process.exit(1);
}

console.log('🔍 Testing Redis connection...');
console.log('📍 Redis URL:', redisUrl.replace(/:[^:]*@/, ':****@')); // Hide password in logs

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('❌ Max retries reached');
      return null;
    }
    const delay = Math.min(times * 100, 1000);
    console.log(`⏳ Retry attempt ${times} in ${delay}ms...`);
    return delay;
  },
  connectTimeout: 5000,
});

redis.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
  process.exit(1);
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis successfully!');
});

redis.on('ready', async () => {
  console.log('✅ Redis is ready!');

  try {
    // Test 1: PING
    console.log('\n📝 Test 1: PING');
    const pong = await redis.ping();
    console.log('   Response:', pong);

    // Test 2: SET and GET
    console.log('\n📝 Test 2: SET and GET');
    await redis.set('test:key', 'Hello Redis!', 'EX', 10);
    const value = await redis.get('test:key');
    console.log('   Stored:', 'Hello Redis!');
    console.log('   Retrieved:', value);

    // Test 3: Check existing keys
    console.log('\n📝 Test 3: Checking existing cache keys');
    const keys = await redis.keys('*');
    console.log('   Total keys in database:', keys.length);
    if (keys.length > 0) {
      console.log('   Sample keys:', keys.slice(0, 5));
    }

    // Test 4: Server info
    console.log('\n📝 Test 4: Server information');
    const info = await redis.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    const uptime = info.match(/uptime_in_seconds:([^\r\n]+)/)?.[1];
    console.log('   Redis version:', version);
    console.log('   Uptime:', uptime ? `${Math.floor(uptime / 3600)} hours` : 'unknown');

    // Test 5: Memory info
    console.log('\n📝 Test 5: Memory usage');
    const memInfo = await redis.info('memory');
    const usedMemory = memInfo.match(/used_memory_human:([^\r\n]+)/)?.[1];
    console.log('   Used memory:', usedMemory);

    console.log('\n✅ All tests passed! Redis is ready to use.');
    console.log('\n💡 Next steps:');
    console.log('   1. Start your dev server: npm run dev');
    console.log('   2. Watch console for [Redis] log messages');
    console.log('   3. Navigate to /sprites to test caching');
    console.log('   4. Refresh the page - you should see "Cache HIT" messages');

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
  } finally {
    await redis.quit();
    process.exit(0);
  }
});
