import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'

export const useUserStore = defineStore('user', () => {
    // --- 상태 (State) ---
    const user = ref(null)
    const profile = ref(null)

    // --- Getter (계산된 값) ---
    const isLoggedIn = computed(() => !!user.value)

    // --- 액션 (Actions) ---
    async function fetchProfile() {
        if (!user.value?.id) {
            profile.value = null
            return
        }
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('nickname, grade, storage_used, broadcast_platform, broadcast_id')
                .eq('id', user.value.id)
                .single()
            if (error && error.code !== 'PGRST116') throw error
            profile.value = data
        } catch (error) {
            console.error('프로필 로딩 에러:', error)
            profile.value = null
        }
    }

    // 앱 시작 시 또는 상태 변경 시 사용자 정보를 초기화하는 함수
    function initialize() {
        supabase.auth.onAuthStateChange(async (event, session) => {
            user.value = session?.user ?? null
            await fetchProfile()
        })
    }

    // 로그아웃 함수
    async function signOut() {
        await supabase.auth.signOut()
        user.value = null
        profile.value = null
    }

    return { user, profile, isLoggedIn, initialize, fetchProfile, signOut }
})
