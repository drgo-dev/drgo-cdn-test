<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/api/upload';
import { useUserStore } from '@/stores/user';


// ⚠️ 경로는 프로젝트 구조에 따라 다를 수 있습니다.
// 기존에 '../stores/user' 를 쓰셨다면 그 경로로 바꾸세요.
const userStore = useUserStore();

// ---------------------- 상태 ----------------------
const signatures = ref([]);
const isLoading = ref(false);
const activeTab = ref('all');

const imageUrl = ref('');
const audioUrl = ref('');
const statusMessage = ref('사용자 정보를 확인 중입니다...');

// user/profile 은 store 를 통해 노출
const user = computed(() => userStore.user);
const profile = computed(() => userStore.profile);

// ---------------------- 초기화 ----------------------
onMounted(async () => {
  // 1) 세션 조회
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // 2) 스토어에 사용자 채우기 (store 구조에 따라 속성명은 맞춰주세요)
    userStore.user = session.user;

    // 3) 프로필 로드 (profiles 테이블 기준)
    const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (!profErr) {
      userStore.profile = prof; // grade, storage_used 등 포함
      statusMessage.value = '';
      // 4) 본인 시그니처 목록 로드
      await fetchSignatures(session.user.id);
    } else {
      statusMessage.value = '프로필을 불러오지 못했습니다.';
      console.error(profErr);
    }
  } else {
    statusMessage.value = '로그인이 필요합니다.';
  }
});

// 세션 변경 감시 (로그인/로그아웃)
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    userStore.user = session.user;
    const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
    if (!profErr) userStore.profile = prof;
    await fetchSignatures(session.user.id);
  } else {
    userStore.user = null;
    userStore.profile = null;
    signatures.value = [];
  }
});

// ---------------------- 목록 필터 ----------------------
const filteredSignatures = computed(() => {
  if (activeTab.value === 'all') return signatures.value;
  return signatures.value.filter((sig) => sig.file_type === activeTab.value);
});

// ---------------------- 목록 불러오기 ----------------------
async function fetchSignatures(userId) {
  if (!userId) return;
  try {
    const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    signatures.value = data || [];
  } catch (error) {
    console.error('파일 목록 로딩 에러:', error);
  }
}

// ---------------------- 업로드 ----------------------
async function handleFileUpload(event, type) {
  // 권한/등급 체크
  if (!userStore?.profile?.grade || !['A', 'B', 'C'].includes(userStore.profile.grade)) {
    alert('C등급 이상부터 파일을 업로드할 수 있습니다.');
    return;
  }

  const file = event.target.files?.[0];
  if (!file) return;

  isLoading.value = true;
  try {
    // 1) R2 업로드 (토큰 자동 포함)
    const result = await uploadToR2(file);
    // result: { ok: true, key, publicUrl, userId: ... }
    if (!result?.ok) throw new Error(result?.error || '업로드에 실패했습니다.');

    const publicUrl = result.publicUrl;

    // 2) DB 기록
    const { error: dbError } = await supabase.from('signatures').insert({
      file_name: file.name,
      file_url: publicUrl,
      file_type: type, // 'image' | 'audio'
      user_id: userStore.profile.id,
      size: file.size,
    });
    if (dbError) throw dbError;

    // 3) 미리보기/상태 반영
    if (type === 'image') imageUrl.value = publicUrl;
    if (type === 'audio') audioUrl.value = publicUrl;

    alert('업로드 성공!');
    await fetchSignatures(userStore.profile.id);
    window.dispatchEvent(new Event('storage-changed'));
  } catch (error) {
    console.error(error);
    alert(`오류가 발생했습니다: ${error.message}`);
  } finally {
    isLoading.value = false;
    // 같은 파일 다시 선택 가능하게 input 초기화
    if (event?.target) event.target.value = '';
  }
}

// ---------------------- 삭제 ----------------------
async function handleDelete(signature) {
  if (!confirm(`'${signature.file_name}' 파일을 정말 삭제하시겠습니까?`)) return;
  isLoading.value = true;
  try {
    // R2 키 추출 (https://host/<key>)
    const fileKey = new URL(signature.file_url).pathname.substring(1);

    // 1) R2에서 삭제 (워커 라우트에 맞게 경로 조정: 예 '/delete' 또는 '/api/delete')
    const res = await fetch('/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: fileKey }),
    });
    if (!res.ok) throw new Error('R2에서 파일 삭제를 실패했습니다.');

    // 2) DB에서 삭제
    const { error } = await supabase.from('signatures').delete().eq('id', signature.id);
    if (error) throw error;

    alert('파일이 성공적으로 삭제되었습니다.');
    await fetchSignatures(userStore.profile.id);
    window.dispatchEvent(new Event('storage-changed'));
  } catch (error) {
    console.error(error);
    alert(`오류가 발생했습니다: ${error.message}`);
  } finally {
    isLoading.value = false;
  }
}

// ---------------------- 유틸 ----------------------
function copyUrl(url) {
  if (!url) return alert('복사할 URL이 없습니다.');
  navigator.clipboard.writeText(url)
      .then(() => alert('클립보드에 URL이 복사되었습니다!'))
      .catch(() => alert('클립보드 복사에 실패했습니다.'));
}

function downloadFile(url, filename) {
  fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error('파일을 다운로드할 수 없습니다.');
        return response.blob();
      })
      .then((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      })
      .catch((err) => {
        console.error('다운로드 에러:', err);
        alert('파일을 다운로드하는 중 오류가 발생했습니다.');
      });
}

// ---------------------- (선택) 파일 직접 선택 호출 예시 ----------------------
async function onSelectFile(file) {
  // 필요 시 외부에서 파일 객체만 받아 업로드
  await handleFileUpload({ target: { files: [file] } }, 'image');
}
</script>

<template>
  <div class="uploader-container">
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>처리 중입니다...</p>
    </div>

    <div class="header">
      <h1>시그니처 관리</h1>
    </div>

    <div v-if="profile" class="storage-gauge-box">
      <h3>내 사용량</h3>
      <div class="storage-gauge">
        <div class="gauge-bar">
          <div class="gauge-fill" :style="{ width: `${(userStore.profile.storage_used / (300 * 1024 * 1024)) * 100}%` }"></div>
        </div>
        <div class="gauge-text">
          {{ (userStore.profile.storage_used / (1024 * 1024)).toFixed(2) }} MB / 300 MB
        </div>
      </div>
    </div>

    <div v-if="!profile" class="status-box">
      {{ statusMessage }}
    </div>

    <div v-if="profile">
      <div class="upload-section">
        <div class="upload-box">
          <h3>알림 이미지</h3>
          <div class="preview-area">
            <img v-if="imageUrl" :src="imageUrl" alt="이미지 미리보기" class="image-preview" />
            <div v-else class="placeholder">이미지 미리보기</div>
          </div>
          <div class="button-group">
            <input type="file" @change="handleFileUpload($event, 'image')" accept="image/*" id="image-upload" style="display:none" :disabled="!['A', 'B', 'C'].includes(profile.grade)" />
            <label for="image-upload" class="btn" :class="{ disabled: !['A', 'B', 'C'].includes(userStore.profile.grade) }">파일 선택</label>
          </div>
        </div>
        <div class="upload-box">
          <h3>알림음</h3>
          <div class="preview-area">
            <audio v-if="audioUrl" :src="audioUrl" controls class="audio-preview"></audio>
            <div v-else class="placeholder">사운드 사용안함</div>
          </div>
          <div class="button-group">
            <input type="file" @change="handleFileUpload($event, 'audio')" accept="audio/*" id="audio-upload" style="display:none" :disabled="!['A', 'B', 'C'].includes(profile.grade)" />
            <label for="audio-upload" class="btn" :class="{ disabled: !['A', 'B', 'C'].includes(userStore.profile.grade) }">파일 선택</label>
          </div>
        </div>
      </div>

      <div class="list-section">
        <h2>내 시그니처 목록</h2>
        <div class="tabs">
          <button @click="activeTab = 'all'" :class="{ active: activeTab === 'all' }">전체</button>
          <button @click="activeTab = 'image'" :class="{ active: activeTab === 'image' }">이미지</button>
          <button @click="activeTab = 'audio'" :class="{ active: activeTab === 'audio' }">오디오</button>
        </div>
        <div class="signature-list-container">
          <div v-if="filteredSignatures.length === 0" class="empty-list">
            해당 종류의 파일이 없습니다.
          </div>
          <div v-else>
            <div v-for="sig in filteredSignatures" :key="sig.id" class="list-item">
              <div class="item-thumbnail">
                <img v-if="sig.file_type === 'image'" :src="sig.file_url" :alt="sig.file_name" />
                <span v-else class="audio-icon">🎵</span>
                <div v-if="sig.file_type === 'image'" class="thumbnail-preview">
                  <img :src="sig.file_url" :alt="sig.file_name" />
                </div>
              </div>
              <div class="item-name" :title="sig.file_name">
                {{ sig.file_name }}
              </div>
              <div class="item-actions">
                <button v-if="['A', 'B', 'C'].includes(userStore.profile.grade)" @click="copyUrl(sig.file_url)" class="btn-icon" title="링크 복사">📋</button>
                <button v-if="['A', 'B', 'C'].includes(userStore.profile.grade)" @click="downloadFile(sig.file_url, sig.file_name)" class="btn-icon" title="다운로드">💾</button>
                <button @click="handleDelete(sig)" class="btn-icon btn-icon-delete" title="삭제">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 이전 스타일과 거의 동일 */
.uploader-container { max-width: 900px; margin: 50px auto; padding: 30px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
.loading-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 9999; color: white; }
.spinner { border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 4px solid #fff; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 10px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.header { text-align: center; margin-bottom: 20px; }
.header h1 { font-size: 2.5em; color: #2c3e50; margin: 0; font-weight: 700; }
.status-box { background-color: #fff3cd; color: #856404; padding: 15px; border: 1px solid #ffeeba; border-radius: 8px; margin-bottom: 30px; text-align: center; font-size: 1.1em; }
.upload-section { display: grid; grid-template-columns: 1fr; gap: 30px; margin-bottom: 30px; }
@media (min-width: 768px) { .upload-section { grid-template-columns: 1fr 1fr; } }
.upload-box { background-color: #f8f9fa; padding: 25px; border-radius: 10px; border: 1px solid #e0e0e0; display: flex; flex-direction: column; align-items: center; gap: 20px; }
.upload-box h3 { font-size: 1.5em; color: #34495e; margin-top: 0; margin-bottom: 15px; font-weight: 600; }
.preview-area { width: 100%; height: 180px; background-color: #e9ecef; border-radius: 8px; display: flex; justify-content: center; align-items: center; overflow: hidden; margin-bottom: 15px; border: 1px dashed #ced4da; }
.image-preview, .audio-preview { max-width: 100%; max-height: 100%; object-fit: contain; }
.placeholder { color: #6c757d; font-size: 1.1em; }
.button-group { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 250px; }
.btn { display: inline-flex; justify-content: center; align-items: center; padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1em; font-weight: 500; transition: all 0.3s ease; text-decoration: none; color: #fff; background-color: #007bff; box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2); }
.btn:hover { background-color: #0056b3; box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3); }
.btn.disabled { background-color: #cccccc; cursor: not-allowed; box-shadow: none; }
.list-section { margin-top: 50px; padding-top: 30px; border-top: 1px solid #eee; }
.list-section h2 { text-align: center; margin-bottom: 30px; font-size: 2em; color: #2c3e50; }
.empty-list { text-align: center; padding: 40px; background-color: #f8f9fa; border-radius: 8px; color: #6c757d; font-size: 1.2em; }
.signature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
.signature-item { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: transform 0.3s ease, box-shadow 0.3s ease; }
.signature-item:hover { transform: translateY(-5px); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
.list-preview { width: 100%; height: 180px; object-fit: cover; background-color: #f0f0f0; }
.no-right-click { pointer-events: none; } /* 우클릭 방지용 클래스 */
audio.list-preview { object-fit: initial; }
.item-info { padding: 15px; display: flex; flex-direction: column; gap: 8px; }
.file-name { font-weight: 600; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-copy, .btn-download, .btn-delete-item { padding: 8px 12px; border: 1px solid; border-radius: 5px; cursor: pointer; font-weight: 500; transition: background-color 0.2s, color 0.2s; width: 100%; background-color: #fff; }
.btn-copy { border-color: #007bff; color: #007bff; }
.btn-copy:hover { background-color: #007bff; color: #fff; }
.btn-download { border-color: #28a745; color: #28a745; }
.btn-download:hover { background-color: #28a745; color: #fff; }
.btn-delete-item { border-color: #dc3545; color: #dc3545; }
.btn-delete-item:hover { background-color: #dc3545; color: #fff; }
.storage-gauge-box {
  background-color: #f8f9fa;
  padding: 20px 25px;
  border-radius: 8px;
  margin-bottom: 30px;
  border: 1px solid #e0e0e0;
}
.storage-gauge-box h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2em;
  color: #34495e;
}
.storage-gauge { display: flex; align-items: center; gap: 15px; }
.gauge-bar { flex-grow: 1; height: 12px; background-color: #e9ecef; border-radius: 6px; overflow: hidden; }
.gauge-fill { height: 100%; background-color: #007bff; border-radius: 6px; transition: width 0.5s ease; }
.gauge-text { font-size: 1em; color: #333; font-weight: 500; white-space: nowrap; }
.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #eee;
}
.tabs button {
  padding: 10px 20px;
  border: none;
  background-color: transparent;
  cursor: pointer;
  font-size: 1.1em;
  font-weight: 500;
  color: #888;
  position: relative;
  transition: color 0.3s;
}
.tabs button.active {
  color: #007bff;
}
.tabs button.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #007bff;
}

/* 새 목록 스타일 */
.signature-list-container {
  background-color: #fff;
  border-radius: 8px;
}
.list-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
  gap: 15px;
}
.list-item:last-child {
  border-bottom: none;
}
.item-thumbnail {
  width: 60px;
  height: 40px;
  background-color: #f0f2f5;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative; /* 미리보기 기준점 */
  cursor: pointer;
}
.item-thumbnail img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.audio-icon {
  font-size: 24px;
}
.item-name {
  flex-grow: 1;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-actions {
  display: flex;
  gap: 10px;
}
.btn-icon {
  background: none;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, color 0.2s;
}
.btn-icon:hover {
  background-color: #f0f2f5;
}
.btn-icon-delete:hover {
  background-color: #dc3545;
  color: white;
  border-color: #dc3545;
}

/* 이미지 호버 시 미리보기 스타일 */
.thumbnail-preview {
  display: none; /* 평소에는 숨김 */
  position: absolute;
  top: 50%;
  left: 100%;
  transform: translateY(-50%);
  margin-left: 15px;
  width: 200px;
  height: auto;
  background-color: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 5px;
  border-radius: 4px;
  z-index: 10;
}
.thumbnail-preview img {
  width: 100%;
  height: auto;
  display: block;
}
.item-thumbnail:hover .thumbnail-preview {
  display: block; /* 마우스 올리면 보이게 */
}
</style>