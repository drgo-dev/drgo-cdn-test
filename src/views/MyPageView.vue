<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../lib/supabaseClient';

const loading = ref(true);
const user = ref(null);
const profile = ref({
  nickname: '',
  broadcast_platform: '',
  broadcast_id: '',
  grade: '', // 등급을 저장할 속성 추가
});
const newPassword = ref(''); // 새 비밀번호를 위한 변수
const statusMessage = ref('');
const passwordStatusMessage = ref('');

onMounted(() => {
  getProfile();
});

async function getProfile() {
  loading.value = true;
  statusMessage.value = '';
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error("사용자를 찾을 수 없습니다.");
    user.value = currentUser;

    // select() 부분에 'grade'를 추가합니다.
    const { data, error, status } = await supabase
        .from('profiles')
        .select(`nickname, broadcast_platform, broadcast_id, grade`)
        .eq('id', user.value.id)
        .single();

    if (error && status !== 406) throw error;
    if (data) profile.value = data;

  } catch (error) {
    statusMessage.value = `오류: ${error.message}`;
  } finally {
    loading.value = false;
  }
}

async function updateProfile() {
  loading.value = true;
  statusMessage.value = '';
  try {
    const updates = {
      id: user.value.id,
      ...profile.value,
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);
    if (error) throw error;
    statusMessage.value = '프로필이 성공적으로 업데이트되었습니다!';
  } catch (error) {
    statusMessage.value = `오류: ${error.message}`;
  } finally {
    loading.value = false;
  }
}

// 비밀번호를 업데이트하는 함수를 새로 추가합니다.
async function updatePassword() {
  if (!newPassword.value) {
    passwordStatusMessage.value = '새 비밀번호를 입력해주세요.';
    return;
  }
  if (newPassword.value.length < 6) {
    passwordStatusMessage.value = '비밀번호는 6자리 이상이어야 합니다.';
    return;
  }

  loading.value = true;
  passwordStatusMessage.value = '';
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword.value,
    });
    if (error) throw error;
    passwordStatusMessage.value = '비밀번호가 성공적으로 변경되었습니다!';
    newPassword.value = ''; // 입력 필드 초기화
  } catch (error) {
    passwordStatusMessage.value = `오류: ${error.message}`;
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <div class="mypage-container">
    <form @submit.prevent="updateProfile" class="profile-form section-box">
      <h2>프로필 수정</h2>
      <div class="input-group">
        <label for="email">이메일</label>
        <input id="email" type="text" :value="user?.email" disabled />
      </div>
      <div class="input-group">
        <label for="grade">현재 등급</label>
        <input id="grade" type="text" :value="profile.grade" disabled />
      </div>
      <div class="input-group">
        <label for="nickname">닉네임</label>
        <input id="nickname" type="text" v-model="profile.nickname" />
      </div>
      <div class="input-group">
        <label for="platform">방송 플랫폼</label>
        <input id="platform" type="text" v-model="profile.broadcast_platform" placeholder="예: AfreecaTV, Twitch" />
      </div>
      <div class="input-group">
        <label for="broadcastId">방송 아이디</label>
        <input id="broadcastId" type="text" v-model="profile.broadcast_id" />
      </div>

      <div v-if="statusMessage" class="message">{{ statusMessage }}</div>

      <button type="submit" :disabled="loading" class="save-button">
        {{ loading ? '저장 중...' : '프로필 저장' }}
      </button>
    </form>

    <form @submit.prevent="updatePassword" class="password-form section-box">
      <h2>비밀번호 변경</h2>
      <div class="input-group">
        <label for="newPassword">새 비밀번호</label>
        <input id="newPassword" type="password" v-model="newPassword" placeholder="6자리 이상 입력" />
      </div>

      <div v-if="passwordStatusMessage" class="message">{{ passwordStatusMessage }}</div>

      <button type="submit" :disabled="loading" class="save-button">
        {{ loading ? '변경 중...' : '비밀번호 변경' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.mypage-container {
  max-width: 600px;
  margin: 40px auto;
  display: flex;
  flex-direction: column;
  gap: 30px; /* 섹션 간 간격 */
}

.section-box {
  padding: 30px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

h2 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 30px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
}
.input-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
.input-group input:disabled {
  background-color: #f4f4f4;
  cursor: not-allowed;
  color: #888;
}
.save-button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  background-color: #28a745;
  color: white;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 10px;
}
.save-button:disabled {
  background-color: #cccccc;
}
.message {
  text-align: center;
  padding: 10px;
  border-radius: 4px;
  background-color: #e7f3ff;
  color: #00529B;
  margin-top: 10px;
}
</style>