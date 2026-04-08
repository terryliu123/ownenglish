import { useEffect, useRef, useState } from 'react'
import { useStudentAiContext } from '../context/StudentAiContext'

function renderMarkdown(text: string): string {
  if (!text) return ''
  let html = text
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 text-xs text-pink-600">$1</code>')
  html = html.replace(/^### (.+)$/gm, '<h4 class="mb-1 mt-2 text-sm font-bold">$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3 class="mb-1 mt-2 text-base font-bold">$1</h3>')
  html = html.replace(/^# (.+)$/gm, '<h2 class="mb-1 mt-2 text-lg font-bold">$1</h2>')
  html = html.replace(/\n\n/g, '</p><p class="my-2">')
  html = html.replace(/\n/g, '<br/>')
  return `<p class="my-1">${html}</p>`
}

export default function StudentAiPanel() {
  const { isOpen, isLoading, error, messages, executeAction, freeQuestion, clearError, setOpen, settings } = useStudentAiContext()
  const [mode, setMode] = useState<'photo' | 'free'>('free')
  const [input, setInput] = useState('')
  const [photoImage, setPhotoImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!settings?.enabled && isOpen) {
      setOpen(false)
    }
  }, [settings?.enabled, isOpen, setOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!isOpen) return null

  const handleTakePhoto = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setPhotoImage(result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (mode === 'photo') {
      if (!input.trim() || !photoImage) return
      executeAction('photo_qa', input.trim(), photoImage)
      setInput('')
      setPhotoImage(null)
      return
    }
    if (!input.trim()) return
    freeQuestion(input.trim())
    setInput('')
  }

  return (
    <div
      className="fixed z-50 flex h-[520px] max-h-[calc(100vh-100px)] w-96 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      style={{ right: '24px', bottom: '170px' }}
    >
      <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/70">Student AI</p>
          <p className="font-semibold">课堂 AI 助手</p>
        </div>
        <button onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex shrink-0 gap-2 border-b border-slate-100 px-4 py-2">
        <button
          onClick={() => setMode('photo')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            mode === 'photo' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          拍照问答
        </button>
        <button
          onClick={() => setMode('free')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            mode === 'free' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          自由提问
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {mode === 'photo' ? '先上传图片，再描述你的问题。' : '输入问题，AI 会给出提示和解释。'}
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-500">AI 正在思考...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {error && (
          <div className="mt-3 cursor-pointer rounded-lg bg-red-50 p-3 text-sm text-red-600" onClick={clearError}>
            {error}，点击关闭
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-100 px-4 py-3">
        {mode === 'photo' && (
          <div className="mb-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={handleTakePhoto}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-100 py-2 text-sm text-amber-700 hover:bg-amber-200"
            >
              {photoImage ? '已选择图片' : '拍照或上传图片'}
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={mode === 'photo' ? '描述你想问的问题...' : '输入问题...'}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || (mode === 'photo' && !photoImage) || isLoading}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600 disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
