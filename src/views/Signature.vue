<script setup>
import { ref, onMounted } from 'vue';
// 1. 우리가 만든 Supabase 클라이언트를 가져옵니다.
import { supabase } from '../lib/supabaseClient';

// UI 상태를 관리할 변수들
const imageUrl = ref('');
const audioUrl = ref('');
const isLoading = ref(false);
const user = ref(null);

// 컴포넌트가 마운트될 때 로그인한 사용자 정보를 가져옵니다.
onMounted(() => {
  checkUser();
});

// 현재 로그인된 사용자 정보를 확인하는 함수
const checkUser = async () => {
  const { data } = await supabase.auth.getUser();
  user.value = data.user;
  // 실제 서비스에서는 user가 null이면 로그인 페이지로 보내는 처리가 필요합니다.
};

// 메인 기능: 파일 선택 ~ Supabase에 정보 저장까지
const handleFileUpload = async (event, type) => {
  const file = event.target.files[0];
  if (!file) return;

  // 0. 로딩 상태 시작
  isLoading.value = true;

  try {
    // 1. R2에 업로드하기 위한 '업로드 전용 URL' 요청 (이 부분은 다음 단계에서 만들 Cloudflare Worker가 필요합니다)
    // 지금은 임시로 '/api/upload' 라는 주소를 사용합니다.
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, contentType: file.type }),
    });

    if (!response.ok) throw new Error('업로드 URL 요청 실패');

    const { uploadUrl, publicUrl } = await response.json();

    // 2. 발급받은 업로드 전용 URL로 파일을 R2에 직접 업로드 (PUT 요청)
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    if (!uploadResponse.ok) throw new Error('R2에 파일 업로드 실패');

    // 3. 업로드가 성공하면, 파일 정보를 Supabase에 저장
    const { error } = await supabase.from('signatures').insert({
      file_name: file.name,
      file_url: publicUrl, // R2에서 제공하는 실제 파일 접근 주소
      file_type: type,
      user_id: user.value.id, // 현재 로그인한 사용자의 ID
    });

    if (error) throw error;

    // 4. 화면에 미리보기 업데이트
    if (type === 'image') imageUrl.value = publicUrl;
    if (type === 'audio') audioUrl.value = publicUrl;

    alert('업로드 성공!');

  } catch (error) {
    console.error('업로드 과정 중 에러 발생:', error);
    alert(`오류가 발생했습니다: ${error.message}`);
  } finally {
    // 5. 로딩 상태 종료
    isLoading.value = false;
  }
};

// 파일 삭제 함수 (UI에서만 제거, 실제 파일 삭제는 별도 구현 필요)
const deleteFile = (type) => {
  if (type === 'image') imageUrl.value = '';
  if (type === 'audio') audioUrl.value = '';
};
</script>

<template>
  <div class="uploader-container">
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>업로드 중입니다...</p>
    </div>

    <div class="header">
    </div>
    <div class="upload-section">
    </div>
  </div>
</template>

<style scoped>
/* 로딩 오버레이 스타일 추가 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  color: white;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid #fff;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ... (기존 스타일은 그대로 유지) ... */
</style>