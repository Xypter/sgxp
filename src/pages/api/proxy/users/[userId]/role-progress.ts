import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ params }) => {
  const PAYLOAD_URL = import.meta.env.PUBLIC_PAYLOAD_URL
  const { userId } = params

  if (!userId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'User ID is required'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }

  try {
    const response = await fetch(`${PAYLOAD_URL}/api/users/${userId}/role-progress`)
    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error fetching role progress:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch role progress'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
