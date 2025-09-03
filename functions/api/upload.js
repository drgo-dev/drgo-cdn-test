import { createClient } from '@supabase/supabase-js'

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors },
    })
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB 예시
const ALLOWED_TYPES = ['image/', 'audio/']; // 접두어 비교

export async function onRequestOptions() {
    return new Response(null, { headers: cors })
}

export async function onRequestPost({ request, env }) {
    try {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

        // 1) 토큰 검증
        const authHeader = request.headers.get('Authorization') || ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
        if (!token) return json({ error: '인증 토큰이 없습니다.' }, 401)

        const { data: userData, error } = await supabase.auth.getUser(token)
        if (error || !userData?.user?.id) return json({ error: '사용자 인증 실패' }, 401)
        const authedUserId = userData.user.id

        // 2) 폼 파싱
        const form = await request.formData()
        const file = form.get('file')
        const userId = (form.get('user_id') || '').toString()

        if (!file || !userId) return json({ error: '파일과 사용자 ID가 필요합니다.' }, 400)
        if (userId !== authedUserId) return json({ error: '사용자 불일치' }, 403)

        // 3) 파일 제한 (선택 권장)
        if (typeof file.size === 'number' && file.size > MAX_FILE_SIZE) {
            return json({ error: '파일이 너무 큽니다.' }, 413)
        }
        const typeOk = ALLOWED_TYPES.some((p) => (file.type || '').startsWith(p))
        if (!typeOk) {
            return json({ error: '허용되지 않는 파일 형식입니다.' }, 415)
        }

        // 4) R2 업로드
        const key = `${crypto.randomUUID()}.${(file.name || 'file').split('.').pop() || 'bin'}`
        await env.MY_BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: file.type || 'application/octet-stream' },
        })

        const publicUrl = `${env.R2_PUBLIC_URL}/${encodeURIComponent(key)}`
        return json({ ok: true, key, publicUrl, userId: authedUserId })
    } catch (e) {
        console.error('Upload worker error:', e)
        return json({ error: e.message || '서버 에러' }, 500)
    }
}