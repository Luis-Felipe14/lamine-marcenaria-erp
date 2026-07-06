import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { isSystemAdminProfile } from '@/lib/system-admin'
import { fetchSystemBillingStatus } from '@/services/system-billing.service'
import { useAuthStore } from '@/stores/authStore'

type BillingAccessState = 'pending' | 'allowed' | 'denied'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth()
  const setBillingBlockMessage = useAuthStore((s) => s.setBillingBlockMessage)
  const [billingAccess, setBillingAccess] = useState<BillingAccessState>('pending')
  const profileId = profile?.id
  const systemAdmin = isSystemAdminProfile(profile)

  useEffect(() => {
    if (!profileId) {
      setBillingAccess('pending')
      return
    }

    if (systemAdmin) {
      setBillingAccess('allowed')
      return
    }

    let cancelled = false

    const verifyBillingAccess = async () => {
      try {
        const status = await fetchSystemBillingStatus()
        if (cancelled) return

        if (status.locked) {
          setBillingAccess('denied')
          setBillingBlockMessage(status.message)
          await signOut()
          return
        }

        setBillingAccess('allowed')
      } catch {
        if (!cancelled) setBillingAccess('allowed')
      }
    }

    setBillingAccess('pending')
    void verifyBillingAccess()
    window.addEventListener('focus', verifyBillingAccess)

    return () => {
      cancelled = true
      window.removeEventListener('focus', verifyBillingAccess)
    }
  }, [profileId, systemAdmin, signOut, setBillingBlockMessage])

  const waitingBillingCheck =
    profileId != null && !systemAdmin && billingAccess === 'pending'

  if (loading || waitingBillingCheck) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    )
  }

  if (!user || !profile || billingAccess === 'denied') {
    return <Navigate to="/login" replace />
  }

  if (!profile.is_active) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold text-white">Conta desativada</h1>
        <p className="text-gray-400">Entre em contato com o administrador do sistema.</p>
        <Button onClick={() => signOut()}>Sair</Button>
      </div>
    )
  }

  return <>{children}</>
}
