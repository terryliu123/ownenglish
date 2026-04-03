import React, { useState } from 'react'

interface ShareRequest {
  share_id: string
  student_id: string
  student_name: string
  content_type: 'text' | 'image'
  content: string | null
  image_url: string | null
}

interface ShareRequestsPanelProps {
  shareRequests: ShareRequest[]
  onApprove: (shareId: string, comment: string) => void
  onReject: (shareId: string) => void
  onRejectAll: () => void
  t: (key: string) => string
}

export const ShareRequestsPanel: React.FC<ShareRequestsPanelProps> = ({
  shareRequests,
  onApprove,
  onReject,
  onRejectAll,
  t,
}) => {
  const [shareTeacherComment, setShareTeacherComment] = useState('')
  const [shareNameFilter, setShareNameFilter] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  if (shareRequests.length === 0) return null

  const filteredRequests = shareRequests.filter(
    (req) => !shareNameFilter || (req.student_name || '').includes(shareNameFilter)
  )

  return (
    <>
      <section className="mb-4">
        <article className="surface-card">
          <div className="surface-head">
            <h3>{t('classroomShare.title')}</h3>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              {shareRequests.length} 条待审核
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 pb-2">
            <input
              type="text"
              value={shareNameFilter}
              onChange={(e) => setShareNameFilter(e.target.value)}
              placeholder="按姓名搜索..."
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-300 w-48"
            />
            <button onClick={onRejectAll} className="ghost-button py-1.5 px-3 text-sm">
              全部忽略
            </button>
          </div>
          <div className="flex gap-3 p-4 overflow-x-auto pb-5">
            {filteredRequests.map((req) => (
              <div
                key={req.share_id}
                className="rounded-xl p-4 min-w-[280px] w-[280px] flex-shrink-0"
                style={{
                  background: 'rgba(248,250,252,0.9)',
                  border: '1px solid rgba(24,36,58,0.08)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
                    {req.student_name?.[0] || '?'}
                  </div>
                  <span className="text-sm font-semibold">{req.student_name}</span>
                </div>
                {req.content_type === 'image' && req.image_url && (
                  <img
                    src={req.image_url}
                    alt="分享图片"
                    className="rounded-lg max-h-32 mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxUrl(req.image_url!)}
                  />
                )}
                {req.content && <p className="text-sm mb-3">{req.content}</p>}
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={shareTeacherComment}
                    onChange={(e) => setShareTeacherComment(e.target.value)}
                    placeholder={t('classroomShare.addComment')}
                    className="w-full text-sm px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-300"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onApprove(req.share_id, shareTeacherComment)
                        setShareTeacherComment('')
                      }}
                      className="solid-button py-1.5 px-3 text-sm flex-1"
                    >
                      {t('classroomShare.shareToAll')}
                    </button>
                    <button
                      onClick={() => onReject(req.share_id)}
                      className="ghost-button py-1.5 px-3 text-sm"
                    >
                      {t('classroomShare.ignore')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Image lightbox */}
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
