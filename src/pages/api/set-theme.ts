import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
    const { theme } = await request.json();
    cookies.set('theme', theme, {
        path: '/',
        maxAge: 31536000, // 1 year
        httpOnly: true, // Recommended for security
        secure: import.meta.env.PROD, // Use secure cookies in production
        sameSite: 'lax',
    });

    return new Response(JSON.stringify({ message: 'Theme updated' }), {
        status: 200,
    });
};
