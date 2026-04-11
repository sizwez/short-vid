
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
        auth: {
            flowType: 'implicit',
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
        global: {
            fetch: (url, options) => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 30000); // Increased to 30s for stability
                return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
            }
        }
    }
);
