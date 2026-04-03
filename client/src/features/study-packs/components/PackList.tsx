import { PackListProps } from '../types'
import { statusLabel } from '../utils'

export function PackList({
  packs,
  loading,
  selectedPackId,
  keyword,
  statusFilter,
  onKeywordChange,
  onStatusFilterChange,
  onSelectPack,
  onEdit,
  onChangeStatus,
  t,
  tWithParams,
}: PackListProps) {
  return (
    <article className="surface-card">
      <div className="surface-head">
        <h3>{t('studyPackV2.teacher.listTitle')}</h3>
        <span>{tWithParams('studyPackV2.teacher.listCount', { count: packs.length })}</span>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 7 7-7 7 7m-4.734 4.734M9 17a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder={t('studyPackV2.teacher.searchPlaceholder')}
          />
        </div>
        <select
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all appearance-none cursor-pointer min-w-[100px]"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          {['all', 'draft', 'published', 'expired', 'disabled', 'archived'].map((status) => (
            <option key={status} value={status}>
              {t(`studyPackV2.teacher.filter${status.charAt(0).toUpperCase() + status.slice(1)}`)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="empty-state"><p>{t('studyPackV2.teacher.loading')}</p></div>
      ) : packs.length === 0 ? (
        <div className="empty-state">
          <p>{t('studyPackV2.teacher.emptyTitle')}</p>
          <p className="text-sm text-muted">{t('studyPackV2.teacher.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packs.map((pack) => {
            const effectiveStatus = pack.effective_status || pack.status
            return (
              <div
                key={pack.id}
                className="p-4 rounded-2xl border"
                style={{ borderColor: selectedPackId === pack.id ? 'rgba(59,130,246,0.3)' : 'rgba(24,36,58,0.08)' }}
              >
                <div className="cursor-pointer" onClick={() => onSelectPack(pack.id)}>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-slate-900">{pack.title}</h4>
                    <span className={`status-badge ${effectiveStatus === 'published' ? 'success' : 'warm'}`}>{statusLabel(t, effectiveStatus)}</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">
                    {pack.class_name || t('studyPackV2.teacher.defaultClassName')} · {tWithParams('studyPackV2.teacher.moduleSummary', { count: pack.module_count, minutes: pack.estimated_total_minutes })}
                    {pack.module_count > 0 && ` · ${pack.module_count} ${t('studyPackV2.teacher.modulesUnit')}`}
                  </p>
                  <p className="text-sm text-slate-600 mb-3">{pack.description || t('studyPackV2.teacher.defaultDescription')}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <span>{tWithParams('studyPackV2.student.progressValue', { current: pack.completed_student_count, total: pack.assigned_student_count })}</span>
                    <span>{tWithParams('studyPackV2.teacher.startedStudentsValue', { count: pack.started_student_count })}</span>
                    <span>{tWithParams('studyPackV2.teacher.completionRateValue', { rate: pack.completion_rate })}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 flex-wrap">
                  <button className="ghost-button text-sm" onClick={() => onEdit(pack.id)}>{t('studyPackV2.teacher.edit')}</button>
                  <button
                    className="ghost-button text-sm"
                    onClick={() => onChangeStatus(
                      pack.id,
                      effectiveStatus === 'draft' ? 'published' : effectiveStatus === 'disabled' ? 'draft' : 'disabled',
                    )}
                  >
                    {effectiveStatus === 'draft'
                      ? t('studyPackV2.teacher.publish')
                      : effectiveStatus === 'disabled'
                      ? t('studyPackV2.teacher.restoreDraft')
                      : t('studyPackV2.teacher.disable')}
                  </button>
                  {effectiveStatus !== 'archived' && (
                    <button className="ghost-button text-sm" onClick={() => onChangeStatus(pack.id, 'archived')}>
                      {t('studyPackV2.teacher.archive')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}
