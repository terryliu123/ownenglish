import { useMemo } from 'react'
import { t } from '../../i18n/index'

interface PasswordStrengthIndicatorProps {
  password: string
}

interface PasswordStrengthResult {
  score: number
  label: string
  labelText: string
  color: string
  isValid: boolean
  requirements: {
    minLength: boolean
    uppercase: boolean
    lowercase: boolean
    digit: boolean
    special: boolean
  }
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const requirements = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
  }

  const score = Object.values(requirements).filter(Boolean).length

  const labelMap: Record<number, { label: string; text: string; color: string }> = {
    0: { label: 'very_weak', text: t('passwordStrength.veryWeak'), color: '#dc4444' },
    1: { label: 'weak', text: t('passwordStrength.weak'), color: '#f97316' },
    2: { label: 'fair', text: t('passwordStrength.fair'), color: '#eab308' },
    3: { label: 'strong', text: t('passwordStrength.strong'), color: '#22c55e' },
    4: { label: 'very_strong', text: t('passwordStrength.veryStrong'), color: '#15803d' },
    5: { label: 'very_strong', text: t('passwordStrength.veryStrong'), color: '#15803d' },
  }

  const { label, text, color } = labelMap[score] || labelMap[0]

  return {
    score,
    label,
    labelText: text,
    color,
    isValid: score >= 3,
    requirements,
  }
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => checkPasswordStrength(password), [password])

  if (!password) {
    return (
      <div style={{ marginTop: '8px' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '8px' }}>
          {t('passwordStrength.requirementsHint')}
        </p>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '4px',
                background: 'rgba(24, 36, 58, 0.1)',
                borderRadius: '2px',
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  const requirementList = [
    { key: 'minLength', text: t('passwordStrength.minLength') },
    { key: 'uppercase', text: t('passwordStrength.uppercase') },
    { key: 'lowercase', text: t('passwordStrength.lowercase') },
    { key: 'digit', text: t('passwordStrength.digit') },
    { key: 'special', text: t('passwordStrength.special') },
  ] as const

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '4px',
              background: i < strength.score ? strength.color : 'rgba(24, 36, 58, 0.1)',
              borderRadius: '2px',
              transition: 'background 200ms',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{t('passwordStrength.title')}</span>
        <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 500 }}>
          {strength.labelText}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
        {requirementList.map((req) => {
          const met = strength.requirements[req.key as keyof typeof strength.requirements]
          return (
            <div key={req.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  background: met ? '#22c55e' : 'rgba(24, 36, 58, 0.1)',
                  color: met ? '#fff' : 'var(--muted)',
                }}
              >
                {met ? '✓' : '○'}
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  color: met ? 'var(--ink)' : 'var(--muted)',
                }}
              >
                {req.text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
