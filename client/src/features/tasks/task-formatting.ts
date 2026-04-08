export function unwrapAnswerValue(value: unknown) {
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    return (value as { value?: unknown }).value
  }
  return value
}

const TRUE_ALIAS_SHORT = '\u5bf9'
const TRUE_ALIAS_FULL = '\u6b63\u786e'
const FALSE_ALIAS_SHORT = '\u9519'
const FALSE_ALIAS_FULL = '\u9519\u8bef'

export function extractTaskTextContent(content: unknown): string {
  if (!content) return ''
  if (typeof content === 'string') return content

  if (typeof content === 'object' && content !== null) {
    const item = content as { type?: string; content?: any[] }
    if (item.type === 'doc' && Array.isArray(item.content)) {
      return item.content
        .map((node: any) => {
          if (node.type === 'paragraph' && node.content) {
            return node.content.map((child: any) => child.text || '').join('')
          }
          return ''
        })
        .join(' ')
    }

    return JSON.stringify(content)
  }

  return String(content)
}

export function getTaskQuestionText(question: { text?: unknown } | null | undefined) {
  return extractTaskTextContent(question?.text)
}

export function formatChoiceAnswer(answer: unknown, options?: { key: string; text: unknown }[]) {
  const values = Array.isArray(answer) ? answer : [answer]
  return values
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
    .map((value) => {
      const key = String(value).trim()
      const option = options?.find((item) => item.key === key)
      const textContent = extractTaskTextContent(option?.text)
      return option ? `${option.key}. ${textContent}` : key
    })
    .join(' / ')
}

export type MatchingAnswerDisplayRow = {
  leftText: string
  rightText: string
  leftIndex: number | null
  rightIndex: number | null
}

function findMatchingPairIndex(
  ref: unknown,
  pairs: { left: unknown; right: unknown }[],
  side: 'left' | 'right',
) {
  if (typeof ref === 'number' && Number.isInteger(ref) && ref >= 0 && ref < pairs.length) {
    return ref
  }

  const normalizedRef = String(ref ?? '').trim()
  if (!normalizedRef) {
    return -1
  }

  const numericRef = Number(normalizedRef)
  if (Number.isInteger(numericRef) && numericRef >= 0 && numericRef < pairs.length) {
    return numericRef
  }

  return pairs.findIndex((pair) => extractTaskTextContent(pair?.[side]).trim() === normalizedRef)
}

function buildMatchingRowsFromArray(
  answer: unknown[],
  pairs: { left: unknown; right: unknown }[],
) {
  return answer
    .map((leftRef, rightIndex) => {
      const rightText = extractTaskTextContent(pairs[rightIndex]?.right)
      const leftIndex = findMatchingPairIndex(leftRef, pairs, 'left')
      const leftText = leftIndex >= 0
        ? extractTaskTextContent(pairs[leftIndex]?.left)
        : String(leftRef ?? '').trim()

      if (!leftText || !rightText) {
        return null
      }

      const row: MatchingAnswerDisplayRow = {
        leftText,
        rightText,
        leftIndex: leftIndex >= 0 ? leftIndex : null,
        rightIndex,
      }

      return row
    })
    .filter((row): row is MatchingAnswerDisplayRow => Boolean(row))
}

function buildMatchingRowsFromObject(
  answer: Record<string, unknown>,
  pairs: { left: unknown; right: unknown }[],
) {
  return Object.entries(answer)
    .map(([leftRef, rightRef]) => {
      const leftIndex = findMatchingPairIndex(leftRef, pairs, 'left')
      const rightIndex = findMatchingPairIndex(rightRef, pairs, 'right')
      const leftText = leftIndex >= 0
        ? extractTaskTextContent(pairs[leftIndex]?.left)
        : String(leftRef ?? '').trim()
      const rightText = rightIndex >= 0
        ? extractTaskTextContent(pairs[rightIndex]?.right)
        : String(rightRef ?? '').trim()

      if (!leftText || !rightText) {
        return null
      }

      const row: MatchingAnswerDisplayRow = {
        leftText,
        rightText,
        leftIndex: leftIndex >= 0 ? leftIndex : null,
        rightIndex: rightIndex >= 0 ? rightIndex : null,
      }

      return row
    })
    .filter((row): row is MatchingAnswerDisplayRow => Boolean(row))
}

export function resolveMatchingAnswerRows(
  answer: unknown,
  pairs?: { left: unknown; right: unknown }[],
  options?: { fallbackToPairs?: boolean },
) {
  if (!pairs?.length) {
    return [] as MatchingAnswerDisplayRow[]
  }

  const normalizedAnswer = unwrapAnswerValue(answer)
  let rows: MatchingAnswerDisplayRow[] = []

  if (Array.isArray(normalizedAnswer)) {
    rows = buildMatchingRowsFromArray(normalizedAnswer, pairs)
  } else if (normalizedAnswer && typeof normalizedAnswer === 'object') {
    rows = buildMatchingRowsFromObject(normalizedAnswer as Record<string, unknown>, pairs)
  }

  if (!rows.length && options?.fallbackToPairs) {
    rows = pairs.map((pair, index) => ({
      leftText: extractTaskTextContent(pair.left),
      rightText: extractTaskTextContent(pair.right),
      leftIndex: index,
      rightIndex: index,
    }))
  }

  return rows
}

export function formatMatchingAnswer(
  answer: unknown,
  translate: (key: string) => string,
  pairs?: { left: unknown; right: unknown }[],
) {
  const rows = resolveMatchingAnswerRows(answer, pairs)
    .map((row) => `${row.leftText} -> ${row.rightText}`)

  return rows.length ? rows.join(' / ') : translate('task.unanswered')
}

export function formatSortingAnswer(
  answer: unknown,
  translate: (key: string) => string,
  options?: { key: string; text: unknown }[],
) {
  const values = Array.isArray(answer)
    ? answer
    : String(answer ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)

  if (!values.length) {
    return translate('task.unanswered')
  }

  return values
    .map((value, index) => {
      const key = String(value)
      const option = options?.find((item) => item.key === key)
      const textContent = extractTaskTextContent(option?.text)
      return `${index + 1}. ${textContent || key}`
    })
    .join(' / ')
}

export function formatTaskAnswer(
  answer: unknown,
  task: {
    type?: string
    question?: {
      answer_required?: boolean
      options?: { key: string; text: unknown }[]
      pairs?: { left: unknown; right: unknown }[]
    }
  } | null | undefined,
  translate: (key: string) => string,
) {
  const normalizedAnswer = unwrapAnswerValue(answer)

  if (task?.type === 'reading') {
    if (normalizedAnswer === '__read__') {
      return translate('taskGroupReading.readingSubmitted')
    }
    if ((task?.question?.answer_required === false) && (normalizedAnswer === undefined || normalizedAnswer === null || normalizedAnswer === '')) {
      return translate('taskGroupReading.readingNoAnswerRequired')
    }
  }

  if (task?.type === 'experiment') {
    if (normalizedAnswer === '__experiment__') {
      return translate('taskGroupReading.readingSubmitted')
    }
    if ((task?.question?.answer_required === false) && (normalizedAnswer === undefined || normalizedAnswer === null || normalizedAnswer === '')) {
      return translate('taskGroupReading.experimentNoAnswerRequired')
    }
  }

  if (normalizedAnswer === undefined || normalizedAnswer === null || normalizedAnswer === '') {
    return translate('task.unanswered')
  }

  if (
    task?.type === 'multiple_choice' ||
    task?.type === 'single_choice' ||
    task?.type === 'image_understanding' ||
    task?.type === 'error_correction' ||
    task?.type === 'scenario'
  ) {
    return formatChoiceAnswer(normalizedAnswer, task?.question?.options)
  }

  if (task?.type === 'true_false') {
    if (typeof normalizedAnswer === 'boolean') {
      return normalizedAnswer ? translate('task.trueLabel') : translate('task.falseLabel')
    }
    const lowered = String(normalizedAnswer).trim().toLowerCase()
    if (['true', '1', 'yes', 't', TRUE_ALIAS_SHORT, TRUE_ALIAS_FULL].includes(lowered)) {
      return translate('task.trueLabel')
    }
    if (['false', '0', 'no', 'f', FALSE_ALIAS_SHORT, FALSE_ALIAS_FULL].includes(lowered)) {
      return translate('task.falseLabel')
    }
  }

  if (task?.type === 'fill_blank') {
    return Array.isArray(normalizedAnswer) ? normalizedAnswer.join(' / ') : String(normalizedAnswer)
  }

  if (task?.type === 'matching') {
    return formatMatchingAnswer(normalizedAnswer, translate, task?.question?.pairs)
  }

  if (task?.type === 'sorting') {
    return formatSortingAnswer(normalizedAnswer, translate, task?.question?.options)
  }

  if (task?.type === 'reading') {
    return String(normalizedAnswer)
  }

  if (task?.type === 'experiment') {
    return String(normalizedAnswer)
  }

  return Array.isArray(normalizedAnswer) ? normalizedAnswer.join(', ') : String(normalizedAnswer)
}
