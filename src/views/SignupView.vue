<script setup>
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const email = ref('')
const password = ref('')
const nickname = ref('')
const broadcastPlatform = ref('twitch') // twitch | youtube | afreeca 등
const broadcastId = ref('')

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function validate() {
  if (!nickname.value.trim()) return '닉네임을 입력해주세요.'
  if (!broadcastPlatform.value) return '방송 플랫폼을 선택해주세요.'
  if (!broadcastId.value.trim()) return '방송 아이디를 입력해주세요.'
  if (!email.value || !password.value) return '이메일과 비밀번호를 모두 입력해주세요.'
  return ''
}

async function handleSignup() {
  errorMessage.value = ''
  successMessage.value = ''

  const v = validate()
  if (v) { errorMessage.value = v; return }

  isLoading.value = true
  try {
    // 추가 정보 메타데이터 + 세션스토리지에 백업
    const extra = {
      nickname: nickname.value.trim(),
      broadcast_platform: broadcastPlatform.value,
      broadcast_id: broadcastId.value.trim(),
    }
    sessionStorage.setItem('signup.extra', JSON.stringify(extra))

    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: { data: extra },  // user_metadata에도 보관
    })
    if (error) throw error

    // 환경에 따라 즉시 세션이 생기면 바로 프로필 upsert
    if (data.user?.id) {
      await upsertProfile(data.user.id, extra)
      sessionStorage.removeItem('signup.extra')
    }

    successMessage.value = '회원가입 성공! 확인 이메일을 보냈습니다. 이메일을 확인해주세요.'
  } catch (err) {
    console.error('회원가입 에러:', err)
    errorMessage.value = err.message || '회원가입 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

async function upsertProfile(id, { nickname, broadcast_platform, broadcast_id }) {
  const { error } = await supabase.from('profiles').upsert({
    id,
    nickname,
    broadcast_platform,
    broadcast_id,
  })
  if (error) throw error
}
</script>

<template>
  <div class="auth-container">
    <div class="auth-box">
      <h1>회원가입</h1>
      <form @submit.prevent="handleSignup">
        <!-- 추가 정보 -->
        <div class="input-group">
          <label for="nickname">닉네임</label>
          <input id="nickname" v-model="nickname" type="text" placeholder="예: 닥터고" />
        </div>

        <div class="input-group">
          <label for="broadcastPlatform">방송 플랫폼</label>
          <select id="broadcastPlatform" v-model="broadcastPlatform">
            <option value="soop">SOOP</option>
            <option value="chzzk">치지직</option>
            <option value="youtube">유튜브</option>
          </select>
        </div>

        <div class="input-group">
          <label for="broadcastId">방송국 아이디</label>
          <input id="broadcastId" v-model="broadcastId" type="text" placeholder="방송국 아이디" />
        </div>

        <!-- 기본 가입 -->
        <div class="input-group">
          <label for="email">이메일</label>
          <input type="email" id="email" v-model="email" placeholder="you@example.com" />
        </div>
        <div class="input-group">
          <label for="password">비밀번호</label>
          <input type="password" id="password" v-model="password" placeholder="6자리 이상" />
        </div>

        <p v-if="successMessage" class="message success">{{ successMessage }}</p>
        <p v-if="errorMessage" class="message error">{{ errorMessage }}</p>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? '가입 중...' : '회원가입' }}
        </button>
      </form>

      <div class="links">
        이미 계정이 있으신가요? <router-link to="/">로그인</router-link>
      </div>
    </div>
  </div>
</template>


<style scoped>
/* 로그인 뷰와 스타일 공유를 위해 유사하게 작성 */
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
}
.auth-box {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}
h1 { margin-bottom: 2rem; }
.input-group {
  margin-bottom: 1.5rem;
  text-align: left;
}
label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}
input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

#broadcastPlatform{
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;

  /* 화살표 위치 조정 */
  background-position: right 10px center; /* 오른쪽에서 10px 안쪽 */
  background-repeat: no-repeat;
  background-size: 16px;
}

button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  background-color: #28a745; /* 초록색 버튼 */
  color: white;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
.links { margin-top: 1.5rem; }
.links a {
  color: #007bff;
  text-decoration: none;
}
/* 메시지 스타일 */
.message {
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 1rem;
}
.success {
  background-color: #d4edda;
  color: #155724;
}
.error {
  background-color: #f8d7da;
  color: #721c24;
}
</style>