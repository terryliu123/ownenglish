import type { LiveTaskGroup } from '../../../services/api'
import type { WhiteboardTheme } from '../types'

interface TaskPanelProps {
  taskGroups: LiveTaskGroup[]
  publishedGroups?: LiveTaskGroup[]
  previewingGroup?: LiveTaskGroup | null
  onClose: () => void
  onRevertToDraft?: (group: LiveTaskGroup) => void
  onEndTask?: (group: LiveTaskGroup) => void
  onPreview?: (group: LiveTaskGroup) => void
  onRefresh?: () => void
  theme?: WhiteboardTheme
  // 活跃任务组（WebSocket 状态）
  activeTaskGroup?: LiveTaskGroup | null
  // 活跃任务统计信息
  activeTaskStats?: Map<string, { studentCount: number; submissionCount: number }>
  // 查看分析和明细
  onViewAnalysis?: (group: LiveTaskGroup) => void
  onViewDetails?: (group: LiveTaskGroup) => void
  onClearCompleted?: () => void
}

export function TaskPanel({
  taskGroups,
  publishedGroups = [],
  previewingGroup,
  onClose,
  onRevertToDraft,
  onEndTask,
  onPreview,
  onRefresh,
  theme = 'dark',
  activeTaskGroup,
  activeTaskStats = new Map(),
  onViewAnalysis,
  onViewDetails,
  onClearCompleted,
}: TaskPanelProps) {

  // 根据主题获取样式
  const getThemeClasses = () => {
    switch (theme) {
      case 'light':
        return {
          bg: 'bg-white/95 border-slate-200',
          headerText: 'text-slate-700',
          textMuted: 'text-slate-500',
          text: 'text-slate-900',
          buttonBg: 'bg-slate-100 hover:bg-slate-200',
          cardBg: 'bg-slate-50 border-slate-200',
          cardHover: 'hover:border-blue-300',
          activeCard: 'bg-blue-50 border-blue-400',
          divider: 'border-slate-200',
          closeBtn: 'text-slate-400 hover:text-slate-600 hover:bg-slate-200',
        }
      case 'colorful':
        return {
          bg: 'bg-white/80 border-purple-200 backdrop-blur-xl',
          headerText: 'text-purple-800',
          textMuted: 'text-purple-600',
          text: 'text-purple-900',
          buttonBg: 'bg-purple-100 hover:bg-purple-200',
          cardBg: 'bg-purple-50/50 border-purple-200',
          cardHover: 'hover:border-purple-400',
          activeCard: 'bg-purple-100 border-purple-400',
          divider: 'border-purple-200',
          closeBtn: 'text-purple-400 hover:text-purple-600 hover:bg-purple-200',
        }
      default: // dark
        return {
          bg: 'bg-[#1a1a22]/95 border-slate-800',
          headerText: 'text-slate-300',
          textMuted: 'text-slate-400',
          text: 'text-slate-100',
          buttonBg: 'bg-slate-800 hover:bg-slate-700',
          cardBg: 'bg-slate-800/50 border-slate-700',
          cardHover: 'hover:border-indigo-500/30',
          activeCard: 'bg-indigo-500/20 border-indigo-500/50',
          divider: 'border-slate-800',
          closeBtn: 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50',
        }
    }
  }

  const tc = getThemeClasses()

  // 获取任务数量（优先使用 task_count，否则使用 tasks 数组长度）
  const getTaskCount = (group: LiveTaskGroup): number => {
    if (group.task_count !== undefined && group.task_count !== null) {
      return group.task_count
    }
    if (group.tasks && Array.isArray(group.tasks)) {
      return group.tasks.length
    }
    return 0
  }

  return (
    <aside className={`w-80 border-l backdrop-blur-xl flex flex-col ${tc.bg}`}>
      {/* 头部 */}
      <div className={`p-3 flex items-center justify-between border-b ${tc.divider}`}>
        <h3 className={`font-medium text-sm ${tc.headerText}`}>控制台</h3>
        <button onClick={onClose} className={`p-1 rounded-lg transition-colors ${tc.closeBtn}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 进行中的任务 - 独立于 API 任务列表 */}
      {activeTaskGroup && (
        <div className={`p-3 border-b ${tc.divider} bg-amber-500/5`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium text-amber-400`}>进行中</span>
          </div>
          {(() => {
            const stats = activeTaskStats.get(activeTaskGroup.id)
            return (
              <div
                onClick={() => onPreview?.(activeTaskGroup)}
                className={`p-2 rounded-lg border bg-amber-500/10 border-amber-500/30 transition-colors cursor-pointer`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium truncate block ${tc.text}`}>{activeTaskGroup.title}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400">
                        进行中
                      </span>
                    </div>
                    <span className={`text-[10px] ${tc.textMuted}`}>
                      {getTaskCount(activeTaskGroup)} 题
                      {stats && (
                        <span className="ml-2 text-amber-400">
                          {stats.submissionCount}/{stats.studentCount} 已提交
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {onEndTask && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEndTask(activeTaskGroup)
                        }}
                        className="px-2 py-1 rounded text-[10px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        title="结束任务"
                      >
                        结束
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* 待发布任务列表 - 紧凑显示 */}
      <div className={`flex-[2] overflow-y-auto p-3 border-b min-h-[150px] max-h-[40%] ${tc.divider}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs ${tc.textMuted}`}>
            {taskGroups.length > 0 ? `${taskGroups.length} 个待发布` : '暂无待发布任务'}
          </span>
          <div className="flex items-center gap-1">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className={`p-1.5 rounded transition-colors ${tc.buttonBg} ${tc.text}`}
                title="刷新列表"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <button
              onClick={() => window.open('/teacher/task-groups', '_blank')}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${tc.buttonBg} ${tc.text}`}
            >
              去准备
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          {taskGroups.length === 0 ? (
            <div className="text-center py-4">
              <p className={`text-xs ${tc.textMuted}`}>暂无待发布任务</p>
            </div>
          ) : (
            taskGroups.map((group) => (
              <div
                key={`pending-${group.id}`}
                onClick={() => onPreview?.(group)}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  previewingGroup?.id === group.id
                    ? tc.activeCard
                    : `${tc.cardBg} ${tc.cardHover}`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    <span className={`text-xs font-medium truncate block ${tc.text}`}>{group.title}</span>
                    <span className={`text-[10px] ${tc.textMuted}`}>
                      {getTaskCount(group)} 题
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {onRevertToDraft && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRevertToDraft(group)
                        }}
                        className={`p-1 rounded transition-colors ${tc.buttonBg} ${tc.text}`}
                        title="退回草稿"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 已完成任务 */}
      <div className="flex-[3] overflow-y-auto p-3 min-h-[150px]">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs ${tc.textMuted}`}>
            {publishedGroups.length > 0 ? `${publishedGroups.length} 个已完成${publishedGroups.length > 20 ? '（显示最近 20 个）' : ''}` : '本节课已完成任务'}
          </span>
          {publishedGroups.length > 0 && onClearCompleted && (
            <button
              onClick={onClearCompleted}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
            >
              清空不显示
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {publishedGroups.length === 0 ? (
            <div className="text-center py-4">
              <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'
              }`}>
                <svg className={`w-6 h-6 ${tc.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className={`text-xs ${tc.textMuted}`}>暂无已完成的任务</p>
            </div>
          ) : (
            publishedGroups.slice(0, 20).map((group) => (
              <div
                key={`published-${group.id}`}
                className={`p-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50/50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-xs font-medium truncate ${tc.text}`}>{group.title}</span>
                    </div>
                    <span className={`text-[10px] ml-4.5 ${tc.textMuted}`}>{getTaskCount(group)} 题 · 已完成</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {onViewAnalysis && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewAnalysis(group)
                        }}
                        className={`text-[10px] px-2 py-1 rounded transition-colors ${
                          theme === 'dark'
                            ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                            : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                        }`}
                        title="查看分析"
                      >
                        分析
                      </button>
                    )}
                    {onViewDetails && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewDetails(group)
                        }}
                        className={`text-[10px] px-2 py-1 rounded transition-colors ${
                          theme === 'dark'
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                        }`}
                        title="查看明细"
                      >
                        明细
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
