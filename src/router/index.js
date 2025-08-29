import { createRouter, createWebHistory } from 'vue-router';
// 방금 만든 로그인 뷰를 가져옵니다.
import LoginView from '../views/LoginView.vue';
import Signature from '../views/Signature.vue';

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
        },
        {
            // 회원가입 링크 클릭 시 이동할 페이지 (나중에 만들어야 함)
            path: '/signup',
            name: 'signup',
            // route level code-splitting
            // this generates a separate chunk (About.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import('../views/LoginView.vue'), // 임시로 AboutView 연결
        },
    ],
});

export default router;