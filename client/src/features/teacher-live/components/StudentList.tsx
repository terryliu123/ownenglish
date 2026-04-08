import React from 'react'

interface Student {
  id: string
  name: string
}

interface StudentListProps {
  classroomStudents: Student[]
  onEndSession: () => void
  t: (key: string) => string
  tWithParams: (key: string, params: Record<string, string | number>) => string
  // Danmu props
  danmuConfig?: { enabled: boolean; speed: string; area: string }
  onDanmuToggle?: (enabled: boolean) => void
  onDanmuSpeedChange?: (speed: string) => void
  onDanmuAreaChange?: (area: string) => void
  onDanmuClear?: () => void
}

export const StudentList: React.FC<StudentListProps> = ({
  classroomStudents,
  onEndSession,
  t,
  tWithParams,
  danmuConfig,
  onDanmuToggle,
  onDanmuSpeedChange,
  onDanmuAreaChange,
  onDanmuClear,
}) => {
  const renderStudents = (students: Student[], emptyText: string) => {
    if (!students.length) {
      return <p className="text-sm" style={{ color: 'var(--muted)' }}>{emptyText}</p>
    }

    return (
      <div className="flex flex-wrap gap-2">
        {students.map((student) => (
          <span
            key={student.id}
            className="px-3 py-2 rounded-full text-sm"
            style={{ background: 'rgba(24, 50, 74, 0.08)', color: 'var(--ink)' }}
          >
            {student.name}
          </span>
        ))}
      </div>
    )
  }

  return (
    <section className="mb-4">
      {/* 教室内 */}
      <article className="surface-card mb-4">
        <div className="surface-head">
          <h3>{t('teacherLive.inClassroom')}</h3>
          <div className="flex items-center gap-3">
            <span>{tWithParams('class.people', { count: classroomStudents.length })}</span>
            <button className="ghost-button py-2 px-4 text-sm" onClick={onEndSession}>
              {t('teacherLive.endClass')}
            </button>
          </div>
        </div>
        {renderStudents(classroomStudents, t('teacherLive.noStudentInClassroom'))}
      </article>

      {/* 氛围管理 */}
      {onDanmuToggle && danmuConfig && (
        <article className="surface-card">
          <div className="surface-head">
            <h3>🎆 氛围管理</h3>
          </div>
          <div className="flex flex-wrap items-center gap-6 px-4 py-3">
            {/* 弹幕开关 */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">弹幕</span>
              <button
                onClick={() => onDanmuToggle(!danmuConfig.enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  danmuConfig.enabled ? 'bg-pink-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    danmuConfig.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs font-medium ${danmuConfig.enabled ? 'text-pink-600' : 'text-gray-400'}`}>
                {danmuConfig.enabled ? '开启' : '关闭'}
              </span>
            </div>

            {/* 弹幕速度 */}
            {onDanmuSpeedChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">速度</span>
                <div className="flex gap-1">
                  {(['slow', 'medium', 'fast'] as const).map(speed => (
                    <button
                      key={speed}
                      onClick={() => onDanmuSpeedChange(speed)}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        danmuConfig.speed === speed
                          ? 'bg-pink-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {speed === 'slow' ? '慢' : speed === 'medium' ? '中' : '快'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 弹幕区域 */}
            {onDanmuAreaChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">区域</span>
                <div className="flex gap-1">
                  {(['full', 'bottom', 'middle'] as const).map(area => (
                    <button
                      key={area}
                      onClick={() => onDanmuAreaChange(area)}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        danmuConfig.area === area
                          ? 'bg-pink-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {area === 'full' ? '全屏' : area === 'bottom' ? '下方' : '中间'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 清空弹幕 */}
            {onDanmuClear && (
              <button
                onClick={onDanmuClear}
                className="ml-auto px-3 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                清空弹幕
              </button>
            )}
          </div>
        </article>
      )}
    </section>
  )
}
