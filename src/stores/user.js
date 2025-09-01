import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient' // 경로 확인

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
                .select('nickname, grade, storage_used')
                .eq('id', user.value.id)
                .single()
            if (error) throw error
            profile.value = data
        } catch (error) {
            console.error('프로필 로딩 에러:', error)
            profile.value = null
        }
    }

    async function initialize() {
        const { data: { session } } = await supabase.auth.getSession()
        user.value = session?.user ?? null
        if (user.value) {
            await fetchProfile()
        }

        supabase.auth.onAuthStateChange(async (event, session) => {
            user.value = session?.user ?? null
            await fetchProfile()
        })
    }

    async function signOut() {
        await supabase.auth.signOut()
        user.value = null
        profile.value = null
    }

    return { user, profile, isLoggedIn, initialize, fetchProfile, signOut }
})