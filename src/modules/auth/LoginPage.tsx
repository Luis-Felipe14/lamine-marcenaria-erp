import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowRight, Loader2, Lock, ShieldAlert, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { formatLoginError } from '@/lib/auth-session'
import { fetchSystemBillingStatus } from '@/services/system-billing.service'
import { LoginParticles } from './LoginParticles'
import { LoginSlideshow } from './LoginSlideshow'
import { APP_LOGO } from '@/lib/branding'
import './login.css'

const LOGO_PRIMARY = APP_LOGO.primary
const LOGO_FALLBACK = APP_LOGO.fallback

const loginSchema = z.object({
  username: z.string().min(2, 'Informe seu usuário'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const { signIn, user, profile, loading: authLoading, billingBlockMessage } = useAuth()
  const navigate = useNavigate()
  const [loginLoading, setLoginLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [logoSrc, setLogoSrc] = useState<string>(LOGO_PRIMARY)
  const [systemLockedMessage, setSystemLockedMessage] = useState<string | null>(null)

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  useEffect(() => {
    let mounted = true

    const loadLockNotice = () => {
      void fetchSystemBillingStatus()
        .then((status) => {
          if (!mounted) return
          setSystemLockedMessage(status.locked ? status.message : null)
        })
        .catch(() => {
          if (!mounted) return
          if (billingBlockMessage) {
            setSystemLockedMessage(billingBlockMessage)
          }
        })
    }

    loadLockNotice()
    window.addEventListener('focus', loadLockNotice)

    return () => {
      mounted = false
      window.removeEventListener('focus', loadLockNotice)
    }
  }, [billingBlockMessage])

  useEffect(() => {
    if (billingBlockMessage) {
      setAuthError(billingBlockMessage)
      setSystemLockedMessage((current) => current ?? billingBlockMessage)
    }
  }, [billingBlockMessage])

  useEffect(() => {
    if (!authLoading && user && profile) {
      navigate('/', { replace: true })
    }
  }, [user, profile, authLoading, navigate])

  const onLogin = async (data: LoginFormData) => {
    setLoginLoading(true)
    setAuthError(null)
    try {
      await signIn(data.username.trim(), data.password)
    } catch (err) {
      setAuthError(formatLoginError(err))
    } finally {
      setLoginLoading(false)
    }
  }

  const lockNotice = systemLockedMessage ?? billingBlockMessage

  if (authLoading) {
    return (
      <div className="login-screen">
        <div className="login-screen-vignette" aria-hidden="true" />
        <div className="login-screen-glow" aria-hidden="true" />
        <div className="login-screen-loader">
          <Loader2 className="login-spinner" size={28} strokeWidth={1.5} />
        </div>
      </div>
    )
  }

  return (
    <div className="login-screen">
      <div className="login-screen-vignette" aria-hidden="true" />
      <div className="login-screen-glow" aria-hidden="true" />
      <LoginParticles />

      <div className="login-panel">
        <div className="login-panel-shine" aria-hidden="true" />
        <LoginSlideshow />

        <div className="login-forms-side">
          <section className="login-form-section login-form-section--login">
            <div className="login-form-header">
              <img
                src={logoSrc}
                alt="Laminê"
                className="login-brand-logo"
                onError={() => {
                  if (logoSrc !== LOGO_FALLBACK) setLogoSrc(LOGO_FALLBACK)
                }}
              />
              <h2 className="login-title">Bem-vindo de volta</h2>
            </div>

            {lockNotice && (
              <div className="login-alert login-alert--warning" role="status">
                <ShieldAlert size={15} strokeWidth={1.75} aria-hidden="true" />
                <span>{lockNotice}</span>
              </div>
            )}

            {authError && authError !== lockNotice && (
              <div className="login-alert login-alert--error" role="alert">
                <AlertCircle size={15} strokeWidth={1.75} aria-hidden="true" />
                <span>{authError}</span>
              </div>
            )}

            <form className="login-form" onSubmit={loginForm.handleSubmit(onLogin)} noValidate>
              <div className="login-field">
                <div className="login-input-wrap">
                  <User className="login-input-icon" size={16} strokeWidth={1.75} aria-hidden="true" />
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="Usuário"
                    {...loginForm.register('username')}
                  />
                </div>
                {loginForm.formState.errors.username && (
                  <p className="login-field-error">{loginForm.formState.errors.username.message}</p>
                )}
              </div>

              <div className="login-field">
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" size={16} strokeWidth={1.75} aria-hidden="true" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Senha"
                    {...loginForm.register('password')}
                  />
                </div>
                {loginForm.formState.errors.password && (
                  <p className="login-field-error">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="login-btn-spinner" size={16} strokeWidth={2} aria-hidden="true" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </div>

      <footer className="login-footer">
        <p>© 2026 Laminê ERP</p>
        <p>Sistema desenvolvido exclusivamente para a Laminê Marcenaria &amp; Interiores.</p>
        <p className="login-footer-developer">
          Desenvolvido por{' '}
          <a href="https://eliustecnologia.com.br" target="_blank" rel="noopener noreferrer">
            Elius Tecnologia
          </a>
        </p>
      </footer>
    </div>
  )
}
