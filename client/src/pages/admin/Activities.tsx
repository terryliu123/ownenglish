import { useEffect, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { api } from '../../services/api'

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

export default function AdminActivities() {
  const { t, tWithParams } = useTranslation()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterType, setFilterType] = useState('')

  const loadActivities = () => {
    setLoading(true)
    const params: any = { limit: 20, offset: (page - 1) * 20 }
    if (filterType) params.activity_type = filterType
    api.get('/admin/activities', { params }).then((res) => {
      setActivities(res.data.items)
      setTotal(res.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadActivities() }, [page, filterType])

  const activityTypeLabels: Record<string, string> = {
    create_task_group: t('adminUi.activities.types.create_task_group'),
    publish_task: t('adminUi.activities.types.publish_task'),
    share_task: t('adminUi.activities.types.share_task'),
    create_class: t('adminUi.activities.types.create_class'),
    create_study_pack: t('adminUi.activities.types.create_study_pack'),
    student_join_class: t('adminUi.activities.types.student_join_class'),
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">{t('adminUi.activities.title')}</h1>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
        >
          <option value="">{t('adminUi.activities.allTypes')}</option>
          <option value="create_task_group">{t('adminUi.activities.types.create_task_group')}</option>
          <option value="publish_task">{t('adminUi.activities.types.publish_task')}</option>
          <option value="share_task">{t('adminUi.activities.types.share_task')}</option>
          <option value="create_class">{t('adminUi.activities.types.create_class')}</option>
          <option value="create_study_pack">{t('adminUi.activities.types.create_study_pack')}</option>
          <option value="student_join_class">{t('adminUi.activities.types.student_join_class')}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">{t('adminUi.activities.loading')}</div>
      ) : activities.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-8 text-center text-slate-400">
          {t('adminUi.activities.empty')}
        </div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-2xl overflow-hidden mb-4">
            <div className="divide-y divide-slate-700">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full ${activityTypeColors[activity.type] || 'bg-slate-600'} flex items-center justify-center text-white text-sm font-medium`}>
                    {activityTypeLabels[activity.type]?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{activity.description}</p>
                    <p className="text-slate-400 text-sm">
                      {activity.user_name} · {new Date(activity.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${activityTypeColors[activity.type] || 'bg-slate-600'} text-white`}>
                    {activityTypeLabels[activity.type] || activity.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-slate-400">{tWithParams('adminUi.activities.total', { count: total })}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-slate-700 rounded-lg disabled:opacity-50"
              >
                {t('adminUi.activities.prev')}
              </button>
              <span className="px-4 py-2 text-slate-400">{tWithParams('adminUi.activities.page', { page })}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={activities.length < 20}
                className="px-4 py-2 bg-slate-700 rounded-lg disabled:opacity-50"
              >
                {t('adminUi.activities.next')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
