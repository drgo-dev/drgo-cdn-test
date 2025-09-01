<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../lib/supabaseClient';

// --- 상태 변수 ---
const imageUrl = ref('');
const audioUrl = ref('');
const isLoading = ref(false);
const user = ref(null);
// ❗️ profile의 초기값을 null 대신 객체 형태로 변경하여 안정성 확보
const profile = ref({ grade: null, expires_at: null, storage_used: 0 });
const statusMessage = ref('사용자 정보를 확인 중입니다...');
const signatures = ref([]);

// --- 함수 ---
const downloadFile = (url, filename) => {
  fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }).catch(console.error);
};

const copyUrl = (url) => {
  if (!url) return alert('복사할 URL이 없습니다.');
  navigator.clipboard.writeText(url).then(() => alert('클립보드에 URL이 복사되었습니다!'));
};

const fetchSignatures = async () => {
  if (!user.value) return;
  try {
    const { data, error } = await supabase.from('signatures').select('*').eq('user_id', user.value.id).order('created_at', { ascending: false });
    if (error) throw error;
    signatures.value = data;
  } catch (error) {
    console.error('파일 목록 로딩 에러:', error);
  }
};

const checkUser = async () => {
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  user.value = currentUser;
  if (currentUser) {
    try {
      const { data: userProfile } = await supabase.from('profiles').select('grade, expires_at').eq('id', currentUser.id).single();
      if (userProfile) {
        profile.value = userProfile;
      }
      statusMessage.value = '';
      await fetchSignatures();
    } catch (error) {
      console.error("프로필 로딩 에러:", error);
      statusMessage.value = "프로필 로딩에 실패했습니다.";
    }
  } else {
    statusMessage.value = '기능을 사용하려면 로그인이 필요합니다.';
  }
};

const handleFileUpload = async (event, type) => {
  // ❗️ 함수 시작 부분에서 profile과 grade의 존재를 더 안전하게 확인
  if (!user.value || !profile.value?.grade) return alert('사용자 정보가 로딩 중입니다. 잠시 후 다시 시도해주세요.');
  if (!['A', 'B', 'C'].includes(profile.value.grade)) {
    return alert('C등급 이상부터 파일을 업로드할 수 있습니다.');
  }
  const file = event.target.files[0];
  if (!file) return;

  isLoading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', user.value.id);

    const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
    const result = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(result.error || '업로드에 실패했습니다.');

    const { publicUrl } = result;

    const { error: dbError } = await supabase.from('signatures').insert({
      file_name: file.name,
      file_url: publicUrl,
      file_type: type,
      user_id: user.value.id,
      size: file.size,
    });
    if (dbError) throw dbError;

    if (type === 'image') imageUrl.value = publicUrl;
    else if (type === 'audio') audioUrl.value = publicUrl;

    alert('업로드 성공!');
    await fetchSignatures();
    window.dispatchEvent(new Event('storage-changed'));
  } catch (error) {
    alert(`오류가 발생했습니다: ${error.message}`);
  } finally {
    isLoading.value = false;
    event.target.value = '';
  }
};

const handleDelete = async (signature) => {
  if (!confirm(`'${signature.file_name}' 파일을 정말 삭제하시겠습니까?`)) return;
  isLoading.value = true;
  try {
    const fileKey = new URL(signature.file_url).pathname.substring(1);
    const response = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: fileKey }),
    });
    if (!response.ok) throw new Error('R2에서 파일 삭제를 실패했습니다.');

    const { error } = await supabase.from('signatures').delete().eq('id', signature.id);
    if (error) throw error;

    alert('파일이 성공적으로 삭제되었습니다.');
    await fetchSignatures();
    window.dispatchEvent(new Event('storage-changed'));
  } catch (error) {
    alert(`오류가 발생했습니다: ${error.message}`);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  checkUser();
});
</script>

<template>
  <div class="uploader-container">
    <div v-if="isLoading" class="loading-overlay"><div class="spinner"></div><p>처리 중입니다...</p></div>
    <div class="header"><h1>시그니처 관리</h1></div>

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
            <label for="image-upload" class="btn" :class="{ disabled: !['A', 'B', 'C'].includes(profile.grade) }">파일 선택</label>
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
            <label for="audio-upload" class="btn" :class="{ disabled: !['A', 'B', 'C'].includes(profile.grade) }">파일 선택</label>
          </div>
        </div>
      </div>

      <div class="list-section">
        <h2>내 시그니처 목록</h2>
        <div v-if="signatures.length === 0" class="empty-list">업로드한 파일이 없습니다.</div>
        <div v-else class="signature-grid">
          <div v-for="sig in signatures" :key="sig.id" class="signature-item">
            <img v-if="sig.file_type === 'image'" :src="sig.file_url" :alt="sig.file_name" class="list-preview" :class="{ 'no-right-click': profile.grade === 'D' }" />
            <audio v-else-if="sig.file_type === 'audio'" :src="sig.file_url" controls class="list-preview"></audio>
            <div class="item-info">
              <p class="file-name" :title="sig.file_name">{{ sig.file_name }}</p>
              <button v-if="['A', 'B', 'C'].includes(profile.grade)" @click="copyUrl(sig.file_url)" class="btn-copy">링크 복사</button>
              <button v-if="['A', 'B', 'C'].includes(profile.grade)" @click="downloadFile(sig.file_url, sig.file_name)" class="btn-download">다운로드</button>
              <button @click="handleDelete(sig)" class="btn-delete-item">삭제</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="status-box">{{ statusMessage }}</div>
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
</style>