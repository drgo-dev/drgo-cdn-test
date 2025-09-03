// _worker.js
import { createClient } from '@supabase/supabase-js';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors },
    });

// (선택) 업로드 제한
const MAX_FILE_SIZE = 10 * 1024 * 1024;       // 10MB
const ALLOWED_PREFIX = ['image/', 'audio/'];  // MIME prefix 허용

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // 0) CORS Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: cors });
        }

        // 1) 업로드 엔드포인트
        if (url.pathname === '/upload' && request.method === 'POST') {
            try {
                // Supabase(서버) 클라이언트 — service_role key 사용
                const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
                    auth: { persistSession: false, autoRefreshToken: false },
                });

                // 1-1) 토큰 검증
                const authHeader = request.headers.get('Authorization') || '';
                const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
                if (!token) return json({ error: '인증 토큰이 없습니다.' }, 401);

                const { data: userData, error: uErr } = await supabase.auth.getUser(token);
                if (uErr || !userData?.user?.id) return json({ error: '사용자 인증 실패' }, 401);
                const authedUserId = userData.user.id;

                // 1-2) 폼 데이터
                const form = await request.formData();
                const file = form.get('file');
                const userId = (form.get('user_id') || '').toString();

                if (!file || !userId) return json({ error: '파일과 사용자 ID가 필요합니다.' }, 400);
                if (userId !== authedUserId) return json({ error: '사용자 불일치' }, 403);

                // 1-3) 파일 제한 (선택)
                if (typeof file.size === 'number' && file.size > MAX_FILE_SIZE) {
                    return json({ error: '파일이 너무 큽니다.' }, 413);
                }
                const type = file.type || 'application/octet-stream';
                const typeOk = ALLOWED_PREFIX.some((p) => type.startsWith(p));
                if (!typeOk) return json({ error: '허용되지 않는 파일 형식입니다.' }, 415);

                // 1-4) R2 업로드
                const ext = (file.name || 'file').split('.').pop() || 'bin';
                const key = `${crypto.randomUUID()}.${ext}`;

                await env.MY_BUCKET.put(key, file.stream(), {
                    httpMetadata: { contentType: type },
                });

                const publicUrl = `${env.R2_PUBLIC_URL}/${encodeURIComponent(key)}`;

                // (선택) 여기서 DB에 기록하려면 supabase.from('signatures').insert(...) 추가

                return json({ ok: true, key, publicUrl, userId: authedUserId });
            } catch (e) {
                console.error('Upload error:', e);
                return json({ error: e.message || '서버 에러' }, 500);
            }
        }

        // 2) 그 외 요청은 정적 에셋으로 전달
        // Pages에서 자동 바인딩되는 정적 에셋 핸들러
        return env.ASSETS.fetch(request);
    },
};