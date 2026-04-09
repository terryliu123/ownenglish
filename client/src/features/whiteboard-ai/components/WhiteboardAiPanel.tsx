import { useEffect, useRef, useState } from 'react'
import { useWhiteboardAiContext } from '../context/WhiteboardAiContext'

interface Props {
  context: {
    whiteboard_text?: string
    task_title?: string
    task_questions?: string[]
    class_id?: string
    session_id?: string
  }
}

function stripMarkdown(text: string): string {
  if (!text) return ''
  let plain = text
  plain = plain.replace(/```[\s\S]*?```/g, '')
  plain = plain.replace(/`([^`]+)`/g, '$1')
  plain = plain.replace(/^#{1,6}\s+/gm, '')
  plain = plain.replace(/\*\*(.+?)\*\*/g, '$1')
  plain = plain.replace(/__(.+?)__/g, '$1')
  plain = plain.replace(/\*(.+?)\*/g, '$1')
  plain = plain.replace(/_(.+?)_/g, '$1')
  plain = plain.replace(/^[-*]\s+/gm, '')
  plain = plain.replace(/^\d+\.\s+/gm, '')
  plain = plain.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  return plain.trim()
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  let html = text
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="my-1 overflow-x-auto rounded-lg bg-black/30 p-2 text-xs text-blue-200 border border-white/[0.06]"><code>$1</code></pre>')
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-blue-500/20 px-1 text-xs text-blue-300">$1</code>')
  html = html.replace(/^### (.+)$/gm, '<h4 class="mb-1 mt-2 text-sm font-bold text-white">$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3 class="mb-1 mt-2 text-base font-bold text-white">$1</h3>')
  html = html.replace(/^# (.+)$/gm, '<h2 class="mb-1 mt-2 text-lg font-bold text-white">$1</h2>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/\n\n/g, '</p><p class="my-2">')
  html = html.replace(/\n/g, '<br/>')
  return `<p class="my-1 text-slate-300">${html}</p>`
}

function getMessageText(content: string | Array<string | { text?: string }>): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content) || content.length === 0) return ''
  const first = content[0]
  return typeof first === 'string' ? first : first?.text || JSON.stringify(first)
}

export default function WhiteboardAiPanel({ context }: Props) {
  const { isOpen, isLoading, error, messages, launcherPosition, executeAction, freeQuestion, clearError } = useWhiteboardAiContext()
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set())
  const [prompt, setPrompt] = useState('')
  const [freeInput, setFreeInput] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!isOpen) return null

  const captureWhiteboard = (): string | undefined => {
    const whiteboardAPI = (window as any).whiteboardAPI
    if (!whiteboardAPI?.toDataURL) return undefined
    try {
      const dataUrl = whiteboardAPI.toDataURL({
        format: 'jpeg',
        quality: 0.7,
        multiplier: 0.3,
      })
      return dataUrl.split(',')[1]
    } catch {
      return undefined
    }
  }

  const toggleAction = (action: string) => {
    setSelectedActions((prev) => {
      const next = new Set(prev)
      if (next.has(action)) next.delete(action)
      else next.add(action)
      return next
    })
  }

  const handleSubmit = () => {
    const hasReference = selectedActions.has('reference')
    const hasImageGen = selectedActions.has('image_gen')

    if (hasImageGen) {
      if (!prompt.trim()) return
      const imageData = hasReference ? captureWhiteboard() : undefined
      void executeAction('generate_image', context, prompt.trim(), imageData)
      setPrompt('')
      setSelectedActions(new Set())
      return
    }

    if (hasReference) {
      if (!prompt.trim()) return
      void executeAction('reference', context, prompt.trim(), captureWhiteboard())
      setPrompt('')
      setSelectedActions(new Set())
      return
    }

    if (!freeInput.trim()) return
    freeQuestion(freeInput.trim(), context, undefined)
    setFreeInput('')
  }

  const projectTextToWhiteboard = (content: string) => {
    const whiteboardAPI = (window as any).whiteboardAPI
    if (!whiteboardAPI?.addText) return
    const plainText = stripMarkdown(content)
    const collapsed = plainText.replace(/\n{3,}/g, '\n\n').trim()
    const finalText = collapsed.length > 500 ? `${collapsed.substring(0, 500)}...` : collapsed
    whiteboardAPI.addText(finalText)
  }

  const projectImageToWhiteboard = (content: string) => {
    const whiteboardAPI = (window as any).whiteboardAPI
    if (!whiteboardAPI?.addImage) return
    const fullDataUrl = content.startsWith('data:') ? content : `data:image/png;base64,${content}`
    whiteboardAPI.addImage(fullDataUrl)
  }

  return (
    <div
      className="fixed z-50 flex h-[520px] max-h-[calc(100vh-80px)] w-96 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e1a]/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
      style={{ right: `${launcherPosition.x}px`, bottom: `${launcherPosition.y + 64}px` }}
    >
      {/* Header */}
      <div className="shrink-0 bg-gradient-to-r from-blue-500/20 to-violet-500/20 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="胖鼠AI副班" className="h-6 w-6 rounded-lg" />
          <p className="font-semibold text-white text-sm">胖鼠AI副班</p>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">AI</span>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center border border-white/[0.06]">
              <img src="/logo.png" alt="" className="w-7 h-7 rounded-lg opacity-60" />
            </div>
            <p className="text-sm text-slate-500 text-center">选择快捷动作，或直接输入课堂问题。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => {
              const displayContent = getMessageText(msg.content)
              const isImageGenResult = msg.action === 'generate_image' && msg.role === 'assistant'
              return (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white'
                        : 'bg-white/[0.05] border border-white/[0.06] text-slate-300'
                    }`}
                  >
                    {isImageGenResult ? (
                      <div>
                        <img
                          src={`data:image/png;base64,${displayContent}`}
                          alt="AI 生成图片"
                          className="max-w-full cursor-pointer rounded-lg hover:opacity-90"
                          onClick={() => setLightboxUrl(`data:image/png;base64,${displayContent}`)}
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => projectImageToWhiteboard(displayContent)}
                            className="rounded-lg bg-blue-500/20 border border-blue-500/25 px-2 py-1 text-xs text-blue-300 hover:bg-blue-500/30 transition-colors"
                          >
                            添加到白板
                          </button>
                          <button
                            onClick={() => setLightboxUrl(`data:image/png;base64,${displayContent}`)}
                            className="rounded-lg bg-white/[0.06] border border-white/[0.08] px-2 py-1 text-xs text-slate-400 hover:bg-white/[0.1] transition-colors"
                          >
                            放大查看
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {msg.role === 'assistant' ? (
                          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }} />
                        ) : (
                          <div className="whitespace-pre-wrap">{displayContent}</div>
                        )}
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => projectTextToWhiteboard(displayContent)}
                            className="mt-2 rounded-lg bg-blue-500/20 border border-blue-500/25 px-2 py-1 text-xs text-blue-300 hover:bg-blue-500/30 transition-colors"
                          >
                            投影到白板
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-white/[0.05] border border-white/[0.06] px-4 py-2 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                    AI 正在分析...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {error && (
          <div className="mt-2 cursor-pointer rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-400" onClick={clearError}>
            {error}，点击关闭
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 space-y-2 border-t border-white/[0.06] bg-[#0a0e1a]/80 px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={() => toggleAction('reference')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              selectedActions.has('reference')
                ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/[0.05] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-slate-300'
            }`}
          >
            参考板书
          </button>
          <button
            onClick={() => toggleAction('image_gen')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              selectedActions.has('image_gen')
                ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/[0.05] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-slate-300'
            }`}
          >
            生成图片
          </button>
        </div>

        {selectedActions.size > 0 ? (
          <div className="space-y-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={selectedActions.has('image_gen') ? '描述你想生成的课堂图片...' : '输入你想让 AI 处理的问题...'}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500/40 focus:bg-white/[0.06] focus:outline-none transition-colors"
            />
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isLoading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-40"
            >
              {selectedActions.has('image_gen') ? '生成图片' : '提交'}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={freeInput}
              onChange={(e) => setFreeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="输入课堂问题..."
              className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500/40 focus:bg-white/[0.06] focus:outline-none transition-colors"
            />
            <button
              onClick={handleSubmit}
              disabled={!freeInput.trim() || isLoading}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-40"
            >
              发送
            </button>
          </div>
        )}
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] flex cursor-pointer items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="放大查看"
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white transition-colors hover:bg-white/20"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
