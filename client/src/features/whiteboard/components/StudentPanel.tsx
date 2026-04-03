import type { WhiteboardTheme } from '../types'

interface StudentPanelProps {
  classroomStudents: Map<string, { id: string; name: string }>
  classroomCount: number
  pendingShares: any[]
  onClose: () => void
  onShowShares: () => void
  theme?: WhiteboardTheme
}

export function StudentPanel({
  classroomStudents,
  classroomCount,
  pendingShares,
  onClose,
  onShowShares,
  theme = 'dark'
}: StudentPanelProps) {
  // 根据主题获取样式
  const getThemeClasses = () => {
    switch (theme) {
      case 'light':
        return {
          bg: 'bg-white/95 border-slate-200',
          headerText: 'text-slate-700',
          textMuted: 'text-slate-500',
          text: 'text-slate-900',
          divider: 'border-slate-200',
          closeBtn: 'text-slate-400 hover:text-slate-600 hover:bg-slate-200',
          studentItem: 'hover:bg-slate-100',
          countBadge: 'bg-blue-100 text-blue-600',
          progressBg: 'bg-slate-200',
          statusIndicator: 'border-white',
          handBadgeActive: 'bg-amber-100 text-amber-600',
          handBadgeInactive: 'bg-green-100 text-green-600',
          handIconActive: 'text-amber-500',
          handIconInactive: 'text-green-500',
        }
      case 'colorful':
        return {
          bg: 'bg-white/80 border-purple-200 backdrop-blur-xl',
          headerText: 'text-purple-800',
          textMuted: 'text-purple-600',
          text: 'text-purple-900',
          divider: 'border-purple-200',
          closeBtn: 'text-purple-400 hover:text-purple-600 hover:bg-purple-200',
          studentItem: 'hover:bg-purple-100/50',
          countBadge: 'bg-purple-100 text-purple-600',
          progressBg: 'bg-purple-200',
          statusIndicator: 'border-white',
          handBadgeActive: 'bg-amber-100 text-amber-600',
          handBadgeInactive: 'bg-green-100 text-green-600',
          handIconActive: 'text-amber-500',
          handIconInactive: 'text-green-500',
        }
      default: // dark
        return {
          bg: 'bg-[#1a1a22]/95 border-slate-800',
          headerText: 'text-slate-300',
          textMuted: 'text-slate-400',
          text: 'text-slate-100',
          divider: 'border-slate-800',
          closeBtn: 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50',
          studentItem: 'hover:bg-slate-800/50',
          countBadge: 'bg-indigo-500/20 text-indigo-400',
          progressBg: 'bg-slate-800',
          statusIndicator: 'border-[#1a1a22]',
          handBadgeActive: 'bg-amber-500/20 text-amber-400',
          handBadgeInactive: 'bg-green-500/20 text-green-400',
          handIconActive: 'text-amber-400',
          handIconInactive: 'text-green-400',
        }
    }
  }

  const tc = getThemeClasses()

  const classroomList = Array.from(classroomStudents.values())

  return (
    <aside className={`w-72 border-r backdrop-blur-xl flex flex-col ${tc.bg}`}>
      {/* 头部 - 教室内学生 + 举手图标 */}
      <div className={`p-4 flex items-center justify-between border-b ${tc.divider}`}>
        <div className="flex items-center gap-2">
          <h3 className={`font-medium ${tc.headerText}`}>教室内</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs ${tc.countBadge}`}>
            {classroomCount}
          </span>
          {/* 举手图标和数量 - 有新分享时为黄色，无分享时为绿色 */}
          <button
            onClick={onShowShares}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs hover:opacity-80 transition-opacity ${
              pendingShares.length > 0 ? tc.handBadgeActive : tc.handBadgeInactive
            }`}
            title="查看学生分享请求"
          >
            <svg className={`w-4 h-4 ${pendingShares.length > 0 ? tc.handIconActive : tc.handIconInactive}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            <span>举手{pendingShares.length > 0 ? `+${pendingShares.length}` : ''}</span>
          </button>
        </div>
        <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${tc.closeBtn}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 教室内学生列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {classroomList.length === 0 ? (
          <p className={`text-sm text-center py-4 ${tc.textMuted}`}>暂无学生进入教室</p>
        ) : (
          classroomList.map((student) => (
            <div
              key={student.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer group transition-colors ${tc.studentItem}`}
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-semibold text-white">
                  {student.name.charAt(0)}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-indigo-500 border-2 ${tc.statusIndicator}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${tc.text}`}>{student.name}</p>
                <p className={`text-xs ${tc.textMuted}`}>教室内</p>
              </div>
            </div>
          ))
        )}
      </div>

    </aside>
  )
}
