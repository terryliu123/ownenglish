import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { useAppStore } from '../stores/app-store'
import { useTranslation } from '../i18n/useTranslation'

export default function Settings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout, isGuest } = useAppStore()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordMismatch'))
      return
    }

    if (newPassword.length < 6) {
      setError(t('settings.passwordTooShort'))
      return
    }

    setLoading(true)
    try {
      await authService.changePassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError(t('settings.changePasswordFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-slate-900">{t('settings.title')}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        {/* Account Info */}
        <section className="mb-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {t('settings.accountInfo')}
          </h2>
          <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-slate-500">{t('settings.name')}</span>
              <span className="text-sm font-medium text-slate-900">{user?.name}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-slate-500">{t('settings.email')}</span>
              <span className="text-sm font-medium text-slate-900">{user?.email || '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-slate-500">{t('settings.role')}</span>
              <span className="text-sm font-medium text-slate-900">
                {user?.role === 'teacher' ? t('settings.teacher') : t('settings.student')}
              </span>
            </div>
          </div>
        </section>

        {/* Change Password */}
        {user?.role === 'teacher' && (
          <section className="mb-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t('membership.title')}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/teacher/membership')}
              className="w-full bg-white rounded-xl border border-slate-100 px-4 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{t('membership.currentPlan')}</p>
                  <p className="text-xs text-slate-500">{t('membership.settingsEntryDescription')}</p>
                </div>
                <span className="text-slate-400">›</span>
              </div>
            </button>
          </section>
        )}

        {/* Change Password */}
        {!isGuest ? (
          <section className="mb-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t('settings.changePassword')}
            </h2>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                    {t('settings.passwordChanged')}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('settings.currentPassword')}
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('settings.enterCurrentPassword')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('settings.newPassword')}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('settings.enterNewPassword')}
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('settings.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('settings.confirmNewPassword')}
                    minLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full solid-button py-3"
                  disabled={loading}
                >
                  {loading ? t('common.loading') : t('settings.updatePassword')}
                </button>
              </form>
            </div>
          </section>
        ) : (
          <section className="mb-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t('settings.changePassword')}
            </h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              {t('settings.guestCannotChangePassword')}
            </div>
          </section>
        )}

        {/* Logout */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {t('settings.dangerZone')}
          </h2>
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-white border border-red-200 text-red-600 rounded-xl font-medium
                     hover:bg-red-50 transition-colors"
          >
            {t('settings.logout')}
          </button>
        </section>
      </div>
    </div>
  )
}
