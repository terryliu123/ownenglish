import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../i18n/useTranslation'
import { api } from '../../services/api'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.post('/auth/login', { email_or_username: email, password })
      const { access_token, refresh_token } = response.data
      localStorage.setItem('token', access_token)
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token)
      const me = await api.get('/auth/me')
      if (me.data.role !== 'admin') {
        setError(t('adminUi.login.notAdmin'))
        return
      }
      navigate('/admin')
    } catch (err: any) {
      setError(err.response?.data?.detail || t('adminUi.login.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t('adminUi.login.title')}</h1>
          <p className="text-slate-400">{t('adminUi.login.subtitle')}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{error}</div>}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('adminUi.login.emailPlaceholder')}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('adminUi.login.passwordPlaceholder')}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('adminUi.login.submitting') : t('adminUi.login.submit')}
          </button>
        </form>
        <div className="mt-6 text-center">
          <a href="/login" className="text-slate-400 hover:text-white text-sm">{t('adminUi.login.backToUserLogin')}</a>
        </div>
      </div>
    </div>
  )
}
