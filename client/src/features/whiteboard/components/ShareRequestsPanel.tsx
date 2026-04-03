import { useState } from 'react'
import type { WhiteboardTheme } from '../types'

interface ShareRequest {
  share_id: string
  student_id: string
  student_name: string
  content_type: 'text' | 'image'
  content: string | null
  image_url: string | null
  status?: 'pending' | 'approved' | 'rejected' | 'approving' | 'rejecting'
  teacher_comment?: string
}

interface ShareRequestsPanelProps {
  shareRequests: ShareRequest[]
  onApprove: (shareId: string, comment?: string) => void
  onReject: (shareId: string) => void
  onProject?: (shareId: string, content: any) => void
  onRejectAll?: () => void
  onClose?: () => void
  theme?: WhiteboardTheme
}

export function ShareRequestsPanel({
  shareRequests,
  onApprove,
  onReject,
  onProject,
  onRejectAll,
  onClose,
  theme = 'dark',
}: ShareRequestsPanelProps) {
  const [shareTeacherComment, setShareTeacherComment] = useState('')
  const [shareNameFilter, setShareNameFilter] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  if (shareRequests.length === 0) return null

  const filteredRequests = shareRequests.filter(
    (req) => req && (!shareNameFilter || (req.student_name || '').includes(shareNameFilter))
  )

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
          cardBg: 'bg-slate-50',
          inputBg: 'bg-white border-slate-200 focus:ring-blue-300',
          badge: 'bg-amber-100 text-amber-700',
          approveBtn: 'bg-green-500 hover:bg-green-600 text-white',
          rejectBtn: 'bg-slate-400 hover:bg-slate-500 text-white',
          projectBtn: 'bg-blue-500 hover:bg-blue-600 text-white',
          avatarBg: 'bg-amber-100 text-amber-700',
        }
      case 'colorful':
        return {
          bg: 'bg-white/80 border-purple-200 backdrop-blur-xl',
          headerText: 'text-purple-800',
          textMuted: 'text-purple-600',
          text: 'text-purple-900',
          divider: 'border-purple-200',
          cardBg: 'bg-purple-50/50',
          inputBg: 'bg-white border-purple-200 focus:ring-purple-300',
          badge: 'bg-amber-100 text-amber-700',
          approveBtn: 'bg-green-500 hover:bg-green-600 text-white',
          rejectBtn: 'bg-slate-400 hover:bg-slate-500 text-white',
          projectBtn: 'bg-blue-500 hover:bg-blue-600 text-white',
          avatarBg: 'bg-amber-100 text-amber-700',
        }
      default: // dark
        return {
          bg: 'bg-[#1a1a22]/95 border-slate-800',
          headerText: 'text-slate-300',
          textMuted: 'text-slate-400',
          text: 'text-slate-100',
          divider: 'border-slate-800',
          cardBg: 'bg-slate-800/50',
          inputBg: 'bg-slate-700/50 border-slate-600 focus:ring-indigo-500',
          badge: 'bg-amber-500/20 text-amber-400',
          approveBtn: 'bg-green-500/80 hover:bg-green-500 text-white',
          rejectBtn: 'bg-slate-600 hover:bg-slate-500 text-white',
          projectBtn: 'bg-blue-500/80 hover:bg-blue-500 text-white',
          avatarBg: 'bg-amber-500/20 text-amber-400',
        }
    }
  }

  const tc = getThemeClasses()

  return (
    <>
      <div className={`rounded-xl border ${tc.bg} p-4 mb-4`}>
        <div className={`flex items-center justify-between mb-3 pb-3 border-b ${tc.divider}`}>
          <div className="flex items-center gap-2">
            <h3 className={`font-medium ${tc.headerText}`}>学生分享</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs ${tc.badge}`}>
              {shareRequests.filter(r => !r.status || r.status === 'pending').length} 条待审核
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onRejectAll && (
              <button
                onClick={onRejectAll}
                className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    : theme === 'light'
                    ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    : 'text-purple-600 hover:text-purple-800 hover:bg-purple-100'
                }`}
              >
                全部忽略
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    : theme === 'light'
                    ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    : 'text-purple-600 hover:text-purple-800 hover:bg-purple-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 搜索过滤 */}
        <div className="mb-3">
          <input
            type="text"
            value={shareNameFilter}
            onChange={(e) => setShareNameFilter(e.target.value)}
            placeholder="按姓名搜索..."
            className={`w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 ${tc.inputBg} ${tc.text}`}
          />
        </div>

        {/* 分享请求列表 - 水平滚动 */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {filteredRequests.map((req) => (
            <div
              key={req.share_id}
              className={`rounded-xl p-4 min-w-[280px] w-[280px] flex-shrink-0 border ${tc.cardBg} ${tc.divider}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${tc.avatarBg}`}>
                  {String(req.student_name || '?')[0]}
                </div>
                <span className={`text-sm font-semibold ${tc.text}`}>{req.student_name || '未知学生'}</span>
              </div>

              {/* 图片内容 */}
              {req.content_type === 'image' && req.image_url && (
                <img
                  src={req.image_url}
                  alt="分享图片"
                  className="rounded-lg max-h-32 mb-3 cursor-pointer hover:opacity-90 transition-opacity w-full object-cover"
                  onClick={() => setLightboxUrl(req.image_url!)}
                />
              )}

              {/* 文字内容 */}
              {req.content && (
                <p className={`text-sm mb-3 ${tc.text}`}>{req.content}</p>
              )}

              {/* 评论输入 */}
              <input
                type="text"
                value={shareTeacherComment}
                onChange={(e) => setShareTeacherComment(e.target.value)}
                placeholder="添加评语（可选）..."
                className={`w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 mb-3 ${tc.inputBg} ${tc.text}`}
              />

              {/* 操作按钮 */}
              <div className="flex gap-2">
                {req.status === 'approved' || req.status === 'approving' ? (
                  <span className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium text-center ${
                    req.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-green-500/10 text-green-400/70'
                  }`}>
                    {req.status === 'approved' ? '已通过' : '处理中...'}
                  </span>
                ) : req.status === 'rejected' || req.status === 'rejecting' ? (
                  <span className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium text-center ${
                    req.status === 'rejected' ? 'bg-slate-500/20 text-slate-400' : 'bg-slate-500/10 text-slate-400/70'
                  }`}>
                    {req.status === 'rejected' ? '已忽略' : '处理中...'}
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        if (req.share_id) {
                          onApprove(req.share_id, shareTeacherComment)
                        }
                        setShareTeacherComment('')
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tc.approveBtn}`}
                    >
                      通过
                    </button>
                    <button
                      onClick={() => {
                        if (req.share_id) {
                          onReject(req.share_id)
                        }
                      }}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tc.rejectBtn}`}
                    >
                      忽略
                    </button>
                    {onProject && (
                      <button
                        onClick={() => {
                          if (req.share_id) {
                            onProject(req.share_id, req)
                          }
                        }}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tc.projectBtn}`}
                      >
                        投影
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 图片放大查看 */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="放大查看"
            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center text-xl transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
