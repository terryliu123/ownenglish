import { ReactNode } from 'react'
import { TipTapViewer } from '../../components/editor/TipTapViewer'
import { LiveTaskData } from '../../services/api'
import { ExperimentIframe } from './experiment-iframe'

function asDisplayText(value: unknown) {
  if (value === undefined || value === null) return ''
  return String(value)
}

export function TaskRichTextOrPlain({
  content,
  className,
}: {
  content: unknown
  className?: string
}) {
  if (content && typeof content === 'object') {
    return <TipTapViewer content={content as Record<string, unknown>} className={className} />
  }

  return <span className={className}>{asDisplayText(content)}</span>
}

export function TaskQuestionImage({
  question,
  alt,
  wrapperClassName = 'mb-3 rounded-2xl overflow-hidden border border-slate-200 bg-white',
  imageClassName = 'w-full max-h-72 object-cover',
  captionClassName = 'px-4 py-3 text-sm text-slate-500',
}: {
  question: Record<string, unknown>
  alt: string
  wrapperClassName?: string
  imageClassName?: string
  captionClassName?: string
}) {
  const imageUrl = String(question?.image_url || '').trim()
  const imageCaption = String(question?.image_caption || '').trim()

  if (!imageUrl) return null

  return (
    <div className={wrapperClassName}>
      <img src={imageUrl} alt={imageCaption || alt} className={imageClassName} />
      {imageCaption && <div className={captionClassName}>{imageCaption}</div>}
    </div>
  )
}

export function TaskDetailPreview({
  task,
  t,
  wrapperClassName = 'space-y-1 mb-3',
}: {
  task: LiveTaskData
  t?: (key: string) => string
  wrapperClassName?: string
}) {
  const question = (task.question as {
    text?: unknown
    options?: { key: string; text: string }[]
    blanks?: { position: number; answer: string }[]
    pairs?: { left: string; right: string }[]
    passage?: unknown
    prompt?: unknown
    answer_required?: boolean
  }) || {}

  const imageBlock = (
    <TaskQuestionImage
      question={question as Record<string, unknown>}
      alt={asDisplayText(question.text) || (t ? t('taskLiveUI.questionFallback') : 'Question')}
    />
  )

  let content: ReactNode = null

  if (question.options?.length) {
    content = (
      <>
        {task.type === 'sorting' && (
          <p className="text-xs text-slate-500 mb-2">
            {t ? t('taskSorting.currentOrder') : 'Current order'}
          </p>
        )}
        {question.options.map((opt) => (
          <div key={opt.key} className="text-sm text-slate-600 flex items-center gap-2">
            <span className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center text-xs">
              {task.type === 'sorting' ? question.options!.findIndex((item) => item.key === opt.key) + 1 : opt.key}
            </span>
            <span>{opt.text}</span>
          </div>
        ))}
      </>
    )
  } else if (question.blanks?.length) {
    content = (
      <>
        {question.blanks.map((blank, index) => (
          <div key={`${blank.position}-${index}`} className="text-sm text-slate-600">
            {(t ? t('task.blankLabel') : 'Blank {{index}}').replace('{{index}}', String(index + 1))}: {blank.answer}
          </div>
        ))}
      </>
    )
  } else if (question.pairs?.length) {
    content = (
      <>
        {question.pairs.map((pair, index) => (
          <div key={`${pair.left}-${index}`} className="text-sm text-slate-600 flex items-center gap-2">
            <span>{pair.left}</span>
            <span className="text-slate-400">-&gt;</span>
            <span>{pair.right}</span>
          </div>
        ))}
      </>
    )
  } else if (task.type === 'reading') {
    const passage = question.passage
    const prompt = question.prompt
    content = (
      <div className="space-y-3">
        {Boolean(passage) && (
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t ? t('taskGroupReading.readingPassagePreview') : 'Reading preview'}
            </p>
            <div className="mt-1 rounded-xl bg-white border border-slate-200 p-3 max-h-40 overflow-y-auto">
              <TaskRichTextOrPlain
                content={passage}
                className="text-sm text-slate-600 whitespace-pre-wrap"
              />
            </div>
          </div>
        )}
        {Boolean(prompt) && (
          <div>
            <p className="text-xs font-medium text-slate-500">
              {t ? t('taskGroupReading.readingPromptPreview') : 'Reading task'}
            </p>
            <div className="mt-1">
              <TaskRichTextOrPlain content={prompt} className="text-sm text-slate-700" />
            </div>
          </div>
        )}
        <p className="text-xs text-slate-500">
          {question.answer_required === false
            ? (t ? t('taskGroupReading.readingNoAnswerRequired') : 'No answer required')
            : (t ? t('taskGroupReading.readingAnswerLabel') : 'Reading answer')}
        </p>
      </div>
    )
  } else if (task.type === 'experiment') {
    const htmlUrl = String((question as Record<string, unknown>)?.html_url || '').trim()
    content = (
      <div className="space-y-3">
        {htmlUrl && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">
              {t ? t('taskGroupReading.experimentPreview') : 'Experiment preview'}
            </p>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <ExperimentIframe
                src={htmlUrl}
                className="w-full"
                style={{ minHeight: 300, border: 'none' }}
                title="Experiment preview"
              />
            </div>
          </div>
        )}
        <p className="text-xs text-slate-500">
          {(question as Record<string, unknown>)?.answer_required === false
            ? (t ? t('taskGroupReading.experimentNoAnswerRequired') : 'No answer required')
            : (t ? t('taskGroupReading.experimentReferenceAnswerLabel') : 'Experiment answer')}
        </p>
      </div>
    )
  }

  if (!imageBlock && !content) return null

  return (
    <div className={wrapperClassName}>
      {imageBlock}
      {content}
    </div>
  )
}
