import { ModuleType, ModuleDraft, VocabularyItemDraft, SentenceItemDraft, ModulePreviewEntry } from './types'

export function label(t: (key: string) => string, type: string) {
  return t(`studyPackV2.moduleTypes.${type}`)
}

export function statusLabel(t: (key: string) => string, status: string) {
  const key = `studyPackV2.statuses.${status}`
  const value = t(key)
  return value === key ? status : value
}

export function toDateInput(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function defaultForm(classId = '') {
  return {
    class_id: classId,
    title: '',
    description: '',
    due_date: '',
    modules: [],
  }
}

export function getModuleStringField(content: Record<string, unknown>, key: string) {
  const value = content[key]
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .join('\n')
  }
  return String(value || '')
}

export function splitLines(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  }

  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getVocabularyItems(value: unknown): VocabularyItemDraft[] {
  const source = Array.isArray(value) ? value : splitLines(value)
  return source
    .map((entry) => {
      if (entry && typeof entry === 'object') {
        const item = entry as Record<string, unknown>
        return {
          word: String(item.word || '').trim(),
          meaning: String(item.meaning || item.translation || '').trim(),
          phonetic: String(item.phonetic || '').trim(),
          image_url: String(item.image_url || '').trim(),
          image_caption: String(item.image_caption || '').trim(),
          image_name: String(item.image_name || '').trim(),
        }
      }

      const parts = String(entry || '')
        .split('|')
        .map((part) => part.trim())
      return {
        word: parts[0] || '',
        meaning: parts[1] || '',
        phonetic: parts[2] || '',
        image_url: '',
        image_caption: '',
        image_name: '',
      }
    })
    .filter((item) => item.word || item.meaning || item.phonetic || item.image_url || item.image_caption)
}

export function getSentenceItems(value: unknown): SentenceItemDraft[] {
  const source = Array.isArray(value) ? value : splitLines(value)
  return source
    .map((entry) => {
      if (entry && typeof entry === 'object') {
        const item = entry as Record<string, unknown>
        return {
          sentence: String(item.sentence || '').trim(),
          translation: String(item.translation || item.meaning || '').trim(),
          pattern: String(item.pattern || '').trim(),
          image_url: String(item.image_url || '').trim(),
          image_caption: String(item.image_caption || '').trim(),
          image_name: String(item.image_name || '').trim(),
        }
      }

      const parts = String(entry || '')
        .split('|')
        .map((part) => part.trim())
      return {
        sentence: parts[0] || '',
        translation: parts[1] || '',
        pattern: parts[2] || '',
        image_url: '',
        image_caption: '',
        image_name: '',
      }
    })
    .filter((item) => item.sentence || item.translation || item.pattern || item.image_url || item.image_caption)
}

export function serializeVocabularyItems(items: VocabularyItemDraft[]) {
  return items
    .filter((item) => item.word || item.meaning || item.phonetic)
    .map((item) => [item.word, item.meaning, item.phonetic].map((part) => part.trim()).join('|'))
    .join('\n')
}

export function serializeSentenceItems(items: SentenceItemDraft[]) {
  return items
    .filter((item) => item.sentence || item.translation || item.pattern)
    .map((item) => [item.sentence, item.translation, item.pattern].map((part) => part.trim()).join('|'))
    .join('\n')
}

export function previewLines(value: unknown, limit = 3) {
  return splitLines(value).slice(0, limit)
}

export function getModulePreviewLines(module: ModuleDraft, limit = 3) {
  const content = (module.content || {}) as Record<string, unknown>

  if (module.type === 'vocabulary') {
    return getVocabularyItems(content.items || content.body)
      .slice(0, limit)
      .map((item) => [item.word, item.meaning, item.phonetic].filter(Boolean).join(' · '))
  }

  if (module.type === 'sentence') {
    return getSentenceItems(content.items || content.body)
      .slice(0, limit)
      .map((item) => [item.sentence, item.translation, item.pattern].filter(Boolean).join(' · '))
  }

  if (module.type === 'reading') return previewLines(content.content, limit)
  if (module.type === 'listening') return previewLines(content.script, limit)
  if (module.type === 'speaking') return previewLines(content.prompt, limit)

  return previewLines(content.body, limit)
}

export function getModulePreviewEntries(module: ModuleDraft, limit = 3): ModulePreviewEntry[] {
  const content = (module.content || {}) as Record<string, unknown>

  if (module.type === 'vocabulary') {
    return getVocabularyItems(content.items || content.body)
      .slice(0, limit)
      .map((item) => ({
        text: [item.word, item.meaning, item.phonetic].filter(Boolean).join(' · '),
        imageUrl: item.image_url,
        imageCaption: item.image_caption,
      }))
  }

  if (module.type === 'sentence') {
    return getSentenceItems(content.items || content.body)
      .slice(0, limit)
      .map((item) => ({
        text: [item.sentence, item.translation, item.pattern].filter(Boolean).join(' · '),
        imageUrl: item.image_url,
        imageCaption: item.image_caption,
      }))
  }

  return getModulePreviewLines(module, limit).map((text) => ({ text }))
}

export function createModuleContent(t: (key: string) => string, type: ModuleType) {
  if (type === 'vocabulary') {
    return {
      title: t('studyPackV2.teacherDefaults.vocabularyTitle'),
      items: [] as VocabularyItemDraft[],
      body: '',
      hints: '',
    }
  }

  if (type === 'sentence') {
    return {
      title: t('studyPackV2.teacherDefaults.sentenceTitle'),
      items: [] as SentenceItemDraft[],
      body: '',
      pattern: '',
    }
  }

  if (type === 'listening') {
    return {
      title: t('studyPackV2.teacherDefaults.listeningTitle'),
      prompt: '',
      script: '',
      body: '',
    }
  }

  if (type === 'reading') {
    return {
      title: t('studyPackV2.teacherDefaults.readingTitle'),
      content: '',
      body: '',
    }
  }

  return {
    title: t('studyPackV2.teacherDefaults.speakingTitle'),
    prompt: '',
    hints: '',
  }
}

export function createModule(t: (key: string) => string, type: ModuleType, order: number): ModuleDraft {
  const titleMap: Record<ModuleType, string> = {
    vocabulary: t('studyPackV2.teacherDefaults.vocabularyTitle'),
    sentence: t('studyPackV2.teacherDefaults.sentenceTitle'),
    listening: t('studyPackV2.teacherDefaults.listeningTitle'),
    reading: t('studyPackV2.teacherDefaults.readingTitle'),
    speaking: t('studyPackV2.teacherDefaults.speakingTitle'),
  }

  return {
    type,
    order,
    estimated_minutes: 5,
    content: {
      ...createModuleContent(t, type),
      title: titleMap[type],
    },
  }
}
