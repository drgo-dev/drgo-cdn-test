<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// ✅ 템플릿에서 사용하는 상태들 전부 선언
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

// (선택) 자동 로그인 상태라면 바로 리다이렉트
async function redirectIfLoggedIn() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    await userStore.fetchProfile()
    router.replace({ name: 'home' }) // 라우트 이름은 프로젝트에 맞게
  }
}
redirectIfLoggedIn()

// ✅ 로그인 핸들러
async function handleLogin() {
  errorMessage.value = ''
  isLoading.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (error) throw error

    // 세션 반영 + 프로필 로드
    const { data: { session } } = await supabase.auth.getSession()
    userStore.user = session?.user ?? null
    await userStore.fetchProfile()

    // 로그인 성공 후 이동 (프로젝트 라우트에 맞게 수정)
    router.replace({ name: 'home' })
  } catch (err) {
    errorMessage.value = err.message || '로그인에 실패했습니다.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="auth-box">
      <router-link to="/signature">
        <img src="/logo.png" alt="닥터고 로고" class="logo" />
      </router-link>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label for="email">아이디 (이메일)</label>
          <input
              type="email"
              id="email"
              v-model="email"
              placeholder="이메일을 입력하세요"
          />
        </div>
        <div class="input-group">
          <label for="password">비밀번호</label>
          <input
              type="password"
              id="password"
              v-model="password"
              placeholder="비밀번호를 입력하세요"
          />
        </div>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <button :disabled="isLoading" @click="handleLogin" class="login-button">
          {{ isLoading ? '로그인 중...' : '로그인' }}
        </button>
      </form>

      <div class="links">
        계정이 없으신가요? <router-link to="/signup">회원가입</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 회원가입 뷰와 스타일 공유 */
.auth-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f2f5; }
.auth-box { width: 100%; max-width: 400px; padding: 40px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); text-align: center; }
.logo { max-width: 150px; margin-bottom: 2rem; cursor: pointer; }
.login-form .input-group { margin-bottom: 1.5rem; text-align: left; }
.login-form label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333; }
.login-form input { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; box-sizing: border-box; }
.login-button { width: 100%; padding: 12px; border: none; border-radius: 4px; background-color: #007bff; color: white; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: background-color 0.3s ease; }
.login-button:disabled { background-color: #cccccc; cursor: not-allowed; }
.links { margin-top: 1.5rem; }
.links a { color: #007bff; text-decoration: none; }
.message { padding: 10px; border-radius: 4px; margin-bottom: 1rem; }
.error { background-color: #f8d7da; color: #721c24; }
</style>