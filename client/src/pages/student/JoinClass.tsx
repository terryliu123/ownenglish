import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from '../../i18n/useTranslation'
import { classService } from '../../services/api'
import { useAppStore } from '../../stores/app-store'

export default function JoinClass() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAppStore()

  const [code, setCode] = useState('')
  const [studentIdNumber, setStudentIdNumber] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [mode, setMode] = useState<'login' | 'guest'>('login')

  useEffect(() => {
    const queryCode = (searchParams.get('invite_code') || '').trim().toUpperCase()
    const pendingCode = (localStorage.getItem('pending_invite_code') || '').trim().toUpperCase()

    if (queryCode) {
      setCode(queryCode)
      localStorage.setItem('pending_invite_code', queryCode)
    } else if (pendingCode) {
      setCode(pendingCode)
    }

    if (searchParams.get('expired') === '1') {
      setError(t('class.guestExpired'))
    }

    if (!user) {
      setMode('guest')
    }
  }, [searchParams, user, t])

  function getJoinErrorMessage(err: any, fallback: string) {
    const errorData = err.response?.data?.detail
    if (typeof errorData === 'string') {
      if (errorData.includes('full') || errorData.includes('60')) {
        return t('class.classFull')
      }
      return errorData
    }
    if (Array.isArray(errorData) && errorData.length > 0) {
      return errorData.map((entry: any) => `${entry.loc?.join('.')}: ${entry.msg}`).join(', ')
    }
    if (errorData?.message) {
      return errorData.message
    }
    if (errorData?.msg) {
      return errorData.msg
    }
    if (err.response?.data?.message) {
      return err.response.data.message
    }
    return fallback
  }

  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const result = await classService.guestJoin({
        invite_code: code.toUpperCase(),
        student_id_number: studentIdNumber.trim(),
        name: name.trim(),
      })

      localStorage.setItem('token', result.access_token)
      if (result.refresh_token) localStorage.setItem('refresh_token', result.refresh_token)
      localStorage.setItem('guest_expires_at', result.expires_at)
      localStorage.setItem('was_guest', 'true')
      localStorage.removeItem('pending_invite_code')

      useAppStore.getState().setToken(result.access_token)
      useAppStore.getState().setUser(result.user)

      setSuccess(true)
      setTimeout(() => {
        navigate('/student')
      }, 1500)
    } catch (err: any) {
      setError(getJoinErrorMessage(err, t('class.joinError')))
    }
  }

  const handleLoginJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await classService.joinByCode(code.toUpperCase())
      localStorage.removeItem('pending_invite_code')
      setSuccess(true)
      setTimeout(() => {
        navigate('/student/live')
      }, 2000)
    } catch (err: any) {
      const msg = getJoinErrorMessage(err, t('class.joinError'))
      if (/already enrolled|已加入|已在班级中/i.test(msg)) {
        localStorage.removeItem('pending_invite_code')
        setSuccess(true)
        setTimeout(() => {
          navigate('/student/live')
        }, 1000)
        return
      }
      setError(msg)
    }
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="card p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green/10 flex items-center justify-center">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">{t('class.joinSuccess')}</h1>
          <p className="text-muted">{t('class.joinRedirect')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-display font-bold mb-2">{t('class.joinTitle')}</h1>
          <p className="text-muted">{t('class.joinPlaceholder')}</p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {user ? (
          <form onSubmit={handleLoginJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">{t('class.inviteCodeInput')}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-lg border border-line bg-paper focus:outline-none focus:ring-2 focus:ring-navy/20 text-center text-2xl tracking-widest uppercase"
                placeholder={t('class.enterCodeHint')}
                maxLength={8}
                required
              />
            </div>
            <button type="submit" className="w-full btn-primary py-3">
              {t('class.joinButton')}
            </button>
          </form>
        ) : (
          <>
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => setMode('guest')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'guest' ? 'bg-white shadow text-navy' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('class.guestJoin')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  navigate('/login')
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'login' ? 'bg-white shadow text-navy' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('class.loginToJoin')}
              </button>
            </div>

            {mode === 'guest' ? (
              <form onSubmit={handleGuestJoin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">{t('class.inviteCodeInput')}</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-lg border border-line bg-paper focus:outline-none focus:ring-2 focus:ring-navy/20 text-center text-2xl tracking-widest uppercase"
                    placeholder={t('class.enterCodeHint')}
                    maxLength={8}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">{t('class.studentIdNumber')}</label>
                  <input
                    type="text"
                    value={studentIdNumber}
                    onChange={(e) => setStudentIdNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-line bg-paper focus:outline-none focus:ring-2 focus:ring-navy/20"
                    placeholder={t('class.studentIdPlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">{t('form.name')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-line bg-paper focus:outline-none focus:ring-2 focus:ring-navy/20"
                    placeholder={t('class.namePlaceholder')}
                    required
                  />
                </div>
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
                  {t('class.guestWarning')}
                </div>
                <button
                  type="submit"
                  className="w-full btn-primary py-3"
                  disabled={!code || !studentIdNumber.trim() || !name.trim()}
                >
                  {t('class.joinButton')}
                </button>
              </form>
            ) : (
              <div className="text-center py-8 text-muted">{t('auth.loginTitle')}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
