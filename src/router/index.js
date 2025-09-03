import { createRouter, createWebHistory } from 'vue-router';
import { supabase } from '@/lib/supabase';
// 방금 만든 로그인 뷰를 가져옵니다.
import LoginView from '../views/LoginView.vue';
import Signature from '../views/Signature.vue';
import SignupView from '../views/SignupView.vue';
import MyPageView from '../views/MyPageView.vue';


const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'login',
            component: LoginView,
        },
        // 2. 아래 내용을 routes 배열 안에 추가/수정합니다.
        {
            path: '/signature', // 주소도 signature로 변경
            name: 'signature',
            component: Signature, // 컴포넌트도 Signature로 변경
            meta: { requiresAuth: true },
        },
        {
            path: '/signup',
            name: 'signup',
            component: SignupView,
        },
        {
            path: '/mypage', // 2. 새 경로 추가
            name: 'mypage',
            component: MyPageView,
            meta: { requiresAuth: true }, // 로그인이 필요한 페이지로 설정
        },
    ],
});

router.beforeEach(async (to) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (to.meta.requiresAuth && !session) return { name: 'login' };
});
/*

// 페이지 이동이 일어나기 직전에 이 함수(문지기)가 항상 실행됩니다.
router.beforeEach(async (to, from, next) => {
    // getSession()은 페이지 이동 시마다 호출되므로 onAuthStateChange보다 효율적입니다.
    const { data: { session } } = await supabase.auth.getSession();
    const isLoggedIn = !!session;

    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const isAuthPage = to.name === 'login' || to.name === 'signup';

    if (requiresAuth && !isLoggedIn) {
        // 로그인이 필요한 페이지에 비로그인 상태로 접근 시, 로그인 페이지로 보냅니다.
        next({ name: 'login' });
    } else if (isAuthPage && isLoggedIn) {
        // 로그인/회원가입 페이지에 로그인 상태로 접근 시, 시그니처 페이지로 보냅니다.
        next({ name: 'signature' });
    } else {
        // 그 외 모든 경우는 통과시킵니다.
        next();
    }
});
*/

export default router;