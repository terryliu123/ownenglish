import React from 'react'

interface ClassSelectorProps {
  classes: { id: string; name: string }[]
  currentClassId: string | null
  onClassChange: (classId: string) => void
  classroomStudentCount: number
  onlineStudentCount: number
  wsStatus: string
  onRefresh: () => void
  t: (key: string) => string
  onSwitchToWhiteboard?: () => void
  // Danmu props
  danmuEnabled?: boolean
  onToggleDanmu?: () => void
}

export const ClassSelector: React.FC<ClassSelectorProps> = ({
  classes,
  currentClassId,
  onClassChange,
  classroomStudentCount,
  onlineStudentCount,
  wsStatus,
  onRefresh,
  t,
  onSwitchToWhiteboard,
  danmuEnabled,
  onToggleDanmu,
}) => {
  const getCurrentClassName = () => {
    const cls = classes.find((c) => c.id === currentClassId)
    return cls?.name || t('live.noClassSelected')
  }

  const getStatusColor = () => {
    switch (wsStatus) {
      case 'connected':
        return '#4ade80'
      case 'connecting':
        return '#fbbf24'
      default:
        return '#ef4444'
    }
  }

  const getStatusText = () => {
    switch (wsStatus) {
      case 'connected':
        return t('teacherLive.connected')
      case 'connecting':
        return t('teacherLive.connecting')
      default:
        return t('teacherLive.disconnected')
    }
  }

  return (
    <section
      className="surface-card mb-4 mt-4"
      style={{ background: 'linear-gradient(135deg, #18324a 0%, #2a4a6a 100%)' }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Live Class title */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <span className="text-lg">📡</span>
            </div>
            <div>
              <p
                className="text-xs uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Live Class
              </p>
              <h2 className="text-base font-semibold" style={{ color: '#fff' }}>
                {t('live.subtitle')}
              </h2>
            </div>
          </div>

          {/* Right: Class + Stats + Status */}
          <div className="flex items-center gap-4">
            {/* Current class + switch */}
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {t('teacherLive.currentClass')}
              </span>
              {classes.length > 1 ? (
                <select
                  value={currentClassId || ''}
                  onChange={(e) => onClassChange(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id} style={{ color: '#333' }}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-semibold" style={{ color: '#fff' }}>
                  {getCurrentClassName()}
                </span>
              )}
            </div>

            {/* Online count */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)' }}
              onClick={onRefresh}
              title={t('teacherLive.clickRefresh')}
            >
              <span>👥</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {t('teacherLive.classroom')}
              </span>
              <span className="text-sm font-bold" style={{ color: '#fff' }}>
                {classroomStudentCount}
              </span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                /
              </span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {t('teacherLive.online')} {onlineStudentCount}
              </span>
            </div>

            {/* Connection status */}
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <span
                className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'animate-pulse' : ''}`}
                style={{ background: getStatusColor() }}
              ></span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {getStatusText()}
              </span>
            </div>

            {/* Switch to Whiteboard */}
            {onSwitchToWhiteboard && (
              <button
                onClick={onSwitchToWhiteboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <span>🎨</span>
                <span>白板模式</span>
              </button>
            )}

            {/* Danmu / Atmosphere */}
            {onToggleDanmu && (
              <button
                onClick={onToggleDanmu}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/20"
                style={{ background: danmuEnabled ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <span>🎆</span>
                <span>氛围{danmuEnabled ? '●' : '○'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
