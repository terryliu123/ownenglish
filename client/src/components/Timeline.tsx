import type { SessionEvent } from '../pages/teacher/ClassroomReviewDetail'

interface TimelineProps {
  events: SessionEvent[]
  eventTypeLabel: Record<string, string>
  buildEventDetailRows: (
    event: SessionEvent,
    t: (key: string, params?: Record<string, string | number>) => string,
    entryModeLabel: Record<string, string>,
    challengeModeLabel: Record<string, string>,
  ) => Array<{ label: string; value: string }>
  formatClock: (value: string) => string
  t: (key: string) => string
}

export function Timeline({ events, eventTypeLabel, buildEventDetailRows, formatClock, t }: TimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">{t('classroom.noEvents')}</p>
  }

  const entryModeLabel: Record<string, string> = {
    whiteboard: t('classroom.entryModes.whiteboard'),
    interaction_management: t('classroom.entryModes.interaction_management'),
    bigscreen_activity: t('classroom.entryModes.bigscreen_activity'),
  }

  const challengeModeLabel: Record<string, string> = {
    class_challenge: t('classroom.challengeModes.class_challenge'),
    duel: t('classroom.challengeModes.duel'),
    single_question_duel: t('classroom.challengeModes.single_question_duel'),
  }

  // Get icon based on event type
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'session_started': return '🚀'
      case 'session_ended': return '🏁'
      case 'task_published': return '📋'
      case 'task_ended': return '📝'
      case 'challenge_started': return '⚡'
      case 'challenge_ended': return '🏆'
      case 'student_joined': return '👤'
      case 'student_left': return '👋'
      case 'share_requested': return '📤'
      case 'share_approved': return '✅'
      case 'share_rejected': return '❌'
      case 'teaching_aid_opened': return '🧰'
      case 'teaching_aid_closed': return '🔚'
      case 'bigscreen_started': return '📺'
      case 'bigscreen_ended': return '📴'
      case 'ai_settings_updated': return '🤖'
      default: return '📌'
    }
  }

  // Event color based on type
  const getEventColor = (type: string) => {
    switch (type) {
      case 'session_started': return { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-600' }
      case 'session_ended': return { bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500', text: 'text-rose-600' }
      case 'task_published': return { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', text: 'text-blue-600' }
      case 'task_ended': return { bg: 'bg-indigo-50', border: 'border-indigo-200', dot: 'bg-indigo-500', text: 'text-indigo-600' }
      case 'challenge_started': return { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', text: 'text-amber-600' }
      case 'challenge_ended': return { bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500', text: 'text-orange-600' }
      case 'student_joined': return { bg: 'bg-cyan-50', border: 'border-cyan-200', dot: 'bg-cyan-500', text: 'text-cyan-600' }
      case 'student_left': return { bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400', text: 'text-slate-500' }
      case 'share_approved': return { bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500', text: 'text-green-600' }
      case 'share_rejected': return { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-600' }
      default: return { bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-500', text: 'text-violet-600' }
    }
  }

  return (
    <div className="relative">
      <div
        className="relative max-h-[360px] overflow-y-auto pr-1"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 transparent',
        }}
      >
        {events.map((event, idx) => {
          const payload = event.payload_json || {}
          const detailRows = buildEventDetailRows(event, t, entryModeLabel, challengeModeLabel)
          const colors = getEventColor(event.event_type)
          const isLast = idx === events.length - 1

          return (
            <div key={event.id} className="relative flex gap-4 pb-6">
              {/* Left: timeline line + dot */}
              <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${colors.bg} border-2 ${colors.dot} shadow-sm`}>
                  <span className="text-base">{getEventIcon(event.event_type)}</span>
                </div>
                {!isLast && <div className="w-0.5 flex-1 bg-gradient-to-b from-slate-200 to-slate-100 mt-1" />}
              </div>

              {/* Right: content card */}
              <div className={`flex-1 rounded-xl ${colors.bg} border ${colors.border} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${colors.text}`}>
                      {eventTypeLabel[event.event_type as keyof typeof eventTypeLabel] || event.event_type}
                    </p>
                    {detailRows.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {detailRows.map((row, i) => (
                          <div key={`${event.id}-${row.label}-${i}`} className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400">{row.label}:</span>
                            <span className="font-medium text-slate-700">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!detailRows.length && Object.keys(payload).length > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        {Object.values(payload).filter((value) => typeof value !== 'object').map(String).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-md bg-white/80 px-2 py-1 text-xs font-mono font-medium text-slate-500 shadow-sm">
                    {formatClock(event.created_at)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
