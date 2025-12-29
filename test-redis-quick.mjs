/**
 * Quick Redis Connection Test
 */

import Redis from 'ioredis';

const password = 'Iprt0623!!';
const encodedPassword = encodeURIComponent(password); // Iprt0623%21%21

const testUrls = [
  {
    url: `redis://:${encodedPassword}@5.78.68.166:1472/0`,
    desc: 'Password only (URL-encoded)'
  },
  {
    url: `redis://:${password}@5.78.68.166:1472/0`,
    desc: 'Password only (plain)'
  }
];

async function testConnection(url, desc) {
  console.log(`\n🔍 Testing: ${desc}`);
  console.log(`   URL: redis://:****@5.78.68.166:1472/0`);

  return new Promise((resolve) => {
    const redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      connectTimeout: 5000,
    });

    redis.on('error', (err) => {
      console.log(`   ❌ Failed: ${err.message}`);
      redis.disconnect();
      resolve({ success: false, url });
    });

    redis.on('ready', async () => {
      try {
        const pong = await redis.ping();
        console.log(`   ✅ Success! Server responded: ${pong}`);

        // Quick test
        await redis.set('test:connection', 'working!', 'EX', 10);
        const value = await redis.get('test:connection');
        console.log(`   ✅ Read/Write test: ${value}`);

        redis.disconnect();
        resolve({ success: true, url });
      } catch (err) {
        console.log(`   ❌ Failed: ${err.message}`);
        redis.disconnect();
        resolve({ success: false, url });
      }
    });
  });
}

async function main() {
  console.log('🔐 Testing Redis Connection...\n');
  console.log('Host: 5.78.68.166');
  console.log('Port: 1472');
  console.log('Password: ****');
  console.log('Database: 0');

  for (const config of testUrls) {
    const result = await testConnection(config.url, config.desc);
    if (result.success) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ CONNECTION SUCCESSFUL!\n');
      console.log('Update your .env file with this line:\n');
      console.log(`REDIS_URL="${result.url}"`);
      console.log('\n' + '='.repeat(60));
      process.exit(0);
      return;
    }
  }

  console.log('\n❌ Connection failed. Please verify:');
  console.log('   1. Redis server is running on 5.78.68.166:1472');
  console.log('   2. Password is correct');
  console.log('   3. Firewall allows connections');
  process.exit(1);
}

main();
