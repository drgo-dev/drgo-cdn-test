export async function onRequestPost({ request, env }) {
    const auth = request.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (token !== env.ADMIN_TOKEN) return new Response('Unauthorized', { status: 401 })

    const { code, url } = await request.json()
    if (!code || !url) return new Response('Bad Request', { status: 400 })

    await env.LINKS.put(code, url)
    return new Response(JSON.stringify({ ok: true, code, url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    })
}
