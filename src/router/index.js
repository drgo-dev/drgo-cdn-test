import { createRouter, createWebHistory } from 'vue-router';
import { supabase } from '../lib/supabaseClient.js';
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
// 페이지 이동이 일어나기 직전에 이 함수(문지기)가 항상 실행됩니다.
router.beforeEach(async (to, from, next) => {
    const { data: { session } } = await supabase.auth.getSession();

    const isLoggedIn = !!session; // 로그인 여부를 boolean 값으로 저장

    // 1. 로그인이 필요한 페이지에 접근하려는데, 로그인이 안 되어 있다면
    if (to.meta.requiresAuth && !isLoggedIn) {
        // 로그인 페이지로 보냅니다.
        next({ name: 'login' });
    }
    // 2. 로그인/회원가입 페이지에 접근하려는데, 이미 로그인이 되어 있다면
    else if ((to.name === 'login' || to.name === 'signup') && isLoggedIn) {
        // 시그니처 페이지로 보냅니다.
        next({ name: 'signature' });
    }
    // 3. 그 외의 모든 경우는 그냥 통과시킵니다.
    else {
        next();
    }
});

export default router;