import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import { useAppStore } from '../../stores/app-store'
import { classService, api } from '../../services/api'

interface RecentSession {
  id: string
  title: string | null
  class_name: string
  started_at: string
  status: string
}

export default function TeacherHome() {
  const { user } = useAppStore()
  const navigate = useNavigate()
  const [classCount, setClassCount] = useState(0)
  const [activeSession, setActiveSession] = useState<{ id: string; class_name: string } | null>(null)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [classesData, sessionsData] = await Promise.all([
        classService.getAll(),
        api.get('/live/sessions', { params: { limit: 3 } }).then(r => r.data).catch(() => []),
        api.get('/live/sessions', { params: { status: 'active', limit: 1 } }).then(r => r.data[0] || null).catch(() => null)
      ])

      setClassCount(classesData.length || 0)

      // 获取最近3节课
      const recent = Array.isArray(sessionsData) ? sessionsData.slice(0, 3) : []
      setRecentSessions(recent)

      // 检查是否有进行中的课堂
      const active = Array.isArray(sessionsData) ? sessionsData.find((s: any) => s.status === 'active') : null
      if (active) {
        setActiveSession({ id: active.id, class_name: active.class_name })
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '上午好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

  const getExpiryWarning = () => {
    const exp = user?.membership?.expires_at
    if (!exp || user?.membership?.status === 'free') return null
    const daysLeft = Math.ceil((new Date(exp).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) return { text: '您的会员已过期，部分功能受限', color: 'bg-red-100 border-red-300 text-red-700' }
    if (daysLeft <= 7) return { text: `会员将在 ${daysLeft} 天后到期，请及时续费`, color: 'bg-amber-100 border-amber-300 text-amber-700' }
    return null
  }

  // 快速创建班级
  const [quickClassName, setQuickClassName] = useState('')
  const [quickCreating, setQuickCreating] = useState(false)

  const handleQuickCreateClass = async () => {
    const name = quickClassName.trim()
    if (!name) return
    setQuickCreating(true)
    try {
      await classService.create({ name })
      setQuickClassName('')
      loadData()
    } catch {
      alert('创建失败，请重试')
    } finally {
      setQuickCreating(false)
    }
  }

  const steps = [
    {
      num: '01',
      icon: '🏫',
      title: '课前准备',
      desc: '创建班级邀请学生加入',
      color: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      items: [
        { title: '创建班级（必备）', desc: '创建班级、邀请学生', icon: '🏫', path: '/teacher/classes' },
      ],
    },
    {
      num: '02',
      icon: '🚀',
      title: '开始上课',
      desc: '进入互动课堂，AI设置和氛围设置（可选步骤）',
      color: 'from-violet-500 to-purple-600',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      items: [
        { title: '互动课堂', desc: '发起实时课堂，发布任务', icon: '🎯', path: '/teacher/whiteboard' },
      ],
    },
    {
      num: '03',
      icon: '📊',
      title: '课后回顾',
      desc: '查看课堂记录、学生答题详情、正确率统计和互动数据',
      color: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      items: [
        { title: '课堂回顾', desc: '历史课堂记录与统计', icon: '📅', path: '/teacher/classroom-review' },
      ],
    },
  ]

  return (
    <Layout sidebar={<TeacherSidebar activePage="home" />} leftSidebar={<TeacherLeftSidebar activePage="home" />}>
      <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #fefbf4 0%, #fdf3e3 100%)' }}>
        {/* Hero Section */}
        <section
          className="relative overflow-hidden mt-4 rounded-2xl"
          style={{
            background: 'linear-gradient(160deg, var(--navy) 0%, var(--navy-soft) 100%)',
          }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            {/* Left: Greeting */}
            <div>
              <h1 className="text-xl font-bold text-white mb-1">
                {getGreeting()}，{user?.name || '老师'}
              </h1>
              <p className="text-blue-200 text-sm">准备好今天的课堂了吗？</p>
            </div>

            {/* Right: Stats */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
                <span className="text-lg font-bold text-white">{loading ? '-' : classCount}</span>
                <span className="text-blue-200 text-xs">个班级</span>
              </div>
              {activeSession && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-200 text-xs">有进行中的课堂</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Membership expiry warning */}
        {getExpiryWarning() && (
          <div className={`mt-3 mx-6 px-4 py-3 rounded-xl border flex items-center justify-between ${getExpiryWarning()!.color}`}>
            <span className="text-sm font-medium">{getExpiryWarning()!.text}</span>
            <Link to="/teacher/membership" className="text-sm font-semibold underline ml-4 whitespace-nowrap">
              前往会员中心
            </Link>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 pt-4 pb-8 space-y-8">
          {/* Three Steps */}
          <section>
            <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--navy)' }}>快速开启</h2>
            <div className="grid md:grid-cols-3 gap-6 relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-12 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-blue-400/50 via-violet-400/50 to-emerald-400/50" />

              {steps.map((step) => (
                <div key={step.num} className="relative">
                  {/* Step header */}
                  <div className="text-center mb-4 relative">
                    <div className={`inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} items-center justify-center text-3xl shadow-lg shadow-blue-500/15`}>
                      {step.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 shadow-sm" style={{ left: 'calc(50% + 20px)' }}>
                      {step.num}
                    </div>
                  </div>
                  <div className="text-center mb-3">
                    <h3 className="text-lg font-bold text-slate-800">{step.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{step.desc}</p>
                  </div>
                  {/* Items */}
                  <div className={`rounded-xl border ${step.border} ${step.bg} overflow-hidden`}>
                    {step.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/60 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                    {/* 第一步：快速创建班级 */}
                    {step.num === '01' && (
                      <div className="px-4 py-3 border-t border-slate-100 bg-white/40">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={quickClassName}
                            onChange={(e) => setQuickClassName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleQuickCreateClass() }}
                            placeholder="输入班级名称快速创建"
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 transition-colors"
                          />
                          <button
                            onClick={handleQuickCreateClass}
                            disabled={quickCreating || !quickClassName.trim()}
                            className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-md transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            {quickCreating ? '...' : '创建'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 功能说明 */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--navy)' }}>功能说明</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: '🏫', title: '班级管理', desc: '创建班级、邀请学生加入、管理班级成员，一个班级对应一个课堂', color: 'blue' },
                { icon: '🧰', title: '数字化教具', desc: '内置丰富的互动教学工具：计时器、骰子、随机点名、抢答器等', color: 'violet' },
                { icon: '📝', title: '平板任务', desc: '创建学习任务包（单选题、判断题、填空题等），可发布给学生作答', color: 'emerald' },
                { icon: '🎮', title: '大屏任务', desc: '将内容投影到大屏，支持双人对战、抢答、弹幕互动，全班参与', color: 'pink' },
                { icon: '🎯', title: '课堂教学', desc: '教师发起实时课堂，学生在线答题，支持弹幕、AI助手辅助教学', color: 'amber' },
                { icon: '📅', title: '课堂回顾', desc: '查看历史课堂记录、学生答题情况、正确率统计和薄弱点分析', color: 'cyan' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                    item.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    item.color === 'violet' ? 'bg-violet-100 text-violet-600' :
                    item.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                    item.color === 'pink' ? 'bg-pink-100 text-pink-600' :
                    item.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                    'bg-cyan-100 text-cyan-600'
                  }`}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm mb-0.5">{item.title}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">最近课堂</h2>
                <Link to="/teacher/classroom-review" className="text-sm text-blue-500 hover:text-blue-600">
                  查看全部 →
                </Link>
              </div>
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => navigate(`/teacher/classroom-review/${session.id}`)}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                        📚
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{session.title || '未命名课堂'}</p>
                        <p className="text-sm text-slate-500">{session.class_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          session.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {session.status === 'active' ? '进行中' : '已结束'}
                      </span>
                      <span className="text-sm text-slate-400">{formatDate(session.started_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  )
}
