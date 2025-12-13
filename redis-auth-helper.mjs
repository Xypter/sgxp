/**
 * Redis Authentication Helper
 * Tests different Redis URL formats to find the correct one
 */

import Redis from 'ioredis';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testConnection(url, description) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`   URL: ${url.replace(/:[^:]*@/, ':****@')}`);

  return new Promise((resolve) => {
    const redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      connectTimeout: 3000,
      lazyConnect: true
    });

    redis.on('error', (err) => {
      console.log(`   ❌ Failed: ${err.message}`);
      redis.disconnect();
      resolve(false);
    });

    redis.connect()
      .then(async () => {
        const pong = await redis.ping();
        console.log(`   ✅ Success! (${pong})`);
        redis.disconnect();
        resolve(true);
      })
      .catch((err) => {
        console.log(`   ❌ Failed: ${err.message}`);
        redis.disconnect();
        resolve(false);
      });
  });
}

async function main() {
  console.log('🔐 Redis Authentication Helper\n');
  console.log('This tool will help you find the correct Redis connection format.\n');

  const host = await question('Redis Host (e.g., 5.78.68.166): ');
  const port = await question('Redis Port (e.g., 1472): ');
  const password = await question('Redis Password: ');
  const username = await question('Redis Username (press Enter if none): ');
  const db = await question('Database number (default is 0): ') || '0';

  console.log('\n' + '='.repeat(60));

  const formats = [];

  if (username) {
    // Format 1: With username
    formats.push({
      url: `redis://${username}:${encodeURIComponent(password)}@${host}:${port}/${db}`,
      desc: 'With username (URL-encoded password)'
    });
  }

  // Format 2: Password only (URL-encoded)
  formats.push({
    url: `redis://:${encodeURIComponent(password)}@${host}:${port}/${db}`,
    desc: 'Password only (URL-encoded)'
  });

  // Format 3: Password only (plain)
  formats.push({
    url: `redis://:${password}@${host}:${port}/${db}`,
    desc: 'Password only (plain)'
  });

  // Format 4: No auth
  formats.push({
    url: `redis://${host}:${port}/${db}`,
    desc: 'No authentication'
  });

  for (const format of formats) {
    const success = await testConnection(format.url, format.desc);
    if (success) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ FOUND WORKING CONFIGURATION!\n');
      console.log('Add this to your .env file:\n');
      console.log(`REDIS_URL="${format.url}"`);
      console.log('\n' + '='.repeat(60));
      rl.close();
      process.exit(0);
      return;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('❌ None of the formats worked. Please check:');
  console.log('   1. Redis server is running');
  console.log('   2. Firewall allows connections to port ' + port);
  console.log('   3. Redis is configured to accept remote connections');
  console.log('   4. Credentials are correct');
  rl.close();
  process.exit(1);
}

main();
