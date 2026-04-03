import { StudyPacksHeaderProps } from '../types'

export function StudyPacksHeader({
  packs,
  membership,
  canCreateStudyPack,
  canUseAi,
  studyPackUsage,
  studyPackLimit,
  onCreate,
  t,
  tWithParams,
}: StudyPacksHeaderProps) {
  return (
    <>
      {/* 深蓝顶栏 */}
      <section className="surface-card mb-4 mt-4" style={{ background: 'linear-gradient(135deg, #18324a 0%, #2a4a6a 100%)' }}>
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* 左侧：图标 + 标题 */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <span className="text-lg">📦</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>{t('studyPackV2.teacher.eyebrow')}</p>
                <h2 className="text-base font-semibold" style={{ color: '#fff' }}>{t('studyPackV2.teacher.title')}</h2>
              </div>
            </div>

            {/* 右侧：会员 + 创建按钮 */}
            <div className="flex items-center gap-3">
              {membership && (
                <div
                  className="flex flex-col items-end gap-0.5 px-3 py-1.5 rounded-lg cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                  onClick={() => window.location.href = '/teacher/membership'}
                  title={membership.plan_name}
                >
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {tWithParams('membership.usageStudyPacks', {
                      used: studyPackUsage,
                      limit: studyPackLimit == null ? '∞' : studyPackLimit,
                    })}
                  </span>
                  <span className="text-xs" style={{ color: canUseAi ? 'rgba(134,239,172,0.9)' : 'rgba(255,255,255,0.45)' }}>
                    {canUseAi ? t('membership.aiEnabled') : t('membership.aiDisabled')}
                  </span>
                </div>
              )}
              <button
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}
                onClick={() => alert(t('studyPackV2.teacher.rulesTip'))}
              >
                {t('studyPackV2.teacher.viewRules')}
              </button>
              <button
                onClick={onCreate}
                className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                disabled={!canCreateStudyPack}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  opacity: canCreateStudyPack ? 1 : 0.5,
                  cursor: canCreateStudyPack ? 'pointer' : 'not-allowed',
                }}
              >
                + {t('studyPackV2.teacher.newPack')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid compact">
        <article className="stat-card compact">
          <strong>{packs.length}</strong>
          <span>{t('studyPackV2.teacher.packCount')}</span>
        </article>
        <article className="stat-card compact">
          <strong>{packs.reduce((sum, p) => sum + (p.assigned_student_count || 0), 0)}</strong>
          <span>{t('studyPackV2.teacher.totalStudents')}</span>
        </article>
        <article className="stat-card compact">
          <strong>-</strong>
          <span>{t('studyPackV2.teacher.currentPackDuration')}</span>
        </article>
      </section>
    </>
  )
}
