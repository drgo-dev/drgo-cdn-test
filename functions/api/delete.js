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
/*

export async function onRequestPost({ request, env }) {
    try {
        // 1. Vue 앱에서 보낸 요청에서 삭제할 파일의 키(경로)를 꺼냅니다.
        const { key } = await request.json();
        if (!key) {
            return new Response("삭제할 파일의 키가 필요합니다.", { status: 400 });
        }

        // 2. R2 버킷에 연결합니다.
        const s3 = new S3Client({
            region: "auto",
            endpoint: `https://3404ddcc1cc2726d48ce64b5c15c0fe8.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: env.R2_ACCESS_KEY_ID,
                secretAccessKey: env.R2_SECRET_ACCESS_KEY,
            },
        });

        // 3. R2에서 객체(파일) 삭제 명령을 실행합니다.
        await s3.send(
            new DeleteObjectCommand({
                Bucket: env.R2_BUCKET_NAME,
                Key: key,
            })
        );

        // 4. 성공 응답을 보냅니다.
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("R2 파일 삭제 에러:", error);
        return new Response("파일 삭제 중 서버에서 오류가 발생했습니다.", { status: 500 });
    }
}*/
