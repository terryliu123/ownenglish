import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import TeacherPageHeader from '../../components/layout/TeacherPageHeader'
import { useTranslation } from '../../i18n/useTranslation'
import { api, classService } from '../../services/api'

interface ClassroomReviewSession {
  id: string
  class_id: string
  class_name: string
  title: string | null
  entry_mode: string
  status: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  event_count: number
}

interface ClassOption {
  id: string
  name: string
}

interface SessionStats {
  total_sessions: number
  total_duration_seconds: number
  total_interactions: number
  total_shares: number
  total_danmu: number
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(seconds: number | null, t: (key: string, params?: Record<string, string | number>) => string) {
  if (!seconds) return '-'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return t('classroom.hoursMinutes', { hours, minutes })
  return t('classroom.minutesOnly', { minutes })
}

function formatTotalDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
  return `${minutes}m`
}

export default function ClassroomReview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<ClassroomReviewSession[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [stats, setStats] = useState<SessionStats | null>(null)

  useEffect(() => {
    void classService.getAll().then(setClasses).catch(() => setClasses([]))
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params: Record<string, string> = {}
        if (statusFilter !== 'all') params.status = statusFilter
        if (classFilter !== 'all') params.class_id = classFilter
        if (dateFilter) params.started_after = dateFilter
        const response = await api.get('/live/sessions', { params })
        setSessions(response.data || [])

        const statsRes = await api.get('/live/sessions/stats', { params })
        setStats(statsRes.data)
      } catch (error) {
        console.error('Failed to load classroom review sessions:', error)
        setSessions([])
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [classFilter, dateFilter, statusFilter])

  const statusLabel = useMemo(
    () => ({
      active: t('classroom.activeStatus'),
      ended: t('classroom.endedStatus'),
      cancelled: t('classroom.cancelledStatus'),
    }),
    [t]
  )

  const entryModeLabel = useMemo(
    () => ({
      whiteboard: t('classroom.entryModes.whiteboard'),
      interaction_management: t('classroom.entryModes.interaction_management'),
      bigscreen_activity: t('classroom.entryModes.bigscreen_activity'),
    }),
    [t]
  )

  const renderStatusBadge = (status: string) => {
    const className =
      status === 'active'
        ? 'bg-green-100 text-green-700 border-green-200'
        : status === 'ended'
          ? 'bg-slate-100 text-slate-700 border-slate-200'
          : 'bg-amber-100 text-amber-700 border-amber-200'
    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${className}`}>
        {statusLabel[status as keyof typeof statusLabel] || status}
      </span>
    )
  }

  return (
    <Layout sidebar={<TeacherSidebar activePage="classroom-review" />} leftSidebar={<TeacherLeftSidebar activePage="classroom-review" />}>
      <div className="teacher-page">
        <TeacherPageHeader
          eyebrow={t('classroom.reviewEyebrow')}
          title={t('classroom.review')}
          description="按课堂会话查看课堂记录、互动概览和结果沉淀。"
          icon="R"
        />

        {stats && (
          <section className="teacher-stat-grid">
            <div className="teacher-stat-tile">
              <span className="teacher-stat-tile__value">{stats.total_sessions}</span>
              <span className="teacher-stat-tile__label">{t('classroom.statsSessions')}</span>
            </div>
            <div className="teacher-stat-tile">
              <span className="teacher-stat-tile__value">{formatTotalDuration(stats.total_duration_seconds)}</span>
              <span className="teacher-stat-tile__label">{t('classroom.statsDuration')}</span>
            </div>
            <div className="teacher-stat-tile">
              <span className="teacher-stat-tile__value">{stats.total_interactions}</span>
              <span className="teacher-stat-tile__label">{t('classroom.statsInteractions')}</span>
            </div>
            <div className="teacher-stat-tile">
              <span className="teacher-stat-tile__value">{stats.total_shares}</span>
              <span className="teacher-stat-tile__label">{t('classroom.statsShares')}</span>
            </div>
            <div className="teacher-stat-tile">
              <span className="teacher-stat-tile__value">{stats.total_danmu}</span>
              <span className="teacher-stat-tile__label">{t('classroom.statsDanmu')}</span>
            </div>
          </section>
        )}

        <section className="surface-card">
          <div className="teacher-toolbar">
            <div className="teacher-toolbar__group">
              <label className="teacher-toolbar__label">{t('classroom.filterByClass')}</label>
              <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="teacher-control min-w-[160px]">
                <option value="all">{t('classroom.allClasses')}</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="teacher-toolbar__group">
              <label className="teacher-toolbar__label">{t('classroom.filterByStatus')}</label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="teacher-control min-w-[140px]">
                <option value="all">{t('classroom.allStatuses')}</option>
                <option value="active">{t('classroom.activeStatus')}</option>
                <option value="ended">{t('classroom.endedStatus')}</option>
              </select>
            </div>

            <div className="teacher-toolbar__spacer" />

            <div className="teacher-toolbar__group">
              <label className="teacher-toolbar__label">{t('classroom.filterByDate')}</label>
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="teacher-control min-w-[160px]" />
            </div>
          </div>
        </section>

        <section className="surface-card">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">{t('common.loading')}</div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white py-20 text-center">
              <div className="mb-4 text-4xl">R</div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">{t('classroom.emptyTitle')}</h3>
              <p className="mb-6 text-slate-500">{t('classroom.emptyDesc')}</p>
              <button className="solid-button" onClick={() => navigate('/teacher/whiteboard')}>
                {t('classroom.gotoWhiteboard')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => navigate(`/teacher/classroom-review/${session.id}`)}
                  className="w-full rounded-2xl border border-slate-100 bg-white p-5 text-left transition-all hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/40"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {session.title || t('classroom.untitledSession')}
                        </h3>
                        {renderStatusBadge(session.status)}
                      </div>
                      <p className="text-sm text-slate-500">
                        {entryModeLabel[session.entry_mode as keyof typeof entryModeLabel] || session.entry_mode}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          alert('开发中')
                        }}
                        className="text-sm font-medium text-slate-400 cursor-pointer hover:text-slate-600"
                      >
                        分析报告
                      </span>
                      <span className="text-sm font-medium text-blue-600">{t('classroom.viewDetail')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="mb-1 text-xs text-slate-500">{t('classroom.classLabel')}</p>
                      <p className="text-sm font-medium text-slate-900">{session.class_name || t('classroom.unknownClass')}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="mb-1 text-xs text-slate-500">{t('classroom.startTime')}</p>
                      <p className="text-sm font-medium text-slate-900">{formatDateTime(session.started_at)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="mb-1 text-xs text-slate-500">{t('classroom.duration')}</p>
                      <p className="text-sm font-medium text-slate-900">{formatDuration(session.duration_seconds, t)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="mb-1 text-xs text-slate-500">{t('classroom.events')}</p>
                      <p className="text-sm font-medium text-blue-600">{session.event_count}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
