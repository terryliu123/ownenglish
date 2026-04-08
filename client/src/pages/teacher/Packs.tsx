import { useState, useCallback } from 'react'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import { useTranslation } from '../../i18n/useTranslation'
import {
  useStudyPacks,
  usePackModules,
  PackList,
  AnalyticsPanel,
  StudyPacksHeader,
  PackEditorModal,
  defaultForm,
  StepId,
  ModuleType,
} from '../../features/study-packs'

export default function Packs() {
  const { t, tWithParams } = useTranslation()
  const [showModal, setShowModal] = useState(false)
  const [currentStep, setCurrentStep] = useState<StepId>(1)
  const [isNew, setIsNew] = useState(false)

  const sp = useStudyPacks()
  const pm = usePackModules(sp.form, sp.setForm, sp.canUseAi, sp.getMembershipMessage, t)

  const openEditor = useCallback(async (packId: string) => {
    const prepared = sp.preparePackForEdit(packId)
    if (!prepared) { alert(t('studyPackV2.teacher.loadError')); return }
    sp.setSelectedPackId(packId)
    setIsNew(false)
    sp.setForm(prepared.formState)
    sp.setAiPackTargetMinutes(prepared.aiPackTargetMinutes)
    sp.setAiPackModuleTypes(prepared.aiPackModuleTypes)
    sp.setAiPackPrompt(''); sp.setAiPackMessage('')
    pm.setContentModuleIndex(0); pm.setContentMode('manual')
    pm.setAiImportText(''); pm.setAiImportFile(null)
    pm.setAiPrompt(''); pm.setAiMessage('')
    setCurrentStep(prepared.pack.modules.length > 0 ? 3 : 2)
    setShowModal(true)
  }, [sp, pm, t])

  const openCreate = useCallback(() => {
    if (!sp.canCreateStudyPack) { alert(t('membership.studyPackLimitReached')); return }
    sp.setSelectedPackId(null); setIsNew(true); setCurrentStep(1)
    sp.setForm(defaultForm(sp.classes[0]?.id || ''))
    sp.setAiPackPrompt(''); sp.setAiPackMessage('')
    sp.setAiPackTargetMinutes(15)
    sp.setAiPackModuleTypes(['vocabulary', 'sentence', 'speaking'])
    pm.setContentModuleIndex(0); pm.setContentMode('manual')
    pm.setAiImportText(''); pm.setAiImportFile(null)
    pm.setAiPrompt(''); pm.setAiMessage('')
    setShowModal(true)
  }, [sp, pm, t])

  const closeModal = useCallback(() => {
    setShowModal(false); setCurrentStep(1)
    pm.setContentModuleIndex(0); pm.setContentMode('manual')
    pm.setAiImportText(''); pm.setAiImportFile(null)
    pm.setAiPrompt(''); pm.setAiMessage('')
    sp.setAiPackPrompt(''); sp.setAiPackMessage('')
    sp.setAiPackTargetMinutes(15)
    sp.setAiPackModuleTypes(['vocabulary', 'sentence', 'speaking'])
    setIsNew(false)
  }, [sp, pm])

  const handleSave = useCallback(async (nextStatus?: 'draft' | 'published') => {
    const result = await sp.savePack(sp.form, isNew, sp.selectedPackId, nextStatus, t)
    if (result) closeModal()
  }, [sp, isNew, closeModal, t])

  const handleAiGeneratePack = useCallback(async () => {
    const result = await sp.runAiGeneratePack(sp.form.class_id, sp.form.title, sp.form.description, sp.aiPackPrompt, t)
    if (result) {
      sp.setForm(prev => ({ ...prev, title: result.title || prev.title, description: result.description || prev.description, modules: result.modules }))
      pm.setContentModuleIndex(0)
      setCurrentStep(result.modules.length ? 3 : 2)
    }
  }, [sp, pm, t])

  const toggleAiPackModuleType = useCallback((types: ModuleType[]) => sp.setAiPackModuleTypes(types), [sp.setAiPackModuleTypes])

  return (
    <Layout sidebar={<TeacherSidebar activePage="packs" />} leftSidebar={<TeacherLeftSidebar activePage="packs" />}>
      <StudyPacksHeader
        packs={sp.packs}
        membership={sp.membership}
        canCreateStudyPack={sp.canCreateStudyPack}
        canUseAi={sp.canUseAi}
        studyPackUsage={sp.studyPackUsage}
        studyPackLimit={sp.studyPackLimit}
        onCreate={openCreate}
        t={t}
        tWithParams={tWithParams}
      />

      <section className="teacher-grid split-2" style={{ alignItems: 'start' }}>
        <PackList
          packs={sp.filtered}
          loading={sp.loading}
          selectedPackId={sp.selectedPackId}
          keyword={sp.keyword}
          statusFilter={sp.statusFilter}
          onKeywordChange={sp.setKeyword}
          onStatusFilterChange={sp.setStatusFilter}
          onSelectPack={sp.setSelectedPackId}
          onEdit={openEditor}
          onChangeStatus={(id, s) => sp.changeStatus(id, s, t)}
          t={t}
          tWithParams={tWithParams}
        />

        <AnalyticsPanel
          selectedPack={sp.selectedPack}
          analytics={sp.analytics}
          analyticsLoading={sp.analyticsLoading}
          onEdit={openEditor}
          t={t}
          tWithParams={tWithParams}
        />
      </section>

      <PackEditorModal
        isOpen={showModal}
        isNew={isNew}
        currentStep={currentStep}
        form={sp.form}
        classes={sp.classes}
        aiPackPrompt={sp.aiPackPrompt}
        aiPackTargetMinutes={sp.aiPackTargetMinutes}
        aiPackModuleTypes={sp.aiPackModuleTypes}
        aiPackMessage={sp.aiPackMessage}
        aiPackLoading={sp.aiPackLoading}
        aiDifficulty={sp.aiDifficulty}
        canUseAi={sp.canUseAi}
        saving={sp.saving}
        onClose={closeModal}
        onStepChange={setCurrentStep}
        onFormChange={sp.setForm}
        onAiPackPromptChange={sp.setAiPackPrompt}
        onAiPackTargetMinutesChange={sp.setAiPackTargetMinutes}
        onAiPackModuleTypesChange={toggleAiPackModuleType}
        onAiDifficultyChange={(v) => { sp.setAiDifficulty(v); pm.setAiDifficulty(v) }}
        onRunAiGeneratePack={handleAiGeneratePack}
        onSave={handleSave}
        t={t}
        tWithParams={tWithParams}
      />
    </Layout>
  )
}
