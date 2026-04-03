import { MODULE_TYPES, ModuleType } from '../types'
import { label } from '../utils'

interface AiPackPanelProps {
  aiPackPrompt: string
  aiPackTargetMinutes: number
  aiPackModuleTypes: ModuleType[]
  aiPackMessage: string
  aiPackLoading: boolean
  aiDifficulty: 'easy' | 'medium' | 'hard'
  canUseAi: boolean
  onAiPackPromptChange: (value: string) => void
  onAiPackTargetMinutesChange: (value: number) => void
  onAiPackModuleTypesChange: (types: ModuleType[]) => void
  onAiDifficultyChange: (value: 'easy' | 'medium' | 'hard') => void
  onRunAiGeneratePack: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export function AiPackPanel({
  aiPackPrompt,
  aiPackTargetMinutes,
  aiPackModuleTypes,
  aiPackMessage,
  aiPackLoading,
  aiDifficulty,
  canUseAi,
  onAiPackPromptChange,
  onAiPackTargetMinutesChange,
  onAiPackModuleTypesChange,
  onAiDifficultyChange,
  onRunAiGeneratePack,
  t,
}: AiPackPanelProps) {
  const toggleModuleType = (type: ModuleType) => {
    let newTypes: ModuleType[]
    if (aiPackModuleTypes.includes(type)) {
      if (aiPackModuleTypes.length === 1) return
      newTypes = aiPackModuleTypes.filter((t) => t !== type)
    } else {
      newTypes = [...aiPackModuleTypes, type]
    }
    onAiPackModuleTypesChange(newTypes)
  }

  return (
    <div className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 shadow-sm space-y-5">
      <div>
        <p className="eyebrow">{t('studyPackV2.teacher.aiPackEyebrow')}</p>
        <h4 className="text-lg font-semibold text-slate-900">{t('studyPackV2.teacher.aiPackTitle')}</h4>
        <p className="text-sm text-slate-500 mt-2">{t('studyPackV2.teacher.aiPackDesc')}</p>
      </div>

      {!canUseAi && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {t('membership.aiUpgradeHint')}
        </div>
      )}

      <div className="form-group mb-0">
        <label className="form-label">{t('studyPackV2.teacher.aiPackPromptLabel')}</label>
        <textarea
          className="input w-full resize-y bg-white shadow-sm"
          rows={10}
          style={{ minHeight: 240 }}
          value={aiPackPrompt}
          onChange={(e) => onAiPackPromptChange(e.target.value)}
          placeholder={t('studyPackV2.teacher.aiPackPromptPlaceholder')}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-[140px,1fr]">
        <div className="form-group mb-0">
          <label className="form-label">{t('studyPackV2.teacher.aiPackMinutesLabel')}</label>
          <input
            type="number"
            min={10}
            max={60}
            className="input"
            value={aiPackTargetMinutes}
            onChange={(e) => onAiPackTargetMinutesChange(Number(e.target.value) || 15)}
          />
        </div>
        <div className="form-group mb-0">
          <label className="form-label">{t('studyPackV2.teacher.aiPackDifficultyLabel')}</label>
          <select className="input" value={aiDifficulty} onChange={(e) => onAiDifficultyChange(e.target.value as 'easy' | 'medium' | 'hard')}>
            {['easy', 'medium', 'hard'].map((level) => (
              <option key={level} value={level}>{t(`studyPackV2.teacher.difficulty${level.charAt(0).toUpperCase() + level.slice(1)}`)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group mb-0">
        <label className="form-label">{t('studyPackV2.teacher.aiPackModuleTypesLabel')}</label>
        <div className="flex flex-wrap gap-2">
          {MODULE_TYPES.map((type) => {
            const active = aiPackModuleTypes.includes(type)
            return (
              <button
                key={`ai-pack-${type}`}
                type="button"
                onClick={() => toggleModuleType(type)}
                disabled={!canUseAi}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: active ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.9)',
                  color: active ? '#047857' : '#475569',
                  border: active ? '1px solid rgba(16,185,129,0.22)' : '1px solid rgba(148,163,184,0.18)',
                }}
              >
                {label(t, type)}
              </button>
            )
          })}
        </div>
      </div>

      {aiPackMessage && (
        <div className="rounded-xl bg-white/90 px-3 py-2 text-sm text-slate-600 border border-emerald-100">
          {aiPackMessage}
        </div>
      )}

      <button
        onClick={() => void onRunAiGeneratePack()}
        disabled={!canUseAi || aiPackLoading || !aiPackPrompt.trim()}
        className="w-full py-3.5 rounded-xl font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #16a34a 100%)' }}
      >
        {aiPackLoading ? t('studyPackV2.teacher.aiGenerating') : t('studyPackV2.teacher.aiPackGenerateAction')}
      </button>
    </div>
  )
}
