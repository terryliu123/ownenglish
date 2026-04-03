import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from '../../i18n/useTranslation'
import { authService } from '../../services/api'
import { useAppStore } from '../../stores/app-store'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, setToken } = useAppStore()
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const inviteCodeFromUrl = searchParams.get('invite_code')
    if (!inviteCodeFromUrl) {
      localStorage.removeItem('pending_invite_code')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await authService.login(formData.emailOrUsername, formData.password)
      setToken(data.access_token)
      localStorage.setItem('token', data.access_token)
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)

      const userData = await authService.getMe()
      setUser(userData)
      const normalizedRole = String(userData.role || '').toLowerCase()

      const inviteCodeFromUrl = searchParams.get('invite_code')
      if (normalizedRole === 'student' && inviteCodeFromUrl) {
        navigate(`/join?invite_code=${encodeURIComponent(inviteCodeFromUrl)}`)
      } else {
        navigate(normalizedRole === 'teacher' ? '/teacher' : '/student')
      }
    } catch (err: any) {
      const status = err.response?.status
      const detail = err.response?.data?.detail || t('auth.loginError')
      setError(status === 429 ? t('auth.tooManyFailedAttempts') : detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="surface-card" style={{ width: '100%', maxWidth: '400px', padding: '40px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/logo.png" alt="胖鼠互动课堂系统" style={{ width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px', display: 'block' }} />
          <h1
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              marginBottom: '4px',
              color: 'var(--ink)',
              fontFamily: 'Noto Sans SC, sans-serif',
              letterSpacing: '-0.01em',
            }}
          >
            胖鼠互动课堂系统
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(220, 68, 68, 0.08)',
              border: '1px solid rgba(220, 68, 68, 0.2)',
              color: 'var(--danger)',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--muted)',
                marginBottom: '6px',
              }}
            >
              {t('miscUi.auth.emailOrUsernameLabel')}
            </label>
            <input
              type="text"
              value={formData.emailOrUsername}
              onChange={(e) => setFormData({ ...formData, emailOrUsername: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(24, 36, 58, 0.1)',
                background: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9375rem',
                outline: 'none',
                transition: 'border-color 200ms, box-shadow 200ms',
              }}
              placeholder={t('miscUi.auth.emailOrUsernamePlaceholder')}
              required
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(30, 58, 95, 0.3)'
                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.08)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(24, 36, 58, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--muted)',
                marginBottom: '6px',
              }}
            >
              {t('form.password')}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(24, 36, 58, 0.1)',
                background: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9375rem',
                outline: 'none',
                transition: 'border-color 200ms, box-shadow 200ms',
              }}
              placeholder={t('miscUi.auth.passwordPlaceholder')}
              required
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(30, 58, 95, 0.3)'
                e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.08)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(24, 36, 58, 0.1)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <button type="submit" disabled={loading} className="solid-button wide-button" style={{ marginTop: '8px' }}>
            {loading ? t('form.loggingIn') : t('auth.login')}
          </button>

          <div style={{ textAlign: 'right', marginTop: '-8px' }}>
            <a href="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--navy)', textDecoration: 'underline' }}>
              {t('auth.forgotPassword')}
            </a>
          </div>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--muted)' }}>
          {t('auth.noAccount')}{' '}
          <a href="/register" style={{ color: 'var(--navy)', fontWeight: 600 }}>
            {t('auth.registerNow')}
          </a>
        </p>
      </div>
    </div>
  )
}
