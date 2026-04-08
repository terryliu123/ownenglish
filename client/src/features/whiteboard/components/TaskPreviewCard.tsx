import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LiveTaskGroup, LiveTaskData } from '../../../services/api'
import { useTranslation } from '../../../i18n/useTranslation'
import { TaskDetailPreview, TaskRichTextOrPlain } from '../../tasks/task-preview'
import { getTaskTypeLabel } from '../../tasks/task-helpers'

interface TaskPreviewCardProps {
  taskGroup: LiveTaskGroup
  onPublish: () => void
  onClose: () => void
  onProjectToWhiteboard?: (taskGroup: LiveTaskGroup) => void
  onStartClassChallenge?: () => void
  onStartDuel?: () => void
  onStartQuickAnswer?: () => void
}

export function TaskPreviewCard({
  taskGroup,
  onPublish,
  onClose,
  onProjectToWhiteboard,
  onStartClassChallenge,
  onStartDuel,
  onStartQuickAnswer,
}: TaskPreviewCardProps) {
  const { t } = useTranslation()
  const [position, setPosition] = useState({ x: 50, y: 45 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [isReadingExpanded, setIsReadingExpanded] = useState(false)

  const tasks = taskGroup.tasks || []
  const currentTask: LiveTaskData | null = tasks[currentTaskIndex] || null
  const canProject = currentTask ? currentTask.type !== 'reading' && currentTask.type !== 'experiment' : true

  useEffect(() => {
    setCurrentTaskIndex((previous) => {
      if (tasks.length === 0) return 0
      if (previous >= tasks.length) return 0
      return previous
    })
  }, [taskGroup.id, tasks.length])

  const actionItems = useMemo(
    () => [
      {
        key: 'class-challenge',
        label: t('whiteboard.classChallenge'),
        enabled: Boolean(onStartClassChallenge),
        onClick: onStartClassChallenge,
        className: 'text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100',
      },
      {
        key: 'duel',
        label: t('whiteboard.pkDuel'),
        enabled: Boolean(onStartDuel),
        onClick: onStartDuel,
        className: 'text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100',
      },
      {
        key: 'quick-answer',
        label: t('challenge.startSingleQuestionDuel'),
        enabled: Boolean(onStartQuickAnswer),
        onClick: onStartQuickAnswer,
        className: 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
      },
      {
        key: 'project',
        label: t('whiteboard.projectToWhiteboard'),
        enabled: Boolean(onProjectToWhiteboard && canProject),
        onClick: () => onProjectToWhiteboard?.(taskGroup),
        className: 'text-sky-600 border-sky-200 bg-sky-50 hover:bg-sky-100',
      },
      {
        key: 'publish',
        label: t('whiteboard.publishToStudents'),
        enabled: true,
        onClick: onPublish,
        className: 'text-white border-transparent bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600',
      },
      {
        key: 'close',
        label: t('common.close'),
        enabled: true,
        onClick: onClose,
        className: 'text-slate-700 border-slate-200 bg-white hover:bg-slate-100',
      },
    ],
    [canProject, onClose, onProjectToWhiteboard, onPublish, onStartClassChallenge, onStartDuel, onStartQuickAnswer, t, taskGroup],
  )

  const handleMouseDown = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.preview-card-header')) return
    setIsDragging(true)
    setDragOffset({ x: event.clientX, y: event.clientY })
    event.preventDefault()
    event.stopPropagation()
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging) return
    event.preventDefault()
    event.stopPropagation()

    const container = document.querySelector('.whiteboard-container')
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const deltaX = event.clientX - dragOffset.x
    const deltaY = event.clientY - dragOffset.y

    setDragOffset({ x: event.clientX, y: event.clientY })
    setPosition((previous) => ({
      x: Math.max(5, Math.min(previous.x + (deltaX / containerRect.width) * 100, 95)),
      y: Math.max(8, Math.min(previous.y + (deltaY / containerRect.height) * 100, 88)),
    }))
  }

  const handleMouseUp = (event?: React.MouseEvent) => {
    setIsDragging(false)
    event?.stopPropagation()
  }

  const renderTaskContent = () => {
    if (!currentTask) return null

    const question = (currentTask.question || {}) as Record<string, unknown>
    const isReadingTask = currentTask.type === 'reading'
    const questionText = typeof question.text === 'string' ? question.text : ''

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {getTaskTypeLabel(currentTask.type, t, t('taskLiveUI.questionFallback'))}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {/* 正确答案不在此预览中显示 */}
            {currentTask.countdown_seconds > 0 && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {currentTask.countdown_seconds}{t('task.seconds')}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
          {isReadingTask ? (
            <div className="space-y-4">
              {Boolean(questionText) && (
                <div>
                  <p className="text-xs mb-2 text-slate-500">{t('taskLiveUI.questionFallback')}</p>
                  <TaskRichTextOrPlain content={question.text} className="text-base leading-7 font-medium text-slate-800 [&_*]:!text-slate-800" />
                </div>
              )}
              {Boolean(question.passage) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">{t('taskGroupReading.readingPassagePreview')}</p>
                    <button
                      type="button"
                      onClick={() => setIsReadingExpanded(true)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                    >
                      {t('whiteboard.previewFullscreen')}
                    </button>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 max-h-64 overflow-y-auto">
                    <TaskRichTextOrPlain content={question.passage} className="whitespace-pre-wrap text-sm text-slate-700 [&_*]:!text-slate-700" />
                  </div>
                </div>
              )}
              {Boolean(question.prompt) && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t('taskGroupReading.readingPromptPreview')}</p>
                  <TaskRichTextOrPlain content={question.prompt} className="text-sm text-slate-700 [&_*]:!text-slate-700" />
                </div>
              )}
              {question.answer_required === false ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {t('taskGroupReading.readingNoAnswerRequired')}
                </div>
              ) : (
                <textarea
                  readOnly
                  className="w-full min-h-[120px] px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-400"
                  placeholder={t('taskGroupReading.readingAnswerPlaceholder')}
                />
              )}
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs mb-2 text-slate-500">{t('taskLiveUI.questionFallback')}</p>
                <div className="text-slate-800 leading-7 [&_*]:!text-slate-800">
                  <TaskRichTextOrPlain content={question.text} />
                </div>
              </div>
              <TaskDetailPreview
                task={currentTask}
                t={t}
                wrapperClassName="space-y-3 [&_*]:!text-slate-800 [&_.text-slate-500]:!text-slate-500 [&_.text-slate-600]:!text-slate-600 [&_.text-slate-700]:!text-slate-700"
              />
            </>
          )}
        </div>
      </div>
    )
  }

  const card = (
    <div
      className="pointer-events-auto absolute select-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        width: 'min(720px, calc(100vw - 64px))',
        maxHeight: 'calc(100vh - 120px)',
        zIndex: 240,
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div
          className="preview-card-header cursor-move border-b border-slate-200 bg-slate-50/80 px-5 py-4"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-slate-900">{taskGroup.title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {t('whiteboard.questionCounter')
                  .replace('{{current}}', String(currentTaskIndex + 1))
                  .replace('{{total}}', String(tasks.length))}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100"
            >
              {t('common.close')}
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-260px)] overflow-y-auto px-5 py-5">
          {currentTask ? (
            renderTaskContent()
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              {t('taskGroup.noTasks')}
            </div>
          )}

          {tasks.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setCurrentTaskIndex((previous) => Math.max(0, previous - 1))
                }}
                disabled={currentTaskIndex === 0}
                className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-slate-600">
                {t('whiteboard.questionCounter')
                  .replace('{{current}}', String(currentTaskIndex + 1))
                  .replace('{{total}}', String(tasks.length))}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setCurrentTaskIndex((previous) => Math.min(tasks.length - 1, previous + 1))
                }}
                disabled={currentTaskIndex === tasks.length - 1}
                className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {actionItems.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  if (!action.enabled) return
                  action.onClick?.()
                }}
                disabled={!action.enabled}
                className={`min-h-[48px] rounded-xl border text-sm font-medium transition-colors flex items-center justify-center text-center px-3 ${action.className} ${!action.enabled ? 'opacity-45 cursor-not-allowed saturate-50' : ''}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(
    <>
      <div className="fixed inset-0 z-[230] pointer-events-none">
        {card}
      </div>
      {isReadingExpanded && currentTask?.type === 'reading' && createPortal(
        <div className="fixed inset-0 z-[280] bg-black/50 flex items-center justify-center p-4" onClick={() => setIsReadingExpanded(false)}>
          <div
            className="w-[min(960px,96vw)] h-[min(88vh,900px)] rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] flex flex-col overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-slate-900">{taskGroup.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('taskGroupReading.readingPassagePreview')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsReadingExpanded(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100"
              >
                {t('common.close')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {Boolean((currentTask.question as Record<string, unknown>)?.text) && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">{t('taskLiveUI.questionFallback')}</p>
                  <TaskRichTextOrPlain
                    content={(currentTask.question as Record<string, unknown>)?.text}
                    className="text-base leading-7 font-medium text-slate-800 [&_*]:!text-slate-800"
                  />
                </div>
              )}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <TaskRichTextOrPlain
                  content={(currentTask.question as Record<string, unknown>)?.passage}
                  className="whitespace-pre-wrap text-base leading-8 text-slate-800 [&_*]:!text-slate-800"
                />
              </div>
              {Boolean((currentTask.question as Record<string, unknown>)?.prompt) && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">{t('taskGroupReading.readingPromptPreview')}</p>
                  <TaskRichTextOrPlain
                    content={(currentTask.question as Record<string, unknown>)?.prompt}
                    className="text-sm text-slate-700 [&_*]:!text-slate-700"
                  />
                </div>
              )}
              {(currentTask.question as Record<string, unknown>)?.answer_required === false ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {t('taskGroupReading.readingNoAnswerRequired')}
                </div>
              ) : (
                <textarea
                  readOnly
                  className="w-full min-h-[140px] px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-400"
                  placeholder={t('taskGroupReading.readingAnswerPlaceholder')}
                />
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>,
    document.body,
  )
}
