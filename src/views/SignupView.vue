<script setup>
import { ref } from 'vue';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const router = useRouter();

const handleSignup = async () => {
  // 이전 메시지 초기화
  errorMessage.value = '';
  successMessage.value = '';

  if (!email.value || !password.value) {
    errorMessage.value = '이메일과 비밀번호를 모두 입력해주세요.';
    return;
  }

  isLoading.value = true;
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    });

    if (error) throw error;

    // Supabase의 기본 설정은 이메일 인증이 필요합니다.
    // data.user.identities가 비어있으면 이메일이 이미 존재한다는 의미일 수 있습니다.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      errorMessage.value = '이미 사용 중인 이메일입니다.';
    } else {
      successMessage.value = '회원가입 성공! 확인 이메일을 보냈습니다. 이메일을 확인해주세요.';
    }

  } catch (error) {
    console.error('회원가입 에러:', error);
    errorMessage.value = error.message || '회원가입 중 오류가 발생했습니다.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="auth-container">
    <div class="auth-box">
      <h1>회원가입</h1>
      <form @submit.prevent="handleSignup">
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