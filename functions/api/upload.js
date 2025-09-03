import { createClient } from '@supabase/supabase-js';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_TOTAL_STORAGE = 300 * 1024 * 1024;

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors },
    });
}

export async function onRequestOptions() {
    return new Response(null, { headers: cors });
}

export async function onRequestPost({ request, env }) {
    try {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const authHeader = request.headers.get('Authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return json({ error: '인증 토큰이 없습니다.' }, 401);

        const { data: userData, error: uErr } = await supabase.auth.getUser(token);
        if (uErr || !userData?.user?.id) return json({ error: '사용자 인증이 불가능합니다.' }, 401);
        const authedUserId = userData.user.id;

        const form = await request.formData();
        const file = form.get('file');
        const userId = (form.get('user_id') || '').toString();

        if (!file || !file.name || !userId) return json({ error: '파일과 사용자 ID가 필요합니다.' }, 400);
        if (userId !== authedUserId) return json({ error: '요청 사용자와 인증 정보가 일치하지 않습니다.' }, 403);

        const { data: profile, error: pErr } = await supabase
            .from('profiles')
            .select('storage_used')
            .eq('id', authedUserId)
            .single();
        if (pErr) throw new Error('사용자 프로필을 조회할 수 없습니다.');

        if ((profile?.storage_used || 0) + file.size > MAX_TOTAL_STORAGE) {
            return json({ error: '총 저장 공간이 부족하여 업로드할 수 없습니다.' }, 413);
        }

        const shortId = crypto.randomUUID().split('-')[0];
        const ext = file.name.split('.').pop();
        const key = `${shortId}.${ext}`;

        await env.MY_BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: file.type },
        });

        const publicUrl = `${env.R2_PUBLIC_URL}/${encodeURIComponent(key)}`;
        return json({ ok: true, key, publicUrl, userId: authedUserId });
    } catch (e) {
        console.error('Upload worker error:', e);
        return json({ error: e.message }, 500);
    }
}