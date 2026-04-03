import React from 'react'
import type { LiveTaskGroup } from '../../../services/api'
import { getTaskTypeConfig } from '../../tasks/task-config'
import { getTaskQuestionText } from '../../tasks/task-formatting'

interface TaskPublisherProps {
  selectedGroup: LiveTaskGroup | null
  wsStatus: string
  hasActiveChallenge: boolean
  challengeCandidates: { id: string; name: string }[]
  canStartStandardChallenge: boolean
  canStartSingleQuestionDuel: boolean
  unsupportedChallengeLabels: string[]
  classroomStudentCount: number
  onlineStudentCount: number
  currentClassName: string
  onPublish: () => void
  onStartClassChallenge: () => void
  onShowDuelModal: () => void
  onShowSingleQuestionDuelModal: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

const getTaskTypeIcon = (type: string) => {
  const defaultIcons: Record<string, string> = {
    single_choice: '📝',
    multiple_choice: '📝',
    true_false: '✅',
    fill_blank: '📝',
    matching: '🔗',
    reading: '📖',
  }
  return getTaskTypeConfig(type)?.icon || defaultIcons[type] || '❓'
}

export const TaskPublisher: React.FC<TaskPublisherProps> = ({
  selectedGroup,
  wsStatus,
  hasActiveChallenge,
  challengeCandidates,
  canStartStandardChallenge,
  canStartSingleQuestionDuel,
  unsupportedChallengeLabels,
  classroomStudentCount,
  onlineStudentCount,
  currentClassName,
  onPublish,
  onStartClassChallenge,
  onShowDuelModal,
  onShowSingleQuestionDuelModal,
  t,
  tWithParams,
}) => {
  if (!selectedGroup) {
    return (
      <article className="surface-card">
        <div className="surface-head">
          <h3>{t('teacherLive.noGroupSelected')}</h3>
        </div>
        <div className="p-6 text-center">
          <p style={{ color: 'var(--muted)' }}>{t('teacherLive.selectFromLeft')}</p>
        </div>
      </article>
    )
  }

  return (
    <article
      className="surface-card"
      style={{ border: selectedGroup ? '2px solid rgba(56, 189, 248, 0.3)' : undefined }}
    >
      <div className="surface-head">
        <h3>📂 {selectedGroup.title}</h3>
        {selectedGroup.tasks && selectedGroup.tasks.length > 0 && (
          <div className="flex items-center gap-3">
            <span>
              {tWithParams('teacherLive.groupTaskCount', { count: selectedGroup.tasks?.length || 0 })}
            </span>
            <button
              className="ghost-button py-2 px-4 text-sm"
              onClick={onShowSingleQuestionDuelModal}
              disabled={!canStartSingleQuestionDuel || challengeCandidates.length < 2}
            >
              {t('challenge.startSingleQuestionDuel')}
            </button>
            <button
              className="ghost-button py-2 px-4 text-sm"
              onClick={onShowDuelModal}
              disabled={!canStartStandardChallenge || challengeCandidates.length < 2}
            >
              {t('challenge.startDuel')}
            </button>
            <button
              className="ghost-button py-2 px-4 text-sm"
              onClick={onStartClassChallenge}
              disabled={!canStartStandardChallenge || challengeCandidates.length < 1}
            >
              {t('challenge.startClassChallenge')}
            </button>
            <button
              className="solid-button py-2 px-4 text-sm"
              onClick={onPublish}
              disabled={wsStatus !== 'connected' || hasActiveChallenge}
            >
              {t('teacherLive.publishAll')}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {selectedGroup.tasks?.map((task, idx) => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(24,36,58,0.08)' }}
          >
            <span
              className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium"
              style={{ background: 'var(--surface)' }}
            >
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate">
                {getTaskTypeIcon(task.type)} {getTaskQuestionText(task.question) || `${t('task.question')} ${idx + 1}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {selectedGroup.tasks && selectedGroup.tasks.length > 0 && (
        <>
          <div
            className="mt-4 p-4 rounded-xl"
            style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)' }}
          >
            <p className="text-sm flex items-center gap-2">
              <span>📢</span>
              <span style={{ color: '#0369a1' }}>
                {tWithParams('teacherLive.publishSummary', {
                  className: currentClassName,
                  online: onlineStudentCount,
                  inClass: classroomStudentCount,
                })}
              </span>
            </p>
          </div>

          <div
            className="mt-4 p-4 rounded-xl"
            style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.22)' }}
          >
            <p className="text-sm" style={{ color: '#047857' }}>
              {tWithParams('challenge.supportedSummary', {
                online: onlineStudentCount,
                inClass: classroomStudentCount,
              })}
            </p>
          </div>

          {unsupportedChallengeLabels.length > 0 && (
            <div
              className="mt-4 p-4 rounded-xl"
              style={{ background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.22)' }}
            >
              <p className="text-sm" style={{ color: '#b91c1c' }}>
                {tWithParams('challenge.unsupportedTypesInline', { types: unsupportedChallengeLabels.join('、') })}
              </p>
            </div>
          )}
        </>
      )}
    </article>
  )
}
