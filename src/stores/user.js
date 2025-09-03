import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '@/lib/supabase';

export const useUserStore = defineStore('user', () => {
    const user = ref(null);
    const profile = ref(null);
    const isLoggedIn = computed(() => !!user.value);

    async function fetchProfile() {
        if (!user.value?.id) { profile.value = null; return; }
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, nickname, grade, storage_used, broadcast_platform, broadcast_id')
                .eq('id', user.value.id)
                .single();
            if (error && error.code !== 'PGRST116') throw error; // not found 허용
            profile.value = data ?? null;
        } catch (err) {
            console.error('프로필 로딩 에러:', err);
            profile.value = null;
        }
    }

    function initialize() {
        // 새로고침 직후 1회
        supabase.auth.getSession().then(async ({ data }) => {
            user.value = data?.session?.user ?? null;
            await fetchProfile();
        });

        // 로그인/로그아웃 등 모든 변동 추적
        supabase.auth.onAuthStateChange(async (_event, session) => {
            user.value = session?.user ?? null;
            await fetchProfile();
        });
    }

    async function signOut() {
        await supabase.auth.signOut();
        user.value = null;
        profile.value = null;
    }

    return { user, profile, isLoggedIn, initialize, fetchProfile, signOut };
});