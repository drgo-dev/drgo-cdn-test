<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { supabase } from './lib/supabaseClient.js'
import { useRouter } from 'vue-router'

const router = useRouter()

// 항상 객체 형태 유지
const user = ref(null)
const profile = ref({ nickname: '', grade: null, broadcast_platform: null, broadcast_id: null })

// 프로필 로더 (결과 없으면 기본값)
const loadProfile = async (currentUser) => {
  if (!currentUser?.id) {
    profile.value = { nickname: '', grade: null, broadcast_platform: null, broadcast_id: null }
    return
  }

  const { data, error } = await supabase
      .from('profiles')
      .select('nickname, grade, broadcast_platform, broadcast_id')  // ✅ 컬럼 확장
      .eq('id', currentUser.id)
      .maybeSingle()

  if (error) {
    console.error('프로필 로딩 중 에러:', error)
    profile.value = { nickname: '', grade: null, broadcast_platform: null, broadcast_id: null }
    return
  }

  profile.value = data ?? { nickname: '', grade: null, broadcast_platform: null, broadcast_id: null }
}

// ✅ 회원가입 폼에서 세션스토리지에 넣어둔 값이 있으면 upsert
const upsertProfileExtraFromSession = async (currentUser) => {
  if (!currentUser?.id) return
  try {
    const raw = sessionStorage.getItem('signup.extra')
    if (!raw) return
    const extra = JSON.parse(raw)
    // 비어있는 값만 채우고 싶으면 조건 분기 추가 가능
    const { error } = await supabase.from('profiles').upsert({
      id: currentUser.id,
      nickname: extra?.nickname ?? undefined,
      broadcast_platform: extra?.broadcast_platform ?? undefined,
      broadcast_id: extra?.broadcast_id ?? undefined,
    })
    if (error) {
      console.error('프로필 upsert 에러:', error)
      return
    }
    sessionStorage.removeItem('signup.extra')
    // 최신값 재로딩 (선택)
    await loadProfile(currentUser)
  } catch (e) {
    console.error('signup.extra 처리 중 에러:', e)
  }
}

let unsub = null

onMounted(async () => {
  // 첫 진입 시 세션 동기화
  const { data: { session} } = await supabase.auth.getSession()
  user.value = session?.user ?? null
  await loadProfile(user.value)
  // ✅ 최초 진입 시에도 upsert 시도
  if (user.value) await upsertProfileExtraFromSession(user.value)

  // 로그인 상태 변화 구독
  const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
    user.value = session?.user ?? null

    if (user.value) {
      await loadProfile(user.value)
      // ✅ 로그인/회원가입 직후 upsert 시도
      await upsertProfileExtraFromSession(user.value)
    } else {
      profile.value = { nickname: '', grade: null, broadcast_platform: null, broadcast_id: null }
    }

    if (event === 'SIGNED_IN' && router.currentRoute.value.name === 'login') {
      router.push('/signature')
    }
  })
  // supabase-js v2 구독 핸들
  unsub = sub?.subscription
})

onBeforeUnmount(() => {
  unsub?.unsubscribe?.()
})

// 로그아웃
const handleLogout = async () => {
  try {
    await supabase.auth.signOut()
    user.value = null
    profile.value = { nickname: '', grade: null, broadcast_platform: null, broadcast_id: null }
    router.push('/')
  } catch (error) {
    console.error('로그아웃 에러:', error)
  }
}
</script>


<template>
  <header class="navbar">
    <nav>
      <router-link to="/" class="brand">Dr.Go CDN</router-link>
      <div class="nav-links">
        <template v-if="user">
          <!-- ✅ 안전 접근: 옵셔널 체이닝/기본값 -->
          <span>
            {{ (profile && profile.nickname) ? profile.nickname : user.email }}
            ({{ profile?.grade ?? '' }} 등급)
          </span>
          <small v-if="profile?.broadcast_platform && profile?.broadcast_id">
            · {{ profile.broadcast_platform }} / {{ profile.broadcast_id }}
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
</style>



<!--
<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from './lib/supabaseClient';
import { useRouter, RouterView, RouterLink } from 'vue-router';

const user = ref(null);
const profile = ref(null);
const router = useRouter();

// 1. 프로필을 불러오는 로직을 별도의 async 함수로 분리합니다.
const loadProfile = async (currentUser) => {
  try {
    const { data } = await supabase
        .from('profiles')
        .select('nickname, grade')
        .eq('id', currentUser.id)
        .single();
    profile.value = data;
  } catch (error) {
    console.error('프로필 로딩 중 에러:', error);
    profile.value = null;
  }
};

const handleLogout = async () => {
  try {
    await supabase.auth.signOut();
    profile.value = null; // 로그아웃 시 프로필 정보도 비웁니다.
    router.push('/');
  } catch (error) {
    console.error('로그아웃 에러:', error);
  }
};

onMounted(() => {
  // 2. onAuthStateChange는 상태 변경만 담당하고, 분리된 함수를 호출합니다.
  supabase.auth.onAuthStateChange((event, session) => {
    const currentUser = session?.user || null;
    user.value = currentUser;

    if (currentUser) {
      loadProfile(currentUser);
    } else {
      profile.value = null;
    }

    if (event === 'SIGNED_IN' && router.currentRoute.value.name === 'login') {
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
          <span>{{ profile?.nickname || user.email }} ({{ profile.grade }} 등급)</span>
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
</style>-->
