import { LiveTaskData } from '../../services/api'
import { TASK_TYPES, TaskMode, getTaskTypeConfig, taskUsesSortingAnswer } from './task-config'
import { extractTaskTextContent } from './task-formatting'

export function getTaskTypeLabel(type: string, t: (key: string) => string, fallback = 'Question') {
  const config = getTaskTypeConfig(type)
  return config?.labelKey ? t(config.labelKey) : fallback
}

// Task types to hide from the UI (focus on core classroom interaction)
const HIDDEN_TASK_TYPES = new Set(['sorting', 'image_understanding', 'error_correction', 'scenario'])

export function getTaskTypesForMode(mode: TaskMode) {
  return TASK_TYPES.filter((item) => {
    if (mode === 'reading') return item.id === 'reading'
    if (mode === 'experiment') return item.id === 'experiment'
    if (HIDDEN_TASK_TYPES.has(item.id)) return false
    return item.id !== 'reading' && item.id !== 'experiment'
  })
}

export function isExperimentType(type?: string | null) {
  return type === 'experiment'
}

export function shouldShowChoiceOptions(type: string) {
  const answerMode = getTaskTypeConfig(type)?.answerMode
  return answerMode === 'choice' || answerMode === 'multi_choice' || answerMode === 'sorting'
}

export function shouldShowGenericCorrectAnswer(type: string, question?: Record<string, unknown>) {
  if (type === 'fill_blank' || type === 'matching' || type === 'sorting' || type === 'experiment') return false
  if (type === 'reading' && question?.answer_required === false) return false
  return true
}

function formatSortingAnswer(task: LiveTaskData) {
  const value = typeof task.correct_answer === 'object'
    ? (task.correct_answer as { value?: unknown })?.value
    : task.correct_answer
  const orderKeys = Array.isArray(value) ? value.map(String) : []
  const options = ((task.question as Record<string, unknown>)?.options || []) as Array<{ key: string; text: unknown }>
  const orderedLabels = orderKeys
    .map((key) => {
      const option = options.find((item) => item.key === key)
      return option ? extractTaskTextContent(option.text) : key
    })
    .filter(Boolean)
  return orderedLabels.join(' -> ')
}

export function formatTaskAnswerDisplay(task: LiveTaskData, t: (key: string) => string) {
  const value = typeof task.correct_answer === 'object'
    ? (task.correct_answer as { value?: unknown })?.value
    : task.correct_answer

  if (task.type === 'reading') {
    if ((task.question as Record<string, unknown>)?.answer_required === false) {
      return t('taskGroupReading.readingNoAnswerRequired')
    }
    return String(value ?? '')
  }

  if (task.type === 'experiment') {
    if ((task.question as Record<string, unknown>)?.answer_required === false) {
      return t('taskGroupReading.experimentNoAnswerRequired')
    }
    return String(value ?? '')
  }

  if (taskUsesSortingAnswer(task.type)) {
    return formatSortingAnswer(task)
  }

  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  return String(value ?? '')
}
