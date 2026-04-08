import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import { useTranslation } from '../../i18n/useTranslation'
import { api, liveTaskService, type LiveTaskData, type LiveTaskGroup } from '../../services/api'
import { resolveMatchingAnswerRows } from '../../features/tasks/task-formatting'
import { Timeline } from '../../components/Timeline'

type SessionDetail = {
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
}

export type SessionEvent = {
  id: string
  event_type: string
  payload_json?: Record<string, unknown> | null
  created_at: string
}

type SessionSummary = {
  total_students: number
  total_tasks: number
  total_submissions: number
  total_challenges: number
  total_shares: number
  total_danmu: number
  average_accuracy: number | null
  all_students: Array<{ student_id: string; student_name: string; joined_at?: string | null }>
  most_active_students: Array<{ student_id: string; student_name: string; submission_count: number }>
}

type ReviewTaskHistoryItem = {
  session_id?: string | null
  group_id: string
  title: string
  task_count: number
  published_at?: string | null
  ended_at?: string | null
  submissions: number
}

type DanmuRecord = {
  id: string
  sender_name: string
  content: string
  created_at: string
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(seconds: number | null, t: (key: string, params?: Record<string, string | number>) => string) {
  if (!seconds) return '-'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return t('classroom.hoursMinutes', { hours, minutes })
  if (minutes > 0) return t('classroom.minutesOnly', { minutes })
  return t('classroom.secondsOnly', { seconds })
}

function formatBoolean(value: boolean | null | undefined, t: (key: string) => string) {
  if (value == null) return '-'
  return value ? t('classroom.boolean.enabled') : t('classroom.boolean.disabled')
}

function buildEventDetailRows(
  event: SessionEvent,
  t: (key: string, params?: Record<string, string | number>) => string,
  entryModeLabel: Record<string, string>,
  challengeModeLabel: Record<string, string>,
) {
  const payload = event.payload_json || {}
  const rows: Array<{ label: string; value: string }> = []

  switch (event.event_type) {
    case 'session_started':
      if (payload.entry_mode) {
        rows.push({ label: t('classroom.eventFields.entryMode'), value: entryModeLabel[String(payload.entry_mode)] || String(payload.entry_mode) })
      }
      break
    case 'session_ended':
      if (typeof payload.duration_seconds === 'number') {
        rows.push({ label: t('classroom.eventFields.duration'), value: formatDuration(payload.duration_seconds as number, t) })
      }
      break
    case 'student_joined':
    case 'student_left':
    case 'share_requested':
    case 'share_approved':
    case 'share_rejected':
      if (payload.student_name) {
        rows.push({ label: t('classroom.eventFields.student'), value: String(payload.student_name) })
      }
      break
    case 'task_published':
      if (payload.group_title) rows.push({ label: t('classroom.eventFields.groupTitle'), value: String(payload.group_title) })
      if (typeof payload.task_count === 'number') rows.push({ label: t('classroom.eventFields.taskCount'), value: String(payload.task_count) })
      break
    case 'challenge_started':
    case 'challenge_ended':
      if (payload.challenge_title) rows.push({ label: t('classroom.eventFields.challengeTitle'), value: String(payload.challenge_title) })
      if (payload.challenge_type) rows.push({ label: t('classroom.eventFields.challengeType'), value: challengeModeLabel[String(payload.challenge_type)] || String(payload.challenge_type) })
      if (typeof payload.participant_count === 'number') rows.push({ label: t('classroom.eventFields.participantCount'), value: String(payload.participant_count) })
      break
    case 'ai_settings_updated':
      rows.push({ label: t('classroom.eventFields.studentAiEnabled'), value: formatBoolean(payload.enabled as boolean | undefined, t) })
      rows.push({ label: t('classroom.eventFields.photoQaEnabled'), value: formatBoolean(payload.photo_qa_enabled as boolean | undefined, t) })
      rows.push({ label: t('classroom.eventFields.freeQuestionEnabled'), value: formatBoolean(payload.free_question_enabled as boolean | undefined, t) })
      break
    default:
      Object.entries(payload).forEach(([key, value]) => {
        if (value == null || typeof value === 'object') return
        rows.push({ label: key, value: String(value) })
      })
      break
  }

  return rows.filter((row) => row.value && row.value !== '-')
}

export default function ClassroomReviewDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [publishedTasks, setPublishedTasks] = useState<ReviewTaskHistoryItem[]>([])
  const [danmuRecords, setDanmuRecords] = useState<DanmuRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [challengeDetails, setChallengeDetails] = useState<Record<string, any>>({})

  const [selectedGroup, setSelectedGroup] = useState<(ReviewTaskHistoryItem & { tasks?: LiveTaskData[] }) | null>(null)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [submissionData, setSubmissionData] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [submissionLoading, setSubmissionLoading] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [viewingStudent, setViewingStudent] = useState<any>(null)
  const [timelineTab, setTimelineTab] = useState<'timeline' | 'tasks' | 'danmu' | 'students' | 'challenges'>('tasks')

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const detailRes = await api.get(`/live/sessions/${id}`)
        const nextDetail = detailRes.data as SessionDetail
        const [eventsRes, summaryRes, danmuRes] = await Promise.all([
          api.get(`/live/sessions/${id}/events`),
          api.get(`/live/sessions/${id}/summary`),
          liveTaskService.getSessionDanmu(id),
        ])
        setDetail(nextDetail)
        setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : [])
        setSummary(summaryRes.data as SessionSummary)
        // 从 events 中提取 task_published 事件构建任务列表（最可靠的方式）
        const eventsData = Array.isArray(eventsRes.data) ? eventsRes.data : []
        const taskPublishedEvents = eventsData.filter((e: any) => e.event_type === 'task_published')
        console.log('[ClassroomReviewDetail] Task published events found:', taskPublishedEvents.length)
        console.log('[ClassroomReviewDetail] Events data sample:', eventsData.slice(0, 3).map((e: any) => ({ type: e.event_type, payload: e.payload_json })))

        // 从 task_published 事件中构建任务列表
        const summaryData = summaryRes.data as any
        const groupSubmissionMap: Record<string, number> = {}
        for (const gs of summaryData?.task_group_submissions || []) {
          groupSubmissionMap[gs.group_id] = gs.submitted_students
        }
        const tasksFromEvents = taskPublishedEvents.map((event: any, idx: number) => {
          const payload = event.payload_json || {}
          const groupId = payload.group_id || null
          return {
            session_id: id,
            group_id: groupId,
            title: payload.group_title || `任务组 ${idx + 1}`,
            task_count: payload.task_count || 0,
            published_at: event.created_at,
            ended_at: null,
            submissions: groupId ? (groupSubmissionMap[groupId] || 0) : 0,
          } as ReviewTaskHistoryItem
        })
        console.log('[ClassroomReviewDetail] Tasks from events:', tasksFromEvents.length, tasksFromEvents)
        setPublishedTasks(tasksFromEvents)
        const danmuItems = Array.isArray(danmuRes?.items) ? danmuRes.items : []
        console.log('[ClassroomReviewDetail] Danmu loaded:', danmuItems.length, 'items, total:', danmuRes?.total || 0)
        setDanmuRecords(danmuItems)
        // Load challenge details from challenge_started events
        const challengeIds = eventsData
          .filter((e: any) => e.event_type === 'challenge_started')
          .map((e: any) => e.payload_json?.challenge_id)
          .filter(Boolean)
        if (challengeIds.length > 0) {
          const details: Record<string, any> = {}
          await Promise.all(challengeIds.map(async (cid: string) => {
            try {
              const r = await api.get(`/live/challenges/${cid}`)
              details[cid] = r.data
            } catch {}
          }))
          setChallengeDetails(details)
        }
      } catch (error) {
        console.error('Failed to load classroom review detail:', error)
        setDetail(null)
        setEvents([])
        setSummary(null)
        setPublishedTasks([])
        setDanmuRecords([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  const entryModeLabel = useMemo(() => ({
    whiteboard: t('classroom.entryModes.whiteboard'),
    interaction_management: t('classroom.entryModes.interaction_management'),
    bigscreen_activity: t('classroom.entryModes.bigscreen_activity'),
  }), [t])

  const statusLabel = useMemo(() => ({
    active: t('classroom.activeStatus'),
    ended: t('classroom.endedStatus'),
    cancelled: t('classroom.cancelledStatus'),
  }), [t])

  const eventTypeLabel = useMemo(() => ({
    session_started: t('classroom.eventTypes.session_started'),
    session_ended: t('classroom.eventTypes.session_ended'),
    task_published: t('classroom.eventTypes.task_published'),
    task_ended: t('classroom.eventTypes.task_ended'),
    challenge_started: t('classroom.eventTypes.challenge_started'),
    challenge_ended: t('classroom.eventTypes.challenge_ended'),
    student_joined: t('classroom.eventTypes.student_joined'),
    student_left: t('classroom.eventTypes.student_left'),
    share_requested: t('classroom.eventTypes.share_requested'),
    share_approved: t('classroom.eventTypes.share_approved'),
    share_rejected: t('classroom.eventTypes.share_rejected'),
    teaching_aid_opened: t('classroom.eventTypes.teaching_aid_opened'),
    teaching_aid_closed: t('classroom.eventTypes.teaching_aid_closed'),
    bigscreen_started: t('classroom.eventTypes.bigscreen_started'),
    bigscreen_ended: t('classroom.eventTypes.bigscreen_ended'),
    ai_settings_updated: t('classroom.eventTypes.ai_settings_updated'),
  }), [t])

  const loadGroupWithTasks = useCallback(async (group: ReviewTaskHistoryItem) => {
    const groupDetail = await liveTaskService.getTaskGroup(group.group_id)
    return { ...group, tasks: (groupDetail as LiveTaskGroup).tasks || [] }
  }, [])

  const handleViewAnalysis = useCallback(async (group: ReviewTaskHistoryItem) => {
    setShowAnalysis(true)
    setAnalyticsLoading(true)
    try {
      const [groupWithTasks, analytics] = await Promise.all([
        loadGroupWithTasks(group),
        liveTaskService.getTaskGroupAnalytics(group.group_id, group.session_id || detail?.id || null),
      ])
      setSelectedGroup(groupWithTasks)
      setAnalyticsData(analytics)
    } catch (error) {
      console.error('Failed to load task analytics:', error)
      setAnalyticsData(null)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [detail?.id, loadGroupWithTasks])

  const handleViewDetails = useCallback(async (group: ReviewTaskHistoryItem) => {
    setShowDetails(true)
    setSubmissionLoading(true)
    setViewingStudent(null)
    try {
      const effectiveSessionId = group.session_id || detail?.id || null
      const [groupWithTasks, submissions, sessionSummary] = await Promise.all([
        loadGroupWithTasks(group),
        liveTaskService.getTaskGroupSubmissions(group.group_id, effectiveSessionId),
        effectiveSessionId ? api.get(`/live/sessions/${effectiveSessionId}/summary`).then((r) => r.data).catch(() => null) : Promise.resolve(null),
      ])
      const nextSubmissions = submissions as any
      if (sessionSummary?.all_students && Array.isArray(nextSubmissions.students)) {
        const allowed = new Set(sessionSummary.all_students.map((student: any) => student.student_id))
        nextSubmissions.students = nextSubmissions.students.filter((student: any) => allowed.has(student.student_id))
      }
      setSelectedGroup(groupWithTasks)
      setSubmissionData(nextSubmissions)
    } catch (error) {
      console.error('Failed to load task submissions:', error)
      setSubmissionData(null)
    } finally {
      setSubmissionLoading(false)
    }
  }, [detail?.id, loadGroupWithTasks])

  if (loading) {
    return <Layout sidebar={<TeacherSidebar activePage="classroom-review" />} leftSidebar={<TeacherLeftSidebar activePage="classroom-review" />}><div className="panel-page"><div className="panel-section mt-4 flex items-center justify-center py-20 text-slate-500">{t('common.loading')}</div></div></Layout>
  }

  if (!detail || !summary) {
    return <Layout sidebar={<TeacherSidebar activePage="classroom-review" />} leftSidebar={<TeacherLeftSidebar activePage="classroom-review" />}><div className="panel-page"><div className="panel-section mt-4 py-20 text-center"><h2 className="mb-3 text-xl font-semibold text-slate-900">{t('classroom.notFound')}</h2><button className="btn btn-primary" onClick={() => navigate('/teacher/classroom-review')}>{t('classroom.backToList')}</button></div></div></Layout>
  }

  return (
    <Layout sidebar={<TeacherSidebar activePage="classroom-review" />} leftSidebar={<TeacherLeftSidebar activePage="classroom-review" />}>
      <div className="panel-page">
        {/* Header */}
        <section className="surface-card mb-4 mt-4" style={{ background: 'linear-gradient(135deg, #18324a 0%, #2a4a6a 100%)' }}>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                  onClick={() => navigate('/teacher/classroom-review')}
                >
                  ←
                </button>
                <div>
                  <p className="text-xs text-white/60">{t('classroom.review')}</p>
                  <h2 className="text-lg font-semibold text-white">{detail.title || t('classroom.untitledSession')}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  detail.status === 'active' ? 'bg-green-500/20 text-green-300' :
                  detail.status === 'ended' ? 'bg-slate-500/20 text-slate-300' :
                  'bg-amber-500/20 text-amber-300'
                }`}>
                  {statusLabel[detail.status as keyof typeof statusLabel] || detail.status}
                </span>
              </div>
              <button
                className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/20 hover:text-white"
                onClick={() => window.location.reload()}
              >
                ⟳ {t('common.refresh')}
              </button>
            </div>
          </div>
        </section>

        {/* Info Card */}
        <section className="panel-section mb-4">
          <div className="grid grid-cols-7 gap-0 overflow-hidden rounded-2xl border border-slate-100 bg-white">
            <div className="flex flex-col items-center justify-center border-r border-slate-100 p-4">
              <p className="text-xs text-slate-500">{t('classroom.classLabel')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{detail.class_name}</p>
            </div>
            <div className="flex flex-col items-center justify-center border-r border-slate-100 p-4">
              <p className="text-xs text-slate-500">{t('classroom.teacher')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{detail.teacher_name}</p>
            </div>
            <div className="flex flex-col items-center justify-center border-r border-slate-100 p-4">
              <p className="text-xs text-slate-500">{t('classroom.entryMode')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{entryModeLabel[detail.entry_mode as keyof typeof entryModeLabel] || detail.entry_mode}</p>
            </div>
            <div className="flex flex-col items-center justify-center border-r border-slate-100 p-4">
              <p className="text-xs text-slate-500">{t('classroom.duration')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatDuration(detail.duration_seconds, t)}</p>
            </div>
            <div className="flex flex-col items-center justify-center border-r border-slate-100 p-4">
              <p className="text-xs text-slate-500">{t('classroom.startTime')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatClock(detail.started_at)}</p>
            </div>
            <div className="flex flex-col items-center justify-center border-r border-slate-100 p-4">
              <p className="text-xs text-slate-500">{t('classroom.endTime')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{detail.ended_at ? formatClock(detail.ended_at) : '-'}</p>
            </div>
            <div className="flex flex-col items-center justify-center bg-blue-50/50 p-4">
              <p className="text-xs text-slate-500">{t('classroom.dateLabel')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{new Date(detail.started_at).toLocaleDateString('zh-CN')}</p>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="panel-section mb-4">
          <div className="grid grid-cols-7 gap-3">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-blue-600">👥</span>
                {t('classroom.participants')}
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total_students}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-100 text-purple-600">📝</span>
                {t('classroom.publishedTasks')}
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total_tasks}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-green-100 text-green-600">✓</span>
                {t('classroom.totalSubmissions')}
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total_submissions}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-amber-600">🏆</span>
                {t('classroom.challenges')}
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total_challenges}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-pink-100 text-pink-600">💬</span>
                {t('classroom.shareRequests')}
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total_shares ?? 0}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-cyan-100 text-cyan-600">💬</span>
                {t('classroom.danmuCount')}
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total_danmu}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-indigo-600">🖥</span>
                {t('classroom.bigscreen')}
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">0</p>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="panel-section mb-4">
          <div className="flex gap-1 border-b border-slate-200">
            <button
              onClick={() => setTimelineTab('timeline')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                timelineTab === 'timeline' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 {t('classroom.overviewTab')}
            </button>
            <button
              onClick={() => setTimelineTab('danmu')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                timelineTab === 'danmu' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              💬 {t('classroom.danmuTab')}
            </button>
            <button
              onClick={() => setTimelineTab('tasks')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                timelineTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              📝 {t('classroom.tasksTab')}
            </button>
            <button
              onClick={() => setTimelineTab('challenges')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                timelineTab === 'challenges' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              🏆 {t('classroom.challengesTab')}
            </button>
            <button
              onClick={() => setTimelineTab('students')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                timelineTab === 'students' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              👥 {t('classroom.studentsTab')}
            </button>
          </div>
        </section>

        {/* Tab Content */}
        <section className="panel-section min-h-[400px] rounded-2xl border border-slate-100 bg-white p-6">
          {/* Overview Tab */}
          {timelineTab === 'timeline' && (
            <div>
              <h3 className="mb-4 text-base font-semibold text-slate-900">{t('classroom.timelineTitle')}</h3>
              <Timeline
                events={events}
                eventTypeLabel={eventTypeLabel}
                buildEventDetailRows={buildEventDetailRows}
                formatClock={formatClock}
                t={t}
              />
            </div>
          )}

          {/* Danmu Tab */}
          {timelineTab === 'danmu' && (
            <div>
              <h3 className="mb-4 text-base font-semibold text-slate-900">{t('classroom.danmuTitle')}</h3>
              {danmuRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">💬</div>
                  <p className="text-sm text-slate-500">{t('classroom.noDanmu')}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {danmuRecords.map((record) => (
                    <div key={record.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{record.content}</p>
                        <p className="text-xs text-slate-400">{record.sender_name}</p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400 font-mono">{formatClock(record.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {timelineTab === 'tasks' && (
            <div>
              <h3 className="mb-4 text-base font-semibold text-slate-900">{t('classroom.classroomTasks')}</h3>
              {publishedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">📝</div>
                  <p className="text-sm text-slate-500">{t('classroom.noTasks')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {publishedTasks.map((group, idx) => (
                    <div key={`${group.group_id || 'nogroup'}-${idx}`} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{group.title}</h4>
                          <p className="mt-1 text-xs text-slate-500">{group.task_count} 题 / {t('classroom.submittedPeople', { count: group.submissions })}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatDateTime(group.published_at || group.ended_at || null)}</p>
                        </div>
                        <div className="flex gap-2">
                          {group.group_id ? (
                            <>
                              <button className="ghost-button px-3 py-1.5 text-xs" onClick={() => void handleViewAnalysis(group)}>{t('classroom.viewAnalysis')}</button>
                              <button className="solid-button px-3 py-1.5 text-xs" onClick={() => void handleViewDetails(group)}>{t('classroom.viewDetails')}</button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">{t('classroom.noGroupId')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Challenges Tab */}
          {timelineTab === 'challenges' && (
            <div>
              <h3 className="mb-4 text-base font-semibold text-slate-900">{t('classroom.challengesTitle')}</h3>
              {(() => {
                const challengeEvents = events.filter(e => e.event_type === 'challenge_started')
                if (challengeEvents.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">🏆</div>
                      <p className="text-sm text-slate-500">{t('classroom.noChallenges')}</p>
                    </div>
                  )
                }
                const modeLabel: Record<string, string> = { duel: '对决', single_question_duel: '单题对决', class_challenge: '全班挑战', quick_answer: '抢答' }
                return (
                  <div className="space-y-3">
                    {challengeEvents.map((event, idx) => {
                      const payload = event.payload_json || {}
                        const cid = typeof payload.challenge_id === 'string' ? payload.challenge_id : null
                        const detail = cid ? challengeDetails[cid] : null
                        const scoreboard: any[] = detail?.scoreboard || []
                        const challengeType =
                          typeof payload.challenge_type === 'string' ? payload.challenge_type : ''
                        return (
                        <div key={event.created_at + '-' + idx} className="rounded-xl border border-slate-100 bg-white p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">{idx + 1}</span>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{String(payload.challenge_title || `挑战 ${idx + 1}`)}</p>
                                <p className="text-xs text-slate-500">
                                  {modeLabel[challengeType] || challengeType}
                                  {typeof payload.participant_count === 'number' && ` · ${payload.participant_count} 人参与`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {event.created_at && (
                                <p className="text-xs text-slate-400">{new Date(event.created_at).toLocaleTimeString()}</p>
                              )}
                            </div>
                          </div>
                          {scoreboard.length > 0 && (
                            <div className="mt-3 border-t border-slate-50 pt-3">
                              <p className="mb-2 text-xs font-medium text-slate-500">排名</p>
                              <div className="space-y-2">
                                {scoreboard.sort((a: any, b: any) => (a.rank || 999) - (b.rank || 999)).map((entry: any, si: number) => (
                                  <div key={entry.student_id || si} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${si === 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                                    <div className="flex items-center gap-2">
                                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${si === 0 ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>{si + 1}</span>
                                      <span className="font-medium text-slate-900">{entry.student_name || '未知'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                      <span>{entry.correct_count || 0}/{entry.total_tasks || '?'} 正确</span>
                                      {entry.total_time_ms != null && <span>{(entry.total_time_ms / 1000).toFixed(1)}s</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Students Tab */}
          {timelineTab === 'students' && (
            <div>
              <h3 className="mb-4 text-base font-semibold text-slate-900">{t('classroom.participatingStudents')}</h3>
              {summary.all_students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">👥</div>
                  <p className="text-sm text-slate-500">{t('classroom.noStudentData')}</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-slate-700">{t('classroom.allStudents')}</h4>
                    <div className="space-y-2">
                      {summary.all_students.map((student) => (
                        <div key={student.student_id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{student.student_name}</p>
                          <span className="text-xs text-slate-500">{formatDateTime(student.joined_at || null)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-slate-700">{t('classroom.mostActiveStudents')}</h4>
                    {summary.most_active_students.length === 0 ? (
                      <p className="text-sm text-slate-500">{t('classroom.noStudentData')}</p>
                    ) : (
                      <div className="space-y-2">
                        {summary.most_active_students.map((student, index) => (
                          <div key={student.student_id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">{index + 1}</span>
                              <p className="text-sm font-medium text-slate-900">{student.student_name}</p>
                            </div>
                            <span className="text-sm font-semibold text-slate-900">{t('classroom.submissionCount', { count: student.submission_count })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {showAnalysis && selectedGroup && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-indigo-100 to-purple-100 px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{selectedGroup.title}</h3>
                  <p className="text-sm text-slate-600">{t('classroom.taskAnalysis')}</p>
                </div>
                <button className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors" onClick={() => setShowAnalysis(false)}>✕</button>
              </div>
              <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6">
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <span className="animate-spin mr-3">⏳</span>
                    <p>加载中...</p>
                  </div>
                ) : analyticsData ? (
                  <div className="space-y-6">
                    {/* 统计卡片 */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl text-center bg-slate-50 border border-slate-200">
                        <p className="text-sm mb-1 text-slate-600">总学生数</p>
                        <p className="text-2xl font-bold text-indigo-500">{analyticsData.total_students || 0}</p>
                      </div>
                      <div className="p-4 rounded-xl text-center bg-slate-50 border border-slate-200">
                        <p className="text-sm mb-1 text-slate-600">平均正确率</p>
                        <p className={`text-2xl font-bold ${(analyticsData.summary_rate || 0) >= 60 ? 'text-emerald-500' : 'text-red-500'}`}>{Math.round(analyticsData.summary_rate || 0)}%</p>
                      </div>
                      <div className="p-4 rounded-xl text-center bg-slate-50 border border-slate-200">
                        <p className="text-sm mb-1 text-slate-600">总结</p>
                        <p className="text-lg font-medium text-amber-500">{typeof analyticsData.summary_label === 'string' ? analyticsData.summary_label : '-'}</p>
                      </div>
                    </div>

                    {/* 题目统计 */}
                    <div>
                      <h4 className="font-semibold mb-4 text-slate-800">题目统计</h4>
                      <div className="space-y-3">
                        {(analyticsData.task_analytics || []).map((task: any, idx: number) => {
                          // Helper to extract plain text from rich text object
                          const extractText = (obj: any): string => {
                            if (typeof obj === 'string') return obj;
                            if (obj && typeof obj === 'object') {
                              if (obj.content && Array.isArray(obj.content)) return obj.content.map(extractText).join('');
                              if (obj.text) return obj.text;
                              if (obj.type === 'text' && obj.text) return obj.text;
                            }
                            return '';
                          };

                          let questionText: string;
                          if (typeof task.question_text === 'string') {
                            try {
                              const parsed = JSON.parse(task.question_text);
                              questionText = extractText(parsed) || task.question_text;
                            } catch {
                              questionText = task.question_text;
                            }
                          } else if (task.question_text && typeof task.question_text === 'object') {
                            questionText = extractText(task.question_text) || JSON.stringify(task.question_text);
                          } else {
                            questionText = String(task.question_text ?? '');
                          }

                          // Check if this is a choice type question
                          const taskType = task.type as string;
                          const isChoiceQuestion = taskType === 'single_choice' || taskType === 'multiple_choice' || taskType === 'true_false';
                          const isTrueFalse = taskType === 'true_false';
                          const isFillBlank = taskType === 'fill_blank';
                          const isMatching = taskType === 'matching';

                          // Extract options for choice questions
                          const taskOptions = (task.options as Array<{key: string, text?: string}> | undefined) || [];
                          const showOptions = isChoiceQuestion && taskOptions.length > 0;

                          const matchingCorrectRows = isMatching
                            ? resolveMatchingAnswerRows(task.correct_answer, task.pairs, { fallbackToPairs: true })
                            : [];

                          // Extract correct answer string
                          const correctAnswerRaw = ((): string => {
                            if (isMatching) {
                              return matchingCorrectRows.map((row) => `${row.leftText} -> ${row.rightText}`).join(' / ');
                            }
                            const ans = task.correct_answer as unknown;
                            if (ans === null || ans === undefined) return '';
                            if (typeof ans === 'string') return ans;
                            if (typeof ans === 'boolean') return ans ? 'TRUE' : 'FALSE';
                            if (typeof ans === 'object') {
                              const ansObj = ans as Record<string, unknown>;
                              if (ansObj.value !== undefined) {
                                if (typeof ansObj.value === 'boolean') return ansObj.value ? 'TRUE' : 'FALSE';
                                return String(ansObj.value);
                              }
                              return JSON.stringify(ans);
                            }
                            return String(ans);
                          })();
                          const correctAnswerStr = correctAnswerRaw.toUpperCase();

                          const wrongCount = task.total_submissions - task.correct_count;

                          return (
                            <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                              <div className="flex items-start gap-3 mb-2">
                                <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-slate-700 text-white">{idx + 1}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${(task.primary_rate || 0) >= 60 ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'}`}>
                                  {(task.primary_rate || 0) >= 60 ? '✓ 正确率高' : '✗ 需关注'}
                                </span>
                              </div>

                              {/* Correct/Wrong count summary */}
                              <div className="flex items-center gap-4 text-sm mb-3">
                                <span className="text-emerald-600">✓ 正确 {task.correct_count || 0}人</span>
                                <span className="text-red-600">✗ 错误 {wrongCount}人</span>
                                <span className="text-slate-500">共{task.total_submissions || 0}人答题</span>
                              </div>

                              {/* Question text */}
                              <p className="text-sm mb-3 text-slate-700">{questionText}</p>

                              {/* Options for choice questions */}
                              {!!showOptions && (
                                <div className="space-y-2 mb-3">
                                  {taskOptions.map((opt: {key: string, text?: string}, oIdx: number) => {
                                    const isCorrectAnswer = correctAnswerStr === opt.key.toUpperCase();
                                    return (
                                      <div key={oIdx} className="flex items-center gap-3 p-2 rounded-lg bg-white/60">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${isCorrectAnswer ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                          {opt.key}
                                        </span>
                                        <span className="flex-1 text-sm text-slate-700">{String(opt.text || '')}</span>
                                        {isCorrectAnswer && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600">正确答案</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Pairs for matching questions */}
                              {isMatching && matchingCorrectRows.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                  {matchingCorrectRows.map((pair, pIdx: number) => (
                                    <div key={pIdx} className="flex items-center gap-2 p-2 rounded bg-white/60">
                                      <span className="font-medium text-sm text-indigo-500">{pair.leftText}</span>
                                      <span className="text-slate-500">→</span>
                                      <span className="text-sm text-slate-700">{pair.rightText}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Fill in the blanks */}
                              {isFillBlank && task.correct_answer && (
                                <div className="p-3 rounded-lg mb-3 bg-emerald-50">
                                  <p className="text-xs mb-1 text-emerald-600">参考答案</p>
                                  <p className="text-sm font-medium text-emerald-600">
                                    {(() => {
                                      const ans = task.correct_answer;
                                      if (Array.isArray(ans)) return ans.join(', ');
                                      if (typeof ans === 'object' && ans !== null) {
                                        const ansObj = ans as Record<string, unknown>;
                                        if (ansObj.blanks && Array.isArray(ansObj.blanks)) return (ansObj.blanks as string[]).join(', ');
                                        if (ansObj.value && Array.isArray(ansObj.value)) return (ansObj.value as string[]).join(', ');
                                        return JSON.stringify(ans);
                                      }
                                      return String(ans);
                                    })() as string}
                                  </p>
                                </div>
                              )}

                              {/* True/False question display */}
                              {isTrueFalse && !showOptions && (
                                <div className="space-y-2 mb-3">
                                  <div className={`flex items-center gap-3 p-2 rounded-lg ${correctAnswerStr === 'TRUE' || correctAnswerStr === 'T' || correctAnswerStr === '正确' ? 'bg-emerald-50' : 'bg-white/60'}`}>
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${correctAnswerStr === 'TRUE' || correctAnswerStr === 'T' || correctAnswerStr === '正确' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>T</span>
                                    <span className="flex-1 text-sm text-slate-700">正确 (True)</span>
                                    {(correctAnswerStr === 'TRUE' || correctAnswerStr === 'T' || correctAnswerStr === '正确') && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600">正确答案</span>}
                                  </div>
                                  <div className={`flex items-center gap-3 p-2 rounded-lg ${correctAnswerStr === 'FALSE' || correctAnswerStr === 'F' || correctAnswerStr === '错误' ? 'bg-emerald-50' : 'bg-white/60'}`}>
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${correctAnswerStr === 'FALSE' || correctAnswerStr === 'F' || correctAnswerStr === '错误' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>F</span>
                                    <span className="flex-1 text-sm text-slate-700">错误 (False)</span>
                                    {(correctAnswerStr === 'FALSE' || correctAnswerStr === 'F' || correctAnswerStr === '错误') && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600">正确答案</span>}
                                  </div>
                                </div>
                              )}

                              {/* 答题分布 */}
                              {task.answer_distribution && task.answer_distribution.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-200/50">
                                  <p className="text-xs mb-2 text-slate-500">答题分布</p>
                                  <div className="space-y-1.5">
                                    {task.answer_distribution.map((dist: any, dIdx: number) => (
                                      <div key={dIdx} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 w-8">{dist.key || dist.option || dist.option_key || dist.answer_key || dist.answer || dist.value || '-'}</span>
                                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${(dist.count / (task.total_submissions || 1)) * 100}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-slate-600 w-8 text-right">{dist.count}人</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : <p className="text-sm text-slate-500">{t('classroom.noAnalysis')}</p>}
              </div>
            </div>
          </div>
        )}

        {showDetails && selectedGroup && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-emerald-100 to-teal-100 px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{selectedGroup.title}</h3>
                  <p className="text-sm text-slate-600">学生答题明细</p>
                </div>
                <div className="flex items-center gap-2">
                  {viewingStudent && (
                    <button className="text-sm px-3 py-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors" onClick={() => setViewingStudent(null)}>← 返回</button>
                  )}
                  <button className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors" onClick={() => { setViewingStudent(null); setShowDetails(false) }}>✕</button>
                </div>
              </div>
              <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6">
                {submissionLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <span className="animate-spin mr-3">⏳</span>
                    <p>加载中...</p>
                  </div>
                ) : viewingStudent ? (
                  /* 学生详情视图 */
                  <div className="space-y-4">
                    <button onClick={() => setViewingStudent(null)} className="text-sm text-slate-600 hover:text-slate-800">← 返回列表</button>
                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-lg font-bold text-white">{viewingStudent.student_name?.charAt(0) || '?'}</div>
                          <h4 className="font-semibold text-lg text-slate-900">{viewingStudent.student_name}</h4>
                        </div>
                        <div className="text-right">
                          <p className={`text-3xl font-bold ${viewingStudent.correct_count === (selectedGroup.tasks?.length || 0) ? 'text-emerald-500' : 'text-red-500'}`}>{viewingStudent.correct_count}/{selectedGroup.tasks?.length || 0}</p>
                          <p className="text-sm text-slate-500">正确数</p>
                        </div>
                      </div>
                    </div>
                    <h4 className="font-semibold text-slate-800">答题详情</h4>
                    <div className="space-y-4">
                      {(() => {
                        // 创建任务 ID 到顺序的映射
                        const taskOrderMap = new Map<string, number>();
                        selectedGroup.tasks?.forEach((t: any, index: number) => {
                          const taskId = t.task_id || t.id;
                          if (taskId) taskOrderMap.set(taskId, index);
                        });

                        // 按任务顺序排序提交
                        const sortedSubmissions = [...(viewingStudent.submissions || [])].sort((a: any, b: any) => {
                          const orderA = taskOrderMap.get(a.task_id) ?? 999;
                          const orderB = taskOrderMap.get(b.task_id) ?? 999;
                          return orderA - orderB;
                        });

                        return sortedSubmissions.map((sub: any, idx: number) => {
                          // 查找对应任务
                          const task = selectedGroup.tasks?.find((t: any) => (t.task_id || t.id) === sub.task_id);

                          // 提取题目文本
                          const extractText = (obj: any): string => {
                            if (typeof obj === 'string') return obj;
                            if (obj && typeof obj === 'object') {
                              if (obj.content && Array.isArray(obj.content)) return obj.content.map(extractText).join('');
                              if (obj.text) return obj.text;
                              if (obj.type === 'text' && obj.text) return obj.text;
                            }
                            return '';
                          };

                          let questionText = '';
                          let questionObj: any = null;
                          if (task?.question) {
                            if (typeof task.question === 'string') {
                              try { questionObj = JSON.parse(task.question); questionText = extractText(questionObj); } catch { questionText = task.question; }
                            } else if (typeof task.question === 'object') {
                              questionObj = task.question;
                              if (questionObj.text) {
                                if (typeof questionObj.text === 'string') {
                                  try { const parsed = JSON.parse(questionObj.text); questionText = extractText(parsed); } catch { questionText = questionObj.text; }
                                } else if (typeof questionObj.text === 'object') questionText = extractText(questionObj.text);
                              }
                              if (!questionText && questionObj.content) questionText = extractText(questionObj);
                            }
                          }

                          // 提取选项
                          let options: any[] = [];
                          if (questionObj?.options && Array.isArray(questionObj.options)) options = questionObj.options;
                          else if (questionObj?.choices && Array.isArray(questionObj.choices)) options = questionObj.choices;

                          // 获取正确答案
                          const taskType = task?.type || '';
                          const isChoiceQuestion = taskType === 'single_choice' || taskType === 'multiple_choice';
                          const isTrueFalse = taskType === 'true_false';
                          const isMatching = taskType === 'matching';
                          const taskPairs = (task?.question?.pairs || []) as Array<{ left: unknown; right: unknown }>;
                          const matchingCorrectRows = isMatching
                            ? resolveMatchingAnswerRows(task?.correct_answer, taskPairs, { fallbackToPairs: true })
                            : [];
                          const matchingStudentRows = isMatching
                            ? resolveMatchingAnswerRows(sub.answer, taskPairs)
                            : [];

                          const correctAnswer = (() => {
                            if (isMatching) {
                              return matchingCorrectRows.map((row) => `${row.leftText}→${row.rightText}`).join(', ');
                            }
                            if (!task?.correct_answer) return '';
                            let answer = '';
                            if (typeof task.correct_answer === 'string') {
                              try {
                                const parsed = JSON.parse(task.correct_answer);
                                if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
                                  answer = String(parsed.value);
                                } else if (typeof parsed === 'string') {
                                  answer = parsed;
                                } else {
                                  answer = task.correct_answer;
                                }
                              } catch { answer = task.correct_answer; }
                            } else if (typeof task.correct_answer === 'object') {
                              const ansObj = task.correct_answer as Record<string, unknown>;
                              if (ansObj.value !== undefined) answer = String(ansObj.value);
                              else if (ansObj.blanks !== undefined) return JSON.stringify(ansObj.blanks);
                              else answer = JSON.stringify(task.correct_answer);
                            } else {
                              answer = String(task.correct_answer);
                            }
                            return answer.trim();
                          })();

                          let studentAnswer = (() => {
                            let ans = sub.answer;
                            if (typeof ans === 'string') {
                              try {
                                const parsed = JSON.parse(ans);
                                ans = typeof parsed === 'string' ? parsed : ans;
                              } catch { /* keep original */ }
                            } else {
                              ans = JSON.stringify(ans);
                            }
                            return String(ans).trim();
                          })();

                          if (isMatching && matchingStudentRows.length > 0) {
                            studentAnswer = matchingStudentRows.map((row) => `${row.leftText}→${row.rightText}`).join(', ');
                          }

                          return (
                            <div key={idx} className="p-5 rounded-xl bg-white border border-slate-200">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium" style={{ background: 'rgba(0,0,0,0.06)', color: '#666' }}>{idx + 1}</span>
                                <span className={`text-xs px-2 py-0.5 rounded border ${sub.is_correct ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-red-500/10 border-red-500/30 text-red-600'}`}>{sub.is_correct ? '✓ 正确' : '✗ 错误'}</span>
                              </div>

                              <p className="text-base font-medium mb-4 text-slate-800">{questionText || '题目'}</p>

                              {/* 选择题选项 */}
                              {isChoiceQuestion && options.length > 0 && (
                                <div className="space-y-2 mb-4">
                                  {options.map((opt: any, oIdx: number) => {
                                    const optKey = opt.key || opt.id || String.fromCharCode(65 + oIdx);
                                    const optText = opt.text || opt.content || opt.value || '';
                                    const isSelected = studentAnswer.toUpperCase() === optKey.toUpperCase();
                                    const isCorrect = correctAnswer.toUpperCase() === optKey.toUpperCase();
                                    return (
                                      <div key={oIdx} className="flex items-center gap-3 py-2 border-b border-slate-200 last:border-0">
                                        <span className={`text-sm font-medium min-w-[20px] ${isCorrect ? 'text-emerald-600' : 'text-slate-600'}`}>{optKey}</span>
                                        <span className="flex-1 text-sm text-slate-700">{String(optText || '')}</span>
                                        {isSelected && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600">你的答案</span>}
                                        {isCorrect && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600">正确答案</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* 判断题选项 */}
                              {isTrueFalse && (
                                <div className="space-y-2 mb-4">
                                  {['T', 'F'].map((optKey) => {
                                    const isSelected = studentAnswer.toUpperCase() === optKey;
                                    const isCorrect = correctAnswer.toUpperCase() === optKey;
                                    return (
                                      <div key={optKey} className={`flex items-center gap-3 p-3 rounded-lg ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100'}`}>
                                        <span className={`text-sm font-medium w-7 h-7 rounded-full flex items-center justify-center ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>{optKey}</span>
                                        <span className="flex-1 text-sm text-slate-700">{optKey === 'T' ? '正确 (True)' : '错误 (False)'}</span>
                                        {isSelected && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600">你的答案</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* 匹配题显示 */}
                              {isMatching && matchingStudentRows.length > 0 && (
                                <div className="space-y-2 mb-4">
                                  <p className="text-xs text-slate-500">匹配结果:</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {matchingStudentRows.map((pair, pIdx) => {
                                      const correctPair = matchingCorrectRows[pIdx];
                                      const isPairCorrect = pair.leftText === correctPair?.leftText && pair.rightText === correctPair?.rightText;
                                      return (
                                        <div key={pIdx} className={`flex items-center gap-2 p-2 rounded ${isPairCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                                          <span className="font-medium text-indigo-500">{pair.leftText}</span>
                                          <span className="text-slate-500">→</span>
                                          <span className={isPairCorrect ? 'text-emerald-600' : 'text-red-600'}>{pair.rightText}</span>
                                          {!isPairCorrect && correctPair && (
                                            <span className="text-xs text-slate-500">(正确: {correctPair.leftText}→{correctPair.rightText})</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* 答案信息 */}
                              <div className={`p-3 rounded-lg ${sub.is_correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-xs text-slate-500">你的答案: </span>
                                    <span className={`text-sm font-medium ${sub.is_correct ? 'text-emerald-600' : 'text-red-600'}`}>{studentAnswer || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-xs text-slate-500">正确答案: </span>
                                    <span className="text-sm font-medium text-emerald-600">{correctAnswer || '-'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : submissionData?.students?.length > 0 ? (
                  <div className="space-y-3">
                    {submissionData.students.map((student: any, idx: number) => (
                      <div key={idx} onClick={() => setViewingStudent(student)} className="p-4 rounded-xl cursor-pointer transition-colors bg-slate-50 border border-slate-200 hover:bg-slate-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-indigo-100 text-indigo-600">{student.student_name?.charAt(0) || '?'}</div>
                            <span className="font-medium text-slate-800">{student.student_name}</span>
                          </div>
                          <span className={`text-lg font-bold ${student.correct_count === (selectedGroup.tasks?.length || 0) ? 'text-emerald-500' : 'text-amber-500'}`}>{student.correct_count}/{selectedGroup.tasks?.length || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-slate-400">暂无答题数据</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
