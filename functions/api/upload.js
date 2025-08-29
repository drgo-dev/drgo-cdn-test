
// Cloudflare Pages Functions - R2 바인딩 업로드 (FormData)
// 바인딩 이름: MY_BUCKET  (Pages → Settings → Functions → Bindings)

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
const ALLOWED_TYPES = new Set([
    'image/png','image/jpeg','image/gif','image/webp','image/svg+xml',
    'audio/mpeg','audio/wav'
])

const MAX_SIZE = 6 * 1024 * 1024 // 6MB
const BASE_DOMAIN = 'https://cdn.nicevod.com' // 복사용 퍼블릭 도메인

function sanitizeBaseName(name) {
    // 경로 제거 (슬래시 금지), 공백 트림
    const justName = name.split('/').pop().trim()
    return justName || `file-${crypto.randomUUID()}`
}

export async function onRequestOptions() {
    return new Response(null, { headers: cors })
}

export async function onRequestPost({ request, env }) {
    try {
        const form = await request.formData()
        const file = form.get('file')
        let clientKey = form.get('key') || ''         // 클라에서 보낼 수도 있음(선택)

        if (!file || !file.name) return json({ error: 'file is required' }, 400)
        const ct = String(file.type || '')
        if (!ALLOWED_TYPES.has(ct)) return json({ error: 'Only images/mp3/wav' }, 415)
        if ((file.size ?? 0) > MAX_SIZE) return json({ error: 'Max 6MB' }, 413)

        // ✅ 루트에 "파일이름.확장자"로만 저장되도록 강제
        const base = sanitizeBaseName(clientKey || file.name || `${crypto.randomUUID()}.bin`)
        const key = base  // R2에 저장되는 키 (루트에 바로 저장)

        await env.MY_BUCKET.put(key, file.stream(), { httpMetadata: { contentType: ct } })

        // ✅ 최종 공개 URL: https://cdn.nicevod.com/파일이름.확장자
        const publicUrl = `${BASE_DOMAIN}/${encodeURIComponent(key)}`
        return json({ ok: true, key, publicUrl })
    } catch (e) {
        return json({ error: String(e) }, 500)
    }
}
function sanitizeBaseName(name) {
    // 경로 제거, 공백 제거
    let justName = name.split('/').pop().trim()
    if (!justName) return `${crypto.randomUUID()}.bin`
    return justName
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } })
}







/*
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function onRequestPost({ request, env }) {
    // 1. Vue 앱에서 보낸 요청에서 파일 이름과 타입을 꺼냅니다.
    const { name, contentType } = await request.json();

    // 2. R2 버킷에 연결하기 위한 클라이언트를 설정합니다.
    // env 변수들은 다음 단계에서 Cloudflare 대시보드에서 설정합니다.
    const s3 = new S3Client({
        region: "auto",
        endpoint: `https://3404ddcc1cc2726d48ce64b5c15c0fe8.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
    });

    // 3. 업로드할 파일의 고유한 키(파일 경로)를 만듭니다.
    const key = `${crypto.randomUUID()}-${name}`;

    // 4. '업로드 전용 임시 허가증(pre-signed URL)'을 생성합니다. (10분 유효)
    const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
            Bucket: env.R2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        }),
        { expiresIn: 600 }
    );

    // 5. R2 버킷의 공개 URL을 만듭니다.
    const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

    // 6. Vue 앱에게 '업로드 전용 URL'과 '최종 파일 주소'를 응답으로 보내줍니다.
    return new Response(JSON.stringify({ uploadUrl, publicUrl }), {
        headers: { "Content-Type": "application/json" },
    });
}*/
