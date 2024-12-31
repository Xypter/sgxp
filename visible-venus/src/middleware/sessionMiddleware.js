import { supabase } from '../lib/supabaseClient';

export async function handle({ event, resolve }) {
    // Check if the session token is in session storage (via client-side logic)
    const token = event.cookies.get('sb-supa-auth-token');

    if (!token) {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
            event.cookies.set('sb-supa-auth-token', JSON.stringify(session), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: session.expires_in,
            });
        }
    }

    const response = await resolve(event);
    return response;
}
