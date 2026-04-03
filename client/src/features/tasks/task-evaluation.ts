import { unwrapAnswerValue } from './task-formatting'

type TaskLike = {
  type?: string
  task_id?: string
  id?: string
  question?: {
    answer_required?: boolean
    blanks?: any[]
    pairs?: any[]
  }
}

export function normalizeReadingAnswer(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

export function isEmptyTaskValue(value: unknown) {
  return value === '' || value === -1 || value === undefined || value === null
}

export function hasTaskAnswer(answer: unknown) {
  if (Array.isArray(answer)) {
    return answer.some((value) => !isEmptyTaskValue(value))
  }
  return !isEmptyTaskValue(answer)
}

export function isNeutralReadingTask(task: TaskLike, correctAnswer: unknown) {
  return task.type === 'reading' && (
    task.question?.answer_required === false ||
    correctAnswer === undefined ||
    correctAnswer === null ||
    String(correctAnswer).trim() === ''
  )
}

function compareStringArrays(studentValues: unknown[], correctValues: unknown[]) {
  const studentArr = studentValues.map((value) => String(value ?? '').trim().toLowerCase())
  const correctArr = correctValues.map((value) => String(value ?? '').trim().toLowerCase())
  return studentArr.length === correctArr.length &&
    studentArr.every((value, index) => value === correctArr[index])
}

function compareMatchingAnswers(studentAnswer: unknown, correctAnswer: unknown) {
  const studentArr = Array.isArray(studentAnswer) ? studentAnswer : []
  const correctArr = Array.isArray(correctAnswer) ? correctAnswer : []
  return studentArr.length === correctArr.length &&
    studentArr.every((value, index) => {
      const correctValue = correctArr[index]
      const studentEmpty = isEmptyTaskValue(value)
      const correctEmpty = isEmptyTaskValue(correctValue)
      if (studentEmpty && correctEmpty) return true
      return String(value) === String(correctValue)
    })
}

function compareMultipleChoiceAnswers(studentAnswer: unknown, correctAnswer: unknown) {
  const studentValues = Array.isArray(studentAnswer)
    ? studentAnswer
    : String(studentAnswer ?? '').split(',').filter(Boolean)
  const correctValues = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]
  const studentStr = studentValues.map(String).sort().join(',')
  const correctStr = correctValues.map(String).sort().join(',')
  return studentStr === correctStr
}

export function evaluateTaskCorrectness(task: TaskLike, studentAnswer: unknown, rawCorrectAnswer: unknown): boolean | null {
  const correctAnswer = unwrapAnswerValue(rawCorrectAnswer)

  if (task.type === 'matching') {
    return compareMatchingAnswers(studentAnswer, correctAnswer)
  }

  if (task.type === 'sorting') {
    const studentValues = Array.isArray(studentAnswer)
      ? studentAnswer
      : String(studentAnswer ?? '').split(',').filter(Boolean)
    const correctValues = Array.isArray(correctAnswer)
      ? correctAnswer
      : String(correctAnswer ?? '').split(',').filter(Boolean)
    return compareStringArrays(studentValues, correctValues)
  }

  if (task.type === 'fill_blank') {
    const studentValues = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer]
    const correctValues = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]
    return compareStringArrays(studentValues, correctValues)
  }

  if (task.type === 'multiple_choice') {
    return compareMultipleChoiceAnswers(studentAnswer, correctAnswer)
  }

  if (task.type === 'reading') {
    if (task.question?.answer_required === false) return null
    if (correctAnswer === undefined || correctAnswer === null || String(correctAnswer).trim() === '') return null
    return normalizeReadingAnswer(studentAnswer) === normalizeReadingAnswer(correctAnswer)
  }

  if (task.type === 'experiment') {
    if (!task.question?.answer_required) return null
    if (correctAnswer === undefined || correctAnswer === null || String(correctAnswer).trim() === '') return null
    return normalizeReadingAnswer(studentAnswer) === normalizeReadingAnswer(correctAnswer)
  }

  if (task.type === 'true_false') {
    const normalizedStudent = unwrapAnswerValue(studentAnswer)
    const normalizedCorrect = unwrapAnswerValue(correctAnswer)
    return String(normalizedStudent).trim().toLowerCase() === String(normalizedCorrect).trim().toLowerCase()
  }

  return String(unwrapAnswerValue(studentAnswer) ?? '') === String(unwrapAnswerValue(correctAnswer) ?? '')
}

export function buildTaskAnswerFromAnswerMap(
  task: TaskLike,
  answers: Map<string, string>,
) {
  const taskId = task.task_id || task.id
  if (!taskId) return ''

  if (task.type === 'reading') {
    if (task.question?.answer_required === false) return '__read__'
    return String(answers.get(taskId) || '').trim()
  }

  if (task.type === 'experiment') {
    if (task.question?.answer_required === false) return '__experiment__'
    return String(answers.get(taskId) || '').trim()
  }

  if (task.type === 'matching') {
    const pairCount = task.question?.pairs?.length || 0
    const result: (string | number)[] = new Array(pairCount).fill('')
    for (let index = 0; index < pairCount; index += 1) {
      const value = answers.get(`${taskId}_right_${index}`)
      result[index] = value ?? ''
    }
    return result
  }

  if (task.type === 'fill_blank') {
    const blankCount = task.question?.blanks?.length || 0
    const result: string[] = []
    for (let index = 0; index < blankCount; index += 1) {
      result.push(answers.get(`${taskId}_blank_${index}`) || '')
    }
    return result
  }

  if (task.type === 'sorting') {
    const storedValue = answers.get(taskId) || ''
    return storedValue
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  }

  return answers.get(taskId) || ''
}
