<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../lib/supabaseClient';

const imageUrl = ref('');
const audioUrl = ref('');
const isLoading = ref(false);
const user = ref(null);
const statusMessage = ref('사용자 정보를 확인 중입니다...');
const signatures = ref([]); // 1. 업로드된 파일 목록을 저장할 배열 추가


onMounted(() => {
  checkUser();
});

// 2. 파일 목록을 불러오는 함수 새로 추가
const fetchSignatures = async () => {
  if (!user.value) return;

  try {
    const { data, error } = await supabase
        .from('signatures') // 'signatures' 테이블에서
        .select('*') // 모든 컬럼을 선택
        .eq('user_id', user.value.id) // 현재 로그인한 사용자의 user_id와 일치하는 것만
        .order('created_at', { ascending: false }); // 최신순으로 정렬

    if (error) throw error;
    signatures.value = data; // 결과를 signatures 배열에 저장
  } catch (error) {
    console.error('파일 목록 로딩 에러:', error);
  }
};

const checkUser = async () => {
  const { data } = await supabase.auth.getUser();
  user.value = data.user;

  if (!user.value) {
    statusMessage.value = '파일을 업로드하려면 로그인이 필요합니다.';
  } else {
    statusMessage.value = '';
    await fetchSignatures(); // 3. 로그인 확인 후 바로 파일 목록 불러오기
  }
};

const handleFileUpload = async (event, type) => {
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

    alert('업로드 성공!');
    await fetchSignatures(); // 4. 새 파일 업로드 후 목록 새로고침

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
      <h1>시그니처 업로드</h1>
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
          <button class="btn" :disabled="!user">외부 링크</button>
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
          <button class="btn" :disabled="!user">외부 링크</button>
          <button v-if="audioUrl" @click="deleteFile('audio')" class="btn-delete">파일 삭제</button>
        </div>
      </div>
    </div>
    <div class="list-section">
      <h2>내 시그니처 목록</h2>
      <div v-if="signatures.length === 0 && user" class="empty-list">
        업로드한 파일이 없습니다.
      </div>
      <div v-else class="signature-grid">
        <div v-for="sig in signatures" :key="sig.id" class="signature-item">
          <img v-if="sig.file_type === 'image'" :src="sig.file_url" :alt="sig.file_name" class="list-preview" />
          <audio v-else-if="sig.file_type === 'audio'" :src="sig.file_url" controls class="list-preview"></audio>

          <div class="item-info">
            <p class="file-name">{{ sig.file_name }}</p>
            <p class="upload-date">{{ new Date(sig.created_at).toLocaleString() }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 로딩 오버레이 스타일 (기존과 동일) */
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

/* ===== 새로운 스타일 시작 ===== */
/* 전체 컨테이너 */
.uploader-container {
  max-width: 900px; /* 전체 너비 제한 */
  margin: 50px auto; /* 중앙 정렬 및 상하 여백 */
  padding: 30px;
  background-color: #ffffff; /* 밝은 배경 */
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); /* 부드러운 그림자 */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
}

/* 페이지 헤더 */
.header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.header h1 {
  font-size: 2.5em;
  color: #2c3e50;
  margin-bottom: 10px;
  font-weight: 700;
}

.header .price {
  font-size: 1.4em;
  color: #4CAF50; /* 강조 색상 */
  font-weight: 600;
}

/* 상태 메시지 박스 */
.status-box {
  background-color: #fff3cd;
  color: #856404;
  padding: 15px;
  border: 1px solid #ffeeba;
  border-radius: 8px;
  margin-bottom: 30px;
  text-align: center;
  font-size: 1.1em;
}

/* 업로드 섹션 */
.upload-section {
  display: grid;
  grid-template-columns: 1fr; /* 모바일 우선: 한 줄에 하나 */
  gap: 30px; /* 항목 간 간격 */
}

@media (min-width: 768px) {
  .upload-section {
    grid-template-columns: 1fr 1fr; /* 데스크톱: 한 줄에 두 개 */
  }
}

/* 각 업로드 박스 */
.upload-box {
  background-color: #f8f9fa; /* 더 밝은 배경 */
  padding: 25px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.upload-box h3 {
  font-size: 1.5em;
  color: #34495e;
  margin-top: 0;
  margin-bottom: 15px;
  font-weight: 600;
}

/* 미리보기 영역 */
.preview-area {
  width: 100%;
  height: 180px;
  background-color: #e9ecef; /* 미리보기 배경 */
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden; /* 이미지/오디오가 넘치지 않도록 */
  margin-bottom: 15px;
  border: 1px dashed #ced4da; /* 점선 테두리 */
}

.image-preview, .audio-preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* 이미지 비율 유지 */
}

.placeholder {
  color: #6c757d;
  font-size: 1.1em;
}

/* 버튼 그룹 */
.button-group {
  display: flex;
  flex-direction: column; /* 세로 정렬 */
  gap: 10px;
  width: 100%; /* 너비 꽉 채우기 */
  max-width: 250px; /* 버튼 그룹 최대 너비 */
}

/* 버튼 기본 스타일 */
.btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1em;
  font-weight: 500;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none; /* a 태그 스타일 제거 */
  color: #fff;
  background-color: #007bff; /* 기본 버튼 색상 */
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
}

.btn:hover {
  background-color: #0056b3;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.btn.disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  box-shadow: none;
}

/* 외부 링크 버튼 (회색) */
.btn-link {
  background-color: #6c757d; /* 회색 */
  box-shadow: 0 2px 8px rgba(108, 117, 125, 0.2);
}

.btn-link:hover {
  background-color: #5a6268;
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
}

/* 삭제 버튼 (빨간색) */
.btn-delete {
  background-color: #dc3545; /* 빨간색 */
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.2);
}

.btn-delete:hover {
  background-color: #c82333;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

/* 모바일 화면에서 버튼 그룹 가로 정렬 */
@media (max-width: 480px) {
  .button-group {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    max-width: none;
  }
  .btn, .btn-link, .btn-delete {
    flex-grow: 1; /* 작은 화면에서 버튼 너비 유연하게 조정 */
    padding: 10px 15px;
    font-size: 1em;
  }
}

/* ... 기존 스타일 코드 맨 아래에 추가 ... */

.list-section {
  margin-top: 50px;
  padding-top: 30px;
  border-top: 1px solid #eee;
}

.list-section h2 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 2em;
  color: #2c3e50;
}

.empty-list {
  text-align: center;
  padding: 40px;
  background-color: #f8f9fa;
  border-radius: 8px;
  color: #6c757d;
  font-size: 1.2em;
}

.signature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.signature-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.signature-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.list-preview {
  width: 100%;
  height: 180px;
  object-fit: cover; /* 이미지는 꽉 차게, 오디오는 높이만 차지 */
  background-color: #f0f0f0;
}

audio.list-preview {
  object-fit: initial;
}

.item-info {
  padding: 15px;
}

.file-name {
  font-weight: 600;
  margin: 0 0 5px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upload-date {
  font-size: 0.9em;
  color: #888;
  margin: 0;
}
</style>