const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
        const { key } = await request.json();
        if (!key || typeof key !== 'string') {
            return json({ error: 'key is required' }, 400);
        }

        const k = key.startsWith('/') ? key.slice(1) : key;
        await env.MY_BUCKET.delete(k);
        return json({ ok: true });
    } catch(e) {
        console.error('Delete worker error:', e);
        return json({ error: e.message }, 500);
    }
}
