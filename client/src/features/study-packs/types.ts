import { PracticeModuleData, StudyPackData, StudyPackAnalytics, MembershipSnapshot } from '../../services/api'

export type ModuleType = PracticeModuleData['type']
export type ModuleDraft = PracticeModuleData & { id?: string }
export type StepId = 1 | 2 | 3 | 4 | 5
export type ContentMode = 'manual' | 'ai_import' | 'ai_generate'
export type QuestionImageFields = { image_url?: string; image_caption?: string; image_name?: string }
export type VocabularyItemDraft = { word: string; meaning: string; phonetic: string } & QuestionImageFields
export type SentenceItemDraft = { sentence: string; translation: string; pattern: string } & QuestionImageFields
export type ModulePreviewEntry = { text: string; imageUrl?: string; imageCaption?: string }

export type FormState = {
  class_id: string
  title: string
  description: string
  due_date: string
  modules: ModuleDraft[]
}

export const MODULE_TYPES: ModuleType[] = ['vocabulary', 'sentence', 'listening', 'reading', 'speaking']
export const DEFAULT_AI_PACK_MODULE_TYPES: ModuleType[] = ['vocabulary', 'sentence', 'speaking']

export const STEPS: { id: StepId; labelKey: string; descKey: string }[] = [
  { id: 1, labelKey: 'stepBasicInfo', descKey: 'stepBasicInfoDesc' },
  { id: 2, labelKey: 'stepAddModules', descKey: 'stepAddModulesDesc' },
  { id: 3, labelKey: 'stepEditModules', descKey: 'stepEditModulesDesc' },
  { id: 4, labelKey: 'stepCreateContent', descKey: 'stepCreateContentDesc' },
  { id: 5, labelKey: 'stepPreview', descKey: 'stepPreviewDesc' },
]

export interface PackListProps {
  packs: StudyPackData[]
  loading: boolean
  selectedPackId: string | null
  keyword: string
  statusFilter: string
  onKeywordChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onSelectPack: (id: string) => void
  onEdit: (id: string) => void
  onChangeStatus: (id: string, status: string) => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export interface PackEditorProps {
  isOpen: boolean
  isNew: boolean
  currentStep: StepId
  form: FormState
  classes: { id: string; name: string }[]
  aiPackPrompt: string
  aiPackTargetMinutes: number
  aiPackModuleTypes: ModuleType[]
  aiPackMessage: string
  aiPackLoading: boolean
  aiDifficulty: 'easy' | 'medium' | 'hard'
  canUseAi: boolean
  saving: boolean
  onClose: () => void
  onStepChange: (step: StepId) => void
  onFormChange: (form: FormState) => void
  onAiPackPromptChange: (value: string) => void
  onAiPackTargetMinutesChange: (value: number) => void
  onAiPackModuleTypesChange: (types: ModuleType[]) => void
  onAiDifficultyChange: (value: 'easy' | 'medium' | 'hard') => void
  onRunAiGeneratePack: () => void
  onSave: (status?: 'draft' | 'published') => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export interface ModuleManagerProps {
  modules: ModuleDraft[]
  onAddModule: (type: ModuleType) => void
  onRemoveModule: (index: number) => void
  onMoveModule: (index: number, direction: -1 | 1) => void
  onUpdateModule: (index: number, updater: (module: ModuleDraft) => ModuleDraft) => void
  onNext: () => void
  onPrev: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export interface ModuleEditorProps {
  modules: ModuleDraft[]
  contentModuleIndex: number
  contentMode: ContentMode
  aiImportText: string
  aiImportFile: File | null
  aiPrompt: string
  aiDifficulty: 'easy' | 'medium' | 'hard'
  aiMessage: string
  aiLoading: boolean
  canUseAi: boolean
  onContentModuleIndexChange: (index: number) => void
  onContentModeChange: (mode: ContentMode) => void
  onAiImportTextChange: (value: string) => void
  onAiImportFileChange: (file: File | null) => void
  onAiPromptChange: (value: string) => void
  onAiDifficultyChange: (value: 'easy' | 'medium' | 'hard') => void
  onRunAiImport: () => void
  onRunAiGenerate: () => void
  onUpdateModule: (index: number, updater: (module: ModuleDraft) => ModuleDraft) => void
  onSetVocabularyItems: (items: VocabularyItemDraft[]) => void
  onSetSentenceItems: (items: SentenceItemDraft[]) => void
  onNext: () => void
  onPrev: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export interface AiImportDialogProps {
  isOpen: boolean
  contentMode: ContentMode
  aiImportText: string
  aiImportFile: File | null
  aiPrompt: string
  aiDifficulty: 'easy' | 'medium' | 'hard'
  aiMessage: string
  aiLoading: boolean
  canUseAi: boolean
  onContentModeChange: (mode: ContentMode) => void
  onAiImportTextChange: (value: string) => void
  onAiImportFileChange: (file: File | null) => void
  onAiPromptChange: (value: string) => void
  onAiDifficultyChange: (value: 'easy' | 'medium' | 'hard') => void
  onRunAiImport: () => void
  onRunAiGenerate: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export interface AnalyticsPanelProps {
  selectedPack: StudyPackData | null
  analytics: StudyPackAnalytics | null
  analyticsLoading: boolean
  onEdit: (id: string) => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export interface StudyPacksHeaderProps {
  packs: StudyPackData[]
  membership: MembershipSnapshot | null
  canCreateStudyPack: boolean
  canUseAi: boolean
  studyPackUsage: number
  studyPackLimit: number | null | undefined
  onCreate: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}
