import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
    const { theme } = await request.json();
    cookies.set('theme', theme, {
        path: '/',
        maxAge: 31536000, // 1 year
        // Not httpOnly: the client sets this same cookie synchronously via
        // document.cookie right when the theme changes (see Navbar.svelte),
        // so a same-origin page navigation fired immediately after picking a
        // theme still carries the new value instead of racing this request.
        httpOnly: false,
        secure: import.meta.env.PROD, // Use secure cookies in production
        sameSite: 'lax',
    });

    return new Response(JSON.stringify({ message: 'Theme updated' }), {
        status: 200,
    });
};
