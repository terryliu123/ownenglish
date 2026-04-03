import { useState } from 'react'
import { createPortal } from 'react-dom'
import { LiveTask, TaskResult } from '../../services/websocket'
import {
  isReadingTask,
  isExperimentTask,
  readingAnswerRequired,
  taskSupportsBlanks,
  taskSupportsPairs,
  taskSupportsSorting,
  taskUsesBooleanAnswer,
  taskUsesMultiChoiceAnswer,
} from './task-config'
import { getTaskTypeLabel } from './task-helpers'
import { buildTaskAnswerFromAnswerMap, evaluateTaskCorrectness, hasTaskAnswer, isNeutralReadingTask } from './task-evaluation'
import { formatTaskAnswer, getTaskQuestionText, unwrapAnswerValue } from './task-formatting'
import { TaskQuestionImage, TaskRichTextOrPlain } from './task-preview'
import { useTranslation } from '../../i18n/useTranslation'
import { ExperimentIframe } from './experiment-iframe'

interface TeacherStudentSubmissionCardProps {
  task: LiveTask | any
  index: number
  studentAnswer: unknown
}

interface StudentTaskResultCardProps {
  task: LiveTask
  index: number
  result?: TaskResult
  answers: Map<string, string>
}

interface StudentTaskQuestionCardProps {
  task: LiveTask
  index: number
  answers: Map<string, string>
  submitted: boolean
  matchingLayout?: number[]
  sortingOrder?: string[]
  localCorrect?: boolean | null
  onSelectAnswer: (taskId: string, answer: string, taskType?: string) => void
  onPatchAnswer: (key: string, value: string | null) => void
}

export function TeacherStudentSubmissionCard({
  task,
  index,
  studentAnswer,
}: TeacherStudentSubmissionCardProps) {
  const { t } = useTranslation()
  const rawCorrectAnswer = task.correct_answer || task.question?.correct_answer
  const correctAnswer = unwrapAnswerValue(rawCorrectAnswer)
  const answered = hasTaskAnswer(studentAnswer)
  const correct = evaluateTaskCorrectness(task, studentAnswer, rawCorrectAnswer)
  const readingCompletedOnly = isNeutralReadingTask(task, correctAnswer)
  const accentColor = !answered
    ? '#6b7280'
    : readingCompletedOnly
    ? '#2563eb'
    : correct
    ? '#15803d'
    : '#dc2626'
  const accentBg = !answered
    ? 'rgba(156,163,175,0.15)'
    : readingCompletedOnly
    ? 'rgba(59,130,246,0.15)'
    : correct
    ? 'rgba(34,197,94,0.15)'
    : 'rgba(239,68,68,0.15)'
  const accentBgLight = !answered
    ? 'rgba(156,163,175,0.08)'
    : readingCompletedOnly
    ? 'rgba(59,130,246,0.08)'
    : correct
    ? 'rgba(34,197,94,0.08)'
    : 'rgba(239,68,68,0.08)'
  const questionText = getTaskQuestionText(task.question) || `${t('taskLiveUI.questionFallback')} ${index + 1}`

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: accentBgLight,
        border: `1px solid ${accentBg.replace('0.15', '0.2').replace('0.08', '0.2')}`,
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: accentBg.replace('0.15', '0.2'), color: accentColor }}
        >
          {index + 1}
        </span>
        <span
          className="px-2 py-1 rounded text-xs font-medium"
          style={{ background: accentBg, color: accentColor }}
        >
          {!answered
            ? t('task.unanswered')
            : readingCompletedOnly
            ? t('taskGroupReading.readingCompleted')
            : correct
            ? t('task.correct')
            : t('task.incorrect')}
        </span>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          {getTaskTypeLabel(task.type, t, t('taskLiveUI.questionFallback'))}
        </span>
      </div>

      <p className="font-medium mb-3">{questionText}</p>
      <TaskQuestionImage
        question={(task.question || {}) as Record<string, unknown>}
        alt={questionText}
        wrapperClassName="mb-4 rounded-2xl overflow-hidden border border-slate-200 bg-white"
      />

      {isReadingTask(task) && task.question?.passage && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white/80 p-4 max-h-60 overflow-y-auto">
          <TaskRichTextOrPlain content={task.question.passage} className="whitespace-pre-wrap text-sm text-slate-700" />
        </div>
      )}

      {isReadingTask(task) && task.question?.prompt && (
        <div className="mb-4">
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
            {t('taskGroupReading.readingPromptPreview')}
          </p>
          <TaskRichTextOrPlain content={task.question.prompt} className="text-sm text-slate-700" />
        </div>
      )}

      {isExperimentTask(task) && task.question?.html_url && (
        <div className="mb-4 rounded-2xl border border-slate-200 overflow-hidden">
          <ExperimentIframe
            src={String(task.question.html_url)}
            className="w-full"
            style={{ minHeight: 300, border: 'none' }}
            title="Experiment"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
            {t('taskLiveUI.studentAnswerLabel')}
          </p>
          <p style={{ color: accentColor, fontWeight: 500 }}>
            {!answered ? t('task.unanswered') : formatTaskAnswer(studentAnswer, task, t)}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
            {t('taskLiveUI.correctAnswerLabel')}
          </p>
          <p style={{ color: '#15803d', fontWeight: 500 }}>
            {formatTaskAnswer(correctAnswer, task, t)}
          </p>
        </div>
      </div>
    </div>
  )
}

export function StudentTaskResultCard({
  task,
  index,
  result,
  answers,
}: StudentTaskResultCardProps) {
  const { t } = useTranslation()
  const taskId = task.task_id || String((task as { id?: string }).id || '')
  const question = (task.question || {}) as Record<string, unknown>
  const studentAnswer = buildTaskAnswerFromAnswerMap(task, answers)
  const normalizedCorrectAnswer = unwrapAnswerValue(result?.correct_answer)
  const correct = evaluateTaskCorrectness(task, studentAnswer, result?.correct_answer)
  const readingCompletedOnly = isNeutralReadingTask(task, result?.correct_answer)
  const questionText = getTaskQuestionText(task.question) || `${t('taskLiveUI.questionFallback')} ${index + 1}`

  return (
    <div className="student-card">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
          {index + 1}
        </span>
        <span className={`status-badge ${correct === true ? 'correct' : 'incorrect'}`}>
          {readingCompletedOnly ? t('taskGroupReading.readingCompleted') : correct ? t('taskLiveUI.correct') : t('taskLiveUI.incorrect')}
        </span>
      </div>

      <p className="question-text mb-4">{questionText}</p>
      <TaskQuestionImage
        question={question}
        alt={questionText}
        wrapperClassName="mb-4 rounded-2xl overflow-hidden border border-slate-200 bg-white"
      />

      {isReadingTask(task) && (
        <div className="mb-4 space-y-3">
          {Boolean(question.passage) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <TaskRichTextOrPlain content={question.passage} className="whitespace-pre-wrap text-sm text-slate-700" />
            </div>
          )}
          {Boolean(question.prompt) && (
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('taskGroupReading.readingPromptPreview')}</p>
              <TaskRichTextOrPlain content={question.prompt} className="text-sm text-slate-700" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs mb-1 text-gray-500">{t('taskGroupReading.readingStudentAnswer')}</p>
              <p className={readingCompletedOnly || correct === true ? 'text-green-600' : 'text-red-600'}>
                {!readingAnswerRequired(task)
                  ? t('taskGroupReading.readingSubmitted')
                  : String(studentAnswer || t('task.unanswered'))}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1 text-gray-500">{t('taskGroupReading.readingTeacherAnswer')}</p>
              <p className="text-green-600">
                {!readingAnswerRequired(task)
                  ? t('taskGroupReading.readingNoAnswerRequired')
                  : (() => {
                      const answer = result?.correct_answer
                      if (answer && typeof answer === 'object' && 'value' in answer) {
                        return String((answer as { value?: string }).value || t('taskGroupReading.readingNoAnswerRequired'))
                      }
                      return String(answer || t('taskGroupReading.readingNoAnswerRequired'))
                    })()}
              </p>
            </div>
          </div>
        </div>
      )}

      {isExperimentTask(task) && (
        <div className="mb-4 space-y-3">
          {Boolean(question.html_url) && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <ExperimentIframe
                src={String(question.html_url)}
                className="w-full"
                style={{ minHeight: 300, border: 'none' }}
                title="Experiment"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs mb-1 text-gray-500">{t('taskGroupReading.readingStudentAnswer')}</p>
              <p className={correct === true ? 'text-green-600' : 'text-red-600'}>
                {task.question.answer_required === false
                  ? t('taskGroupReading.experimentNoAnswerRequired')
                  : String(studentAnswer || t('task.unanswered'))}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1 text-gray-500">{t('taskGroupReading.experimentReferenceAnswerLabel')}</p>
              <p className="text-green-600">
                {task.question.answer_required === false
                  ? t('taskGroupReading.experimentNoAnswerRequired')
                  : (() => {
                      const answer = result?.correct_answer
                      if (answer && typeof answer === 'object' && 'value' in answer) {
                        return String((answer as { value?: string }).value || t('taskGroupReading.experimentNoAnswerRequired'))
                      }
                      return String(answer || t('taskGroupReading.experimentNoAnswerRequired'))
                    })()}
              </p>
            </div>
          </div>
        </div>
      )}
      {task.question.options && !isReadingTask(task) && !isExperimentTask(task) && !taskSupportsSorting(task.type) && (
        <div className="option-list">
          {task.question.options.map((opt) => {
            const isMultipleChoice = taskUsesMultiChoiceAnswer(task.type)
            const studentAnswers = Array.isArray(studentAnswer)
              ? studentAnswer.map(String)
              : studentAnswer
              ? String(studentAnswer).split(',')
              : []
            const isSelected = isMultipleChoice ? studentAnswers.includes(opt.key) : studentAnswer === opt.key
            const correctAnswers = Array.isArray(normalizedCorrectAnswer)
              ? normalizedCorrectAnswer.map(String)
              : [String(normalizedCorrectAnswer)]
            const isCorrectAnswer = correctAnswers.includes(opt.key)

            return (
              <div
                key={opt.key}
                className={`option-line ${isCorrectAnswer ? 'correct' : ''} ${isSelected && !isCorrectAnswer ? 'incorrect' : ''}`}
              >
                <span>{opt.key}</span>
                <p><TaskRichTextOrPlain content={opt.text} /></p>
                {isCorrectAnswer && <span className="correct-badge">{t('taskLiveUI.correctAnswer')}</span>}
                {isSelected && !isCorrectAnswer && <span className="incorrect-badge">{t('taskLiveUI.studentAnswer')}</span>}
              </div>
            )
          })}
        </div>
      )}

      {taskSupportsSorting(task.type) && task.question.options && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium mb-3">{t('taskSorting.resultTitle')}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs mb-1 text-gray-500">{t('taskLiveUI.studentAnswer')}</p>
              <div className="space-y-1">
                {Array.isArray(studentAnswer) && studentAnswer.length > 0 ? (
                  studentAnswer.map((value, sortIndex) => {
                    const option = task.question.options?.find((item) => item.key === String(value))
                    return (
                      <p key={`${value}-${sortIndex}`} className="text-slate-700">
                        {sortIndex + 1}. <TaskRichTextOrPlain content={option?.text || String(value)} />
                      </p>
                    )
                  })
                ) : (
                  <p className="text-red-600">{t('task.unanswered')}</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs mb-1 text-gray-500">{t('taskSorting.sortingAnswer')}</p>
              <div className="space-y-1">
                {Array.isArray(normalizedCorrectAnswer) && normalizedCorrectAnswer.map((value, sortIndex) => {
                  const option = task.question.options?.find((item) => item.key === String(value))
                  return (
                    <p key={`${value}-${sortIndex}`} className="text-green-600">
                      {sortIndex + 1}. <TaskRichTextOrPlain content={option?.text || String(value)} />
                    </p>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {taskSupportsBlanks(task.type) && task.question?.blanks && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium mb-3">{t('taskLiveUI.fillBlankAnswers')}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs mb-1 text-gray-500">{t('taskLiveUI.studentAnswer')}</p>
              <div className="space-y-1">
                {task.question.blanks.map((_: any, blankIndex: number) => {
                  const answer = answers.get(`${taskId}_blank_${blankIndex}`) || t('task.unanswered')
                  const correctAnswer = Array.isArray(normalizedCorrectAnswer) ? normalizedCorrectAnswer[blankIndex] : ''
                  const isMatch = String(answer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()
                  return (
                    <p key={blankIndex} className={isMatch ? 'text-green-600' : 'text-red-600'}>
                      {tWithIndex(t, 'taskLiveUI.blankLabel', blankIndex + 1)}: {answer}
                    </p>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="text-xs mb-1 text-gray-500">{t('taskLiveUI.correctAnswer')}</p>
              <div className="space-y-1">
                {task.question.blanks.map((_: any, blankIndex: number) => {
                  const correctAnswer = Array.isArray(normalizedCorrectAnswer) ? normalizedCorrectAnswer[blankIndex] : ''
                  return (
                    <p key={blankIndex} className="text-green-600">
                      {tWithIndex(t, 'taskLiveUI.blankLabel', blankIndex + 1)}: {correctAnswer || '-'}
                    </p>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {taskSupportsPairs(task.type) && task.question?.pairs && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium mb-3">{t('taskLiveUI.matchingResult')}</p>
          <div className="space-y-2 text-sm">
            {task.question.pairs.map((pair: any, pairIndex: number) => {
              const studentLeftIdx = answers.get(`${taskId}_right_${pairIndex}`)
              const correctLeftIdx = Array.isArray(normalizedCorrectAnswer) ? normalizedCorrectAnswer[pairIndex] : -1
              const isMatch = String(studentLeftIdx) === String(correctLeftIdx)
              const normalizedStudentLeftIdx =
                studentLeftIdx !== undefined && studentLeftIdx !== '' ? Number(studentLeftIdx) : -1
              const studentLeftText =
                studentLeftIdx !== undefined && studentLeftIdx !== '' && normalizedStudentLeftIdx !== -1
                  ? task.question.pairs?.[normalizedStudentLeftIdx]?.left || t('taskLiveUI.unselected')
                  : t('task.unanswered')

              return (
                <div key={pairIndex} className="flex items-center gap-4">
                  <span className="text-gray-600"><TaskRichTextOrPlain content={pair.right} /></span>
                  <span className="text-gray-400">→</span>
                  <span className={isMatch ? 'text-green-600 font-medium' : 'text-red-600'}>
                    <TaskRichTextOrPlain content={studentLeftText} />
                  </span>
                  {!isMatch && (
                    <span className="text-green-600 text-xs">
                      {t('taskLiveUI.correctPrefix')}<TaskRichTextOrPlain content={task.question.pairs?.[correctLeftIdx]?.left} />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function StudentTaskQuestionCard({
  task,
  index,
  answers,
  submitted,
  matchingLayout,
  sortingOrder,
  localCorrect,
  onSelectAnswer,
  onPatchAnswer,
}: StudentTaskQuestionCardProps) {
  const { t, tWithParams } = useTranslation()
  const [experimentFullscreen, setExperimentFullscreen] = useState(false)
  const taskId = task.task_id || String((task as { id?: string }).id || '')
  const question = (task.question || {}) as Record<string, unknown>
  const selectedAnswer = answers.get(taskId)
  const questionText = getTaskQuestionText(task.question) || `${t('taskLiveUI.questionFallback')} ${index + 1}`
  const orderedRightIndices =
    matchingLayout || (Array.isArray(question.pairs) ? question.pairs.map((_: any, pairIndex: number) => pairIndex) : []) || []

  return (
    <div className="student-card">
      <div className="flex items-center gap-3 mb-4">
        <span className="question-number">{index + 1}</span>
        <span className="text-sm text-gray-500">
          {getTaskTypeLabel(task.type, t, t('taskLiveUI.questionFallback'))}
        </span>
        {localCorrect != null && submitted && (
          <span
            className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: localCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: localCorrect ? '#15803d' : '#dc2626',
            }}
          >
            {localCorrect ? '✓' : '✗'}
          </span>
        )}
      </div>

      <p className="question-text mb-4">{questionText}</p>
      <TaskQuestionImage
        question={question}
        alt={questionText}
        wrapperClassName="mb-4 rounded-2xl overflow-hidden border border-slate-200 bg-white"
      />

      {isReadingTask(task) && (
        <div className="space-y-4">
          {Boolean(question.passage) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <TaskRichTextOrPlain content={question.passage} className="whitespace-pre-wrap text-sm text-slate-700" />
            </div>
          )}
          {Boolean(question.prompt) && (
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('taskGroupReading.readingPromptPreview')}</p>
              <TaskRichTextOrPlain content={question.prompt} className="text-sm text-slate-700" />
            </div>
          )}
          {readingAnswerRequired(task) ? (
            <textarea
              className="w-full min-h-[120px] px-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
              placeholder={t('taskGroupReading.readingAnswerPlaceholder')}
              value={answers.get(taskId) || ''}
              onChange={(event) => onSelectAnswer(taskId, event.target.value)}
              disabled={submitted}
            />
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {t('taskGroupReading.readingNoAnswerRequired')}
            </div>
          )}
        </div>
      )}

      {isExperimentTask(task) && (
        <div className="space-y-4">
          {Boolean(question.html_url) && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden relative">
              <button
                type="button"
                onClick={() => setExperimentFullscreen(true)}
                className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center text-sm transition-colors"
                title="全屏"
              >⛶</button>
              <ExperimentIframe
                src={String(question.html_url)}
                className="w-full"
                style={{ minHeight: 400, border: 'none' }}
                title="Experiment"
              />
            </div>
          )}
          {task.question.answer_required !== false ? (
            <textarea
              className="w-full min-h-[120px] px-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
              placeholder={t('taskGroupReading.experimentAnswerPlaceholder')}
              value={answers.get(taskId) || ''}
              onChange={(event) => onSelectAnswer(taskId, event.target.value)}
              disabled={submitted}
            />
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {t('taskGroupReading.experimentNoAnswerRequired')}
            </div>
          )}
          {experimentFullscreen && createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col">
              <div className="flex justify-end p-3 relative z-[10000]">
                <button
                  onClick={() => setExperimentFullscreen(false)}
                  className="w-10 h-10 rounded-full bg-white/30 hover:bg-white/50 text-white flex items-center justify-center text-xl transition-colors shadow-lg border border-white/20"
                  style={{ position: 'relative', zIndex: 10001 }}
                >✕</button>
              </div>
              <div className="flex-1 px-4 pb-4">
                <iframe
                  src={String(question.html_url)}
                  className="w-full h-full rounded-2xl"
                  style={{ border: 'none' }}
                  title="Experiment Fullscreen"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                />
              </div>
            </div>,
            document.body,
          )}
        </div>
      )}

      {task.question.options && !isReadingTask(task) && !taskSupportsSorting(task.type) && (
        <div className="option-list">
          {task.question.options.map((opt) => {
            const isMultipleChoice = taskUsesMultiChoiceAnswer(task.type)
            const selectedAnswers = answers.get(taskId) || ''
            const selectedArray = selectedAnswers ? selectedAnswers.split(',') : []
            const isSelected = selectedArray.includes(opt.key)

            return (
              <button
                type="button"
                key={opt.key}
                className={`option-line ${isSelected ? 'selected' : ''} ${submitted ? 'disabled' : ''}`}
                onClick={() => onSelectAnswer(taskId, opt.key, task.type)}
                disabled={submitted}
              >
                <span className="option-key">{isMultipleChoice ? (isSelected ? '☑' : '☐') : opt.key}</span>
                <p className="option-text"><TaskRichTextOrPlain content={opt.text} /></p>
                {isSelected && <span className="selected-badge">{t('taskLiveUI.selected')}</span>}
              </button>
            )
          })}
        </div>
      )}

      {taskSupportsSorting(task.type) && task.question.options && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{t('taskSorting.dragHint')}</p>
          {(answers.get(taskId) || sortingOrder?.join(',') || task.question.options.map((option) => option.key).join(','))
            .split(',')
            .filter(Boolean)
            .map((optionKey, orderIndex, currentOrder) => {
              const option = task.question.options?.find((item) => item.key === optionKey)
              return (
                <div key={`${optionKey}-${orderIndex}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-medium">
                    {orderIndex + 1}
                  </span>
                  <div className="flex-1 text-sm text-slate-700">
                    <TaskRichTextOrPlain content={option?.text || optionKey} />
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (submitted || orderIndex === 0) return
                        const nextOrder = [...currentOrder]
                        ;[nextOrder[orderIndex], nextOrder[orderIndex - 1]] = [nextOrder[orderIndex - 1], nextOrder[orderIndex]]
                        onSelectAnswer(taskId, nextOrder.join(','))
                      }}
                      disabled={submitted || orderIndex === 0}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white disabled:opacity-40"
                    >
                      {t('taskSorting.moveUp')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (submitted || orderIndex === currentOrder.length - 1) return
                        const nextOrder = [...currentOrder]
                        ;[nextOrder[orderIndex], nextOrder[orderIndex + 1]] = [nextOrder[orderIndex + 1], nextOrder[orderIndex]]
                        onSelectAnswer(taskId, nextOrder.join(','))
                      }}
                      disabled={submitted || orderIndex === currentOrder.length - 1}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white disabled:opacity-40"
                    >
                      {t('taskSorting.moveDown')}
                    </button>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {taskUsesBooleanAnswer(task.type) && (
        <div className="tf-options">
          {[
            { key: 'true', label: t('taskLiveUI.trueOption') },
            { key: 'false', label: t('taskLiveUI.falseOption') },
          ].map((option) => (
            <button
              type="button"
              key={option.key}
              className={`tf-option ${selectedAnswer === option.key ? 'selected' : ''} ${submitted ? 'disabled' : ''}`}
              onClick={() => onSelectAnswer(taskId, option.key)}
              disabled={submitted}
            >
              <span>{option.label}</span>
              {selectedAnswer === option.key && <span className="selected-badge">{t('taskLiveUI.selected')}</span>}
            </button>
          ))}
        </div>
      )}

      {taskSupportsPairs(task.type) && task.question.pairs && (
        <div className="matching-container">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-2">{t('taskLiveUI.leftSide')}</p>
              {task.question.pairs.map((pair: any, pairIndex: number) => (
                <div
                  key={`left-${pairIndex}`}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    answers.get(`${taskId}_left`) === String(pairIndex)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  } ${submitted ? 'cursor-not-allowed opacity-60' : ''}`}
                  onClick={() => {
                    if (submitted) return
                    if (answers.get(`${taskId}_left`) === String(pairIndex)) {
                      onPatchAnswer(`${taskId}_left`, null)
                      return
                    }
                    onPatchAnswer(`${taskId}_left`, String(pairIndex))
                  }}
                >
                  <span className="font-medium"><TaskRichTextOrPlain content={pair.left} /></span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-2">{t('taskLiveUI.rightSideMatch')}</p>
              {orderedRightIndices.map((rightIndex: number) => {
                const pair = task.question.pairs?.[rightIndex]
                if (!pair) return null
                const pairedLeft = answers.get(`${taskId}_right_${rightIndex}`)

                return (
                  <div
                    key={`right-${rightIndex}`}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      pairedLeft !== undefined
                        ? 'border-green-500 bg-green-50'
                        : answers.get(`${taskId}_left`) !== undefined
                        ? 'border-blue-300 hover:border-blue-500'
                        : 'border-gray-200 hover:border-blue-300'
                    } ${submitted ? 'cursor-not-allowed opacity-60' : ''}`}
                    onClick={() => {
                      if (submitted) return
                      const selectedLeft = answers.get(`${taskId}_left`)
                      if (selectedLeft !== undefined) {
                        onPatchAnswer(`${taskId}_right_${rightIndex}`, selectedLeft)
                        onPatchAnswer(`${taskId}_left`, null)
                        return
                      }
                      onPatchAnswer(`${taskId}_right_${rightIndex}`, null)
                    }}
                  >
                    <span className="font-medium"><TaskRichTextOrPlain content={pair.right} /></span>
                    {pairedLeft !== undefined && (
                      <span className="ml-2 text-sm text-green-600">
                        ← {tWithParams('taskLiveUI.pairedLeftIndex', { index: Number(pairedLeft) + 1 })}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {answers.get(`${taskId}_left`) !== undefined && (
            <p className="text-sm text-blue-600 mt-2">
              {tWithParams('taskLiveUI.selectedLeftHint', {
                index: Number(answers.get(`${taskId}_left`)) + 1,
              })}
            </p>
          )}
        </div>
      )}

      {taskSupportsBlanks(task.type) && (
        <div className="fill-blank-container">
          {task.question.blanks ? (
            <div className="space-y-3">
              {task.question.blanks.map((_: any, blankIndex: number) => (
                <div key={blankIndex} className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{tWithParams('taskLiveUI.blankLabel', { index: blankIndex + 1 })}:</span>
                  <input
                    type="text"
                    className="fill-blank-input"
                    placeholder={t('taskLiveUI.enterAnswer')}
                    value={answers.get(`${taskId}_blank_${blankIndex}`) || ''}
                    onChange={(event) => onPatchAnswer(`${taskId}_blank_${blankIndex}`, event.target.value)}
                    disabled={submitted}
                  />
                </div>
              ))}
            </div>
          ) : (
            <input
              type="text"
              className="fill-blank-input w-full"
              placeholder={t('taskLiveUI.enterAnswer')}
              value={answers.get(taskId) || ''}
              onChange={(event) => onSelectAnswer(taskId, event.target.value)}
              disabled={submitted}
            />
          )}
        </div>
      )}
    </div>
  )
}

function tWithIndex(t: (key: string) => string, key: string, index: number) {
  return t(key).replace('{{index}}', String(index))
}
