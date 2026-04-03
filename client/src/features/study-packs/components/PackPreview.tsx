import { FormState } from '../types'
import { label, getModulePreviewEntries, getModuleStringField } from '../utils'

interface PackPreviewProps {
  form: FormState
  classes: { id: string; name: string }[]
  summaryMinutes: number
  saving: boolean
  onBack: () => void
  onSaveDraft: () => void
  onPublish: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
}

export function PackPreview({
  form,
  classes,
  summaryMinutes,
  saving,
  onBack,
  onSaveDraft,
  onPublish,
  t,
  tWithParams,
}: PackPreviewProps) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('studyPackV2.teacher.previewTitle')}</h3>
        <p className="text-slate-500">{tWithParams('studyPackV2.teacher.previewTip', { title: form.title, count: form.modules.length })}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="bg-slate-50 rounded-3xl p-6 text-left">
          <h4 className="font-medium text-slate-900 mb-4">{t('studyPackV2.teacher.previewSummary')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{form.modules.length}</p>
              <p className="text-xs text-slate-500">{tWithParams('studyPackV2.teacher.summaryModules', { count: form.modules.length })}</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{summaryMinutes}</p>
              <p className="text-xs text-slate-500">{tWithParams('studyPackV2.teacher.summaryMinutes', { minutes: summaryMinutes })}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-600"><span className="font-medium">{t('studyPackV2.teacher.fieldClass')}：</span>{classes.find((item) => item.id === form.class_id)?.name || '-'}</p>
            <p className="text-sm text-slate-600"><span className="font-medium">{t('studyPackV2.teacher.fieldDueDate')}：</span>{form.due_date ? new Date(form.due_date).toLocaleString() : '-'}</p>
          </div>
          <div className="mt-6 space-y-3">
            {form.modules.map((module, index) => {
              const content = (module.content || {}) as Record<string, unknown>
              const previewEntries = getModulePreviewEntries(module, module.type === 'speaking' ? 2 : 3)
              const useItemImages = module.type === 'vocabulary' || module.type === 'sentence'
              return (
                <div key={`${module.type}-${index}-preview`} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">{tWithParams('studyPackV2.teacher.moduleCardTitle', { index: index + 1, type: label(t, module.type) })}</p>
                      <p className="font-medium text-slate-900 mt-1">{String(content.title || label(t, module.type))}</p>
                    </div>
                    <span className="card-tag">{module.estimated_minutes || 0}m</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {!useItemImages && getModuleStringField(content, 'image_url') && (
                      <img
                        src={getModuleStringField(content, 'image_url')}
                        alt={getModuleStringField(content, 'image_caption') || String(content.title || label(t, module.type))}
                        className="w-full h-32 object-cover rounded-2xl border border-slate-200"
                      />
                    )}
                    {previewEntries.length > 0 ? previewEntries.map((entry, lineIndex) => (
                      <div key={lineIndex} className="space-y-2">
                        {entry.imageUrl && (
                          <img
                            src={entry.imageUrl}
                            alt={entry.imageCaption || `${String(content.title || label(t, module.type))}-${lineIndex + 1}`}
                            className="w-full h-28 object-cover rounded-2xl border border-slate-200"
                          />
                        )}
                        <p className="text-sm text-slate-600">{entry.text}</p>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-400">{t('studyPackV2.teacher.previewNoContent')}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="eyebrow">{t('studyPackV2.teacher.previewStudentEyebrow')}</p>
              <h4 className="text-lg font-semibold text-slate-900">{t('studyPackV2.teacher.previewStudentTitle')}</h4>
            </div>
            <span className="card-tag">{tWithParams('studyPackV2.student.doneCount', { done: 0, total: form.modules.length })}</span>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">{form.title || t('studyPackV2.teacher.fieldTitlePlaceholder')}</p>
            <p className="text-sm text-slate-500 mt-2">{form.description || t('studyPackV2.teacher.previewStudentDesc')}</p>
            <div className="mt-4 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full w-1/4 rounded-full bg-blue-500" />
            </div>
            <div className="mt-5 space-y-3">
              {form.modules.map((module, index) => {
                const content = (module.content || {}) as Record<string, unknown>
                return (
                  <div
                    key={`${module.type}-${index}-student-card`}
                    className="rounded-2xl border p-4"
                    style={{
                      borderColor: index === 0 ? 'rgba(59,130,246,0.25)' : 'rgba(24,36,58,0.08)',
                      background: index === 0 ? 'rgba(239,246,255,0.92)' : 'rgba(255,255,255,0.92)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{index + 1}. {String(content.title || label(t, module.type))}</p>
                        <p className="text-xs text-slate-500 mt-1">{label(t, module.type)} · {module.estimated_minutes || 0}m</p>
                      </div>
                      <span className={`status-badge ${index === 0 ? 'warm' : 'success'}`}>
                        {index === 0 ? t('studyPackV2.student.currentStep') : t('studyPackV2.student.notStarted')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center mt-8">
        <button onClick={onBack} className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
          ← {t('studyPackV2.teacher.backToEdit')}
        </button>
        <button
          onClick={() => void onSaveDraft()}
          disabled={saving}
          className="px-6 py-3 bg-slate-500 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          {saving ? t('studyPackV2.teacher.saving') : t('studyPackV2.teacher.saveDraft')}
        </button>
        <button
          onClick={() => void onPublish()}
          disabled={saving}
          className="px-8 py-3 rounded-xl font-medium transition-colors shadow-sm"
          style={{ backgroundColor: '#15803d', color: '#ffffff' }}
        >
          {saving ? t('studyPackV2.teacher.processing') : t('studyPackV2.teacher.saveAndPublish')}
        </button>
      </div>
    </div>
  )
}
