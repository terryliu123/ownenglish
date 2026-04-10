import { useEffect, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { api } from '../../services/api'

interface Stats {
  total_users: number
  total_teachers: number
  total_students: number
  total_classes: number
  total_task_groups: number
  total_live_sessions: number
  active_users_7d: number
  today_teachers: number
  today_students: number
  today_sessions: number
  today_task_groups: number
  week_teachers: number
  week_students: number
  week_sessions: number
  week_task_groups: number
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats').then((res) => {
      setStats(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-8 text-center">{t('adminUi.dashboard.loading')}</div>
  }

  const totalCards = [
    { label: t('adminUi.dashboard.cards.totalUsers'), value: stats?.total_users ?? 0, color: 'bg-blue-500', icon: '人' },
    { label: t('adminUi.dashboard.cards.teachers'), value: stats?.total_teachers ?? 0, color: 'bg-green-500', icon: '师' },
    { label: t('adminUi.dashboard.cards.students'), value: stats?.total_students ?? 0, color: 'bg-purple-500', icon: '学' },
    { label: t('adminUi.dashboard.cards.classes'), value: stats?.total_classes ?? 0, color: 'bg-amber-500', icon: '班' },
    { label: t('adminUi.dashboard.cards.taskGroups'), value: stats?.total_task_groups ?? 0, color: 'bg-red-500', icon: '任' },
    { label: t('adminUi.dashboard.cards.liveSessions'), value: stats?.total_live_sessions ?? 0, color: 'bg-cyan-500', icon: '课' },
    { label: t('adminUi.dashboard.cards.activeUsers7d'), value: stats?.active_users_7d ?? 0, color: 'bg-pink-500', icon: '活' },
  ]

  const todayCards = [
    { label: '今日新增老师', value: stats?.today_teachers ?? 0, color: 'bg-green-500', icon: '师' },
    { label: '今日新增学生', value: stats?.today_students ?? 0, color: 'bg-purple-500', icon: '学' },
    { label: '今日上课数', value: stats?.today_sessions ?? 0, color: 'bg-cyan-500', icon: '课' },
    { label: '今日任务组创建', value: stats?.today_task_groups ?? 0, color: 'bg-red-500', icon: '任' },
  ]

  const weekCards = [
    { label: '本周新增老师', value: stats?.week_teachers ?? 0, color: 'bg-green-600', icon: '师' },
    { label: '本周新增学生', value: stats?.week_students ?? 0, color: 'bg-purple-600', icon: '学' },
    { label: '本周上课数', value: stats?.week_sessions ?? 0, color: 'bg-cyan-600', icon: '课' },
    { label: '本周任务组创建', value: stats?.week_task_groups ?? 0, color: 'bg-red-600', icon: '任' },
  ]

  const renderCards = (items: typeof totalCards) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((card) => (
        <div key={card.label} className="p-3 rounded-xl bg-slate-800 border border-slate-700">
          <div className={`w-7 h-7 rounded-lg ${card.color} flex items-center justify-center text-white text-xs font-bold mb-2`}>
            {card.icon}
          </div>
          <p className="text-xl font-bold text-white">{card.value}</p>
          <p className="text-slate-400 text-xs mt-0.5">{card.label}</p>
        </div>
      ))}
    </div>
  )

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">{t('adminUi.dashboard.title')}</h1>

      <h2 className="text-lg font-semibold text-white mb-3">系统概况</h2>
      <div className="mb-8">{renderCards(totalCards)}</div>

      <h2 className="text-lg font-semibold text-white mb-3">今日概况</h2>
      <div className="mb-8">{renderCards(todayCards)}</div>

      <h2 className="text-lg font-semibold text-white mb-3">本周概况</h2>
      <div className="mb-8">{renderCards(weekCards)}</div>
    </div>
  )
}
