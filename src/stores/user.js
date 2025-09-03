import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase' // ✅ 경로 수정

export const useUserStore = defineStore('user', () => {
    const user = ref(null)
    const profile = ref(null)

    const isLoggedIn = computed(() => !!user.value)

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

            // PGRST116 = row not found
            if (error && error.code !== 'PGRST116') throw error
            profile.value = data ?? null
        } catch (error) {
            console.error('프로필 로딩 에러:', error)
            profile.value = null
        }
    }

    function initialize() {
        // 앱 시작 후 세션 변동을 항상 반영
        supabase.auth.onAuthStateChange(async (_event, session) => {
            user.value = session?.user ?? null
            await fetchProfile()
        })
        // 새로고침 직후에도 한번 채움
        supabase.auth.getSession().then(async ({ data }) => {
            user.value = data?.session?.user ?? null
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