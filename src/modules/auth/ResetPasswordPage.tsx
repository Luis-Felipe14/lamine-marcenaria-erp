import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { APP_LOGO } from '@/lib/branding'
import '@/modules/auth/login.css'

function parseHashError(hash: string): string | null {
  if (!hash || !hash.includes('error=')) return null
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const description = params.get('error_description')
  if (description) return description.replace(/\+/g, ' ')
  const code = params.get('error_code')
  if (code === 'otp_expired') return 'O link expirou. Solicite um novo e-mail de redefinição no Supabase.'
  return params.get('error') ?? 'Não foi possível validar o link de redefinição.'
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const hashError = parseHashError(window.location.hash)
    if (hashError) {
      setError(hashError)
      setChecking(false)
      return
    }

    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
        setError(null)
        setChecking(false)
      }
    })

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session) {
        setReady(true)
        setError(null)
      }
      setChecking(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('As senhas não conferem')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      toast.success('Senha redefinida com sucesso!')
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-screen-vignette" aria-hidden="true" />
      <div className="login-screen-glow" aria-hidden="true" />

      <div className="login-panel" style={{ maxWidth: 420, margin: '0 auto' }}>
        <div className="login-forms-side" style={{ width: '100%' }}>
          <section className="login-form-section login-form-section--login">
            <div className="login-form-header">
              <img src={APP_LOGO.primary} alt="Laminê" className="login-brand-logo" />
              <h2 className="login-title">Nova senha</h2>
              <p className="text-sm text-gray-400 mt-2">
                Defina uma nova senha para concluir a recuperação de acesso.
              </p>
            </div>

            {checking && (
              <div className="flex justify-center py-8">
                <Loader2 className="login-spinner animate-spin" size={28} />
              </div>
            )}

            {!checking && error && (
              <div className="login-alert login-alert--error" role="alert">
                <AlertCircle size={15} strokeWidth={1.75} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {!checking && ready && (
              <form className="login-form" onSubmit={onSubmit} noValidate>
                <div className="login-field">
                  <div className="login-input-wrap">
                    <Lock className="login-input-icon" size={16} strokeWidth={1.75} aria-hidden="true" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Nova senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="login-field">
                  <div className="login-input-wrap">
                    <Lock className="login-input-icon" size={16} strokeWidth={1.75} aria-hidden="true" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Confirmar nova senha"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="login-btn" disabled={submitting}>
                  {submitting ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </form>
            )}

            <Link to="/login" className="mt-4 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gold">
              <ArrowLeft size={14} />
              Voltar ao login
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}
