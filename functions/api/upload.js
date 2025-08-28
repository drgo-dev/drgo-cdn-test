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
}