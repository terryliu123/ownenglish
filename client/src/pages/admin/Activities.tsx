import { useEffect, useState } from 'react'
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

const ACTIVITY_TYPES: Record<string, string> = {
  create_task_group: '创建课前准备',
  publish_task: '发布任务',
  share_task: '分享任务',
  create_class: '创建班级',
  create_study_pack: '创建学习包',
  student_join_class: '学生加入班级',
  session_start: '开始课程',
  session_end: '结束课程',
  ai_assistant_use: 'AI助手使用',
  classroom_review_use: '课堂回顾使用',
  teaching_aid_create: '教具创建',
  teaching_aid_open: '教具打开',
  bigscreen_create: '大屏互动创建',
  bigscreen_use: '大屏互动使用',
  delete_task: '删除任务',
}

const TYPE_COLORS: Record<string, string> = {
  create_task_group: 'bg-green-500/20 text-green-400',
  publish_task: 'bg-blue-500/20 text-blue-400',
  share_task: 'bg-purple-500/20 text-purple-400',
  create_class: 'bg-amber-500/20 text-amber-400',
  create_study_pack: 'bg-cyan-500/20 text-cyan-400',
  student_join_class: 'bg-pink-500/20 text-pink-400',
  session_start: 'bg-emerald-500/20 text-emerald-400',
  session_end: 'bg-rose-500/20 text-rose-400',
  ai_assistant_use: 'bg-violet-500/20 text-violet-400',
  classroom_review_use: 'bg-teal-500/20 text-teal-400',
  teaching_aid_create: 'bg-orange-500/20 text-orange-400',
  teaching_aid_open: 'bg-yellow-500/20 text-yellow-400',
  bigscreen_create: 'bg-indigo-500/20 text-indigo-400',
  bigscreen_use: 'bg-sky-500/20 text-sky-400',
  delete_task: 'bg-red-500/20 text-red-400',
}

export default function AdminActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  // Filters
  const [filterType, setFilterType] = useState('')
  const [filterUsername, setFilterUsername] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const loadActivities = () => {
    setLoading(true)
    const params: any = { limit: pageSize, offset: (page - 1) * pageSize }
    if (filterType) params.activity_type = filterType
    if (filterUsername.trim()) params.username = filterUsername.trim()
    if (filterStartDate) params.start_date = filterStartDate
    if (filterEndDate) params.end_date = filterEndDate
    api.get('/admin/activities', { params }).then((res) => {
      setActivities(res.data.items)
      setTotal(res.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadActivities() }, [page])

  const handleSearch = () => {
    setPage(1)
    loadActivities()
  }

  const handleReset = () => {
    setFilterType('')
    setFilterUsername('')
    setFilterStartDate('')
    setFilterEndDate('')
    setPage(1)
    setTimeout(() => {
      const params: any = { limit: pageSize, offset: 0 }
      api.get('/admin/activities', { params }).then((res) => {
        setActivities(res.data.items)
        setTotal(res.data.total)
        setLoading(false)
      }).catch(() => setLoading(false))
    }, 0)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-white mb-4">系统日志</h1>

      {/* Filter bar */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">日志类型</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm min-w-[140px]"
            >
              <option value="">全部类型</option>
              {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">用户名</label>
            <input
              type="text"
              value={filterUsername}
              onChange={(e) => setFilterUsername(e.target.value)}
              placeholder="搜索用户名"
              className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500 min-w-[140px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">开始时间</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">结束时间</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg"
            >
              查询
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : activities.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">暂无活动记录</div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-24">用户</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-28">类型</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">描述</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-44">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {activities.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 text-white whitespace-nowrap">{a.user_name}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[a.type] || 'bg-slate-600/30 text-slate-400'}`}>
                        {ACTIVITY_TYPES[a.type] || a.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 max-w-md truncate">{a.description}</td>
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{new Date(a.created_at).toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-3">
            <p className="text-slate-400 text-sm">共 {total} 条</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm disabled:opacity-40 text-white"
              >
                上一页
              </button>
              <span className="text-slate-400 text-sm">{page} / {totalPages || 1}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm disabled:opacity-40 text-white"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
