<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { supabase } from '@/lib/supabaseClient'; // 경로 확인: 보통 './lib/supabaseClient'
import { useRouter, RouterView, RouterLink } from 'vue-router';

const router = useRouter();
const user = ref(null);
const profile = ref(null); // profile은 null로 시작하는 것이 더 안전합니다.
let authListener = null;

// 프로필 정보를 불러오는 함수
const loadProfile = async (currentUser) => {
  if (!currentUser?.id) {
    profile.value = null;
    return;
  }
  try {
    // 필요한 모든 프로필 정보를 한 번에 불러옵니다.
    const { data, error } = await supabase
        .from('profiles')
        .select('nickname, grade, broadcast_platform, broadcast_id, storage_used')
        .eq('id', currentUser.id)
        .single();

    if (error) throw error;
    profile.value = data;
  } catch (error) {
    console.error('프로필 로딩 중 에러:', error);
    profile.value = null;
  }
};

// 로그아웃 함수
const handleLogout = async () => {
  try {
    await supabase.auth.signOut();
    user.value = null;
    profile.value = null;
    router.push('/');
  } catch (error) {
    console.error('로그아웃 에러:', error);
  }
};

// 컴포넌트가 마운트될 때 실행
onMounted(async () => {
  // 1. 페이지 첫 로드 시 현재 세션 정보를 가져옵니다.
  const { data: { session } } = await supabase.auth.getSession();
  user.value = session?.user ?? null;
  if (user.value) {
    await loadProfile(user.value);
  }

  // 2. 로그인/로그아웃 등 인증 상태 변화를 실시간으로 감지합니다.
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    const currentUser = session?.user ?? null;
    user.value = currentUser;
    profile.value = null; // 상태 변경 시 프로필을 초기화하고 다시 불러옵니다.

    if (currentUser) {
      await loadProfile(currentUser);
    }

    // 로그인 페이지에서 로그인이 성공했을 때만 페이지를 이동합니다.
    if (event === 'SIGNED_IN' && router.currentRoute.value.name === 'login') {
      router.push('/signature');
    }
  });

  authListener = data.subscription;

  // 다른 페이지(Signature.vue)에서 파일 용량이 변경되었을 때 알림을 받아 프로필을 새로고침합니다.
  window.addEventListener('storage-changed', () => loadProfile(user.value));
});

// 컴포넌트가 파괴되기 직전에 리스너를 정리합니다.
onBeforeUnmount(() => {
  authListener?.unsubscribe();
  window.removeEventListener('storage-changed', () => loadProfile(user.value));
});
</script>

<template>
  <header class="navbar">
    <nav>
      <router-link to="/" class="brand">Dr.Go CDN</router-link>
      <div class="nav-links">
        <template v-if="user">
          <span v-if="profile">
            {{ profile.nickname || user.email }} ({{ profile.grade }} 등급)
          </span>
          <small v-if="profile?.broadcast_platform && profile?.broadcast_id" class="broadcast-info">
          </small>
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
    <RouterView />
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
</style>
