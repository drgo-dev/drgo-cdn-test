<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../lib/supabaseClient';

const imageUrl = ref('');
const audioUrl = ref('');
const isLoading = ref(false);
const user = ref(null);
const statusMessage = ref('사용자 정보를 확인 중입니다...'); // 상태 메시지 변수

onMounted(() => {
  checkUser();
});

const checkUser = async () => {
  const { data } = await supabase.auth.getUser();
  user.value = data.user;

  if (!user.value) {
    // 로그인이 되어 있지 않다면, 에러가 아니라 정상 상태 메시지를 보여줍니다.
    statusMessage.value = '파일을 업로드하려면 로그인이 필요합니다.';
  } else {
    statusMessage.value = ''; // 로그인 되어 있다면 메시지 없음
  }
};

const handleFileUpload = async (event, type) => {
  // 로그인이 안되어 있으면 업로드 시도 자체를 막습니다.
  if (!user.value) {
    alert('로그인이 필요합니다.');
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  isLoading.value = true;
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, contentType: file.type }),
    });
    if (!response.ok) throw new Error('업로드 URL 요청 실패');
    const { uploadUrl, publicUrl } = await response.json();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!uploadResponse.ok) throw new Error('R2에 파일 업로드 실패');

    const { error } = await supabase.from('signatures').insert({
      file_name: file.name,
      file_url: publicUrl,
      file_type: type,
      user_id: user.value.id,
    });
    if (error) throw error;

    if (type === 'image') imageUrl.value = publicUrl;
    if (type === 'audio') audioUrl.value = publicUrl;
    alert('업로드 성공!');
  } catch (error) {
    console.error('업로드 과정 중 에러 발생:', error);
    alert(`오류가 발생했습니다: ${error.message}`);
  } finally {
    isLoading.value = false;
  }
};

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
      <h1>시그니처 제한 없는 업로드 용량</h1>
      <div class="price">월 150,000원</div>
    </div>

    <div v-if="statusMessage" class="status-box">{{ statusMessage }}</div>

    <div class="upload-section">
      <div class="upload-box">
        <h3>알림 이미지</h3>
        <div class="preview-area">
          <img v-if="imageUrl" :src="imageUrl" alt="이미지 미리보기" class="image-preview" />
          <div v-else class="placeholder">이미지 미리보기</div>
        </div>
        <div class="button-group">
          <input type="file" @change="handleFileUpload($event, 'image')" accept="image/*" id="image-upload" style="display:none" :disabled="!user" />
          <label for="image-upload" class="btn" :class="{ disabled: !user }">파일 선택</label>
          <button class="btn-link" :disabled="!user">외부 링크</button>
          <button v-if="imageUrl" @click="deleteFile('image')" class="btn-delete">파일 삭제</button>
        </div>
      </div>

      <div class="upload-box">
        <h3>알림음</h3>
        <div class="preview-area">
          <audio v-if="audioUrl" :src="audioUrl" controls class="audio-preview"></audio>
          <div v-else class="placeholder">사운드 사용안함</div>
        </div>
        <div class="button-group">
          <input type="file" @change="handleFileUpload($event, 'audio')" accept="audio/*" id="audio-upload" style="display:none" :disabled="!user" />
          <label for="audio-upload" class="btn" :class="{ disabled: !user }">파일 선택</label>
          <button class="btn-link" :disabled="!user">외부 링크</button>
          <button v-if="audioUrl" @click="deleteFile('audio')" class="btn-delete">파일 삭제</button>
        </div>
      </div>
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