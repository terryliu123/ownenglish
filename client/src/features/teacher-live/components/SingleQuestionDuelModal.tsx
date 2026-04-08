import React, { useMemo, useState } from 'react'
import { getTaskQuestionText } from '../../tasks/task-formatting'
import { getTaskTypeLabel } from '../../tasks/task-helpers'

interface SingleQuestionDuelModalProps {
  show: boolean
  tasks: Array<{ id?: string; task_id?: string; type: string; question: unknown }>
  selectedTaskId: string | null
  selectedParticipants: string[]
  challengeCandidates: { id: string; name: string }[]
  challengeCreating: boolean
  onClose: () => void
  onSelectTask: (taskId: string) => void
  onToggleParticipant: (studentId: string) => void
  onConfirm: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export const SingleQuestionDuelModal: React.FC<SingleQuestionDuelModalProps> = ({
  show,
  tasks,
  selectedTaskId,
  selectedParticipants,
  challengeCandidates,
  challengeCreating,
  onClose,
  onSelectTask,
  onToggleParticipant,
  onConfirm,
  t,
  tWithParams,
}) => {
  if (!show) return null

  const [searchTerm, setSearchTerm] = useState('')

  const visibleCandidates = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    const filtered = !keyword
      ? challengeCandidates
      : challengeCandidates.filter((student) => student.name.toLowerCase().includes(keyword))

    return [...filtered].sort((left, right) => {
      const leftSelected = selectedParticipants.includes(left.id)
      const rightSelected = selectedParticipants.includes(right.id)
      if (leftSelected !== rightSelected) return leftSelected ? -1 : 1
      return left.name.localeCompare(right.name, 'zh-CN')
    })
  }, [challengeCandidates, searchTerm, selectedParticipants])

  return (
    <div className="fixed inset-0 z-[1500] flex items-start justify-center pt-24 pb-5 px-5" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div
        className="modal-content surface-card"
        style={{ maxWidth: '840px', maxHeight: 'min(84vh, 820px)', display: 'flex', flexDirection: 'column', marginTop: '40px', marginBottom: '40px' }}
      >
        <div className="surface-head">
          <div>
            <h3 style={{ color: '#0f172a' }}>{t('challenge.selectSingleQuestionDuel')}</h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {tWithParams('challenge.selectDuelDescription', { count: selectedParticipants.length })}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t('common.close')} style={{ color: '#475569' }}>
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
          <div>
            <h4 className="font-medium mb-2 text-slate-900">{t('challenge.selectBuzzQuestion')}</h4>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {tasks.map((task, index) => {
                const taskId = task.id ?? task.task_id ?? ''
                const selected = selectedTaskId === taskId

                return (
                  <button
                    key={taskId}
                    type="button"
                    className="w-full min-w-0 p-4 rounded-xl text-left transition-all"
                    onClick={() => onSelectTask(taskId)}
                    style={{
                      background: selected ? 'rgba(14, 165, 233, 0.12)' : 'rgba(255,255,255,0.9)',
                      border: selected ? '1px solid rgba(14,165,233,0.35)' : '1px solid rgba(24,36,58,0.08)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-medium"
                        style={{ background: 'rgba(148, 163, 184, 0.12)', color: '#334155' }}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium break-words" style={{ color: selected ? '#0c4a6e' : '#0f172a' }}>
                          {getTaskQuestionText(task.question as { text?: unknown }) || t('taskLiveUI.questionFallback')}
                        </div>
                        <div className="text-sm mt-1 break-words" style={{ color: selected ? '#0369a1' : '#64748b' }}>
                          {getTaskTypeLabel(task.type, t, task.type)}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2 text-slate-900">{t('challenge.selectDuelParticipants')}</h4>
            <div className="mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('challenge.searchStudents')}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-300"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleCandidates.map((student) => {
                const selected = selectedParticipants.includes(student.id)

                return (
                  <button
                    key={student.id}
                    type="button"
                    className="h-[96px] min-w-0 p-4 rounded-xl text-left transition-all overflow-hidden"
                    onClick={() => onToggleParticipant(student.id)}
                    style={{
                      background: selected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.9)',
                      border: selected ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(24,36,58,0.08)',
                    }}
                  >
                    <div
                      className="font-medium break-words overflow-hidden"
                      style={{
                        color: selected ? '#059669' : '#0f172a',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {student.name}
                    </div>
                    <div className="text-sm mt-1 break-words" style={{ color: selected ? '#059669' : '#64748b' }}>
                      {selected ? t('challenge.selected') : t('challenge.clickToSelect')}
                    </div>
                  </button>
                )
              })}
            </div>
            {visibleCandidates.length === 0 && (
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                {t('challenge.noMatchingStudents')}
              </div>
            )}
          </div>
        </div>

        <div className="action-stack mt-4">
          <button className="ghost-button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="solid-button"
            disabled={!selectedTaskId || selectedParticipants.length !== 2 || challengeCreating}
            onClick={onConfirm}
          >
            {t('challenge.confirmStart')}
          </button>
        </div>
      </div>
    </div>
  )
}
