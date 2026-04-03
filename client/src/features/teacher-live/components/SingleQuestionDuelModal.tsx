import React from 'react'
import { getTaskQuestionText } from '../../tasks/task-formatting'
import { getTaskTypeLabel } from '../../tasks/task-helpers'

interface SingleQuestionDuelModalProps {
  show: boolean
  tasks: any[]
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

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content surface-card" style={{ maxWidth: '780px' }}>
        <div className="surface-head">
          <div>
            <h3>{t('challenge.selectSingleQuestionDuel')}</h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {tWithParams('challenge.selectDuelDescription', { count: selectedParticipants.length })}
            </p>
          </div>
          <button className="icon-button" onClick={onClose}>×</button>
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">{t('challenge.selectBuzzQuestion')}</h4>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {tasks.map((task: any, idx: number) => {
                const taskId = task?.id ?? task?.task_id
                const selected = selectedTaskId === taskId
                return (
                  <button
                    key={taskId}
                    type="button"
                    className="w-full p-4 rounded-xl text-left transition-all"
                    onClick={() => onSelectTask(taskId)}
                    style={{
                      background: selected ? 'rgba(14, 165, 233, 0.12)' : 'rgba(255,255,255,0.7)',
                      border: selected ? '1px solid rgba(14,165,233,0.35)' : '1px solid rgba(24,36,58,0.08)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                        style={{ background: 'var(--surface)' }}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{getTaskQuestionText(task.question)}</div>
                        <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
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
            <h4 className="font-medium mb-2">{t('challenge.selectDuelParticipants')}</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {challengeCandidates.map((student) => {
                const selected = selectedParticipants.includes(student.id)
                return (
                  <button
                    key={student.id}
                    type="button"
                    className="p-4 rounded-xl text-left transition-all"
                    onClick={() => onToggleParticipant(student.id)}
                    style={{
                      background: selected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.7)',
                      border: selected ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(24,36,58,0.08)',
                    }}
                  >
                    <div className="font-medium" style={{ color: selected ? '#059669' : '#1e293b' }}>{student.name}</div>
                    <div className="text-sm mt-1" style={{ color: selected ? '#059669' : '#64748b' }}>
                      {selected ? t('challenge.selected') : t('challenge.clickToSelect')}
                    </div>
                  </button>
                )
              })}
            </div>
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
