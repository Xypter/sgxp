// src/pages/api/test-payload.js
// Debug endpoint to test Payload CMS connection

export async function GET({ request }) {
  try {
    const PAYLOAD_URL = process.env.PAYLOAD_URL || 'https://cms.sgxp.me';
    
    const tests = {};
    
    // Test 1: Health check (though we know this fails)
    try {
      const healthResponse = await fetch(`${PAYLOAD_URL}/api/health`);
      tests['Health Check'] = {
        success: healthResponse.ok,
        status: healthResponse.status,
        url: `${PAYLOAD_URL}/api/health`,
        data: await healthResponse.json(),
        headers: Object.fromEntries(healthResponse.headers.entries()),
      };
    } catch (error) {
      tests['Health Check'] = { error: error.message };
    }

    // Test 2: Check if login endpoint exists (OPTIONS request)
    try {
      const optionsResponse = await fetch(`${PAYLOAD_URL}/api/users/login`, {
        method: 'OPTIONS',
      });
      tests['Login Endpoint (OPTIONS)'] = {
        success: optionsResponse.ok,
        status: optionsResponse.status,
        url: `${PAYLOAD_URL}/api/users/login`,
        data: optionsResponse.ok ? {} : await optionsResponse.json(),
        headers: Object.fromEntries(optionsResponse.headers.entries()),
      };
    } catch (error) {
      tests['Login Endpoint (OPTIONS)'] = { error: error.message };
    }

    // Test 3: Try login with test credentials (this will likely fail, but shows us the error)
    try {
      const loginResponse = await fetch(`${PAYLOAD_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://sgxp.me', // Add origin header
        },
        body: JSON.stringify({
          email: 'test@example.com', // Use known test email
          password: 'test123456', // Use known test password
        }),
      });
      
      tests['Login Test (POST)'] = {
        success: loginResponse.ok,
        status: loginResponse.status,
        url: `${PAYLOAD_URL}/api/users/login`,
        data: await loginResponse.json(),
        headers: Object.fromEntries(loginResponse.headers.entries()),
      };
    } catch (error) {
      tests['Login Test (POST)'] = { error: error.message };
    }

    // Test 4: Try to get users collection info (this should work even without auth)
    try {
      const usersResponse = await fetch(`${PAYLOAD_URL}/api/users`);
      tests['Users Collection'] = {
        success: usersResponse.ok,
        status: usersResponse.status,
        url: `${PAYLOAD_URL}/api/users`,
        data: usersResponse.ok ? 'Protected (expected)' : await usersResponse.json(),
        headers: Object.fromEntries(usersResponse.headers.entries()),
      };
    } catch (error) {
      tests['Users Collection'] = { error: error.message };
    }

    return new Response(JSON.stringify({
      payloadUrl: PAYLOAD_URL,
      timestamp: new Date().toISOString(),
      tests,
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Test endpoint error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}