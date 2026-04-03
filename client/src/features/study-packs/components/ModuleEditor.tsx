import { ModuleEditorProps, ContentMode } from '../types'
import { label, getModuleStringField, getVocabularyItems, getSentenceItems } from '../utils'
import { mediaService } from '../../../services/api'

export function ModuleEditor({
  modules,
  contentModuleIndex,
  contentMode,
  aiImportText,
  aiImportFile,
  aiPrompt,
  aiDifficulty,
  aiMessage,
  aiLoading,
  canUseAi,
  onContentModuleIndexChange,
  onContentModeChange,
  onAiImportTextChange,
  onAiImportFileChange,
  onAiPromptChange,
  onAiDifficultyChange,
  onRunAiImport,
  onRunAiGenerate,
  onUpdateModule,
  onSetVocabularyItems,
  onSetSentenceItems,
  onNext,
  onPrev,
  t,
  tWithParams,
}: ModuleEditorProps) {
  const activeContentModule = modules[contentModuleIndex] || null

  if (!activeContentModule) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="empty-state">
          <p>{t('studyPackV2.teacher.emptyModulesTitle')}</p>
          <p className="text-sm text-muted">{t('studyPackV2.teacher.emptyModulesDesc')}</p>
        </div>
      </div>
    )
  }

  const content = (activeContentModule.content || {}) as Record<string, unknown>

  const setContentField = (key: string, value: string) => {
    onUpdateModule(contentModuleIndex, (item) => ({
      ...item,
      content: { ...(item.content || {}), [key]: value },
    }))
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="font-semibold text-slate-900">{t('studyPackV2.teacher.createContentTitle')}</h4>
          <p className="text-sm text-slate-500">{t('studyPackV2.teacher.createContentDesc')}</p>
        </div>
        <button
          onClick={onNext}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
        >
          {t('studyPackV2.teacher.toPreview')} →
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px,minmax(0,1fr)]">
        <aside className="space-y-3">
          {modules.map((module, index) => {
            const modContent = (module.content || {}) as Record<string, unknown>
            return (
              <button
                key={`${module.type}-${index}-content-nav`}
                onClick={() => onContentModuleIndexChange(index)}
                className="w-full text-left p-4 rounded-2xl border transition-colors"
                style={{
                  borderColor: contentModuleIndex === index ? 'rgba(59,130,246,0.28)' : 'rgba(24,36,58,0.08)',
                  background: contentModuleIndex === index ? 'rgba(239,246,255,0.9)' : 'rgba(255,255,255,0.9)',
                }}
              >
                <p className="text-sm text-slate-500">{tWithParams('studyPackV2.teacher.moduleCardTitle', { index: index + 1, type: label(t, module.type) })}</p>
                <p className="font-medium text-slate-900 mt-1">{String(modContent.title || label(t, module.type))}</p>
                <p className="text-xs text-slate-500 mt-2">{tWithParams('studyPackV2.teacher.overviewModuleMinutes', { minutes: module.estimated_minutes || 0 })}</p>
              </button>
            )
          })}
        </aside>

        <div className="p-6 rounded-3xl border bg-white" style={{ borderColor: 'rgba(24,36,58,0.08)' }}>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">
                {tWithParams('studyPackV2.teacher.moduleCardTitle', { index: contentModuleIndex + 1, type: label(t, activeContentModule.type) })}
              </p>
              <h5 className="text-lg font-semibold text-slate-900 mt-1">
                {String(content.title || label(t, activeContentModule.type))}
              </h5>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['manual', 'ai_import', 'ai_generate'] as ContentMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onContentModeChange(mode)}
                  disabled={!canUseAi && mode !== 'manual'}
                  className="px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: contentMode === mode ? 'rgba(37,99,235,0.12)' : 'rgba(241,245,249,0.9)',
                    color: contentMode === mode ? '#1d4ed8' : '#475569',
                    border: contentMode === mode ? '1px solid rgba(37,99,235,0.18)' : '1px solid rgba(148,163,184,0.15)',
                  }}
                >
                  {mode === 'manual'
                    ? t('studyPackV2.teacher.contentModeManual')
                    : mode === 'ai_import'
                    ? `${t('studyPackV2.teacher.contentModeImport')} · ${t('membership.vipOnly')}`
                    : `${t('studyPackV2.teacher.contentModeGenerate')} · ${t('membership.vipOnly')}`}
                </button>
              ))}
            </div>
            {!canUseAi && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {t('membership.aiUpgradeHint')}
              </div>
            )}
            {contentMode === 'ai_import' && (
              <div className="rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 space-y-4 shadow-sm">
                <div>
                  <p className="font-medium text-slate-900">{t('studyPackV2.teacher.aiImportTitle')}</p>
                  <p className="text-sm text-slate-500 mt-1">{t('studyPackV2.teacher.aiImportDesc')}</p>
                </div>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),280px]">
                  <textarea
                    className="input w-full resize-y bg-white shadow-sm"
                    rows={12}
                    style={{ minHeight: 260 }}
                    value={aiImportText}
                    onChange={(e) => onAiImportTextChange(e.target.value)}
                    placeholder={t('studyPackV2.teacher.aiImportPlaceholder')}
                  />
                  <div className="rounded-2xl border border-blue-100 bg-white/80 p-4 space-y-3">
                    <div>
                      <p className="font-medium text-slate-900">{t('studyPackV2.teacher.aiImportDocxTitle')}</p>
                      <p className="text-sm text-slate-500 mt-1">{t('studyPackV2.teacher.aiImportDocxDesc')}</p>
                    </div>
                    <input
                      type="file"
                      accept=".docx"
                      className="input"
                      onChange={(e) => onAiImportFileChange(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-slate-500">
                      {aiImportFile
                        ? tWithParams('studyPackV2.teacher.aiImportDocxSelected', { name: aiImportFile.name })
                        : t('studyPackV2.teacher.aiImportDocxEmpty')}
                    </p>
                    {aiImportFile && (
                      <button
                        className="ghost-button text-sm"
                        onClick={() => onAiImportFileChange(null)}
                      >
                        {t('studyPackV2.teacher.aiImportDocxClear')}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">{t('studyPackV2.teacher.aiImportTip')}</span>
                  <button
                    className="solid-button"
                    onClick={() => void onRunAiImport()}
                    disabled={!canUseAi || aiLoading || (!aiImportText.trim() && !aiImportFile)}
                  >
                    {aiLoading ? t('studyPackV2.teacher.aiGenerating') : t('studyPackV2.teacher.aiImportAction')}
                  </button>
                </div>
              </div>
            )}
            {contentMode === 'ai_generate' && (
              <div className="rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5 space-y-4 shadow-sm">
                <div>
                  <p className="font-medium text-slate-900">{t('studyPackV2.teacher.aiGenerateTitle')}</p>
                  <p className="text-sm text-slate-500 mt-1">{t('studyPackV2.teacher.aiGenerateDesc')}</p>
                </div>
                <textarea
                  className="input w-full resize-y bg-white shadow-sm"
                  rows={12}
                  style={{ minHeight: 260 }}
                  value={aiPrompt}
                  onChange={(e) => onAiPromptChange(e.target.value)}
                  placeholder={t('studyPackV2.teacher.aiGeneratePlaceholder')}
                />
                <div className="grid gap-3 md:grid-cols-[160px,1fr]">
                  <select className="input" value={aiDifficulty} onChange={(e) => onAiDifficultyChange(e.target.value as 'easy' | 'medium' | 'hard')}>
                    {['easy', 'medium', 'hard'].map((level) => (
                      <option key={level} value={level}>{t(`studyPackV2.teacher.difficulty${level.charAt(0).toUpperCase() + level.slice(1)}`)}</option>
                    ))}
                  </select>
                  <button
                    className="solid-button"
                    onClick={() => void onRunAiGenerate()}
                    disabled={!canUseAi || aiLoading || !aiPrompt.trim()}
                  >
                    {aiLoading ? t('studyPackV2.teacher.aiGenerating') : t('studyPackV2.teacher.aiGenerateAction')}
                  </button>
                </div>
              </div>
            )}
            {aiMessage && (
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
                {aiMessage}
              </div>
            )}
            {contentMode !== 'manual' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{t('studyPackV2.teacher.editorTitle')}</p>
                <p className="text-sm text-slate-500 mt-1">{t('studyPackV2.teacher.editorDesc')}</p>
              </div>
            )}

            {/* Module Type Specific Content */}
            {activeContentModule.type === 'vocabulary' && (
              <VocabularyEditor
                content={content}
                onSetVocabularyItems={onSetVocabularyItems}
                setContentField={setContentField}
                t={t}
                tWithParams={tWithParams}
              />
            )}

            {activeContentModule.type === 'sentence' && (
              <SentenceEditor
                content={content}
                onSetSentenceItems={onSetSentenceItems}
                setContentField={setContentField}
                t={t}
                tWithParams={tWithParams}
              />
            )}

            {activeContentModule.type === 'listening' && (
              <ListeningEditor
                content={content}
                setContentField={setContentField}
                t={t}
              />
            )}

            {activeContentModule.type === 'reading' && (
              <ReadingEditor
                content={content}
                setContentField={setContentField}
                t={t}
              />
            )}

            {activeContentModule.type === 'speaking' && (
              <SpeakingEditor
                content={content}
                setContentField={setContentField}
                t={t}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={onPrev} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
          ← {t('studyPackV2.teacher.prevStep')}
        </button>
        <button onClick={onNext} className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">
          {t('studyPackV2.teacher.toPreview')} →
        </button>
      </div>
    </div>
  )
}

// Sub-components for each module type
function VocabularyEditor({ content, onSetVocabularyItems, setContentField, t, tWithParams }: {
  content: Record<string, unknown>
  onSetVocabularyItems: (items: { word: string; meaning: string; phonetic: string; image_url?: string; image_caption?: string; image_name?: string }[]) => void
  setContentField: (key: string, value: string) => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}) {
  const items = getVocabularyItems(content.items || content.body)
  const setItems = onSetVocabularyItems

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label className="form-label mb-0">{t('studyPackV2.teacher.moduleVocabularyLabel')}</label>
        <button
          className="solid-button text-sm"
          onClick={() => setItems([...items, { word: '', meaning: '', phonetic: '' }])}
        >
          + {t('studyPackV2.teacher.addVocabularyItem')}
        </button>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            {t('studyPackV2.teacher.emptyVocabularyItems')}
          </div>
        ) : items.map((entry, itemIndex) => (
          <div key={`vocabulary-${itemIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">
                {tWithParams('studyPackV2.teacher.itemIndexLabel', { index: itemIndex + 1 })}
              </p>
              <button
                className="ghost-button text-sm text-red-500"
                onClick={() => setItems(items.filter((_, i) => i !== itemIndex))}
              >
                {t('studyPackV2.teacher.remove')}
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="form-group mb-0">
                <label className="form-label">{t('studyPackV2.teacher.itemWordLabel')}</label>
                <input
                  className="input"
                  value={entry.word}
                  onChange={(e) => setItems(items.map((item, i) => (i === itemIndex ? { ...item, word: e.target.value } : item)))}
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">{t('studyPackV2.teacher.itemMeaningLabel')}</label>
                <input
                  className="input"
                  value={entry.meaning}
                  onChange={(e) => setItems(items.map((item, i) => (i === itemIndex ? { ...item, meaning: e.target.value } : item)))}
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">{t('studyPackV2.teacher.itemPhoneticLabel')}</label>
                <input
                  className="input"
                  value={entry.phonetic}
                  onChange={(e) => setItems(items.map((item, i) => (i === itemIndex ? { ...item, phonetic: e.target.value } : item)))}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="form-group mb-0">
        <label className="form-label">{t('studyPackV2.teacher.moduleHintsLabel')}</label>
        <textarea
          className="input"
          rows={4}
          placeholder={t('studyPackV2.teacher.moduleHintsPlaceholder')}
          value={getModuleStringField(content, 'hints')}
          onChange={(e) => setContentField('hints', e.target.value)}
        />
      </div>
      <p className="text-xs text-slate-500">
        {tWithParams('studyPackV2.teacher.lineCountHint', { count: items.length })}
      </p>
    </div>
  )
}

function SentenceEditor({ content, onSetSentenceItems, setContentField, t, tWithParams }: {
  content: Record<string, unknown>
  onSetSentenceItems: (items: { sentence: string; translation: string; pattern: string; image_url?: string; image_caption?: string; image_name?: string }[]) => void
  setContentField: (key: string, value: string) => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}) {
  const items = getSentenceItems(content.items || content.body)
  const setItems = onSetSentenceItems

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label className="form-label mb-0">{t('studyPackV2.teacher.moduleSentenceLabel')}</label>
        <button
          className="solid-button text-sm"
          onClick={() => setItems([...items, { sentence: '', translation: '', pattern: '' }])}
        >
          + {t('studyPackV2.teacher.addSentenceItem')}
        </button>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            {t('studyPackV2.teacher.emptySentenceItems')}
          </div>
        ) : items.map((entry, itemIndex) => (
          <div key={`sentence-${itemIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">
                {tWithParams('studyPackV2.teacher.itemIndexLabel', { index: itemIndex + 1 })}
              </p>
              <button
                className="ghost-button text-sm text-red-500"
                onClick={() => setItems(items.filter((_, i) => i !== itemIndex))}
              >
                {t('studyPackV2.teacher.remove')}
              </button>
            </div>
            <div className="grid gap-3">
              <div className="form-group mb-0">
                <label className="form-label">{t('studyPackV2.teacher.itemSentenceLabel')}</label>
                <textarea
                  className="input"
                  rows={3}
                  value={entry.sentence}
                  onChange={(e) => setItems(items.map((item, i) => (i === itemIndex ? { ...item, sentence: e.target.value } : item)))}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="form-group mb-0">
                  <label className="form-label">{t('studyPackV2.teacher.itemTranslationLabel')}</label>
                  <input
                    className="input"
                    value={entry.translation}
                    onChange={(e) => setItems(items.map((item, i) => (i === itemIndex ? { ...item, translation: e.target.value } : item)))}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">{t('studyPackV2.teacher.itemPatternLabel')}</label>
                  <input
                    className="input"
                    value={entry.pattern}
                    onChange={(e) => setItems(items.map((item, i) => (i === itemIndex ? { ...item, pattern: e.target.value } : item)))}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="form-group mb-0">
        <label className="form-label">{t('studyPackV2.teacher.moduleHintsLabel')}</label>
        <textarea
          className="input"
          rows={4}
          placeholder={t('studyPackV2.teacher.moduleHintsPlaceholder')}
          value={getModuleStringField(content, 'pattern')}
          onChange={(e) => setContentField('pattern', e.target.value)}
        />
      </div>
      <p className="text-xs text-slate-500">
        {tWithParams('studyPackV2.teacher.lineCountHint', { count: items.length })}
      </p>
    </div>
  )
}

function ListeningEditor({ content, setContentField, t }: {
  content: Record<string, unknown>
  setContentField: (key: string, value: string) => void
  t: (key: string) => string
}) {
  return (
    <div className="space-y-4">
      <div className="form-group mb-0">
        <label className="form-label">{t('studyPackV2.teacher.moduleListeningPromptLabel')}</label>
        <textarea
          className="input"
          rows={3}
          placeholder={t('studyPackV2.teacher.moduleListeningPromptPlaceholder')}
          value={getModuleStringField(content, 'prompt')}
          onChange={(e) => setContentField('prompt', e.target.value)}
        />
      </div>
      <div className="form-group mb-0">
        <label className="form-label">{t('studyPackV2.teacher.moduleListeningScriptLabel')}</label>
        <textarea
          className="input"
          rows={8}
          placeholder={t('studyPackV2.teacher.moduleListeningScriptPlaceholder')}
          value={getModuleStringField(content, 'script')}
          onChange={(e) => setContentField('script', e.target.value)}
        />
      </div>
      <div className="form-group mb-0">
        <label className="form-label">{t('studyPackV2.teacher.moduleHintsLabel')}</label>
        <textarea
          className="input"
          rows={4}
          placeholder={t('studyPackV2.teacher.moduleHintsPlaceholder')}
          value={getModuleStringField(content, 'body')}
          onChange={(e) => setContentField('body', e.target.value)}
        />
      </div>
      <MediaUploadSection
        content={content}
        setContentField={setContentField}
        t={t}
      />
    </div>
  )
}

function ReadingEditor({ content, setContentField, t }: {
  content: Record<string, unknown>
  setContentField: (key: string, value: string) => void
  t: (key: string) => string
}) {
  return (
    <div className="space-y-4">
      <div className="form-group mb-0">
        <label className="form-label">{t('studyPackV2.teacher.moduleReadingLabel')}</label>
        <textarea
          className="input"
          rows={8}
          placeholder={t('studyPackV2.teacher.moduleReadingPlaceholder')}
          value={getModuleStringField(content, 'content')}
          onChange={(e) => setContentField('content', e.target.value)}
        />
      </div>
      <div className="form-group mb-0">
        <label className="form-label">{t('studyPackV2.teacher.moduleReadingTaskLabel')}</label>
        <textarea
          className="input"
          rows={5}
          placeholder={t('studyPackV2.teacher.moduleReadingTaskPlaceholder')}
          value={getModuleStringField(content, 'body')}
          onChange={(e) => setContentField('body', e.target.value)}
        />
      </div>
    </div>
  )
}

function SpeakingEditor({ content, setContentField, t }: {
  content: Record<string, unknown>
  setContentField: (key: string, value: string) => void
  t: (key: string) => string
}) {
  return (
    <div className="space-y-4">
      <div className="form-group mb-0">
        <label className="form-label">{t('studyPackV2.teacher.moduleSpeakingPromptLabel')}</label>
        <textarea
          className="input"
          rows={5}
          placeholder={t('studyPackV2.teacher.moduleSpeakingPromptPlaceholder')}
          value={getModuleStringField(content, 'prompt')}
          onChange={(e) => setContentField('prompt', e.target.value)}
        />
      </div>
      <div className="form-group mb-0">
        <label className="form-label">{t('studyPackV2.teacher.moduleHintsLabel')}</label>
        <textarea
          className="input"
          rows={4}
          placeholder={t('studyPackV2.teacher.moduleHintsPlaceholder')}
          value={getModuleStringField(content, 'hints')}
          onChange={(e) => setContentField('hints', e.target.value)}
        />
      </div>
      <MediaUploadSection
        content={content}
        setContentField={setContentField}
        t={t}
      />
    </div>
  )
}

function MediaUploadSection({ content, setContentField, t }: {
  content: Record<string, unknown>
  setContentField: (key: string, value: string) => void
  t: (key: string) => string
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
      <div>
        <p className="font-medium text-slate-900">{t('studyPackV2.teacher.mediaSectionTitle')}</p>
        <p className="text-sm text-slate-500 mt-1">{t('studyPackV2.teacher.mediaSectionDesc')}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),220px]">
        <div className="space-y-3">
          <div className="form-group mb-0">
            <label className="form-label">{t('studyPackV2.teacher.mediaUrlLabel')}</label>
            <input
              className="input"
              value={getModuleStringField(content, 'media_url')}
              placeholder={t('studyPackV2.teacher.mediaUrlPlaceholder')}
              onChange={(e) => setContentField('media_url', e.target.value)}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <input
            type="file"
            accept="audio/*,video/*"
            className="input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 10 * 1024 * 1024) {
                alert(t('studyPackV2.teacher.mediaSizeError'))
                return
              }
              mediaService.upload(file).then((result) => {
                setContentField('media_url', result.url)
                setContentField('media_type', result.media_type)
              }).catch(() => {
                alert(t('studyPackV2.teacher.mediaUploadError'))
              })
            }}
          />
          <p className="text-xs text-slate-500">{t('studyPackV2.teacher.mediaUploadHint')}</p>
          {getModuleStringField(content, 'media_url') && (
            <button
              type="button"
              className="ghost-button text-sm text-red-500"
              onClick={() => {
                setContentField('media_url', '')
                setContentField('media_type', '')
              }}
            >
              {t('studyPackV2.teacher.mediaRemoveAction')}
            </button>
          )}
        </div>
      </div>
      {getModuleStringField(content, 'media_url') && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
          {getModuleStringField(content, 'media_type') === 'video' ? (
            <video controls className="w-full max-h-72" src={getModuleStringField(content, 'media_url')} />
          ) : (
            <audio controls className="w-full" src={getModuleStringField(content, 'media_url')} />
          )}
        </div>
      )}
    </div>
  )
}
