import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ url, request }) => {
  const PAYLOAD_URL = import.meta.env.PAYLOAD_URL

  // Forward all query parameters
  const searchParams = url.searchParams.toString()
  const apiUrl = `${PAYLOAD_URL}/api/sprites/search${searchParams ? '?' + searchParams : ''}`

  try {
    const response = await fetch(apiUrl)
    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error searching sprites:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to search sprites',
        docs: [],
        totalDocs: 0
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
