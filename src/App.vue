<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from './lib/supabaseClient';
import { useRouter, RouterView, RouterLink } from 'vue-router';

const user = ref(null);
const router = useRouter();

// 로그아웃 함수
const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // 로그아웃 후 로그인 페이지로 이동
    router.push('/');
  } catch (error) {
    console.error('로그아웃 에러:', error);
  }
};

// 컴포넌트가 마운트될 때와 인증 상태가 바뀔 때마다 사용자 정보를 업데이트합니다.
onMounted(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user || null;
    if (event === 'SIGNED_IN') {
      router.push('/signature');
    }
  });
});
</script>
<template>
  <header class="navbar">
    <nav>
      <router-link to="/" class="brand">Dr.Go CDN</router-link>
      <div class="nav-links">
        <template v-if="user">
          <span>{{ user.email }}</span>
          <router-link to="/signature">Signature</router-link>
          <button @click="handleLogout" class="logout-button">로그아웃</button>
        </template>
        <template v-else>
          <router-link to="/">로그인</router-link>
          <router-link to="/signup">회원가입</router-link>
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
</style>