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
}

interface Activity {
  id: string
  user_id: string
  user_name: string
  type: string
  description: string
  entity_type: string | null
  entity_id: string | null
  extra_data: any
  created_at: string
}

const activityTypeColors: Record<string, string> = {
  create_task_group: 'bg-green-500',
  publish_task: 'bg-blue-500',
  share_task: 'bg-purple-500',
  create_class: 'bg-amber-500',
  create_study_pack: 'bg-cyan-500',
  student_join_class: 'bg-pink-500',
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<Stats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/activities', { params: { limit: 20 } }),
    ]).then(([statsRes, activitiesRes]) => {
      setStats(statsRes.data)
      setActivities(activitiesRes.data.items)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-8 text-center">{t('adminUi.dashboard.loading')}</div>
  }

  const activityTypeLabels: Record<string, string> = {
    create_task_group: t('adminUi.activities.types.create_task_group'),
    publish_task: t('adminUi.activities.types.publish_task'),
    share_task: t('adminUi.activities.types.share_task'),
    create_class: t('adminUi.activities.types.create_class'),
    create_study_pack: t('adminUi.activities.types.create_study_pack'),
    student_join_class: t('adminUi.activities.types.student_join_class'),
  }

  const cards = [
    { label: t('adminUi.dashboard.cards.totalUsers'), value: stats?.total_users ?? 0, color: 'blue' },
    { label: t('adminUi.dashboard.cards.teachers'), value: stats?.total_teachers ?? 0, color: 'green' },
    { label: t('adminUi.dashboard.cards.students'), value: stats?.total_students ?? 0, color: 'purple' },
    { label: t('adminUi.dashboard.cards.classes'), value: stats?.total_classes ?? 0, color: 'amber' },
    { label: t('adminUi.dashboard.cards.taskGroups'), value: stats?.total_task_groups ?? 0, color: 'red' },
    { label: t('adminUi.dashboard.cards.liveSessions'), value: stats?.total_live_sessions ?? 0, color: 'cyan' },
    { label: t('adminUi.dashboard.cards.activeUsers7d'), value: stats?.active_users_7d ?? 0, color: 'pink' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    cyan: 'bg-cyan-500',
    pink: 'bg-pink-500',
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">{t('adminUi.dashboard.title')}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="p-6 rounded-2xl bg-slate-800 border border-slate-700">
            <div className={`w-12 h-12 rounded-xl ${colorMap[card.color]} flex items-center justify-center text-2xl mb-3`}>
              {card.label[0]}
            </div>
            <p className="text-3xl font-bold text-white">{card.value}</p>
            <p className="text-slate-400 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-white mb-4">{t('adminUi.dashboard.activityTitle')}</h2>
      {activities.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-8 text-center text-slate-400">
          {t('adminUi.dashboard.empty')}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-700">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${activityTypeColors[activity.type] || 'bg-slate-600'} flex items-center justify-center text-white text-sm font-medium`}>
                  {activityTypeLabels[activity.type]?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{activity.description}</p>
                  <p className="text-slate-400 text-sm">{activity.user_name} · {new Date(activity.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                  {activityTypeLabels[activity.type] || activity.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
