<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { supabase } from './lib/supabaseClient';
import { useRouter, RouterView, RouterLink } from 'vue-router';

const router = useRouter();
const user = ref(null);
const profile = ref(null);
let authListener = null;

const loadProfile = async (currentUser) => {
  if (!currentUser?.id) {
    profile.value = null;
    return;
  }
  try {
    const { data } = await supabase
        .from('profiles')
        .select('nickname, grade, storage_used')
        .eq('id', currentUser.id)
        .single();
    profile.value = data;
  } catch (error) {
    console.error('프로필 로딩 중 에러:', error);
    profile.value = null;
  }
};

const handleLogout = async () => {
  await supabase.auth.signOut();
  user.value = null;
  profile.value = null;
  router.push('/');
};

// src/App.vue 의 <script setup> 내부

onMounted(async () => {
  // ❗️ 이 부분을 더 안전한 코드로 수정합니다.
  try {
    // 1. 전체 응답을 먼저 받습니다.
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    // 2. 데이터가 존재할 경우에만 세션과 사용자 정보를 할당합니다.
    if (data?.session) {
      user.value = data.session.user;
      await loadProfile(data.session.user);
    }
  } catch(error) {
    console.error("세션 로딩 중 에러:", error);
    user.value = null;
    profile.value = null;
  }
  // ---

  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    const currentUser = session?.user ?? null;
    user.value = currentUser;
    profile.value = null;
    if (currentUser) {
      await loadProfile(currentUser);
    }
    if (event === 'SIGNED_IN' && router.currentRoute.value.name === 'login') {
      router.push('/signature');
    }
  });

  authListener = data.subscription;

  window.addEventListener('storage-changed', () => {
    if (user.value) loadProfile(user.value);
  });
});

onBeforeUnmount(() => {
  authListener?.unsubscribe();
  window.removeEventListener('storage-changed', () => {
    if (user.value) loadProfile(user.value);
  });
});
</script>

<template>
  <header class="navbar">
    <nav>
      <router-link to="/" class="brand">Dr.Go CDN</router-link>
      <div class="nav-links">
        <template v-if="user && profile">
          <span>{{ profile.nickname || user.email }} ({{ props.profile.grade }} 등급)</span>
          <div class="storage-gauge" title="사용량">
            <div class="gauge-bar">
              <div class="gauge-fill" :style="{ width: `${(profile.storage_used / (300 * 1024 * 1024)) * 100}%` }"></div>
            </div>
            <div class="gauge-text">
              {{ (profile.storage_used / (1024 * 1024)).toFixed(1) }} / 300 MB
            </div>
          </div>
          <router-link to="/mypage">마이페이지</router-link>
          <router-link to="/signature">시그니처</router-link>
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
    <RouterView :profile="profile" />
  </main>
</template>
<style>
/* 전역 스타일 */
body { margin: 0; font-family: sans-serif; background-color: #f4f7f9; }
main { padding: 20px; }

/* 네비게이션 바 스타일 */
.navbar { background-color: #ffffff; padding: 15px 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.navbar nav { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; }
.brand { font-size: 1.5rem; font-weight: bold; text-decoration: none; color: #2c3e50; }
.nav-links { display: flex; align-items: center; gap: 20px; }
.nav-links a { text-decoration: none; color: #333; font-weight: 500; transition: color 0.3s; }
.nav-links a:hover { color: #007bff; }
.nav-links span { color: #555; }
.logout-button { background-color: #007bff; color: #fff; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: 500; }
.logout-button:hover { background-color: #0056b3; }
.platform-icon {
  width: 20px;
  height: 20px;
  margin-right: 5px;
  margin-bottom: 2px;
  vertical-align: middle;
}
.broadcast-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: #555;
}
.storage-gauge { display: flex; align-items: center; gap: 8px; min-width: 200px; }
.gauge-bar { width: 100%; height: 8px; background-color: #e9ecef; border-radius: 4px; overflow: hidden; }
.gauge-fill { height: 100%; background-color: #007bff; border-radius: 4px; transition: width 0.5s ease; }
.gauge-text { font-size: 0.8rem; color: #555; white-space: nowrap; }
</style>
