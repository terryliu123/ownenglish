import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService, type RegisterData } from '../../services/api'
import { useTranslation } from '../../i18n/useTranslation'
import { PasswordStrengthIndicator } from '../../components/auth/PasswordStrengthIndicator'

type RegisterStep = 'form' | 'verify'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [step, setStep] = useState<RegisterStep>('form')
  const [formData, setFormData] = useState<RegisterData & { confirmPassword: string }>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'student',
  })
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleSendCode = async () => {
    setError('')
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setLoading(true)
    try {
      await authService.sendVerificationCode(formData.email, 'register')
      setSuccess(t('auth.verifyCodeSent'))
      setCountdown(300) // 5 minutes
      setStep('verify')
    } catch (err: any) {
      setError(err.response?.data?.detail || t('auth.registerError'))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.verifyCode(formData.email, code, 'register')
      await authService.register(formData)
      navigate('/login')
    } catch (err: any) {
      setError(err.response?.data?.detail || t('auth.registerError'))
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (countdown > 0) return
    setError('')
    setLoading(true)
    try {
      await authService.sendVerificationCode(formData.email, 'register')
      setSuccess(t('auth.verifyCodeSent'))
      setCountdown(300)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('auth.registerError'))
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(24, 36, 58, 0.1)',
    background: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 200ms, box-shadow 200ms',
  } as React.CSSProperties

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--muted)',
    marginBottom: '4px',
  }

  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(30, 58, 95, 0.3)'
    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.08)'
  }

  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(24, 36, 58, 0.1)'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', overflow: 'auto' }}>
      <div className="surface-card" style={{ width: '100%', maxWidth: '380px', padding: '24px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img src="/logo.png" alt="胖鼠互动课堂系统" style={{ width: 48, height: 48, borderRadius: 12, margin: '0 auto 10px', display: 'block' }} />
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '2px', color: 'var(--ink)', fontFamily: 'Noto Sans SC, sans-serif', letterSpacing: '-0.01em' }}>
            胖鼠互动课堂系统
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            {t('auth.registerSubtitle')}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(220, 68, 68, 0.08)', border: '1px solid rgba(220, 68, 68, 0.2)', color: 'var(--danger)', padding: '8px 12px', borderRadius: '10px', marginBottom: '12px', fontSize: '0.8125rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#15803d', padding: '8px 12px', borderRadius: '10px', marginBottom: '12px', fontSize: '0.8125rem' }}>
            {success}
          </div>
        )}

        {step === 'form' ? (
          <form onSubmit={(e) => { e.preventDefault(); handleSendCode(); }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={labelStyle}>{t('form.name')}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={inputStyle}
                placeholder={t('form.namePlaceholder')}
                required
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>

            <div>
              <label style={labelStyle}>{t('form.email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={inputStyle}
                placeholder={t('form.emailPlaceholder')}
                required
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>推荐使用 QQ 邮箱，便于接收验证码</p>
            </div>

            <div>
              <label style={labelStyle}>{t('form.username')}</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                style={inputStyle}
                placeholder={t('form.usernamePlaceholder')}
                minLength={2}
                maxLength={50}
                required
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>

            <div>
              <label style={labelStyle}>{t('form.password')}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={inputStyle}
                placeholder={t('form.passwordPlaceholder')}
                minLength={8}
                required
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
              <PasswordStrengthIndicator password={formData.password} />
            </div>

            <div>
              <label style={labelStyle}>{t('form.confirmPassword')}</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                style={inputStyle}
                placeholder={t('form.confirmPasswordPlaceholder')}
                minLength={6}
                required
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: '6px' }}>{t('form.roleLabel')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'teacher' })}
                  style={{
                    padding: '8px',
                    borderRadius: '10px',
                    border: `1px solid ${formData.role === 'teacher' ? 'var(--navy)' : 'rgba(24, 36, 58, 0.1)'}`,
                    background: formData.role === 'teacher' ? 'var(--navy)' : 'rgba(255, 255, 255, 0.8)',
                    color: formData.role === 'teacher' ? '#fff' : 'var(--muted)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                >
                  {t('roles.teacher')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'student' })}
                  style={{
                    padding: '8px',
                    borderRadius: '10px',
                    border: `1px solid ${formData.role === 'student' ? 'var(--navy)' : 'rgba(24, 36, 58, 0.1)'}`,
                    background: formData.role === 'student' ? 'var(--navy)' : 'rgba(255, 255, 255, 0.8)',
                    color: formData.role === 'student' ? '#fff' : 'var(--muted)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                >
                  {t('roles.student')}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="solid-button wide-button"
              style={{ marginTop: '4px' }}
            >
              {loading ? t('form.registering') : t('auth.sendVerifyCode')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="text-center mb-1">
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '4px' }}>
                {t('auth.verifyCodeSent')}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{formData.email}</p>
            </div>

            <div>
              <label style={labelStyle}>{t('auth.enterVerifyCode')}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ ...inputStyle, textAlign: 'center', fontSize: '1.25rem', letterSpacing: '6px', fontFamily: 'monospace' }}
                placeholder={t('auth.verifyCodePlaceholder')}
                maxLength={6}
                required
                autoFocus
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="solid-button wide-button"
            >
              {loading ? t('form.registering') : t('auth.register')}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.75rem' }}>
              {countdown > 0 ? (
                <span style={{ color: 'var(--muted)' }}>
                  {t('auth.resendCountdown', { count: String(countdown) })}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  style={{ background: 'none', border: 'none', color: 'var(--navy)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                >
                  {t('auth.resendCode')}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => { setStep('form'); setCode(''); setSuccess(''); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              ← {t('common.back')}
            </button>
          </form>
        )}

        <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--muted)' }}>
          {t('auth.haveAccount')}{' '}
          <a href="/login" style={{ color: 'var(--navy)', fontWeight: 600 }}>
            {t('auth.loginNow')}
          </a>
        </p>
      </div>
    </div>
  )
}
