// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// 개발 중 HMR(핫리로드)에도 인스턴스 1개만 유지
const globalKey = '__supabase_singleton__';
const _g = globalThis;

export const supabase =
    _g[globalKey] ||
    (_g[globalKey] = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
            auth: {
                storageKey: 'drgo-app-auth', // 같은 도메인에 여러 앱이면 각자 다르게
                persistSession: true,
                autoRefreshToken: true,
            },
        }
    ));