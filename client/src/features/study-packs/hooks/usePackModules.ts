import { useState, useCallback } from 'react'
import { ModuleDraft, ModuleType, VocabularyItemDraft, SentenceItemDraft, ContentMode, FormState } from '../types'
import { createModule, getVocabularyItems, getSentenceItems, serializeVocabularyItems, serializeSentenceItems } from '../utils'
import { studyPackService, imageService } from '../../../services/api'

export function usePackModules(
  form: FormState,
  setForm: React.Dispatch<React.SetStateAction<FormState>>,
  canUseAi: boolean,
  getMembershipMessage: (error: any, fallback: string) => string,
  t?: (key: string) => string
) {
  const [contentModuleIndex, setContentModuleIndex] = useState(0)
  const [contentMode, setContentMode] = useState<ContentMode>('manual')
  const [aiImportText, setAiImportText] = useState('')
  const [aiImportFile, setAiImportFile] = useState<File | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [aiMessage, setAiMessage] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const activeContentModule = form.modules[contentModuleIndex] || null

  const addModule = useCallback((type: ModuleType) => {
    if (!t) return
    setForm((prev) => ({
      ...prev,
      modules: [...prev.modules, createModule(t, type, prev.modules.length)],
    }))
  }, [setForm, t])

  const updateModule = useCallback((index: number, updater: (module: ModuleDraft) => ModuleDraft) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.map((module, moduleIndex) => (moduleIndex === index ? updater(module) : module)),
    }))
  }, [setForm])

  const removeModule = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules
        .filter((_, moduleIndex) => moduleIndex !== index)
        .map((module, moduleIndex) => ({ ...module, order: moduleIndex })),
    }))
    setContentModuleIndex((prev) => Math.max(0, Math.min(prev, form.modules.length - 2)))
  }, [setForm, form.modules.length])

  const moveModule = useCallback((index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= prev.modules.length) return prev
      const modules = [...prev.modules]
      ;[modules[index], modules[nextIndex]] = [modules[nextIndex], modules[index]]
      return {
        ...prev,
        modules: modules.map((module, moduleIndex) => ({ ...module, order: moduleIndex })),
      }
    })
    setContentModuleIndex((prev) => {
      if (prev === index) return index + direction
      if (prev === index + direction) return index
      return prev
    })
  }, [setForm])

  const setVocabularyItems = useCallback((itemsValue: VocabularyItemDraft[]) => {
    updateModule(contentModuleIndex, (item) => ({
      ...item,
      content: {
        ...(item.content || {}),
        items: itemsValue,
        body: serializeVocabularyItems(itemsValue),
      },
    }))
  }, [updateModule, contentModuleIndex])

  const setSentenceItems = useCallback((itemsValue: SentenceItemDraft[]) => {
    updateModule(contentModuleIndex, (item) => ({
      ...item,
      content: {
        ...(item.content || {}),
        items: itemsValue,
        body: serializeSentenceItems(itemsValue),
      },
    }))
  }, [updateModule, contentModuleIndex])

  const runAiImport = useCallback(async () => {
    if (!activeContentModule || !form.class_id || (!aiImportText.trim() && !aiImportFile)) return
    if (!canUseAi) {
      if (t) setAiMessage(t('membership.aiUpgradeHint'))
      return
    }
    setAiLoading(true)
    setAiMessage('')
    try {
      const title = String(((activeContentModule.content || {}) as Record<string, unknown>).title || '')
      const result = aiImportFile
        ? await studyPackService.aiImportModuleContentDocx(aiImportFile, {
            class_id: form.class_id,
            module_type: activeContentModule.type,
            title,
          })
        : await studyPackService.aiImportModuleContent({
            class_id: form.class_id,
            module_type: activeContentModule.type,
            raw_text: aiImportText.trim(),
            title,
          })
      updateModule(contentModuleIndex, (item) => ({
        ...item,
        content: { ...(item.content || {}), ...result.content },
      }))
      if (t) setAiMessage(t('studyPackV2.teacher.aiApplied'))
      setAiImportText('')
      setAiImportFile(null)
      setContentMode('manual')
    } catch (error) {
      if (t) setAiMessage(getMembershipMessage(error, t('studyPackV2.teacher.aiError')))
    } finally {
      setAiLoading(false)
    }
  }, [activeContentModule, form.class_id, aiImportText, aiImportFile, canUseAi, contentModuleIndex, updateModule, getMembershipMessage, t])

  const runAiGenerate = useCallback(async () => {
    if (!activeContentModule || !form.class_id || !aiPrompt.trim()) return
    if (!canUseAi) {
      if (t) setAiMessage(t('membership.aiUpgradeHint'))
      return
    }
    setAiLoading(true)
    setAiMessage('')
    try {
      const result = await studyPackService.aiGenerateModuleContent({
        class_id: form.class_id,
        module_type: activeContentModule.type,
        prompt: aiPrompt.trim(),
        title: String(((activeContentModule.content || {}) as Record<string, unknown>).title || ''),
        difficulty: aiDifficulty,
        estimated_minutes: activeContentModule.estimated_minutes || 10,
      })
      updateModule(contentModuleIndex, (item) => ({
        ...item,
        content: { ...(item.content || {}), ...result.content },
      }))
      if (t) setAiMessage(t('studyPackV2.teacher.aiApplied'))
      setContentMode('manual')
    } catch (error) {
      if (t) setAiMessage(getMembershipMessage(error, t('studyPackV2.teacher.aiError')))
    } finally {
      setAiLoading(false)
    }
  }, [activeContentModule, form.class_id, aiPrompt, aiDifficulty, canUseAi, contentModuleIndex, updateModule, getMembershipMessage, t])

  const applyTaskImage = useCallback(async (file: File | null) => {
    if (!file) return
    if (file.size > 500 * 1024) {
      if (t) alert(t('studyPackV2.teacher.imageSizeError'))
      return
    }
    try {
      const url = await imageService.upload(file)
      updateModule(contentModuleIndex, (item) => ({
        ...item,
        content: {
          ...(item.content || {}),
          image_url: url,
          image_name: file.name,
        },
      }))
    } catch {
      if (t) alert(t('studyPackV2.teacher.imageUploadError'))
    }
  }, [updateModule, contentModuleIndex, t])

  const clearTaskImage = useCallback(() => {
    updateModule(contentModuleIndex, (item) => {
      const nextContent = { ...(item.content || {}) } as Record<string, unknown>
      delete nextContent.image_url
      delete nextContent.image_name
      delete nextContent.image_caption
      return {
        ...item,
        content: nextContent,
      }
    })
  }, [updateModule, contentModuleIndex])

  const applyVocabularyItemImage = useCallback(async (itemIndex: number, file: File | null) => {
    if (!file) return
    if (file.size > 500 * 1024) {
      if (t) alert(t('studyPackV2.teacher.imageSizeError'))
      return
    }
    try {
      const url = await imageService.upload(file)
      const content = (activeContentModule?.content || {}) as Record<string, unknown>
      const items = getVocabularyItems(content.items || content.body)
      setVocabularyItems(
        items.map((item, index) =>
          index === itemIndex
            ? { ...item, image_url: url, image_name: file.name }
            : item,
        ),
      )
    } catch {
      if (t) alert(t('studyPackV2.teacher.imageUploadError'))
    }
  }, [activeContentModule, setVocabularyItems, t])

  const clearVocabularyItemImage = useCallback((itemIndex: number) => {
    const content = (activeContentModule?.content || {}) as Record<string, unknown>
    const items = getVocabularyItems(content.items || content.body)
    setVocabularyItems(
      items.map((item, index) => {
        if (index !== itemIndex) return item
        const nextItem = { ...item }
        delete nextItem.image_url
        delete nextItem.image_name
        delete nextItem.image_caption
        return nextItem
      }),
    )
  }, [activeContentModule, setVocabularyItems])

  const applySentenceItemImage = useCallback(async (itemIndex: number, file: File | null) => {
    if (!file) return
    if (file.size > 500 * 1024) {
      if (t) alert(t('studyPackV2.teacher.imageSizeError'))
      return
    }
    try {
      const url = await imageService.upload(file)
      const content = (activeContentModule?.content || {}) as Record<string, unknown>
      const items = getSentenceItems(content.items || content.body)
      setSentenceItems(
        items.map((item, index) =>
          index === itemIndex
            ? { ...item, image_url: url, image_name: file.name }
            : item,
        ),
      )
    } catch {
      if (t) alert(t('studyPackV2.teacher.imageUploadError'))
    }
  }, [activeContentModule, setSentenceItems, t])

  const clearSentenceItemImage = useCallback((itemIndex: number) => {
    const content = (activeContentModule?.content || {}) as Record<string, unknown>
    const items = getSentenceItems(content.items || content.body)
    setSentenceItems(
      items.map((item, index) => {
        if (index !== itemIndex) return item
        const nextItem = { ...item }
        delete nextItem.image_url
        delete nextItem.image_name
        delete nextItem.image_caption
        return nextItem
      }),
    )
  }, [activeContentModule, setSentenceItems])

  return {
    contentModuleIndex,
    contentMode,
    aiImportText,
    aiImportFile,
    aiPrompt,
    aiDifficulty,
    aiMessage,
    aiLoading,
    activeContentModule,

    setContentModuleIndex,
    setContentMode,
    setAiImportText,
    setAiImportFile,
    setAiPrompt,
    setAiDifficulty,
    setAiMessage,

    addModule,
    updateModule,
    removeModule,
    moveModule,
    setVocabularyItems,
    setSentenceItems,
    runAiImport,
    runAiGenerate,
    applyTaskImage,
    clearTaskImage,
    applyVocabularyItemImage,
    clearVocabularyItemImage,
    applySentenceItemImage,
    clearSentenceItemImage,
  }
}
