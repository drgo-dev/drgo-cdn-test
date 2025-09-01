import { createClient } from '@supabase/supabase-js';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_TOTAL_STORAGE = 300 * 1024 * 1024; // 300MB

export async function onRequestOptions() {
    return new Response(null, { headers: cors });
}

export async function onRequestPost({ request, env }) {
    try {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
        const form = await request.formData();
        const file = form.get('file');
        const userId = (form.get('user_id') || '').toString();

        if (!file || !file.name || !userId) {
            return new Response(JSON.stringify({ error: '파일과 사용자 ID가 필요합니다.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('storage_used')
            .eq('id', userId)
            .single();

        if (profileError) throw new Error('사용자 프로필을 조회할 수 없습니다.');

        if (profile.storage_used + file.size > MAX_TOTAL_STORAGE) {
            return new Response(JSON.stringify({ error: '총 저장 공간이 부족하여 업로드할 수 없습니다.' }), { status: 413, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // --- ❗️ 이 부분이 파일 이름을 짧게 만드는 핵심 변경점입니다. ❗️ ---
        const shortId = crypto.randomUUID().split('-')[0]; // 8자리의 랜덤 코드 생성
        const extension = file.name.split('.').pop();      // 원본 파일의 확장자 가져오기
        const key = `${shortId}.${extension}`;             // "8자리코드.확장자" 형식의 새 파일 이름
        // --- ✅ 여기까지입니다. ✅ ---

        await env.MY_BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: file.type },
        });

        // env.R2_PUBLIC_URL (cdn.nicevod.com) 을 사용하여 최종 URL 생성
        const publicUrl = `${env.R2_PUBLIC_URL}/${encodeURIComponent(key)}`;

        return new Response(JSON.stringify({ ok: true, key, publicUrl }), {
            headers: { 'Content-Type': 'application/json', ...cors },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...cors },
        });
    }
}