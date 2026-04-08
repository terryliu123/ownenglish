export type TaskMode = 'objective' | 'reading' | 'experiment'

export type TaskAnswerMode =
  | 'choice'
  | 'multi_choice'
  | 'text'
  | 'boolean'
  | 'matching'
  | 'reading'
  | 'sorting'

export interface TaskTypeConfigItem {
  labelKey: string
  icon: string
  answerMode: TaskAnswerMode
  mode: TaskMode
  supportsOptions?: boolean
  supportsBlanks?: boolean
  supportsPairs?: boolean
  supportsSorting?: boolean
  supportsPassage?: boolean
  supportsPrompt?: boolean
  supportsHtmlUpload?: boolean
  supportsExternalUrl?: boolean
  supportsTeachingAid?: boolean
  supportsAnswerRequiredToggle?: boolean
  supportsReferenceAnswer?: boolean
}

export const TASK_TYPE_CONFIG: Record<string, TaskTypeConfigItem> = {
  single_choice: {
    labelKey: 'taskGroupReading.singleChoice',
    icon: 'A',
    answerMode: 'choice',
    mode: 'objective',
    supportsOptions: true,
    supportsReferenceAnswer: true,
  },
  multiple_choice: {
    labelKey: 'taskGroupReading.multipleChoice',
    icon: 'AB',
    answerMode: 'multi_choice',
    mode: 'objective',
    supportsOptions: true,
    supportsReferenceAnswer: true,
  },
  fill_blank: {
    labelKey: 'taskGroupReading.fillBlank',
    icon: '___',
    answerMode: 'text',
    mode: 'objective',
    supportsBlanks: true,
  },
  true_false: {
    labelKey: 'taskGroupReading.trueFalse',
    icon: 'T/F',
    answerMode: 'boolean',
    mode: 'objective',
    supportsReferenceAnswer: true,
  },
  matching: {
    labelKey: 'taskGroupReading.matching',
    icon: '<>',
    answerMode: 'matching',
    mode: 'objective',
    supportsPairs: true,
  },
  sorting: {
    labelKey: 'taskSorting.sorting',
    icon: '1-2',
    answerMode: 'sorting',
    mode: 'objective',
    supportsOptions: true,
    supportsSorting: true,
  },
  image_understanding: {
    labelKey: 'taskGroupReading.imageUnderstanding',
    icon: 'IMG',
    answerMode: 'choice',
    mode: 'objective',
    supportsOptions: true,
    supportsReferenceAnswer: true,
  },
  error_correction: {
    labelKey: 'taskGroupReading.errorCorrection',
    icon: 'FIX',
    answerMode: 'choice',
    mode: 'objective',
    supportsOptions: true,
    supportsReferenceAnswer: true,
  },
  scenario: {
    labelKey: 'taskGroupReading.scenario',
    icon: 'SCN',
    answerMode: 'choice',
    mode: 'objective',
    supportsOptions: true,
    supportsReferenceAnswer: true,
  },
  reading: {
    labelKey: 'taskGroupReading.typeReading',
    icon: 'TXT',
    answerMode: 'reading',
    mode: 'reading',
    supportsPassage: true,
    supportsPrompt: true,
    supportsAnswerRequiredToggle: true,
    supportsReferenceAnswer: true,
  },
  experiment: {
    labelKey: 'taskGroupReading.experiment',
    icon: 'EXP',
    answerMode: 'text',
    mode: 'objective',
    supportsTeachingAid: true,
    supportsAnswerRequiredToggle: true,
    supportsReferenceAnswer: true,
  },
}

export const TASK_TYPES = Object.entries(TASK_TYPE_CONFIG).map(([id, meta]) => ({
  id,
  ...meta,
}))

export function getTaskTypeConfig(type?: string): TaskTypeConfigItem | null {
  if (!type) return null
  return TASK_TYPE_CONFIG[type] || null
}

export function isReadingType(type?: string | null) {
  return type === 'reading'
}

export function isReadingTask(task: { type?: string } | null | undefined): boolean {
  return isReadingType(task?.type)
}

export function readingAnswerRequired(task: { question?: Record<string, unknown> } | null | undefined): boolean {
  return Boolean(task?.question?.answer_required)
}

export function taskSupportsOptions(type?: string | null) {
  return Boolean(getTaskTypeConfig(type || undefined)?.supportsOptions)
}

export function taskSupportsBlanks(type?: string | null) {
  return Boolean(getTaskTypeConfig(type || undefined)?.supportsBlanks)
}

export function taskSupportsPairs(type?: string | null) {
  return Boolean(getTaskTypeConfig(type || undefined)?.supportsPairs)
}

export function taskSupportsSorting(type?: string | null) {
  return Boolean(getTaskTypeConfig(type || undefined)?.supportsSorting)
}

export function taskSupportsPassage(type?: string | null) {
  return Boolean(getTaskTypeConfig(type || undefined)?.supportsPassage)
}

export function taskSupportsPrompt(type?: string | null) {
  return Boolean(getTaskTypeConfig(type || undefined)?.supportsPrompt)
}

export function taskSupportsAnswerRequiredToggle(type?: string | null) {
  return Boolean(getTaskTypeConfig(type || undefined)?.supportsAnswerRequiredToggle)
}

export function taskSupportsReferenceAnswer(type?: string | null) {
  return Boolean(getTaskTypeConfig(type || undefined)?.supportsReferenceAnswer)
}

export function taskUsesBooleanAnswer(type?: string | null) {
  return getTaskTypeConfig(type || undefined)?.answerMode === 'boolean'
}

export function taskUsesMultiChoiceAnswer(type?: string | null) {
  return getTaskTypeConfig(type || undefined)?.answerMode === 'multi_choice'
}

export function taskUsesSortingAnswer(type?: string | null) {
  return getTaskTypeConfig(type || undefined)?.answerMode === 'sorting'
}

export function isExperimentTask(task: { type?: string } | null | undefined): boolean {
  return task?.type === 'experiment'
}

export function taskSupportsExternalUrl(type?: string | null) {
  return Boolean(getTaskTypeConfig(type || undefined)?.supportsExternalUrl)
}

export function taskSupportsTeachingAid(type?: string | null) {
  return Boolean(getTaskTypeConfig(type || undefined)?.supportsTeachingAid)
}
