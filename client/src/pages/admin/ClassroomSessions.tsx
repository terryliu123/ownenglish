import { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface Session {
  id: string
  class_id: string
  class_name: string
  teacher_name: string
  title: string | null
  entry_mode: string
  status: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  event_count: number
}

export default function AdminClassroomSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  // Filters
  const [filterTeacher, setFilterTeacher] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const loadSessions = (p = page) => {
    setLoading(true)
    const params: any = { page: p, page_size: pageSize }
    if (filterTeacher.trim()) params.teacher_name = filterTeacher.trim()
    if (filterClass.trim()) params.class_name = filterClass.trim()
    if (filterStatus) params.status = filterStatus
    if (filterStartDate) params.start_date = filterStartDate
    if (filterEndDate) params.end_date = filterEndDate
    api.get('/admin/classroom-sessions', { params }).then((res) => {
      setSessions(res.data.items)
      setTotal(res.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadSessions() }, [page])

  const handleSearch = () => {
    setPage(1)
    loadSessions(1)
  }

  const handleReset = () => {
    setFilterTeacher('')
    setFilterClass('')
    setFilterStatus('')
    setFilterStartDate('')
    setFilterEndDate('')
    setPage(1)
    const params: any = { page: 1, page_size: pageSize }
    api.get('/admin/classroom-sessions', { params }).then((res) => {
      setSessions(res.data.items)
      setTotal(res.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  const totalPages = Math.ceil(total / pageSize)

  const formatDuration = (s: number | null) => {
    if (!s) return '-'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}时${m}分`
    if (m > 0) return `${m}分${sec}秒`
    return `${sec}秒`
  }

  const statusLabel: Record<string, { text: string; cls: string }> = {
    active: { text: '进行中', cls: 'bg-green-500/20 text-green-400' },
    ended: { text: '已结束', cls: 'bg-slate-500/20 text-slate-400' },
    cancelled: { text: '已取消', cls: 'bg-red-500/20 text-red-400' },
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-white mb-4">课堂回顾</h1>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">教师名</label>
            <input
              type="text"
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              placeholder="搜索教师"
              className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500 min-w-[120px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">班级名</label>
            <input
              type="text"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              placeholder="搜索班级"
              className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500 min-w-[120px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">状态</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm min-w-[100px]"
            >
              <option value="">全部</option>
              <option value="active">进行中</option>
              <option value="ended">已结束</option>
            </select>
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
            <button onClick={handleSearch} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">
              查询
            </button>
            <button onClick={handleReset} className="px-4 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg">
              重置
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">暂无课堂记录</div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">课堂标题</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-24">教师</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-28">班级</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-20">状态</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-20">时长</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-16">互动</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-44">开始时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sessions.map((s) => {
                  const st = statusLabel[s.status] || { text: s.status, cls: 'bg-slate-500/20 text-slate-400' }
                  return (
                    <tr key={s.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-2.5 text-white max-w-[200px] truncate">{s.title || '-'}</td>
                      <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{s.teacher_name}</td>
                      <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{s.class_name}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${st.cls}`}>{st.text}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{formatDuration(s.duration_seconds)}</td>
                      <td className="px-4 py-2.5 text-slate-300">{s.event_count}</td>
                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{new Date(s.started_at).toLocaleString('zh-CN')}</td>
                    </tr>
                  )
                })}
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
