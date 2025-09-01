// functions/api/upload.js

import { createClient } from '@supabase/supabase-js';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ALLOWED_TYPES = new Set(['image/png','image/jpeg','image/gif','image/webp','image/svg+xml', 'audio/mpeg','audio/wav']);
const MAX_FILE_SIZE = 6 * 1024 * 1024; // 1회 업로드 최대 6MB
const MAX_TOTAL_STORAGE = 300 * 1024 * 1024; // 사용자별 총 300MB
const BASE_DOMAIN = 'https://cdn.nicevod.com';

function sanitizeBaseName(name) { /* ... (이전과 동일) ... */ }

export async function onRequestOptions() {
    return new Response(null, { headers: cors });
}

export async function onRequestPost({ request, env }) {
    try {
        const form = await request.formData();
        const file = form.get('file');
        const userId = (form.get('user_id') || '').toString();

        if (!file || !file.name || !userId) return json({ error: '파일과 사용자 ID가 필요합니다.' }, 400);
        if (!ALLOWED_TYPES.has(file.type)) return json({ error: '허용되지 않는 파일 형식입니다.' }, 415);
        if (file.size > MAX_FILE_SIZE) return json({ error: `파일 크기는 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB를 초과할 수 없습니다.` }, 413);

        // --- ❗️ 용량 확인 로직 시작 ❗️ ---
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('storage_used')
            .eq('id', userId)
            .single();

        if (profileError) throw new Error('사용자 프로필을 조회할 수 없습니다.');

        if (profile.storage_used + file.size > MAX_TOTAL_STORAGE) {
            return json({ error: '총 저장 공간이 부족하여 업로드할 수 없습니다.' }, 413); // 413: Payload Too Large
        }
        // --- ✅ 용량 확인 로직 끝 ✅ ---

        const safeName = sanitizeBaseName(file.name);
        const ext = safeName.includes('.') ? '.' + safeName.split('.').pop() : '';
        const shortId = crypto.randomUUID().split('-')[0];
        const key = `${userId}_${shortId}${ext}`;

        await env.MY_BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: file.type },
        });

        const publicUrl = `${BASE_DOMAIN}/${encodeURIComponent(key)}`;
        return json({ ok: true, key, publicUrl });
    } catch (e) {
        return json({ error: String(e) }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors },
    });
}