import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  classService,
  CreateStudyPackData,
  MembershipSnapshot,
  StudyPackAnalytics,
  StudyPackData,
  studyPackService,
  membershipService,
} from '../../../services/api'
import { FormState, ModuleDraft, ModuleType, DEFAULT_AI_PACK_MODULE_TYPES } from '../types'
import { defaultForm, toDateInput } from '../utils'

export function useStudyPacks() {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [packs, setPacks] = useState<StudyPackData[]>([])
  const [membership, setMembership] = useState<MembershipSnapshot | null>(null)
  const [analytics, setAnalytics] = useState<StudyPackAnalytics | null>(null)
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Form state
  const [form, setForm] = useState<FormState>(defaultForm())
  const [isNew, setIsNew] = useState(false)

  // AI Pack generation state
  const [aiPackPrompt, setAiPackPrompt] = useState('')
  const [aiPackMessage, setAiPackMessage] = useState('')
  const [aiPackLoading, setAiPackLoading] = useState(false)
  const [aiPackTargetMinutes, setAiPackTargetMinutes] = useState(15)
  const [aiPackModuleTypes, setAiPackModuleTypes] = useState<ModuleType[]>(DEFAULT_AI_PACK_MODULE_TYPES)
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [classList, packList, membershipData] = await Promise.all([
        classService.getAll(),
        studyPackService.getAll(),
        membershipService.getMyMembership(),
      ])
      setClasses(classList)
      setPacks(packList)
      setMembership(membershipData)
      setSelectedPackId((prev) => prev || packList[0]?.id || null)
      setForm((prev) => (!prev.class_id && classList.length ? { ...prev, class_id: classList[0].id } : prev))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAnalytics = useCallback(async (packId: string) => {
    setAnalyticsLoading(true)
    try {
      const data = await studyPackService.getAnalytics(packId)
      setAnalytics(data)
    } catch {
      setAnalytics(null)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!selectedPackId) {
      setAnalytics(null)
      return
    }
    void loadAnalytics(selectedPackId)
  }, [selectedPackId, loadAnalytics])

  const filtered = useMemo(() => {
    return packs.filter((pack) => {
      const effectiveStatus = pack.effective_status || pack.status
      const hitStatus = statusFilter === 'all' || effectiveStatus === statusFilter
      const text = `${pack.title} ${pack.class_name || ''}`.toLowerCase()
      const hitKeyword = !keyword.trim() || text.includes(keyword.trim().toLowerCase())
      return hitStatus && hitKeyword
    })
  }, [packs, keyword, statusFilter])

  const studyPackLimit = membership?.limits.max_study_packs
  const studyPackUsage = membership?.usage.study_pack_count ?? packs.length
  const canCreateStudyPack = studyPackLimit == null || studyPackUsage < studyPackLimit
  const canUseAi = membership?.can_use_ai ?? false

  const selectedPack = packs.find((item) => item.id === selectedPackId) || null

  const getMembershipMessage = useCallback((error: any, fallback: string) => {
    const detail = error?.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (detail?.message) return detail.message
    return fallback
  }, [])

  const preparePackForEdit = useCallback((packId: string) => {
    const detail = packs.find((p) => p.id === packId)
    if (!detail) return null

    const existingTypes = Array.from(new Set(detail.modules.map((item) => item.type))) as ModuleType[]

    return {
      pack: detail,
      formState: {
        class_id: detail.class_id,
        title: detail.title,
        description: detail.description || '',
        due_date: toDateInput(detail.due_date),
        modules: detail.modules.map((item, index) => ({
          ...item,
          order: index,
          estimated_minutes: item.estimated_minutes || 0,
        })),
      },
      aiPackTargetMinutes: detail.estimated_total_minutes || 15,
      aiPackModuleTypes: existingTypes.length ? existingTypes : DEFAULT_AI_PACK_MODULE_TYPES,
    }
  }, [packs])

  const savePack = useCallback(async (
    formData: FormState,
    isCreating: boolean,
    packId: string | null,
    nextStatus?: 'draft' | 'published',
    t?: (key: string) => string
  ) => {
    if (!formData.title.trim() || !formData.class_id) {
      if (t) alert(t('studyPackV2.teacher.requiredError'))
      return null
    }

    const payload: CreateStudyPackData = {
      class_id: formData.class_id,
      title: formData.title.trim(),
      description: formData.description.trim(),
      due_date: formData.due_date || undefined,
      status: nextStatus,
      modules: formData.modules.map((module, index) => ({
        type: module.type,
        content: module.content,
        order: index,
        estimated_minutes: module.estimated_minutes || 0,
      })),
    }

    setSaving(true)
    try {
      const saved = isCreating || !packId
        ? await studyPackService.create(payload)
        : await studyPackService.update(packId, payload)
      if (nextStatus === 'published' && saved.status !== 'published') {
        await studyPackService.publish(saved.id)
      }
      await loadData()
      setSelectedPackId(saved.id)
      await loadAnalytics(saved.id)
      return saved
    } catch (error) {
      if (t) {
        const message = getMembershipMessage(error, t(nextStatus === 'published' ? 'studyPackV2.teacher.publishError' : 'studyPackV2.teacher.saveError'))
        alert(message)
      }
      return null
    } finally {
      setSaving(false)
    }
  }, [loadData, loadAnalytics, getMembershipMessage])

  const changeStatus = useCallback(async (packId: string, status: string, t?: (key: string) => string) => {
    try {
      if (status === 'published') await studyPackService.publish(packId)
      else await studyPackService.update(packId, { status })
      await loadData()
      if (selectedPackId === packId) {
        await loadAnalytics(packId)
      }
    } catch {
      if (t) alert(t('studyPackV2.teacher.publishError'))
    }
  }, [loadData, loadAnalytics, selectedPackId])

  const runAiGeneratePack = useCallback(async (
    classId: string,
    title: string,
    description: string,
    prompt: string,
    t?: (key: string) => string
  ): Promise<{ modules: ModuleDraft[]; title?: string; description?: string } | null> => {
    if (!classId || !prompt.trim()) return null
    if (!canUseAi) {
      if (t) setAiPackMessage(t('membership.aiUpgradeHint'))
      return null
    }
    setAiPackLoading(true)
    setAiPackMessage('')
    try {
      const result = await studyPackService.aiGeneratePack({
        class_id: classId,
        prompt: prompt.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        difficulty: aiDifficulty,
        target_minutes: aiPackTargetMinutes,
        module_types: aiPackModuleTypes,
      })

      const modules = (result.modules || []).map((module, index) => ({
        ...module,
        order: index,
        estimated_minutes: module.estimated_minutes || 5,
      }))

      if (t) setAiPackMessage(t('studyPackV2.teacher.aiPackApplied'))
      return { modules, title: result.title, description: result.description }
    } catch (error) {
      if (t) setAiPackMessage(getMembershipMessage(error, t('studyPackV2.teacher.aiPackError')))
      return null
    } finally {
      setAiPackLoading(false)
    }
  }, [canUseAi, aiDifficulty, aiPackTargetMinutes, aiPackModuleTypes, getMembershipMessage])

  return {
    // Data
    classes,
    packs,
    membership,
    analytics,
    selectedPackId,
    selectedPack,
    loading,
    analyticsLoading,
    saving,
    filtered,
    form,
    isNew,

    // AI Pack state
    aiPackPrompt,
    aiPackMessage,
    aiPackLoading,
    aiPackTargetMinutes,
    aiPackModuleTypes,
    aiDifficulty,

    // Computed
    studyPackLimit,
    studyPackUsage,
    canCreateStudyPack,
    canUseAi,
    keyword,
    statusFilter,

    // Actions
    setKeyword,
    setStatusFilter,
    setSelectedPackId,
    setForm,
    setIsNew,
    setAiPackPrompt,
    setAiPackMessage,
    setAiPackTargetMinutes,
    setAiPackModuleTypes,
    setAiDifficulty,
    loadData,
    loadAnalytics,
    preparePackForEdit,
    savePack,
    changeStatus,
    runAiGeneratePack,
    getMembershipMessage,
  }
}
