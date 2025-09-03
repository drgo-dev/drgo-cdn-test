/*
import { createClient } from '@supabase/supabase-js'

// 여기에 본인의 Supabase API 정보를 입력하세요.
const supabaseUrl = 'https://dchtynddqgoqqthiqihn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaHR5bmRkcWdvcXF0aGlxaWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTkyMTEsImV4cCI6MjA3MTkzNTIxMX0.auQ2t3Jv3AlX9Iu5v-F4WKyN8id1akll4xxakpihg4A'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

*/
/*

// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// HMR(핫리로드) 시에도 1개만 유지
const globalKey = '__supabase_singleton__';
const _global = globalThis;

export const supabase =
    _global[globalKey] ||
    (_global[globalKey] = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
            auth: {
                // 같은 origin에 여러 앱이 있으면 키를 앱별로 바꿔주세요
                storageKey: 'drgo-app-auth',
                persistSession: true,
                autoRefreshToken: true,
            },
        }
    ));
    */
