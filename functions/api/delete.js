const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function onRequestOptions() {
    return new Response(null, { headers: cors })
}

export async function onRequestPost({ request, env }) {
    try {
        const { key } = await request.json();
        if (!key) return new Response(JSON.stringify({ error: 'key is required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });

        const k = key.startsWith('/') ? key.slice(1) : key;
        await env.MY_BUCKET.delete(k);
        return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json', ...cors },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...cors },
        });
    }
}