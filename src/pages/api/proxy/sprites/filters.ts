import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ request }) => {
  const PAYLOAD_URL = import.meta.env.PAYLOAD_URL

  try {
    const response = await fetch(`${PAYLOAD_URL}/api/sprites/filters`)
    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error fetching sprite filters:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch filters'
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
