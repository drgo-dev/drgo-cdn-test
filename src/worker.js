// src/worker.js
import { createClient } from '@supabase/supabase-js';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // ✅ Preflight
        if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

        if (url.pathname === '/upload' && request.method === 'POST') {
            try {
                const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

                // 토큰 검증
                const authHeader = request.headers.get('Authorization') || '';
                const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
                if (!token) return json({ error: '인증 토큰이 없습니다.' }, 401);

                const { data: userData, error: uErr } = await supabase.auth.getUser(token);
                if (uErr || !userData?.user?.id) return json({ error: '사용자 인증이 불가능합니다.' }, 401);
                const authedUserId = userData.user.id;

                // 폼
                const form = await request.formData();
                const file = form.get('file');
                const userId = (form.get('user_id') || '').toString();
                if (!file || !userId) return json({ error: '파일과 사용자 ID가 필요합니다.' }, 400);
                if (userId !== authedUserId) return json({ error: '요청 사용자와 인증 정보가 일치하지 않습니다.' }, 403);

                // 업로드
                const shortId = crypto.randomUUID().split('-')[0];
                const ext = file.name.split('.').pop();
                const key = `${shortId}.${ext}`;

                await env.MY_BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
                const publicUrl = `${env.R2_PUBLIC_URL}/${encodeURIComponent(key)}`;
                return json({ ok: true, key, publicUrl, userId: authedUserId });
            } catch (e) {
                console.error(e);
                return json({ error: e.message }, 500);
            }
        }

        // ❌ 나머지 메서드/경로는 405/404
        if (url.pathname === '/upload') return new Response('Method Not Allowed', { status: 405, headers: cors });
        return new Response('Not Found', { status: 404, headers: cors });
    },
};