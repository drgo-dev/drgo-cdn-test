// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const gk = '__supabase_singleton__';
const g = globalThis;

export const supabase =
    g[gk] ||
    (g[gk] = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
            auth: {
                storageKey: 'drgo-app-auth',
                persistSession: true,
                autoRefreshToken: true,
            },
        }
    ));