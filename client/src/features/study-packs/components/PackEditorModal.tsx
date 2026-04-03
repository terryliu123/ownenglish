import { PackEditorProps, STEPS } from '../types'
import { ModuleManager } from './ModuleManager'
import { ModuleEditor } from './ModuleEditor'
import { PackPreview } from './PackPreview'
import { AiPackPanel } from './AiPackPanel'

export function PackEditorModal({
  isOpen,
  isNew,
  currentStep,
  form,
  classes,
  aiPackPrompt,
  aiPackTargetMinutes,
  aiPackModuleTypes,
  aiPackMessage,
  aiPackLoading,
  aiDifficulty,
  canUseAi,
  saving,
  onClose,
  onStepChange,
  onFormChange,
  onAiPackPromptChange,
  onAiPackTargetMinutesChange,
  onAiPackModuleTypesChange,
  onAiDifficultyChange,
  onRunAiGeneratePack,
  onSave,
  t,
  tWithParams,
}: PackEditorProps) {
  if (!isOpen) return null

  const summaryMinutes = form.modules.reduce((sum, module) => sum + (module.estimated_minutes || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{isNew ? t('studyPackV2.teacher.createTitle') : t('studyPackV2.teacher.editTitle')}</h3>
              <p className="text-sm text-slate-500 mt-1">{form.title || t('studyPackV2.teacher.editorDesc')}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label={t('studyPackV2.teacher.close')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-center mt-6">
            <div className="flex items-center gap-2">
              {STEPS.map((step, index) => {
                const isActive = currentStep === step.id
                const isCompleted = currentStep > step.id
                const canNavigate = step.id < currentStep

                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => canNavigate && onStepChange(step.id)}
                      disabled={!canNavigate}
                      className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : isCompleted
                          ? 'bg-green-100 text-green-700 cursor-pointer'
                          : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-lg font-bold">{step.id}</span>
                      <span className="text-xs">{t(`studyPackV2.teacher.${step.labelKey}`)}</span>
                    </button>
                    {index < STEPS.length - 1 && <div className="w-8 h-0.5 mx-2 bg-slate-200" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-8">
            {currentStep === 1 && (
              <div className="max-w-6xl mx-auto">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),420px]">
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {t('studyPackV2.teacher.fieldTitle')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.title}
                          onChange={(e) => onFormChange({ ...form, title: e.target.value })}
                          placeholder={t('studyPackV2.teacher.fieldTitlePlaceholder')}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {t('studyPackV2.teacher.fieldClass')} <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={form.class_id}
                          onChange={(e) => onFormChange({ ...form, class_id: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                        >
                          <option value="">{t('studyPackV2.teacher.fieldClassPlaceholder')}</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t('studyPackV2.teacher.fieldDueDate')}</label>
                        <input
                          type="datetime-local"
                          value={form.due_date}
                          onChange={(e) => onFormChange({ ...form, due_date: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t('studyPackV2.teacher.fieldDescription')}</label>
                        <textarea
                          value={form.description}
                          onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                          placeholder={t('studyPackV2.teacher.fieldDescriptionPlaceholder')}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          rows={5}
                        />
                      </div>

                      <button
                        onClick={() => onStepChange(2)}
                        disabled={!form.title.trim() || !form.class_id}
                        className="w-full py-3.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('studyPackV2.teacher.nextStep')} →
                      </button>
                    </div>
                  </div>
                  <AiPackPanel
                    aiPackPrompt={aiPackPrompt}
                    aiPackTargetMinutes={aiPackTargetMinutes}
                    aiPackModuleTypes={aiPackModuleTypes}
                    aiPackMessage={aiPackMessage}
                    aiPackLoading={aiPackLoading}
                    aiDifficulty={aiDifficulty}
                    canUseAi={canUseAi}
                    onAiPackPromptChange={onAiPackPromptChange}
                    onAiPackTargetMinutesChange={onAiPackTargetMinutesChange}
                    onAiPackModuleTypesChange={onAiPackModuleTypesChange}
                    onAiDifficultyChange={onAiDifficultyChange}
                    onRunAiGeneratePack={onRunAiGeneratePack}
                    t={t}
                    tWithParams={tWithParams}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <ModuleManager
                modules={form.modules}
                onAddModule={(type) => onFormChange({ ...form, modules: [...form.modules, { type, order: form.modules.length, estimated_minutes: 5, content: { title: t(`studyPackV2.teacherDefaults.${type}Title`) } }] })}
                onRemoveModule={(index) => onFormChange({ ...form, modules: form.modules.filter((_, i) => i !== index).map((m, i) => ({ ...m, order: i })) })}
                onMoveModule={(index, dir) => {
                  const nextIndex = index + dir
                  if (nextIndex < 0 || nextIndex >= form.modules.length) return
                  const modules = [...form.modules]
                  ;[modules[index], modules[nextIndex]] = [modules[nextIndex], modules[index]]
                  onFormChange({ ...form, modules: modules.map((m, i) => ({ ...m, order: i })) })
                }}
                onUpdateModule={(index, updater) => onFormChange({ ...form, modules: form.modules.map((m, i) => i === index ? updater(m) : m) })}
                onNext={() => onStepChange(form.modules.length > 0 ? 3 : 5)}
                onPrev={() => onStepChange(1)}
                t={t}
                tWithParams={tWithParams}
              />
            )}

            {currentStep === 3 && (
              <ModuleManager
                modules={form.modules}
                onAddModule={() => {}}
                onRemoveModule={(index) => onFormChange({ ...form, modules: form.modules.filter((_, i) => i !== index).map((m, i) => ({ ...m, order: i })) })}
                onMoveModule={(index, dir) => {
                  const nextIndex = index + dir
                  if (nextIndex < 0 || nextIndex >= form.modules.length) return
                  const modules = [...form.modules]
                  ;[modules[index], modules[nextIndex]] = [modules[nextIndex], modules[index]]
                  onFormChange({ ...form, modules: modules.map((m, i) => ({ ...m, order: i })) })
                }}
                onUpdateModule={(index, updater) => onFormChange({ ...form, modules: form.modules.map((m, i) => i === index ? updater(m) : m) })}
                onNext={() => onStepChange(4)}
                onPrev={() => onStepChange(2)}
                isEditMode
                t={t}
                tWithParams={tWithParams}
              />
            )}

            {currentStep === 4 && (
              <ModuleEditor
                modules={form.modules}
                contentModuleIndex={0}
                contentMode="manual"
                aiImportText=""
                aiImportFile={null}
                aiPrompt=""
                aiDifficulty={aiDifficulty}
                aiMessage=""
                aiLoading={false}
                canUseAi={canUseAi}
                onContentModuleIndexChange={() => {}}
                onContentModeChange={() => {}}
                onAiImportTextChange={() => {}}
                onAiImportFileChange={() => {}}
                onAiPromptChange={() => {}}
                onAiDifficultyChange={onAiDifficultyChange}
                onRunAiImport={() => {}}
                onRunAiGenerate={() => {}}
                onUpdateModule={(index, updater) => onFormChange({ ...form, modules: form.modules.map((m, i) => i === index ? updater(m) : m) })}
                onSetVocabularyItems={() => {}}
                onSetSentenceItems={() => {}}
                onNext={() => onStepChange(5)}
                onPrev={() => onStepChange(3)}
                t={t}
                tWithParams={tWithParams}
              />
            )}

            {currentStep === 5 && (
              <PackPreview
                form={form}
                classes={classes}
                summaryMinutes={summaryMinutes}
                saving={saving}
                onBack={() => onStepChange(form.modules.length > 0 ? 4 : 2)}
                onSaveDraft={() => onSave('draft')}
                onPublish={() => onSave('published')}
                t={t}
                tWithParams={tWithParams}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
