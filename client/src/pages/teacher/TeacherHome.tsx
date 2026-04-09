import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import TeacherPageHeader from '../../components/layout/TeacherPageHeader'
import { useAppStore } from '../../stores/app-store'
import { api, classService } from '../../services/api'

interface RecentSession {
  id: string
  title: string | null
  class_name: string
  started_at: string
  status: string
}

interface HomeStep {
  num: string
  icon: string
  title: string
  desc: string
  color: string
  bg: string
  border: string
  items: Array<{ title: string; desc: string; icon: string; path: string }>
}

export default function TeacherHome() {
  const { user } = useAppStore()
  const navigate = useNavigate()
  const [classCount, setClassCount] = useState(0)
  const [activeSession, setActiveSession] = useState<{ id: string; class_name: string } | null>(null)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [loading, setLoading] = useState(true)
  const [quickClassName, setQuickClassName] = useState('')
  const [quickCreating, setQuickCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    try {
      const [classesData, sessionsData] = await Promise.all([
        classService.getAll(),
        api.get('/live/sessions', { params: { limit: 3 } }).then((r) => r.data).catch(() => []),
      ])

      setClassCount(classesData.length || 0)

      const normalizedSessions = Array.isArray(sessionsData) ? sessionsData : []
      setRecentSessions(normalizedSessions.slice(0, 3))

      const active = normalizedSessions.find((session: RecentSession) => session.status === 'active') || null
      if (active) {
        setActiveSession({ id: active.id, class_name: active.class_name })
      } else {
        setActiveSession(null)
      }
    } catch (error) {
      console.error('Failed to load teacher home data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return '上午好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }, [])

  const expiryWarning = useMemo(() => {
    const exp = user?.membership?.expires_at
    if (!exp || user?.membership?.status === 'free') return null
    const daysLeft = Math.ceil((new Date(exp).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) {
      return {
        text: '当前会员已过期，部分功能可能受限。',
        color: 'bg-red-100 border-red-300 text-red-700',
      }
    }
    if (daysLeft <= 7) {
      return {
        text: `会员将在 ${daysLeft} 天后到期，建议提前续费。`,
        color: 'bg-amber-100 border-amber-300 text-amber-700',
      }
    }
    return null
  }, [user?.membership?.expires_at, user?.membership?.status])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 3600)
  }

  const handleQuickCreateClass = async () => {
    const name = quickClassName.trim()
    if (!name) return

    setQuickCreating(true)
    try {
      await classService.create({ name })
      setQuickClassName('')
      showToast(`班级“${name}”创建成功。`)
      await loadData()
    } catch (error) {
      console.error('Failed to quick create class:', error)
      showToast('创建失败，请稍后重试。')
    } finally {
      setQuickCreating(false)
    }
  }

  const steps: HomeStep[] = [
    {
      num: '01',
      icon: '班',
      title: '课前准备',
      desc: '先完成班级搭建，再邀请学生加入课堂。',
      color: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      items: [
        { title: '班级管理', desc: '创建班级、生成邀请链接和二维码。', icon: '班', path: '/teacher/classes' },
      ],
    },
    {
      num: '02',
      icon: '课',
      title: '开始上课',
      desc: '进入课堂教学后发任务、组织互动并管理课堂氛围。',
      color: 'from-violet-500 to-purple-600',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      items: [
        { title: '课堂教学', desc: '开始本节课并发起课堂互动。', icon: '课', path: '/teacher/whiteboard' },
      ],
    },
    {
      num: '03',
      icon: '回',
      title: '课后回顾',
      desc: '课后按课堂会话查看记录、互动数据和课堂结果。',
      color: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      items: [
        { title: '课堂回顾', desc: '查看最近课堂记录与复盘信息。', icon: '回', path: '/teacher/classroom-review' },
      ],
    },
  ]

  const capabilities = [
    { icon: '班', title: '班级管理', desc: '创建班级、邀请学生、管理课堂归属。' },
    { icon: '屏', title: '大屏互动', desc: '配置素材与活动包，组织适合投屏展示的课堂互动。' },
    { icon: '题', title: '平板任务', desc: '创建任务组并在课堂中发布给学生。' },
    { icon: '教', title: '数字化教具', desc: '查找并预览数字教具，直接用于课堂展示。' },
    { icon: '回', title: '课堂回顾', desc: '回看课堂会话、互动摘要和课后结果。' },
    { icon: '会', title: '会员中心', desc: '管理当前套餐、额度和功能权益。' },
  ]

  return (
    <Layout sidebar={<TeacherSidebar activePage="home" />} leftSidebar={<TeacherLeftSidebar activePage="home" />}>
      <div className="teacher-page">
        <TeacherPageHeader
          eyebrow="教师工作台"
          title={`${greeting}，${user?.name || '老师'}`}
          description="从这里完成班级准备、课堂教学和课后回顾。"
          icon="教"
          actions={
            <>
              <span className="teacher-page-pill">{loading ? '...' : `${classCount} 个班级`}</span>
              {activeSession ? <span className="teacher-page-pill">进行中：{activeSession.class_name}</span> : null}
            </>
          }
        />

        {expiryWarning ? (
          <div className={`rounded-2xl border px-4 py-3 ${expiryWarning.color}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{expiryWarning.text}</span>
              <Link to="/teacher/membership" className="text-sm font-semibold underline whitespace-nowrap">
                前往会员中心
              </Link>
            </div>
          </div>
        ) : null}

        <section className="surface-card">
          <div className="panel-head">
            <div>
              <h2>快速开始</h2>
              <p>按真实课堂流程推进，减少进入系统后的判断成本。</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.num} className="relative">
                <div className="mb-4 text-center relative">
                  <div className={`inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-2xl text-white shadow-lg shadow-blue-500/15`}>
                    {step.icon}
                  </div>
                  <div
                    className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-xs font-bold text-slate-400 shadow-sm"
                    style={{ left: 'calc(50% + 20px)' }}
                  >
                    {step.num}
                  </div>
                </div>

                <div className="mb-3 text-center">
                  <h3 className="text-lg font-semibold text-slate-800">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{step.desc}</p>
                </div>

                <div className={`overflow-hidden rounded-xl border ${step.border} ${step.bg}`}>
                  {step.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-white/60"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-700">
                        {item.icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </Link>
                  ))}

                  {step.num === '01' ? (
                    <div className="border-t border-slate-100 bg-white/40 px-4 py-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={quickClassName}
                          onChange={(e) => setQuickClassName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleQuickCreateClass()
                          }}
                          placeholder="输入班级名称，快速创建"
                          className="teacher-control flex-1"
                        />
                        <button
                          onClick={() => void handleQuickCreateClass()}
                          disabled={quickCreating || !quickClassName.trim()}
                          className="solid-button whitespace-nowrap"
                        >
                          {quickCreating ? '创建中...' : '创建'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card">
          <div className="panel-head">
            <div>
              <h2>功能概览</h2>
              <p>当前教师端的主要工作区和核心产品能力。</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
                  {item.icon}
                </div>
                <div>
                  <h3 className="mb-0.5 text-sm font-semibold text-slate-800">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {recentSessions.length > 0 ? (
          <section className="surface-card">
            <div className="panel-head">
              <div>
                <h2>最近课堂</h2>
                <p>按最近发生的课堂会话快速回看。</p>
              </div>
              <Link to="/teacher/classroom-review" className="ghost-button">
                查看全部
              </Link>
            </div>

            <div className="space-y-3">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigate(`/teacher/classroom-review/${session.id}`)}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                      课
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{session.title || '未命名课堂'}</p>
                      <p className="text-sm text-slate-500">{session.class_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        session.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {session.status === 'active' ? '进行中' : '已结束'}
                    </span>
                    <span className="text-sm text-slate-400">{formatDate(session.started_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {toast && createPortal(
        <div className="fixed left-1/2 top-20 z-[9999] -translate-x-1/2 animate-[fadeInDown_0.3s_ease-out]">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0a0e1a]/90 px-5 py-3 text-sm font-medium text-white shadow-xl shadow-black/20 backdrop-blur-xl">
            <svg className="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {toast}
          </div>
        </div>,
        document.body
      )}
    </Layout>
  )
}
