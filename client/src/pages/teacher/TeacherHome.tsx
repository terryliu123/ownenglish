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

  const quickAccess = [
    {
      step: '第一步',
      title: '准备阶段',
      items: [
        { title: '班级管理', desc: '管理学生和班级', icon: '🏫', path: '/teacher/classes' },
        { title: '数字化教具（资源）', desc: '教学工具库', icon: '🧰', path: '/teacher/teaching-aids' },
      ],
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50 border-blue-200',
    },
    {
      step: '第二步',
      title: '课前准备',
      items: [
        { title: '平板任务', desc: '创建和管理任务', icon: '📝', path: '/teacher/task-groups' },
        { title: '大屏任务', desc: '双人对战活动', icon: '🎮', path: '/teacher/bigscreen-activities' },
      ],
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-50 border-violet-200',
    },
    {
      step: '第三步',
      title: '课堂教学',
      items: [
        { title: '课堂教学', desc: '发布任务给学生', icon: '🎯', path: '/teacher/whiteboard' },
      ],
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50 border-emerald-200',
    },
    {
      step: '第四步',
      title: '课后回顾',
      items: [
        { title: '课堂回顾', desc: '查看历史记录', icon: '📅', path: '/teacher/classroom-review' },
      ],
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50 border-amber-200',
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

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 pt-4 pb-8 space-y-8">
          {/* Quick Access Grid */}
          <section>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--navy)' }}>使用流程</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickAccess.map((card) => (
                <div
                  key={card.title}
                  className={`rounded-2xl border-2 ${card.bgColor} overflow-hidden`}
                >
                  {/* Card Header */}
                  <div className={`px-4 py-3 bg-gradient-to-r ${card.color}`}>
                    <p className="font-semibold text-sm text-white">{card.step}：{card.title}</p>
                  </div>
                  {/* Card Items */}
                  <div className="p-3 space-y-2">
                    {card.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors"
                      >
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
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
