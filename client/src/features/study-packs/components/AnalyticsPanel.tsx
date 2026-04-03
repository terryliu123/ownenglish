import { AnalyticsPanelProps } from '../types'
import { label } from '../utils'

export function AnalyticsPanel({
  selectedPack,
  analytics,
  analyticsLoading,
  onEdit,
  t,
  tWithParams,
}: AnalyticsPanelProps) {
  if (!selectedPack) {
    return (
      <article className="surface-card">
        <div className="surface-head">
          <h3>{t('studyPackV2.teacher.overviewTitle')}</h3>
        </div>
        <div className="empty-state"><p>{t('studyPackV2.teacher.overviewDesc')}</p></div>
      </article>
    )
  }

  const effectiveStatus = selectedPack.effective_status || selectedPack.status

  return (
    <article className="surface-card">
      <div className="surface-head">
        <h3>{t('studyPackV2.teacher.overviewTitle')}</h3>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-slate-900">{selectedPack.title}</h3>
          <span className={`status-badge ${effectiveStatus === 'published' ? 'success' : 'warm'}`}>
            {effectiveStatus}
          </span>
        </div>

        <p className="text-slate-600">{selectedPack.description || t('studyPackV2.teacher.defaultDescription')}</p>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="callout-card">
            <p className="text-sm text-slate-500">{t('studyPackV2.teacher.overviewClass')}</p>
            <p className="font-medium mt-2">{selectedPack.class_name || t('studyPackV2.teacher.classFallback')}</p>
          </div>
          <div className="callout-card">
            <p className="text-sm text-slate-500">{t('studyPackV2.teacher.overviewModuleCount')}</p>
            <p className="font-medium mt-2">{selectedPack.module_count}</p>
          </div>
          <div className="callout-card">
            <p className="text-sm text-slate-500">{t('studyPackV2.teacher.overviewMinutes')}</p>
            <p className="font-medium mt-2">{selectedPack.estimated_total_minutes}</p>
          </div>
          <div className="callout-card">
            <p className="text-sm text-slate-500">{t('studyPackV2.teacher.completionRate')}</p>
            <p className="font-medium mt-2">{selectedPack.completion_rate}%</p>
          </div>
        </div>

        <div className="space-y-3">
          {selectedPack.modules.map((module, index) => (
            <div
              key={module.id}
              className="p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(24,36,58,0.08)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{index + 1}. {label(t, module.type)}</p>
                  <p className="text-sm text-slate-500 mt-1">{tWithParams('studyPackV2.teacher.overviewModuleMinutes', { minutes: module.estimated_minutes || 0 })}</p>
                </div>
                <span className="card-tag">{module.type}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-lg font-semibold text-slate-900">{t('studyPackAnalytics.title')}</h4>
            {analyticsLoading && <span className="text-sm text-slate-500">{t('studyPackAnalytics.loading')}</span>}
          </div>
          {!analytics || analytics.student_records.length === 0 ? (
            <div className="callout-card">
              <p className="text-slate-600">{t('studyPackAnalytics.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="callout-card">
                  <p className="text-sm text-slate-500">{t('studyPackAnalytics.started')}</p>
                  <p className="font-medium mt-2">{analytics.summary.started_student_count}</p>
                </div>
                <div className="callout-card">
                  <p className="text-sm text-slate-500">{t('studyPackAnalytics.completed')}</p>
                  <p className="font-medium mt-2">{analytics.summary.completed_student_count}</p>
                </div>
                <div className="callout-card">
                  <p className="text-sm text-slate-500">{t('studyPackAnalytics.rate')}</p>
                  <p className="font-medium mt-2">{analytics.summary.completion_rate}%</p>
                </div>
                <div className="callout-card">
                  <p className="text-sm text-slate-500">{analytics.summary.summary_label || t('studyPackAnalytics.summaryRate')}</p>
                  <p className="font-medium mt-2">{analytics.summary.summary_rate}%</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h5 className="text-sm font-semibold text-slate-900 mb-3">{t('studyPackAnalytics.moduleStats')}</h5>
                  <div className="space-y-3">
                    {analytics.module_stats.map((moduleStat) => (
                      <div key={moduleStat.module_id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{moduleStat.module_title}</p>
                            <p className="text-sm text-slate-500 mt-1">
                              {label(t, moduleStat.module_type)} · {moduleStat.primary_label} {moduleStat.primary_rate}%
                            </p>
                          </div>
                          <span className="card-tag">
                            {moduleStat.avg_score === null || moduleStat.avg_score === undefined
                              ? `${moduleStat.primary_rate}%`
                              : `${moduleStat.avg_score}%`}
                          </span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3 mt-3 text-sm text-slate-600">
                          <div>{t('studyPackAnalytics.moduleSubmissions')}: {moduleStat.submitted_count}</div>
                          <div>{t('studyPackAnalytics.moduleMetric')}: {moduleStat.primary_label}</div>
                          <div>{t('studyPackAnalytics.moduleCorrectCount')}: {moduleStat.correct_count}/{moduleStat.total_count}</div>
                        </div>
                        {moduleStat.sample_answers.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-sm font-medium text-slate-700 mb-2">{t('studyPackAnalytics.moduleSampleAnswers')}</p>
                            <div className="space-y-2">
                              {moduleStat.sample_answers.map((sample, index) => (
                                <div key={`${sample.student_id}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                  <span className="font-medium text-slate-800">{sample.student_name}:</span> {sample.answer}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-semibold text-slate-900 mb-3">{t('studyPackAnalytics.studentRecords')}</h5>
                </div>
                {analytics.student_records.map((record) => (
                  <div key={record.student_id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{record.student_name}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          {t('studyPackAnalytics.studentProgress')
                            .replace('{{done}}', String(record.completed_modules))
                            .replace('{{total}}', String(record.total_modules))}
                        </p>
                      </div>
                      <span className="card-tag">
                        {record.avg_score === null || record.avg_score === undefined
                          ? t('studyPackAnalytics.noScore')
                          : `${record.avg_score}%`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {record.module_results.map((moduleResult) => (
                        <span key={moduleResult.module_id} className={`status-badge ${moduleResult.status === 'completed' ? 'success' : 'warm'}`}>
                          {moduleResult.module_title}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="solid-button" onClick={() => onEdit(selectedPack.id)}>{t('studyPackV2.teacher.overviewEdit')}</button>
      </div>
    </article>
  )
}
