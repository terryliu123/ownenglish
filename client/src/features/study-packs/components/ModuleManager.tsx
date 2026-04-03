import { ModuleManagerProps, MODULE_TYPES } from '../types'
import { label } from '../utils'

interface ExtendedModuleManagerProps extends ModuleManagerProps {
  isEditMode?: boolean
}

export function ModuleManager({
  modules,
  onAddModule,
  onRemoveModule,
  onMoveModule,
  onUpdateModule,
  onNext,
  onPrev,
  isEditMode,
  t,
  tWithParams,
}: ExtendedModuleManagerProps) {
  if (isEditMode) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="font-semibold text-slate-900">{t('studyPackV2.teacher.editModules')}</h4>
            <p className="text-sm text-slate-500">{tWithParams('studyPackV2.teacher.modulesCount', { count: modules.length })}</p>
          </div>
        </div>

        <div className="space-y-4">
          {modules.map((module, index) => {
            const content = (module.content || {}) as Record<string, unknown>
            return (
              <div key={`${module.type}-${index}`} className="p-5 rounded-2xl border bg-white" style={{ borderColor: 'rgba(24,36,58,0.1)' }}>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 text-sm font-semibold flex items-center justify-center">{index + 1}</span>
                    <div>
                      <p className="font-semibold text-slate-800">{label(t, module.type)}</p>
                      <p className="text-xs text-slate-500">{t('studyPackV2.teacher.moduleConfigTip')}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="ghost-button text-sm px-2 py-1" onClick={() => onMoveModule(index, -1)} disabled={index === 0}>
                      {t('studyPackV2.teacher.moveUp')}
                    </button>
                    <button className="ghost-button text-sm px-2 py-1" onClick={() => onMoveModule(index, 1)} disabled={index === modules.length - 1}>
                      {t('studyPackV2.teacher.moveDown')}
                    </button>
                    <button className="ghost-button text-sm px-2 py-1 text-red-500" onClick={() => onRemoveModule(index)}>
                      {t('studyPackV2.teacher.remove')}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 120px' }}>
                  <div className="form-group mb-0">
                    <label className="form-label">{t('studyPackV2.teacher.moduleTitle')}</label>
                    <input
                      className="input"
                      value={String(content.title || '')}
                      onChange={(e) => onUpdateModule(index, (item) => ({
                        ...item,
                        content: { ...(item.content || {}), title: e.target.value },
                      }))}
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">{t('studyPackV2.teacher.moduleMinutes')}</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      className="input"
                      value={module.estimated_minutes || 0}
                      onChange={(e) => onUpdateModule(index, (item) => ({
                        ...item,
                        estimated_minutes: Number(e.target.value),
                      }))}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-between mt-6">
          <button onClick={onPrev} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            ← {t('studyPackV2.teacher.prevStep')}
          </button>
          <button
            onClick={onNext}
            disabled={modules.length === 0}
            className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('studyPackV2.teacher.toCreateContent')} →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h4 className="font-semibold text-slate-900 mb-2">{t('studyPackV2.teacher.modulesTitle')}</h4>
        <p className="text-sm text-slate-500">{t('studyPackV2.teacher.addModulesTip')}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 mb-6">
        {MODULE_TYPES.map((type) => {
          const typeConfig: Record<string, { icon: string; color: string; bg: string; border: string }> = {
            vocabulary: { icon: '📖', color: '#1d4ed8', bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: 'rgba(37,99,235,0.18)' },
            sentence: { icon: '✍️', color: '#7c3aed', bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: 'rgba(124,58,237,0.18)' },
            listening: { icon: '🎧', color: '#059669', bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: 'rgba(5,150,105,0.18)' },
            reading: { icon: '📝', color: '#d97706', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: 'rgba(217,119,6,0.18)' },
            speaking: { icon: '🎙️', color: '#dc2626', bg: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', border: 'rgba(220,38,38,0.18)' },
          }
          const config = typeConfig[type] || { icon: '📋', color: '#475569', bg: '#f8fafc', border: 'rgba(24,36,58,0.08)' }
          return (
            <button
              key={type}
              className="group p-4 rounded-2xl text-left transition-all hover:shadow-md active:scale-[0.98]"
              style={{ background: config.bg, border: `1px solid ${config.border}` }}
              onClick={() => onAddModule(type)}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{config.icon}</span>
                <span className="font-semibold" style={{ color: config.color }}>{label(t, type)}</span>
              </div>
              <p className="text-xs text-slate-500 pl-11">{t(`studyPackV2.teacherModuleDesc.${type}`)}</p>
            </button>
          )
        })}
      </div>

      {modules.length > 0 && (
        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <p className="text-sm text-slate-600 mb-3">
            {t('studyPackV2.teacher.selectedModules')}：{modules.length}{t('studyPackV2.teacher.modulesUnit')}
          </p>
          <div className="flex flex-wrap gap-2">
            {modules.map((module, index) => (
              <span key={`${module.type}-${index}`} className="px-3 py-1 bg-white rounded-full text-sm border">
                {index + 1}. {label(t, module.type)}
                <button onClick={() => onRemoveModule(index)} className="ml-2 text-red-500 hover:text-red-700">×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onPrev}
          className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          ← {t('studyPackV2.teacher.prevStep')}
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
        >
          {modules.length > 0 ? `${t('studyPackV2.teacher.nextStep')} →` : `${t('studyPackV2.teacher.toPreview')} →`}
        </button>
      </div>
    </div>
  )
}
