import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { useTranslation } from '../../i18n/useTranslation'
import { classService } from '../../services/api'
import { useAppStore } from '../../stores/app-store'

function GuestBanner({ expiresAt }: { expiresAt: string }) {
  const { t } = useTranslation()
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now()
      const expires = new Date(expiresAt).getTime()
      const diff = expires - now

      if (diff <= 0) {
        setTimeLeft('0:00')
        return
      }

      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `${minutes}m`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 30000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏰</span>
          <div>
            <p className="text-sm font-medium text-amber-800">{t('class.guestBannerTitle')}</p>
            <p className="text-xs text-amber-600">{t('class.guestBannerDesc')}</p>
          </div>
        </div>
        <div className="text-amber-700 font-bold text-lg tabular-nums">{timeLeft}</div>
      </div>
    </div>
  )
}

export default function StudentHome() {
  const { t, tWithParams } = useTranslation()
  const { user, token, isGuest, expiresAt } = useAppStore()
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!user || !token) {
      setLoading(false)
      return
    }
    loadData()
  }, [user, token])

  async function loadData() {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      const classesData = await classService.getAll()
      setClasses(classesData)
      if (classesData.length > 0) {
        localStorage.setItem('last_student_class_id', classesData[0].id)
      }
    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return t('studentHome.morningGreeting')
    if (hour < 18) return t('studentHome.afternoonGreeting')
    return t('studentHome.eveningGreeting')
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-600">{t('common.loading')}</span>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        {isGuest && expiresAt && <GuestBanner expiresAt={expiresAt} />}

        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="max-w-lg mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/60 text-sm mb-1">{getGreeting()}</p>
                <h1 className="text-2xl font-bold">{user?.name || t('studentHome.classmate')}</h1>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl">
                👤
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-3">
                <div className="text-2xl font-bold">{classes.length}</div>
                <div className="text-xs text-white/60">{t('studentHome.myClasses')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <section>
            <Link
              to="/student/live"
              className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">🎯</div>
              <div>
                <div className="font-semibold text-lg">{t('studentHome.classroomTasks')}</div>
                <div className="text-sm text-blue-100">{t('studentHome.realtimeAnswer')}</div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
            </Link>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{t('studentHome.myClasses')}</h2>
              <Link to="/join" className="text-sm text-blue-600 hover:text-blue-700">
                + {t('studentHome.joinClass')}
              </Link>
            </div>

            {classes.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mx-auto mb-3">🏫</div>
                <p className="text-slate-500 text-sm mb-3">{t('studentHome.noClassYet')}</p>
                <Link to="/join" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
                  {t('studentHome.enterCode')}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {classes.map((cls) => (
                  <div key={cls.id} className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                        {cls.name?.charAt(0) || 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{cls.name}</h3>
                        <p className="text-xs text-slate-500">{t('studentHome.teacher')}: {cls.teacher?.name || t('studentHome.unknown')}</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm(tWithParams('studentHome.leaveConfirm', { name: cls.name }))) {
                            try {
                              await classService.leave(cls.id)
                              loadData()
                            } catch (e: any) {
                              alert(e.response?.data?.detail || t('studentHome.leaveFailed'))
                            }
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {!isGuest && (
            <section className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm">💡</div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">{t('studentHome.learningTip')}</h4>
                  <p className="text-xs text-slate-600">{t('student.practiceTip')}</p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  )
}
