// _worker.js (추가된 진단 핸들러 포함)
import { createClient } from '@supabase/supabase-js';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Preflight
        if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

        // ✅ 1) 워커 라우팅 확인용 핑
        if (url.pathname === '/upload' && request.method === 'GET') {
            return json({ ok: true, via: '_worker.js' });
        }

        // 2) 실제 업로드
        if (url.pathname === '/upload' && request.method === 'POST') {
            try {
                const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
                    auth: { persistSession: false, autoRefreshToken: false },
                });

                const authHeader = request.headers.get('Authorization') || '';
                const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
                if (!token) return json({ error: '인증 토큰이 없습니다.' }, 401);

                const { data: userData, error: uErr } = await supabase.auth.getUser(token);
                if (uErr || !userData?.user?.id) return json({ error: '사용자 인증 실패' }, 401);
                const authedUserId = userData.user.id;

                const form = await request.formData();
                const file = form.get('file');
                const userId = (form.get('user_id') || '').toString();
                if (!file || !userId) return json({ error: '파일과 사용자 ID가 필요합니다.' }, 400);
                if (userId !== authedUserId) return json({ error: '사용자 불일치' }, 403);

                const type = file.type || 'application/octet-stream';
                const ext = (file.name || 'file').split('.').pop() || 'bin';
                const key = `${crypto.randomUUID()}.${ext}`;

                await env.MY_BUCKET.put(key, file.stream(), { httpMetadata: { contentType: type } });
                const publicUrl = `${env.R2_PUBLIC_URL}/${encodeURIComponent(key)}`;

                return json({ ok: true, key, publicUrl, userId: authedUserId });
            } catch (e) {
                console.error('Upload error:', e);
                return json({ error: e.message || '서버 에러' }, 500);
            }
        }

        // 정적 에셋
        return env.ASSETS.fetch(request);
    },
};