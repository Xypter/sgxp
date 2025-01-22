import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

// Helper function for Discord auth
export const signInWithDiscord = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            skipBrowserRedirect: false,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent'
            }
        }
    });
    
    if (error) throw error;
    return data;
};
