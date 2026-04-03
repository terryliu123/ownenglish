import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { authService } from '../../services/api'
import { useTranslation } from '../../i18n/useTranslation'

export default function ResetPassword() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }

    if (newPassword.length < 6) {
      setError(t('settings.passwordTooShort'))
      return
    }

    setLoading(true)
    try {
      if (token) {
        // Reset via email link token
        await authService.resetPassword(token, newPassword)
      } else {
        // Reset via temp password - need to login first to verify temp password, then change
        // Actually, for temp password flow, user logs in with temp password then goes to settings
        // But here we can support both: if token provided, use token; otherwise use temp password + new password
        setError('Invalid reset flow')
        return
      }
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('settings.changePasswordFailed'))
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
            {t('auth.changePasswordSuccess')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '24px' }}>
            {t('auth.resetPasswordSuccess')}
          </p>
          <Link to="/login" className="solid-button wide-button" style={{ display: 'block', textAlign: 'center' }}>
            {t('auth.login')}
          </Link>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="surface-card" style={{ width: '100%', maxWidth: '400px', padding: '32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: 'var(--ink)' }}>
            {t('auth.resetPassword')}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '24px' }}>
            Invalid or expired reset link. Please request a new password reset.
          </p>
          <Link to="/forgot-password" className="solid-button wide-button" style={{ display: 'block', textAlign: 'center' }}>
            {t('auth.forgotPassword')}
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
              {t('auth.newPassword')}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
              placeholder={t('auth.enterNewPassword')}
              minLength={6}
              required
              onFocus={(e) => { e.target.style.borderColor = 'rgba(30, 58, 95, 0.3)'; e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.08)' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(24, 36, 58, 0.1)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--muted)', marginBottom: '6px' }}>
              {t('form.confirmPassword')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
              placeholder={t('form.confirmPasswordPlaceholder')}
              minLength={6}
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
      </div>
    </div>
  )
}
