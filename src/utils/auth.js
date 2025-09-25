// src/utils/auth.js
// Utility functions for handling Payload CMS authentication in Astro

/**
 * Verify JWT token with Payload CMS
 * @param {string} token - JWT token from cookie
 * @returns {Promise<Object|null>} User data if valid, null if invalid
 */
export async function verifyToken(token) {
  if (!token) return null;

  try {
    const PAYLOAD_URL = process.env.PAYLOAD_URL || 'http://localhost:3000';
    
    const response = await fetch(`${PAYLOAD_URL}/api/users/me`, {
      headers: {
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const userData = await response.json();
      return userData;
    }

    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Get user from Astro request cookies
 * @param {Request} request - Astro request object
 * @returns {Promise<Object|null>} User data if authenticated, null if not
 */
export async function getUserFromRequest(request) {
  const cookies = request.headers.get('cookie');
  if (!cookies) return null;

  const tokenMatch = cookies.match(/payload-token=([^;]+)/);
  if (!tokenMatch) return null;

  const token = tokenMatch[1];
  return await verifyToken(token);
}

/**
 * Middleware function to protect routes
 * @param {Object} context - Astro context object with request
 * @param {string} redirectTo - Where to redirect if not authenticated (default: '/login')
 * @returns {Promise<Response|null>} Redirect response if not authenticated, null if authenticated
 */
export async function requireAuth(context, redirectTo = '/login') {
  const user = await getUserFromRequest(context.request);
  
  if (!user) {
    return context.redirect(redirectTo);
  }

  return null; // User is authenticated
}

/**
 * Check if user has specific role
 * @param {Object} user - User object from Payload
 * @param {string} role - Role to check for
 * @returns {boolean} True if user has role, false otherwise
 */
export function hasRole(user, role) {
  if (!user || !user.roles) return false;
  return user.roles.includes(role);
}

/**
 * Client-side function to check if user is logged in
 * @returns {Promise<Object|null>} User data if logged in, null if not
 */
export async function getCurrentUser() {
  try {
    const response = await fetch('/api/users/me');
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Client-side logout function
 * @returns {Promise<boolean>} True if logout successful, false otherwise
 */
export async function logout() {
  try {
    const response = await fetch('/api/users/login', {
      method: 'DELETE',
    });
    
    if (response.ok) {
      // Redirect to home or login page
      window.location.href = '/';
      return true;
    }
    return false;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}