// src/pages/api/users/login.js
// Improved version with better error handling and debugging

export async function POST({ request }) {
  try {
    const body = await request.json();
    
    const PAYLOAD_URL = process.env.PAYLOAD_URL || 'https://cms.sgxp.me';
    
    console.log('Login attempt:', { 
      email: body.email, 
      payloadUrl: PAYLOAD_URL,
      timestamp: new Date().toISOString() 
    });
    
    // Forward the login request to Payload CMS
    const payloadResponse = await fetch(`${PAYLOAD_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://sgxp.me', // Add origin header for CORS
        'User-Agent': 'Astro-Frontend/1.0',
      },
      body: JSON.stringify(body),
    });

    console.log('Payload response status:', payloadResponse.status);
    console.log('Payload response headers:', Object.fromEntries(payloadResponse.headers.entries()));

    // Check if response is actually JSON
    const contentType = payloadResponse.headers.get('content-type');
    console.log('Content-Type:', contentType);

    if (!contentType || !contentType.includes('application/json')) {
      // If it's not JSON, get the text response for debugging
      const textResponse = await payloadResponse.text();
      console.log('Non-JSON response:', textResponse);
      
      return new Response(JSON.stringify({
        errors: [{
          message: 'Server returned non-JSON response',
          details: textResponse.substring(0, 500), // First 500 chars for debugging
          contentType: contentType,
          status: payloadResponse.status
        }]
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Parse JSON response
    let payloadData;
    try {
      payloadData = await payloadResponse.json();
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      return new Response(JSON.stringify({
        errors: [{
          message: 'Failed to parse response as JSON',
          error: jsonError.message
        }]
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    console.log('Parsed payload data:', payloadData);

    // If login is successful, set the JWT token in a secure cookie
    if (payloadResponse.ok && payloadData.token) {
      console.log('Login successful, setting cookie');
      const response = new Response(JSON.stringify({
        success: true,
        user: payloadData.user,
        message: 'Login successful'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Set secure, httpOnly cookie with the JWT token
      const cookieOptions = [
        `payload-token=${payloadData.token}`,
        'HttpOnly',
        'Path=/',
        `Max-Age=${60 * 60 * 24 * 7}`, // 7 days
        'SameSite=Strict'
      ];

      // Only add Secure in production
      if (process.env.NODE_ENV === 'production') {
        cookieOptions.push('Secure');
      }

      response.headers.append('Set-Cookie', cookieOptions.join('; '));

      return response;
    }

    // If login failed, return the error
    console.log('Login failed:', payloadData);
    return new Response(JSON.stringify(payloadData), {
      status: payloadResponse.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Login API error:', error);
    
    // Check if it's a network error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new Response(JSON.stringify({
        errors: [{
          message: 'Cannot connect to authentication server',
          details: 'Please check if the Payload CMS server is running',
          code: error.code
        }]
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify({
      errors: [{
        message: 'Internal server error',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }]
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Handle logout
export async function DELETE({ request }) {
  try {
    const response = new Response(JSON.stringify({ 
      success: true,
      message: 'Logged out successfully' 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Clear the JWT cookie
    response.headers.append(
      'Set-Cookie',
      'payload-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
    );

    return response;

  } catch (error) {
    console.error('Logout API error:', error);
    return new Response(JSON.stringify({
      errors: [{
        message: 'Internal server error',
        details: error.message
      }]
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}