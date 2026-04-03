import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../../services/api'
import { useTranslation } from '../../i18n/useTranslation'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(24, 36, 58, 0.1)',
    background: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.9375rem',
    outline: 'none',
    transition: 'border-color 200ms, box-shadow 200ms',
  } as React.CSSProperties

  if (success) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="surface-card" style={{ width: '100%', maxWidth: '400px', padding: '32px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px' }}>
            ✓
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--ink)' }}>
            {t('auth.resetPassword')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            {t('auth.resetPasswordEmailSent')}
          </p>
          <Link to="/login" className="solid-button wide-button" style={{ display: 'block', textAlign: 'center' }}>
            {t('auth.login')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="surface-card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px', color: 'var(--ink)', fontFamily: 'Fraunces, Georgia, serif' }}>
          {t('auth.resetPassword')}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '24px' }}>
          {t('auth.resetPasswordLinkDesc')}
        </p>

        {error && (
          <div style={{ background: 'rgba(220, 68, 68, 0.08)', border: '1px solid rgba(220, 68, 68, 0.2)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--muted)', marginBottom: '6px' }}>
              {t('form.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="your@email.com"
              required
              onFocus={(e) => { e.target.style.borderColor = 'rgba(30, 58, 95, 0.3)'; e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.08)' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(24, 36, 58, 0.1)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="solid-button wide-button"
          >
            {loading ? t('common.loading') : t('auth.resetPassword')}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--muted)' }}>
          <Link to="/login" style={{ color: 'var(--navy)', fontWeight: 600 }}>{t('auth.loginNow')}</Link>
        </p>
      </div>
    </div>
  )
}
