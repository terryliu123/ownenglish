import { useState } from 'react'
import type { WhiteboardTheme } from '../types'

interface LiveStatusPanelProps {
  isConnected: boolean
  onlineCount: number
  classroomCount: number
  submissionCount: number
  activeTaskGroup: any
  pendingShares: any[]
  onApproveShare: (shareId: string, comment?: string) => void
  onRejectShare: (shareId: string) => void
  onEndTask: () => void
  theme: WhiteboardTheme
}

export function LiveStatusPanel({
  isConnected,
  onlineCount,
  classroomCount,
  submissionCount,
  activeTaskGroup,
  pendingShares,
  onApproveShare,
  onRejectShare,
  onEndTask,
  theme,
}: LiveStatusPanelProps) {
  const [showShares, setShowShares] = useState(false)

  const getThemeClasses = () => {
    switch (theme) {
      case 'light':
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          muted: 'text-slate-500',
          border: 'border-slate-200',
          success: 'text-green-600',
          warning: 'text-amber-600',
        }
      case 'colorful':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-700',
          muted: 'text-purple-500',
          border: 'border-purple-200',
          success: 'text-green-600',
          warning: 'text-amber-600',
        }
      default:
        return {
          bg: 'bg-slate-800',
          text: 'text-slate-200',
          muted: 'text-slate-400',
          border: 'border-slate-700',
          success: 'text-green-400',
          warning: 'text-amber-400',
        }
    }
  }

  const tc = getThemeClasses()

  return (
    <div className={`rounded-xl p-4 ${tc.bg} border ${tc.border}`}>
      {/* 连接状态 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className={`text-xs ${tc.muted}`}>
            {isConnected ? '实时连接中' : '连接断开'}
          </span>
        </div>
        {activeTaskGroup && (
          <button
            onClick={onEndTask}
            className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            结束任务
          </button>
        )}
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className={`text-center p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-white'}`}>
          <div className={`text-lg font-bold ${tc.text}`}>{onlineCount}</div>
          <div className={`text-xs ${tc.muted}`}>在线学生</div>
        </div>
        <div className={`text-center p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-white'}`}>
          <div className={`text-lg font-bold ${tc.text}`}>{classroomCount}</div>
          <div className={`text-xs ${tc.muted}`}>教室学生</div>
        </div>
        <div className={`text-center p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-white'}`}>
          <div className={`text-lg font-bold ${tc.success}`}>{submissionCount}</div>
          <div className={`text-xs ${tc.muted}`}>已提交</div>
        </div>
      </div>

      {/* 当前任务 */}
      {activeTaskGroup && (
        <div className={`mb-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-white'}`}>
          <div className={`text-xs ${tc.muted} mb-1`}>当前任务</div>
          <div className={`text-sm font-medium ${tc.text}`}>{activeTaskGroup.title}</div>
          <div className={`text-xs ${tc.success} mt-1`}>
            {submissionCount}/{onlineCount + classroomCount} 学生已提交
          </div>
        </div>
      )}

      {/* 分享请求 */}
      {pendingShares.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowShares(!showShares)}
            className={`w-full flex items-center justify-between p-2 rounded-lg ${tc.warning} bg-amber-500/10`}
          >
            <span className="text-sm font-medium">
              {pendingShares.length} 个分享请求
            </span>
            <span>{showShares ? '▼' : '▶'}</span>
          </button>

          {showShares && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {pendingShares.map((share) => (
                <div
                  key={share.share_id}
                  className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-white'}`}
                >
                  <div className={`text-sm ${tc.text}`}>
                    {share.student_name} 分享了内容
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => onApproveShare(share.share_id, '已通过')}
                      className="flex-1 px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    >
                      通过
                    </button>
                    <button
                      onClick={() => onRejectShare(share.share_id)}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      忽略
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
