import { useEffect, useRef } from 'react'
import { resolveLoginEmail } from '@/lib/auth-username'
import {
  BillingAccessDeniedError,
  loadAuthenticatedProfile,
} from '@/lib/auth-session'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@supabase/supabase-js'

async function clearBlockedSession(
  message: string,
  setBillingBlockMessage: (value: string | null) => void,
  clearAuth: () => void,
) {
  setBillingBlockMessage(message)
  await supabase.auth.signOut()
  clearAuth()
}

export function useAuth() {
  const signInInProgress = useRef(false)
  const {
    user,
    profile,
    loading,
    billingBlockMessage,
    setUser,
    setProfile,
    setLoading,
    setBillingBlockMessage,
    reset,
  } = useAuthStore()

  useEffect(() => {
    let mounted = true

    const clearAuth = () => {
      setUser(null)
      setProfile(null)
    }

    async function applyAuthenticatedSession(sessionUser: User) {
      const profileData = await loadAuthenticatedProfile(sessionUser.id)
      if (!mounted) return
      setUser(sessionUser)
      setProfile(profileData)
      setBillingBlockMessage(null)
    }

    async function restoreSession(sessionUser: User) {
      try {
        await applyAuthenticatedSession(sessionUser)
      } catch (error) {
        if (!mounted) return
        if (error instanceof BillingAccessDeniedError) {
          await clearBlockedSession(error.message, setBillingBlockMessage, clearAuth)
          return
        }
        clearAuth()
      }
    }

    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      if (session?.user) {
        await restoreSession(session.user)
      } else {
        clearAuth()
      }

      if (mounted) setLoading(false)
    }

    void initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT' || !session?.user) {
        clearAuth()
        if (mounted) setLoading(false)
        return
      }

      if (event === 'SIGNED_IN') {
        if (signInInProgress.current) return

        try {
          await applyAuthenticatedSession(session.user)
        } catch (error) {
          if (!mounted) return
          if (error instanceof BillingAccessDeniedError) {
            await clearBlockedSession(error.message, setBillingBlockMessage, clearAuth)
          } else {
            if (error instanceof Error && error.message) {
              setBillingBlockMessage(error.message)
            }
            clearAuth()
          }
        }
      }

      if (mounted) setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setUser, setProfile, setLoading, setBillingBlockMessage])

  const signIn = async (identifier: string, password: string) => {
    signInInProgress.current = true
    setLoading(true)

    try {
      const email = resolveLoginEmail(identifier)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const sessionUser = data.session?.user ?? data.user
      if (!sessionUser) return

      const profileData = await loadAuthenticatedProfile(sessionUser.id)
      setUser(sessionUser)
      setProfile(profileData)
      setBillingBlockMessage(null)
    } catch (error) {
      if (error instanceof BillingAccessDeniedError) {
        await clearBlockedSession(error.message, setBillingBlockMessage, () => {
          setUser(null)
          setProfile(null)
        })
      } else {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        if (error instanceof Error && error.message) {
          setBillingBlockMessage(error.message)
        }
      }
      throw error
    } finally {
      signInInProgress.current = false
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    reset()
  }

  return { user, profile, loading, billingBlockMessage, signIn, signOut }
}
