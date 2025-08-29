const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const ALLOWED_TYPES = new Set([
    'image/png','image/jpeg','image/gif','image/webp','image/svg+xml',
    'audio/mpeg','audio/wav',
])
const MAX_SIZE = 6 * 1024 * 1024 // 6MB
const BASE_DOMAIN = 'https://cdn.nicevod.com' // 원하는 공개 도메인

function sanitizeBaseName(name) {
    // 경로 제거 + 공백 제거 + 빈값 방지
    let just = (name || '').split('/').pop().trim()
    if (!just) just = `${crypto.randomUUID()}.bin`
    return just
}

export async function onRequestOptions() {
    return new Response(null, { headers: cors })
}

export async function onRequestPost({ request, env }) {
    try {
        const form = await request.formData()
        const file = form.get('file')
        const clientKey = form.get('key') || ''

        if (!file || !file.name) return json({ error: 'file is required' }, 400)

        const ct = String(file.type || '')
        if (!ALLOWED_TYPES.has(ct)) return json({ error: 'Only images/mp3/wav' }, 415)
        if ((file.size ?? 0) > MAX_SIZE) return json({ error: 'Max 6MB' }, 413)

        // 루트 저장: 파일명만(슬래시 없음)
        const key = sanitizeBaseName(clientKey || file.name)

        await env.MY_BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: ct },
        })

        const publicUrl = `${BASE_DOMAIN}/${encodeURIComponent(key)}`
        return json({ ok: true, key, publicUrl })
    } catch (e) {
        return json({ error: String(e) }, 500)
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors },
    })
}