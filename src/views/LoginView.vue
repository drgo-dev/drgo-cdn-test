<script setup>
import { ref } from 'vue';

// v-model을 통해 input 값과 실시간으로 연동될 변수
const userId = ref('');
const userPassword = ref('');

// 로그인 버튼 클릭 시 실행될 함수 (지금은 콘솔에 출력만)
const handleLogin = () => {
  if (!userId.value || !userPassword.value) {
    alert('아이디와 비밀번호를 모두 입력해주세요.');
    return;
  }
  console.log('로그인 시도:', {
    id: userId.value,
    password: userPassword.value,
  });
  // 여기에 실제 로그인 API 요청 로직을 추가하면 됩니다.
};
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <router-link to="/signature">
        <img src="/logo.png" alt="닥터고 로고" class="logo" />
      </router-link>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label for="userId">아이디</label>
          <input
              type="text"
              id="userId"
              v-model="userId"
              placeholder="아이디를 입력하세요"
          />
        </div>
        <div class="input-group">
          <label for="userPassword">비밀번호</label>
          <input
              type="password"
              id="userPassword"
              v-model="userPassword"
              placeholder="비밀번호를 입력하세요"
          />
        </div>
        <button type="submit" class="login-button">로그인</button>
      </form>

      <div class="links">
        <router-link to="/signup">회원가입</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* scoped: 이 스타일은 현재 컴포넌트(.vue 파일) 내에서만 적용됩니다. */

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh; /* 화면 전체 높이를 차지하도록 설정 */
  background-color: #f0f2f5;
}

.login-box {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.logo {
  max-width: 150px;
  margin-bottom: 2rem;
}

.login-form .input-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.login-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.login-form input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box; /* 패딩이 너비에 포함되도록 설정 */
}

.login-button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.login-button:hover {
  background-color: #0056b3;
}

.links {
  margin-top: 1.5rem;
}

.links a {
  color: #007bff;
  text-decoration: none;
}

.links a:hover {
  text-decoration: underline;
}
</style>