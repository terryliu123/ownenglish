import { CreateTaskData, LiveTaskData } from '../../services/api'
import { TaskMode } from './task-config'

export const EMPTY_TIPTAP_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
} as Record<string, unknown>

type TipTapNode = {
  type?: string
  content?: TipTapNode[]
  text?: string
}

type ManualTaskDraft = {
  taskMode: TaskMode
  manualType: string
  manualText: Record<string, unknown>
  manualPassage: Record<string, unknown>
  manualPrompt: Record<string, unknown>
  manualAnswerRequired: boolean
  manualOptions: string[]
  manualAnswer: string
  manualHtmlUrl: string
  manualCountdown: number
  manualBlanks: string[]
  manualPairs: Array<{ left: string; right: string }>
}

type QuestionData = Record<string, unknown> & {
  text?: unknown
  options?: Array<{ key: string; text: string }>
  blanks?: Array<{ position: number; answer: string }>
  pairs?: Array<{ left: string; right: string }>
  passage?: unknown
  prompt?: unknown
  answer_required?: boolean
}

function asParagraphDoc(text: string) {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  } as Record<string, unknown>
}

function extractText(node: unknown): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node !== 'object') return ''

  const item = node as TipTapNode
  const ownText = typeof item.text === 'string' ? item.text : ''
  const childText = Array.isArray(item.content) ? item.content.map(extractText).join('') : ''
  return `${ownText}${childText}`
}

export function hasRichTextContent(value: Record<string, unknown> | null | undefined) {
  return extractText(value).trim().length > 0
}

export function normalizeTipTapValue(value: unknown) {
  if (!value) return EMPTY_TIPTAP_DOC
  if (typeof value === 'string') {
    return asParagraphDoc(value)
  }
  return value as Record<string, unknown>
}

function normalizeFillBlankAnswers(correctAnswer: unknown) {
  if (!correctAnswer) return []

  if (typeof correctAnswer === 'object' && correctAnswer !== null) {
    const value = (correctAnswer as { value?: unknown }).value
    if (Array.isArray(value)) {
      return value.map((answer, index) => ({
        position: index,
        answer: String(answer ?? ''),
      }))
    }
    if (typeof value === 'string' && value.trim()) {
      return [{ position: 0, answer: value }]
    }
  }

  if (typeof correctAnswer === 'string' && correctAnswer.trim()) {
    return [{ position: 0, answer: correctAnswer }]
  }

  return []
}

export function cloneTaskForEditing(task: LiveTaskData) {
  const clonedTask = JSON.parse(JSON.stringify(task)) as LiveTaskData
  const question = (clonedTask.question || {}) as QuestionData

  question.text = normalizeTipTapValue(question.text)
  if (question.passage) question.passage = normalizeTipTapValue(question.passage)
  if (question.prompt) question.prompt = normalizeTipTapValue(question.prompt)

  if (clonedTask.type === 'fill_blank' && !question.blanks) {
    question.blanks = normalizeFillBlankAnswers(clonedTask.correct_answer)
  }

  clonedTask.question = question
  return clonedTask
}

export function buildManualTaskPayload(draft: ManualTaskDraft): CreateTaskData {
  const isReading = draft.manualType === 'reading'
  const questionPayload: QuestionData = {
    text: draft.manualText,
  }

  if (draft.manualType === 'single_choice' || draft.manualType === 'multiple_choice' || draft.manualType === 'sorting') {
    questionPayload.options = draft.manualOptions.map((text, index) => ({
      key: String.fromCharCode(65 + index),
      text,
    }))
  }

  if (draft.manualType === 'fill_blank') {
    questionPayload.blanks = (draft.manualBlanks || [''])
      .filter((b) => b.trim() !== '')
      .map((answer, index) => ({ position: index, answer }))
  }

  if (draft.manualType === 'matching') {
    questionPayload.pairs = (draft.manualPairs || [{ left: '', right: '' }])
      .filter((p) => p.left.trim() || p.right.trim())
  }

  if (isReading) {
    questionPayload.passage = draft.manualPassage
    questionPayload.prompt = draft.manualPrompt || undefined
    questionPayload.answer_required = draft.manualAnswerRequired
  }

  if (draft.manualType === 'experiment') {
    questionPayload.html_url = draft.manualHtmlUrl || undefined
    questionPayload.answer_required = draft.manualAnswerRequired
  }

  return {
    type: draft.manualType,
    question: questionPayload,
    countdown_seconds: isReading ? Math.max(draft.manualCountdown, 120) : draft.manualCountdown,
    correct_answer: buildCorrectAnswer({
      type: draft.manualType,
      question: questionPayload,
      correct_answer: isReading
        ? (draft.manualAnswerRequired && draft.manualAnswer.trim() ? { value: draft.manualAnswer.trim() } : null)
        : draft.manualType === 'sorting'
        ? { value: draft.manualOptions.map((_, index) => String.fromCharCode(65 + index)) }
        : draft.manualType === 'true_false'
        ? draft.manualAnswer === 'true'
        : { value: draft.manualAnswer },
    } as LiveTaskData),
  }
}

export function buildCorrectAnswer(task: LiveTaskData) {
  const question = (task.question || {}) as QuestionData

  if (task.type === 'fill_blank') {
    const answers = (question.blanks || [])
      .map((blank) => blank.answer || '')
      .filter((answer) => String(answer).trim() !== '')

    return answers.length > 0 ? { value: answers } : null
  }

  if (task.type === 'matching') {
    const pairs = question.pairs || []
    return pairs.length > 0 ? { value: pairs.map((pair) => pair.right) } : null
  }

  if (task.type === 'sorting') {
    const options = question.options || []
    return options.length > 0 ? { value: options.map((option) => option.key) } : null
  }

  if (task.type === 'true_false') {
    if (typeof task.correct_answer === 'object' && task.correct_answer !== null) {
      return Boolean((task.correct_answer as { value?: unknown }).value)
    }
    if (typeof task.correct_answer === 'string') {
      return task.correct_answer === 'true'
    }
  }

  if (task.type === 'reading' && question.answer_required === false) {
    return null
  }

  return task.correct_answer
}

export function buildTaskUpdatePayload(task: LiveTaskData) {
  return {
    type: task.type,
    question: task.question,
    countdown_seconds: task.countdown_seconds,
    correct_answer: buildCorrectAnswer(task),
  }
}
