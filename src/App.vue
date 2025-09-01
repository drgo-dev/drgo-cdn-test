<script setup>
import { onMounted } from 'vue';
import { useUserStore } from './stores/user'; // 스토어 import
import { useRouter, RouterView, RouterLink } from 'vue-router';

const userStore = useUserStore(); // 스토어 사용
const router = useRouter();

// 앱이 시작될 때 스토어를 초기화하여 로그인 상태 감지를 시작합니다.
onMounted(() => {
  userStore.initialize();
});

const handleLogout = async () => {
  await userStore.signOut();
  router.push('/');
};
</script>

<template>
  <header class="navbar">
    <nav>
      <router-link to="/" class="brand">Dr.Go CDN</router-link>
      <div class="nav-links">
        <template v-if="userStore.isLoggedIn && userStore.profile">
          <span>{{ userStore.profile.nickname || userStore.user.email }} ({{ userStore.profile.grade }} 등급)</span>
          <router-link to="/mypage">마이페이지</router-link>
          <router-link to="/signature">시그니처</router-link>
          <button @click="handleLogout" class="logout-button">로그아웃</button>
        </template>
        <template v-else>
        </template>
      </div>
    </nav>
  </header>
  <main>
    <RouterView />
  </main>
</template>

<style>
/* 전역 스타일 */
body { margin: 0; font-family: sans-serif; background-color: #f4f7f9; }
main { padding: 20px; }

/* 네비게이션 바 스타일 */
.navbar {
  background-color: #ffffff;
  padding: 15px 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.navbar nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}
.brand {
  font-size: 1.5rem;
  font-weight: bold;
  text-decoration: none;
  color: #2c3e50;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}
.nav-links a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: color 0.3s;
}
.nav-links a:hover { color: #007bff; }
.nav-links span { color: #555; }
.logout-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
}
.logout-button:hover { background-color: #0056b3; }
.storage-gauge { display: flex; align-items: center; gap: 8px; min-width: 200px; }
.gauge-bar { width: 100%; height: 8px; background-color: #e9ecef; border-radius: 4px; overflow: hidden; }
.gauge-fill { height: 100%; background-color: #007bff; border-radius: 4px; transition: width 0.5s ease; }
.gauge-text { font-size: 0.8rem; color: #555; white-space: nowrap; }
</style>