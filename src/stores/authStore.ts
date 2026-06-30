import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  billingBlockMessage: string | null
  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  setBillingBlockMessage: (message: string | null) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  billingBlockMessage: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setBillingBlockMessage: (billingBlockMessage) => set({ billingBlockMessage }),
  reset: () => set({ user: null, profile: null, loading: false }),
}))
