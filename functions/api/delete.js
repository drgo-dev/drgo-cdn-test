// functions/api/delete.js
const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function onRequestOptions() {
    return new Response(null, { headers: cors })
}

export async function onRequestPost({ request, env }) {
    const { key } = await request.json()
    if (!key) return json({ error: 'key is required' }, 400)

    const k = key.startsWith('/') ? key.slice(1) : key
    await env.MY_BUCKET.delete(k)   // ← 바인딩으로 바로 삭제
    return json({ ok: true })
}

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors },
    })
}