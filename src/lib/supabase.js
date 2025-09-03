// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// HMR(핫리로드) 시에도 1개만 유지
const globalKey = '__supabase_singleton__';
const g = globalThis;

export const supabase =
    g[globalKey] ||
    (g[globalKey] = createClient(
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