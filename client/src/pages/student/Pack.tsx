import { useEffect, useState } from 'react'
import Layout from '../../components/layout/Layout'
import { useTranslation } from '../../i18n/useTranslation'
import { useAppStore } from '../../stores/app-store'
import {
  audioService,
  StudyPackData,
  StudyPackSubmissionData,
  StudyPackSubmissionResult,
  studyPackService,
  SubmitAnswerData,
} from '../../services/api'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'

type StudyView = 'list' | 'overview' | 'module' | 'module-result' | 'module-complete' | 'pack-complete'

function getModuleLabel(t: (key: string) => string, type: string) {
  return t(`studyPackV2.moduleTypes.${type}`)
}

function getStatusLabel(t: (key: string) => string, status: string) {
  const key = `studyPackV2.statuses.${status}`
  const value = t(key)
  return value === key ? status : value
}

function splitLines(value: unknown) {
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

function getVocabularyItems(content: Record<string, unknown>) {
  const source = Array.isArray(content.items) ? content.items : splitLines(content.body)
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

function getSentenceItems(content: Record<string, unknown>) {
  const source = Array.isArray(content.items) ? content.items : splitLines(content.body)
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

type ModuleData = StudyPackData['modules'][number]

export default function StudentPack() {
  const { t, tWithParams } = useTranslation()
  const { user } = useAppStore()
  const [packs, setPacks] = useState<StudyPackData[]>([])
  const [selectedPack, setSelectedPack] = useState<StudyPackData | null>(null)
  const [currentView, setCurrentView] = useState<StudyView>('list')
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set())
  const [latestSubmissions, setLatestSubmissions] = useState<Record<string, StudyPackSubmissionData>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user?.role !== 'student') return
    void loadPacks()
  }, [user])

  async function loadPacks() {
    setLoading(true)
    try {
      setPacks(await studyPackService.getAll())
    } finally {
      setLoading(false)
    }
  }

  async function openPack(packId: string) {
    const detail = await studyPackService.getById(packId)
    const completed = new Set<string>((detail.completed_module_ids || []).map(String))
    const firstPendingIndex = detail.modules.findIndex((module: ModuleData) => !completed.has(module.id))
    const latestMap = Object.fromEntries(
      (detail.latest_submissions || [])
        .filter((submission: StudyPackSubmissionData) => submission.module_id)
        .map((submission: StudyPackSubmissionData) => [String(submission.module_id), submission])
    )
    setSelectedPack(detail)
    setCompletedModules(completed)
    setLatestSubmissions(latestMap)
    setCurrentModuleIndex(firstPendingIndex >= 0 ? firstPendingIndex : 0)
    setCurrentView('overview')
  }

  function resetPack() {
    setSelectedPack(null)
    setCurrentView('list')
    setCurrentModuleIndex(0)
    setCompletedModules(new Set())
    setLatestSubmissions({})
    setAnswers({})
  }

  function restartPack(moduleIndex = 0) {
    if (!selectedPack) return
    const safeIndex = Math.max(0, Math.min(moduleIndex, selectedPack.modules.length - 1))
    const module = selectedPack.modules[safeIndex]
    setCurrentModuleIndex(safeIndex)
    if (module) {
      const latestAnswer = latestSubmissions[module.id]?.answers
      setAnswers((prev) => ({ ...prev, [module.id]: latestAnswer || {} }))
    }
    setCurrentView('module')
  }

  async function submitModule() {
    if (!selectedPack) return
    const module = selectedPack.modules[currentModuleIndex]
    if (!module) return
    const rawAnswer = answers[module.id]
    const normalizedAnswer =
      module.type === 'reading' || module.type === 'listening'
        ? { text: typeof rawAnswer === 'string' ? rawAnswer : String(rawAnswer?.text || '') }
        : rawAnswer || {}

    const payload: SubmitAnswerData = {
      study_pack_id: selectedPack.id,
      module_id: module.id,
      answers: normalizedAnswer,
    }

    setSubmitting(true)
    try {
      const submission = await studyPackService.submitAnswer(payload)
      const nextCompleted = new Set(completedModules)
      nextCompleted.add(module.id)
      setCompletedModules(nextCompleted)
      setLatestSubmissions((prev) => ({ ...prev, [module.id]: submission }))
      const refreshed = await studyPackService.getById(selectedPack.id)
      const refreshedLatestMap = Object.fromEntries(
        (refreshed.latest_submissions || [])
          .filter((item: StudyPackSubmissionData) => item.module_id)
          .map((item: StudyPackSubmissionData) => [String(item.module_id), item])
      )
      setSelectedPack(refreshed)
      setLatestSubmissions((prev) => ({ ...refreshedLatestMap, ...prev, [module.id]: submission }))
      setPacks((prev) => prev.map((pack) => (pack.id === refreshed.id ? refreshed : pack)))
      setCurrentView('module-result')
    } catch {
      alert(t('studyPackV2.student.submitError'))
    } finally {
      setSubmitting(false)
    }
  }

  const activeModule = selectedPack?.modules[currentModuleIndex] || null
  const progressCount = completedModules.size
  const activeSubmission = activeModule ? latestSubmissions[activeModule.id] || null : null

  if (loading) {
    return <Layout><div className="min-h-screen flex items-center justify-center"><p className="text-muted">{t('studyPackV2.student.loading')}</p></div></Layout>
  }

  if (currentView === 'list') {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white p-4">
          <div className="max-w-lg mx-auto space-y-4">
            <div className="text-center py-2">
              <p className="eyebrow">{t('studyPackV2.student.eyebrow')}</p>
              <h2 className="text-2xl font-display font-bold text-slate-900">{t('studyPackV2.student.title')}</h2>
              <p className="text-sm text-slate-500 mt-2">{t('studyPackV2.student.subtitle')}</p>
            </div>
            {packs.length === 0 ? (
              <div className="student-card text-center">
                <div className="brand-mark mx-auto mb-4">教</div>
                <h3 className="text-xl font-display font-bold mb-2">{t('studyPackV2.student.emptyTitle')}</h3>
                <p className="text-muted">{t('studyPackV2.student.emptyDesc')}</p>
              </div>
            ) : (
              packs.map((pack) => {
                const status = pack.effective_status || pack.status
                const progress = pack.module_count ? (pack.completed_count / pack.module_count) * 100 : 0
                const isCompleted = progress >= 100
                const progressColor = isCompleted
                  ? 'bg-emerald-500'
                  : progress > 0
                    ? 'bg-blue-500'
                    : 'bg-slate-300'
                const statusClass = isCompleted ? 'success' : progress > 0 ? 'warm' : 'cool'
                const moduleTypes = [...new Set((pack.modules || []).map((m) => m.type))]

                return (
                  <button
                    key={pack.id}
                    className="student-card text-left w-full group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                    onClick={() => void openPack(pack.id)}
                  >
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{pack.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {pack.class_name || t('studyPackV2.student.defaultClassName')} · {tWithParams('studyPackV2.student.moduleSummary', { count: pack.module_count, minutes: pack.estimated_total_minutes })}
                        </p>
                      </div>
                      <span className={`status-badge ${statusClass} flex-shrink-0`}>{getStatusLabel(t, status)}</span>
                    </div>

                    {pack.description && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{pack.description}</p>
                    )}

                    {moduleTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {moduleTypes.slice(0, 4).map((type) => (
                          <span key={type} className="card-tag">{getModuleLabel(t, type)}</span>
                        ))}
                        {moduleTypes.length > 4 && (
                          <span className="card-tag">+{moduleTypes.length - 4}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-medium tabular-nums">{pack.completed_count}/{pack.module_count}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </Layout>
    )
  }

  if (!selectedPack) return null

  if (currentView === 'overview') {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white p-4">
          <div className="max-w-lg mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <BackButton label={t('studyPackV2.student.backToList')} onClick={resetPack} />
              <span className="card-tag">{tWithParams('studyPackV2.student.doneCount', { done: progressCount, total: selectedPack.modules.length })}</span>
            </div>
            <div className="student-card">
              <span className="card-tag mb-3 inline-block">{t('studyPackV2.student.detailTag')}</span>
              <h2 className="text-2xl font-display font-bold text-slate-900">{selectedPack.title}</h2>
              <p className="text-slate-600 mt-3">{selectedPack.description || t('studyPackV2.student.detailNoDescription')}</p>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <StatCard label={t('studyPackV2.student.detailModuleCount')} value={`${selectedPack.module_count}`} />
                <StatCard label={t('studyPackV2.student.detailMinutes')} value={`${selectedPack.estimated_total_minutes}`} />
                <StatCard label={t('studyPackV2.student.detailRule')} value={t('studyPackV2.student.detailRuleValue')} />
                <StatCard label={t('studyPackV2.student.detailFlow')} value={t('studyPackV2.student.detailFlowValue')} />
              </div>
              <div className="mt-5">
                <h3 className="font-semibold text-slate-900 mb-3">{t('studyPackV2.student.detailPath')}</h3>
                <div className="space-y-3">
                  {selectedPack.modules.map((module, index) => {
                    const isCompleted = completedModules.has(module.id)
                    const isCurrent = index === currentModuleIndex
                    const hasResult = Boolean(latestSubmissions[module.id]?.result)
                    return (
                      <div key={module.id} className="p-4 rounded-xl" style={{ background: isCurrent ? 'rgba(239,246,255,0.9)' : 'rgba(255,255,255,0.75)', border: `1px solid ${isCurrent ? 'rgba(59,130,246,0.2)' : 'rgba(24,36,58,0.08)'}` }}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{index + 1}. {getModuleLabel(t, module.type)}</p>
                            <p className="text-sm text-slate-500 mt-1">{module.estimated_minutes || 0}</p>
                          </div>
                          <span className={`status-badge ${isCompleted ? 'success' : 'warm'}`}>{isCompleted ? t('studyPackV2.student.completed') : isCurrent ? t('studyPackV2.student.currentStep') : t('studyPackV2.student.notStarted')}</span>
                        </div>
                        {(isCompleted || hasResult) && (
                          <div className="flex gap-2 mt-3">
                            <button
                              className="ghost-button text-sm"
                              onClick={() => {
                                setCurrentModuleIndex(index)
                                setCurrentView('module-result')
                              }}
                            >
                              {t('studyPackResults.viewResult')}
                            </button>
                            <button
                              className="ghost-button text-sm"
                              onClick={() => restartPack(index)}
                            >
                              {t('studyPackResults.studyAgain')}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <button
                className="solid-button wide-button mt-6"
                onClick={() => {
                  if (progressCount >= selectedPack.modules.length) {
                    setCurrentModuleIndex(0)
                    setCurrentView('module-result')
                    return
                  }
                  setCurrentView('module')
                }}
              >
                {progressCount === 0 ? t('studyPackV2.student.startLearning') : progressCount >= selectedPack.modules.length ? t('studyPackV2.student.viewResult') : t('studyPackV2.student.continueLearning')}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (currentView === 'module-complete' && activeModule) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white p-4 flex items-center justify-center">
          <div className="student-card max-w-lg w-full text-center">
            <div className="brand-mark mx-auto mb-4">OE</div>
            <span className="card-tag mb-3 inline-block">{t('studyPackV2.student.moduleCompleteTag')}</span>
            <h2 className="text-2xl font-display font-bold text-slate-900">{t('studyPackV2.student.moduleCompleteTitle')}</h2>
            <p className="text-slate-600 mt-3">{tWithParams('studyPackV2.student.moduleCompleteDesc', { type: getModuleLabel(t, activeModule.type) })}</p>
            <StatCard label={t('studyPackV2.student.progressTitle')} value={tWithParams('studyPackV2.student.progressValue', { done: progressCount, total: selectedPack.modules.length })} className="mt-5 text-left" />
            <button className="solid-button wide-button mt-6" onClick={() => { setCurrentModuleIndex(Math.min(currentModuleIndex + 1, selectedPack.modules.length - 1)); setCurrentView('module') }}>
              {t('studyPackV2.student.goNextModule')}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (currentView === 'module-result' && activeModule) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white p-4">
          <div className="max-w-lg mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <BackButton label={t('studyPackV2.student.backToOverview')} onClick={() => setCurrentView('overview')} />
              <span className="card-tag">{getModuleLabel(t, activeModule.type)}</span>
            </div>
            <div className="student-card">
              <h2 className="text-2xl font-display font-bold text-slate-900">{t('studyPackResults.resultTitle')}</h2>
              <p className="text-slate-600 mt-2">{tWithParams('studyPackResults.resultMeta', { current: currentModuleIndex + 1, total: selectedPack.modules.length })}</p>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <StatCard
                  label={t('studyPackResults.statusLabel')}
                  value={getResultStatusLabel(t, activeSubmission?.result || null)}
                />
                <StatCard
                  label={t('studyPackResults.scoreLabel')}
                  value={formatResultScore(t, activeSubmission?.result || null)}
                />
              </div>
            </div>

            <ResultCard module={activeModule} submission={activeSubmission} />

            <div className="flex gap-3">
              <button className="ghost-button flex-1" onClick={() => restartPack(currentModuleIndex)}>
                {t('studyPackResults.studyAgain')}
              </button>
              <button
                className="solid-button flex-1"
                onClick={() => {
                  if (currentModuleIndex >= selectedPack.modules.length - 1) {
                    setCurrentView('pack-complete')
                    return
                  }
                  setCurrentModuleIndex(currentModuleIndex + 1)
                  setCurrentView('module')
                }}
              >
                {currentModuleIndex >= selectedPack.modules.length - 1 ? t('studyPackResults.goPackSummary') : t('studyPackResults.nextModule')}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (currentView === 'pack-complete') {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white p-4 flex items-center justify-center">
          <div className="student-card max-w-lg w-full text-center">
            <div className="brand-mark mx-auto mb-4">OE</div>
            <span className="card-tag mb-3 inline-block">{t('studyPackV2.student.packCompleteTag')}</span>
            <h2 className="text-2xl font-display font-bold text-slate-900">{t('studyPackV2.student.packCompleteTitle')}</h2>
            <p className="text-slate-600 mt-3">{t('studyPackV2.student.packCompleteDesc')}</p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <StatCard label={t('studyPackV2.student.detailModuleCount')} value={`${completedModules.size}/${selectedPack.modules.length}`} />
              <StatCard label={t('studyPackV2.student.detailMinutes')} value={`${selectedPack.estimated_total_minutes}`} />
            </div>
            <div className="flex gap-3 mt-6">
              <button className="ghost-button flex-1" onClick={() => setCurrentView('overview')}>{t('studyPackV2.student.viewDetail')}</button>
              <button className="ghost-button flex-1" onClick={() => restartPack(0)}>{t('studyPackResults.studyAgain')}</button>
              <button className="solid-button flex-1" onClick={resetPack}>{t('studyPackV2.student.returnToList')}</button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center justify-between gap-3">
              <BackButton label={t('studyPackV2.student.backToOverview')} onClick={() => setCurrentView('overview')} />
              <span className="text-sm text-slate-500">{tWithParams('studyPackV2.student.doneCount', { done: progressCount, total: selectedPack.modules.length })}</span>
            </div>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedPack.modules.length ? (progressCount / selectedPack.modules.length) * 100 : 0}%` }} />
            </div>
          </div>
          {activeModule && (
            <div className="student-card">
              <div className="mb-5">
                <span className="card-tag">{getModuleLabel(t, activeModule.type)}</span>
                <h2 className="text-xl font-display font-bold text-slate-900 mt-3">{selectedPack.title}</h2>
                <p className="text-sm text-slate-500 mt-2">{tWithParams('studyPackV2.student.stepMeta', { current: currentModuleIndex + 1, total: selectedPack.modules.length, minutes: activeModule.estimated_minutes || 0 })}</p>
              </div>
              <ModulePractice module={activeModule} answer={answers[activeModule.id]} onAnswerChange={(value) => setAnswers((prev) => ({ ...prev, [activeModule.id]: value }))} />
              <div className="flex items-center justify-between gap-3 mt-6">
                <button className="ghost-button" onClick={() => setCurrentView('overview')}>{t('studyPackV2.student.pauseAndReturn')}</button>
                <button className="solid-button" onClick={() => void submitModule()} disabled={submitting}>
                  {submitting ? t('studyPackV2.student.submitting') : currentModuleIndex === selectedPack.modules.length - 1 ? t('studyPackV2.student.submitAndFinish') : t('studyPackV2.student.submitAndContinue')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

function StatCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`callout-card ${className}`.trim()}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900 mt-2">{value}</p>
    </div>
  )
}

function BackButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      className="ghost-button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        borderRadius: '999px',
        background: 'rgba(255,255,255,0.96)',
        border: '1px solid rgba(24,36,58,0.1)',
        color: 'var(--ink)',
        fontWeight: 600,
        boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
      }}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  )
}

function getResultStatusLabel(t: (key: string) => string, result: StudyPackSubmissionResult | null) {
  if (!result) return t('studyPackResults.statusPending')
  if (result.overall_status === 'graded') return t('studyPackResults.statusGraded')
  return t('studyPackResults.statusSubmitted')
}

function formatResultScore(t: (key: string) => string, result: StudyPackSubmissionResult | null) {
  if (!result) return t('studyPackResults.notAvailable')
  if (result.score === null || result.score === undefined) return t('studyPackResults.notAvailable')
  return `${Math.round(result.score * 100)}%`
}

function ResultCard({
  module,
  submission,
}: {
  module: ModuleData
  submission: StudyPackSubmissionData | null
}) {
  const { t } = useTranslation()
  const result = submission?.result

  if (!result) {
    return (
      <div className="student-card">
        <p className="text-slate-600">{t('studyPackResults.empty')}</p>
      </div>
    )
  }

  return (
    <div className="student-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{getModuleLabel(t, module.type)}</h3>
          <p className="text-sm text-slate-500 mt-1">
            {result.total_count > 0
              ? t('studyPackResults.correctSummary')
                  .replace('{{correct}}', String(result.correct_count))
                  .replace('{{total}}', String(result.total_count))
              : t('studyPackResults.submittedOnly')}
          </p>
        </div>
        <span className="card-tag">{formatResultScore(t, result)}</span>
      </div>

      <div className="space-y-3">
        {result.items.map((item) => (
          <div key={`${module.id}-${item.index}`} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-slate-900">{item.prompt || `${t('studyPackResults.itemLabel')} ${item.index + 1}`}</p>
              <span
                className={`status-badge ${
                  item.is_correct === true ? 'success' : 'warm'
                }`}
              >
                {item.is_correct === true
                  ? t('studyPackResults.correct')
                  : item.is_correct === false
                  ? t('studyPackResults.incorrect')
                  : t('studyPackResults.submitted')}
              </span>
            </div>
            <QuestionImageBlock imageUrl={item.image_url} imageCaption={item.image_caption} alt={item.prompt} />
            {item.audio_url && (
              <div className="mt-3">
                <audio controls src={item.audio_url} className="w-full" />
              </div>
            )}
            <div className="grid gap-3 mt-4 md:grid-cols-2">
              <div className="callout-card">
                <p className="text-xs text-slate-500">{t('studyPackResults.yourAnswer')}</p>
                <p className="font-medium text-slate-900 mt-2 whitespace-pre-wrap">{item.student_answer || t('studyPackResults.emptyAnswer')}</p>
              </div>
              <div className="callout-card">
                <p className="text-xs text-slate-500">{t('studyPackResults.expectedAnswer')}</p>
                <p className="font-medium text-slate-900 mt-2 whitespace-pre-wrap">{item.expected_answer || t('studyPackResults.noReference')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuestionImageBlock({
  imageUrl,
  imageCaption,
  alt,
}: {
  imageUrl?: string
  imageCaption?: string
  alt?: string
}) {
  const safeImageUrl = String(imageUrl || '').trim()
  const safeImageCaption = String(imageCaption || '').trim()

  if (!safeImageUrl) return null

  return (
    <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 bg-white">
      <img src={safeImageUrl} alt={safeImageCaption || alt || ''} className="w-full max-h-72 object-cover" />
      {safeImageCaption && <div className="px-4 py-3 text-sm text-slate-500">{safeImageCaption}</div>}
    </div>
  )
}

function ModulePractice({ module, answer, onAnswerChange }: { module: ModuleData; answer: any; onAnswerChange: (answer: any) => void }) {
  const { t, tWithParams } = useTranslation()
  const content = (module.content || {}) as Record<string, unknown>

  if (module.type === 'speaking') {
    return <SpeakingPractice prompt={String(content.prompt || t('studyPackV2.student.speakingDefaultPrompt'))} hints={splitLines(content.hints)} content={content} answer={answer} onAnswerChange={onAnswerChange} />
  }

  if (module.type === 'vocabulary') {
    const items = getVocabularyItems(content)
    const values = answer || {}
    return (
      <div className="space-y-4">
        <div className="callout-card">
          <p className="font-medium text-slate-900">{String(content.title || getModuleLabel(t, module.type))}</p>
          <p className="text-sm text-slate-600 mt-2">{t('studyPackV2.student.vocabularyDesc')}</p>
          {splitLines(content.hints).length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-slate-500">
              {splitLines(content.hints).map((hint, index) => <li key={index}>• {hint}</li>)}
            </ul>
          )}
        </div>
        <div className="space-y-3">
          {items.map((item, index) => {
            return (
              <div key={`${item.word || 'word'}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.word || `${t('studyPackV2.student.wordLabel')} ${index + 1}`}</p>
                    {item.phonetic && <p className="text-sm text-slate-400 mt-1">{item.phonetic}</p>}
                  </div>
                </div>
                <QuestionImageBlock imageUrl={item.image_url} imageCaption={item.image_caption} alt={item.word || `${t('studyPackV2.student.wordLabel')} ${index + 1}`} />
                <input
                  className="input mt-3"
                  value={values[index] || ''}
                  placeholder={t('studyPackV2.student.vocabularyPlaceholder')}
                  onChange={(event) => onAnswerChange({ ...values, [index]: event.target.value })}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (module.type === 'sentence') {
    const items = getSentenceItems(content)
    const values = answer || {}
    const hints = splitLines(content.pattern)
    return (
      <div className="space-y-4">
        <div className="callout-card">
          <p className="font-medium text-slate-900">{String(content.title || getModuleLabel(t, module.type))}</p>
          <p className="text-sm text-slate-600 mt-2">{t('studyPackV2.student.sentenceDesc')}</p>
          {hints.length > 0 && <p className="text-xs text-slate-500 mt-3">{tWithParams('studyPackV2.student.sentencePattern', { pattern: hints.join(' / ') })}</p>}
        </div>
        <div className="space-y-3">
          {items.map((item, index) => {
            return (
              <div key={`${item.sentence || 'sentence'}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-medium text-slate-900">{item.sentence || `${t('studyPackV2.student.sentenceLabel')} ${index + 1}`}</p>
                {item.translation && <p className="text-sm text-slate-500 mt-2">{item.translation}</p>}
                {item.pattern && <p className="text-xs text-slate-400 mt-2">{item.pattern}</p>}
                <QuestionImageBlock imageUrl={item.image_url} imageCaption={item.image_caption} alt={item.sentence || `${t('studyPackV2.student.sentenceLabel')} ${index + 1}`} />
                <textarea
                  className="input mt-3"
                  rows={3}
                  value={values[index] || ''}
                  placeholder={t('studyPackV2.student.sentencePlaceholder')}
                  onChange={(event) => onAnswerChange({ ...values, [index]: event.target.value })}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (module.type === 'listening') {
    const textAnswer = typeof answer === 'string' ? answer : String(answer?.text || '')
    const mediaUrl = String(content.media_url || '')
    const mediaType = String(content.media_type || '')
    return (
      <div className="space-y-4">
        <div className="callout-card">
          <p className="font-medium text-slate-900">{String(content.title || t('studyPackV2.student.listeningDefaultTitle'))}</p>
          <p className="text-sm text-slate-600 mt-2">{String(content.prompt || t('studyPackV2.student.listeningDefaultPrompt'))}</p>
          <QuestionImageBlock imageUrl={String(content.image_url || '')} imageCaption={String(content.image_caption || '')} alt={String(content.title || t('studyPackV2.student.listeningDefaultTitle'))} />
          {mediaUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200">
              {mediaType === 'video' ? (
                <video controls className="w-full" src={mediaUrl} />
              ) : (
                <audio controls className="w-full" src={mediaUrl} />
              )}
            </div>
          )}
          {Boolean(content.script) && <p className="text-sm text-slate-500 mt-3 whitespace-pre-wrap">{String(content.script)}</p>}
          {splitLines(content.body).length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-slate-500">
              {splitLines(content.body).map((hint, index) => <li key={index}>• {hint}</li>)}
            </ul>
          )}
        </div>
        <textarea
          className="input"
          rows={6}
          value={textAnswer}
          onChange={(event) => onAnswerChange({ ...(typeof answer === 'object' && answer ? answer : {}), text: event.target.value })}
          placeholder={t('studyPackV2.student.listeningPlaceholder')}
        />
      </div>
    )
  }

  if (module.type === 'reading') {
    const textAnswer = typeof answer === 'string' ? answer : String(answer?.text || '')
    return (
      <div className="space-y-4">
        <div className="callout-card">
          <p className="font-medium text-slate-900">{String(content.title || t('studyPackV2.student.readingDefaultTitle'))}</p>
          <QuestionImageBlock imageUrl={String(content.image_url || '')} imageCaption={String(content.image_caption || '')} alt={String(content.title || t('studyPackV2.student.readingDefaultTitle'))} />
          {Boolean(content.content) && <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{String(content.content)}</p>}
          {Boolean(content.body) && <p className="text-sm text-slate-500 mt-3 whitespace-pre-wrap">{String(content.body)}</p>}
        </div>
        <textarea
          className="input"
          rows={6}
          value={textAnswer}
          onChange={(event) => onAnswerChange({ ...(typeof answer === 'object' && answer ? answer : {}), text: event.target.value })}
          placeholder={t('studyPackV2.student.readingPlaceholder')}
        />
      </div>
    )
  }

  return (
    <div className="callout-card">
      <p className="text-slate-600">{t('studyPackV2.student.unsupportedModule')}</p>
    </div>
  )
}

function SpeakingPractice({
  prompt,
  hints,
  content,
  answer,
  onAnswerChange,
}: {
  prompt: string
  hints: string[]
  content: Record<string, unknown>
  answer: any
  onAnswerChange: (answer: any) => void
}) {
  const { t, tWithParams } = useTranslation()
  const { status, duration, audioUrl, startRecording, stopRecording, resetRecording, getRecordingResult, isSupported } = useAudioRecorder()
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(answer?.audio_url || null)

  async function handleUpload() {
    const result = getRecordingResult()
    if (!result) return
    setUploading(true)
    try {
      const url = await audioService.upload(result.blob)
      setUploadedUrl(url)
      onAnswerChange({ ...(answer || {}), audio_url: url, duration: result.duration })
    } catch {
      alert(t('studyPackV2.student.speakingUploadError'))
    } finally {
      setUploading(false)
    }
  }

  if (!isSupported) {
    return <div className="callout-card"><p className="text-slate-600">{t('studyPackV2.student.speakingUnsupported')}</p></div>
  }

  return (
    <div className="space-y-4">
      <div className="callout-card">
        <p className="font-medium text-slate-900">{t('studyPackV2.student.speakingTitle')}</p>
        <p className="text-sm text-slate-600 mt-2">{prompt}</p>
        {String(content.media_url || '') && (
          <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200">
            {String(content.media_type || '') === 'video' ? (
              <video controls className="w-full" src={String(content.media_url || '')} />
            ) : (
              <audio controls className="w-full" src={String(content.media_url || '')} />
            )}
          </div>
        )}
        <QuestionImageBlock imageUrl={String(content.image_url || '')} imageCaption={String(content.image_caption || '')} alt={prompt} />
        {hints.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-slate-500">
            {hints.map((hint, index) => <li key={index}>• {hint}</li>)}
          </ul>
        )}
      </div>
      <div className="callout-card">
        <p className="text-sm text-slate-500">{tWithParams('studyPackV2.student.speakingStatus', { status })}</p>
        <p className="text-sm text-slate-500 mt-1">{tWithParams('studyPackV2.student.speakingDuration', { duration })}</p>
        <div className="flex gap-3 mt-4">
          <button className="ghost-button" onClick={() => void startRecording(60)} disabled={status === 'recording'}>{t('studyPackV2.student.speakingStart')}</button>
          <button className="ghost-button" onClick={stopRecording} disabled={status !== 'recording'}>{t('studyPackV2.student.speakingStop')}</button>
          <button className="ghost-button" onClick={resetRecording}>{t('studyPackV2.student.speakingReset')}</button>
        </div>
        {audioUrl && <div className="mt-4"><audio controls src={audioUrl} className="w-full" /></div>}
        {status === 'stopped' && !uploadedUrl && <button className="solid-button mt-4" onClick={() => void handleUpload()} disabled={uploading}>{uploading ? t('studyPackV2.student.speakingUploading') : t('studyPackV2.student.speakingUpload')}</button>}
        {uploadedUrl && <p className="text-sm text-green-600 mt-4">{t('studyPackV2.student.speakingUploaded')}</p>}
      </div>
    </div>
  )
}
