export async function onRequestGet({ params, env }) {
    const code = params.code
    if (!code) return new Response('Bad Request', { status: 400 })

    const url = await env.LINKS.get(code)
    if (!url) return new Response('Not Found', { status: 404 })

    return Response.redirect(url, 302) // 또는 301
}
