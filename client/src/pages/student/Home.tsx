import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { classService } from '../../services/api'
import { useAppStore } from '../../stores/app-store'

type StudentClassSummary = {
  id: string
  name: string
  teacher?: { name?: string | null } | null
}

function formatGuestRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return '0 分钟'
  const totalMinutes = Math.ceil(diff / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes} 分钟`
  return `${hours} 小时 ${minutes} 分钟`
}

function GuestBanner({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => formatGuestRemaining(expiresAt))

  useEffect(() => {
    const update = () => setRemaining(formatGuestRemaining(expiresAt))
    update()
    const timer = window.setInterval(update, 30000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  return (
    <div className="student-panel">
      <div className="student-panel-body flex items-center justify-between gap-4 bg-amber-50/80">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">游客身份已启用</p>
            <p className="text-sm text-amber-700">请尽快登录正式账号，避免课堂记录和进度丢失。</p>
          </div>
        </div>
        <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm">
          剩余 {remaining}
        </div>
      </div>
    </div>
  )
}

export default function StudentHome() {
  const { user, token, isGuest, expiresAt } = useAppStore()
  const [classes, setClasses] = useState<StudentClassSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!user || !token) {
      setLoading(false)
      return
    }
    void loadClasses()
  }, [user, token])

  async function loadClasses() {
    try {
      const allClasses = await classService.getAll()
      setClasses(allClasses)
      if (allClasses.length > 0) {
        localStorage.setItem('last_student_class_id', allClasses[0].id)
      }
    } catch (error) {
      console.error('Failed to load classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const greeting = useMemo(() => {
    const hour = currentTime.getHours()
    if (hour < 12) return '上午好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }, [currentTime])

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded-full bg-white/80 px-5 py-3 shadow-sm">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--navy)] border-t-transparent" />
            <span className="text-sm font-medium text-[var(--muted)]">正在加载课堂信息…</span>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="student-page">
        <div className="student-page-shell">
          {isGuest && expiresAt ? <GuestBanner expiresAt={expiresAt} /> : null}

          <section className="student-hero">
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow !mb-2 !text-white/70">{greeting}</p>
                  <h1 className="text-3xl font-semibold !text-white">{user?.name || '同学'}</h1>
                  <p className="mt-2 max-w-xl text-sm text-white/80">
                    这里是你的课堂入口。进入课堂作答、查看已加入班级和继续今天的学习，都从这里开始。
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/14 text-white shadow-lg backdrop-blur">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 20.055a12.083 12.083 0 01-6.16-9.477L12 14z" />
                  </svg>
                </div>
              </div>

              <div className="student-count-grid">
                <div className="student-count-tile">
                  <div className="text-2xl font-bold text-white">{classes.length}</div>
                  <div className="mt-1 text-xs text-white/70">已加入班级</div>
                </div>
                <div className="student-count-tile">
                  <div className="text-2xl font-bold text-white">{currentTime.getHours().toString().padStart(2, '0')}:{currentTime.getMinutes().toString().padStart(2, '0')}</div>
                  <div className="mt-1 text-xs text-white/70">当前时间</div>
                </div>
              </div>
            </div>
          </section>

          <Link to="/student/live" className="student-feature-link">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/18">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 19h8a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">进入课堂任务</div>
              <div className="mt-1 text-sm text-blue-100">接收老师发布的任务、挑战和课堂互动。</div>
            </div>
            <div className="text-sm font-semibold text-white/80">立即进入</div>
          </Link>

          <section className="student-panel">
            <div className="student-panel-body space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--ink)]">我的班级</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">查看已加入班级，或通过邀请码加入新的课堂。</p>
                </div>
                <Link to="/join" className="solid-button">
                  加入班级
                </Link>
              </div>

              {classes.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[rgba(24,36,58,0.14)] bg-white/70 px-6 py-10 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(30,58,95,0.08)] text-[var(--navy)]">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--ink)]">还没有加入任何班级</h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">输入老师提供的邀请码后，课堂任务和互动会自动出现在这里。</p>
                  <div className="mt-5">
                    <Link to="/join" className="ghost-button">
                      输入邀请码
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {classes.map((cls) => (
                    <div key={cls.id} className="flex items-center gap-4 rounded-[20px] border border-[rgba(24,36,58,0.08)] bg-white px-4 py-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(30,58,95,0.1)] text-base font-semibold text-[var(--navy)]">
                        {cls.name?.trim()?.charAt(0) || '班'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold text-[var(--ink)]">{cls.name}</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">任课老师：{cls.teacher?.name || '暂未显示'}</div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`确认退出「${cls.name}」吗？`)) return
                          try {
                            await classService.leave(cls.id)
                            await loadClasses()
                          } catch (error: any) {
                            alert(error?.response?.data?.detail || '退出班级失败，请稍后重试。')
                          }
                        }}
                        className="ghost-button"
                        type="button"
                      >
                        退出
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {!isGuest ? (
            <section className="student-panel">
              <div className="student-panel-body flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(74,139,122,0.12)] text-[var(--sage)]">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--ink)]">学习提示</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    上课前先确认网络稳定。进入课堂后尽量保持页面常驻，老师发布任务、抢答和弹幕互动都会实时显示。
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </Layout>
  )
}
