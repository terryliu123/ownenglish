import React, { useState } from 'react'
import { getTaskQuestionText } from '../../tasks/task-formatting'
import { getTaskTypeConfig } from '../../tasks/task-config'
import type { LiveTaskGroupSession } from '../types'

interface ActiveTaskGroupProps {
  currentTaskGroup: LiveTaskGroupSession
  taskGroupSubmissions: number
  taskGroupEnded: boolean
  classroomStudentCount: number
  onEndTaskGroup: () => void
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

export const ActiveTaskGroup: React.FC<ActiveTaskGroupProps> = ({
  currentTaskGroup,
  taskGroupSubmissions,
  taskGroupEnded,
  classroomStudentCount,
  onEndTaskGroup,
  t,
  tWithParams,
}) => {
  const [showTaskPreview, setShowTaskPreview] = useState(false)

  return (
    <section className="mb-6">
      <div className="surface-card">
        <div className="surface-head">
          <h3>{tWithParams('teacherLive.taskGroup', { title: currentTaskGroup.title })}</h3>
          <div className="flex items-center gap-2">
            <span className="status-badge active">{t('teacherLive.active')}</span>
            <button
              className="ghost-button py-1 px-3 text-xs"
              onClick={() => setShowTaskPreview(true)}
            >
              {t('live.enterClass')}
            </button>
          </div>
        </div>

        {/* Task group stats */}
        <div className="flex gap-4 mb-4">
          <div className="meta-chip">
            📋 {tWithParams('teacherLive.taskCountLabel', { count: currentTaskGroup.tasks.length })}
          </div>
          <div className="meta-chip">
            {tWithParams('teacherLive.submittedSummary', {
              submitted: taskGroupSubmissions,
              total: classroomStudentCount,
            })}
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-3 mb-4">
          {currentTaskGroup.tasks.map((task, index) => (
            <div
              key={task.task_id}
              className="p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(24,36,58,0.08)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium"
                  style={{ background: 'var(--surface)' }}
                >
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="truncate">
                    {getTaskTypeIcon(task.type)} {getTaskQuestionText(task.question) || `${t('task.question')} ${index + 1}`}
                  </p>
                  {taskGroupEnded && (
                    <p className="text-xs text-green-600">
                      {t('teacherLive.correctAnswerSimple')}: {(task.question as any)?.correct_answer}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="action-stack">
          {taskGroupEnded ? (
            <button className="solid-button" disabled>
              {t('teacherLive.ended')}
            </button>
          ) : (
            <button className="solid-button" onClick={onEndTaskGroup}>
              {t('teacherLive.endTaskGroup')}
            </button>
          )}
        </div>
      </div>

      {/* Task preview modal */}
      {showTaskPreview && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div
            className="modal-content surface-card"
            style={{ maxWidth: '480px', maxHeight: '90vh', overflow: 'auto' }}
          >
            <div className="surface-head">
              <div>
                <h3>{currentTaskGroup.title}</h3>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {tWithParams('teacherLive.taskCountLabel', { count: currentTaskGroup.tasks.length })}
                </p>
              </div>
              <button className="icon-button" onClick={() => setShowTaskPreview(false)}>
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {currentTaskGroup.tasks.map((task, idx) => (
                <div
                  key={task.task_id}
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(24,36,58,0.08)' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: 'var(--navy)', color: '#fff' }}
                    >
                      {idx + 1}
                    </span>
                    <span className="meta-chip" style={{ fontSize: '0.7rem' }}>
                      {getTaskTypeLabel(task.type, t, t('teacherLive.other'))}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>
                    {getTaskQuestionText(task.question) || `${t('task.question')} ${idx + 1}`}
                  </p>
                </div>
              ))}
            </div>
            <div className="action-stack mt-4">
              <button className="solid-button" onClick={() => setShowTaskPreview(false)}>
                {t('teacherLive.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// Helper function for task type label
function getTaskTypeLabel(type: string, t: (key: string) => string, fallback: string): string {
  const labels: Record<string, string> = {
    single_choice: t('taskType.singleChoice') || '单选题',
    multiple_choice: t('taskType.multipleChoice') || '多选题',
    true_false: t('taskType.trueFalse') || '判断题',
    fill_blank: t('taskType.fillBlank') || '填空题',
    matching: t('taskType.matching') || '配对题',
    sorting: t('taskType.sorting') || '排序题',
    image_understanding: t('taskType.imageUnderstanding') || '图片理解',
  }
  return labels[type] || fallback
}
