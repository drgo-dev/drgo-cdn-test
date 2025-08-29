import { createRouter, createWebHistory } from 'vue-router';
// 방금 만든 로그인 뷰를 가져옵니다.
import LoginView from '../views/LoginView.vue';
import Signature from '../views/Signature.vue';
import SignupView from '../views/SignupView.vue';


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
            path: '/signup',
            name: 'signup',
            component: SignupView,
        },
    ],
});

export default router;