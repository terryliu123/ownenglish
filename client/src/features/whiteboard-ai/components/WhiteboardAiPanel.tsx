import { useCallback, useEffect, useRef, useState } from 'react'

import { useWhiteboardAiContext } from '../context/WhiteboardAiContext'
import { useAppStore } from '../../../stores/app-store'

// Web Speech API constructor (Chrome uses webkit prefix)
const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

interface Props {
  context: {
    whiteboard_text?: string
    task_title?: string
    task_questions?: string[]
    class_id?: string
    session_id?: string
  }
}

type PromptCommandMode = 'fill' | 'execute'

interface PromptCommand {
  key: string
  label: string
  description: string
  mode: PromptCommandMode
  prompt: string
}

const PROMPT_COMMANDS: PromptCommand[] = [
  { key: '/explain', label: '解释这部分', description: '填入输入框，继续编辑后发送', mode: 'fill', prompt: '解释这部分' },
  { key: '/simple', label: '换更简单的说法', description: '填入输入框，继续编辑后发送', mode: 'fill', prompt: '换更简单的说法' },
  { key: '/summary', label: '总结当前重点', description: '直接执行总结', mode: 'execute', prompt: '总结当前重点' },
  { key: '/quiz', label: '生成 1 道检测题', description: '直接执行生成', mode: 'execute', prompt: '生成 1 道检测题' },
  { key: '/followups', label: '生成 3 个追问', description: '直接执行生成', mode: 'execute', prompt: '生成 3 个追问' },
  { key: '/check', label: '检查表达问题', description: '填入输入框，继续编辑后发送', mode: 'fill', prompt: '检查表达问题' },
]

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
  html = html.replace(
    /```([\s\S]*?)```/g,
    '<pre class="my-1 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white"><code>$1</code></pre>',
  )
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-blue-500/20 px-1 text-xs text-white">$1</code>')
  html = html.replace(/^### (.+)$/gm, '<h4 class="mb-1 mt-2 text-sm font-bold text-white">$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3 class="mb-1 mt-2 text-base font-bold text-white">$1</h3>')
  html = html.replace(/^# (.+)$/gm, '<h2 class="mb-1 mt-2 text-lg font-bold text-white">$1</h2>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em class="text-white">$1</em>')
  html = html.replace(/\n\n/g, '</p><p class="my-2">')
  html = html.replace(/\n/g, '<br/>')
  return `<p class="my-1 text-white">${html}</p>`
}

function getMessageText(content: string | Array<string | { text?: string }>): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content) || content.length === 0) return ''
  const first = content[0]
  return typeof first === 'string' ? first : first?.text || JSON.stringify(first)
}

export default function WhiteboardAiPanel({ context }: Props) {
  const {
    isOpen,
    isLoading,
    error,
    messages,
    launcherPosition,
    executeAction,
    freeQuestion,
    clearError,
    pushMessages,
  } = useWhiteboardAiContext()

  const [useWhiteboard, setUseWhiteboard] = useState(false)
  const [useVoice, setUseVoice] = useState(true)
  const [isGenImage, setIsGenImage] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')

  const { user } = useAppStore()
  const isPaid = user?.membership?.status === 'active'
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null)
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const [speechError, setSpeechError] = useState<string | null>(null)
  const autoSubmitRef = useRef(false)
  const handleSubmitRef = useRef<() => void>(() => {})
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  // Chrome's SpeechRecognition uses Google servers (blocked in China), default to server ASR
  const isChrome = navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edg')
  const fallbackModeRef = useRef(isChrome)

  // Browser TTS helpers
  // Chrome: getVoices() returns [] until voiceschanged fires
  const voicesReadyRef = useRef(false)
  useEffect(() => {
    if (!window.speechSynthesis) return
    const check = () => {
      if (window.speechSynthesis.getVoices().length > 0) {
        voicesReadyRef.current = true
      }
    }
    check()
    window.speechSynthesis.addEventListener('voiceschanged', check)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check)
  }, [])

  // Chrome bug: speech pauses after ~15s, need periodic resume
  const resumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pickChineseVoice = useCallback(() => {
    if (!window.speechSynthesis) return null
    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) return null
    const priorities = ['zh-CN', 'zh_CN', 'zh-Hans', 'zh-TW', 'zh_TW', 'cmn']
    // Edge: 优先远程语音（微软云端，质量更高且国内可用）
    // Chrome: 优先本地语音（Google 远程语音国内被墙）
    const preferLocal = navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edg')
    for (const prefix of priorities) {
      const found = voices.find((v) => v.lang.startsWith(prefix) && (preferLocal ? v.localService : !v.localService))
      if (found) return found
    }
    for (const prefix of priorities) {
      const found = voices.find((v) => v.lang.startsWith(prefix))
      if (found) return found
    }
    return voices.find((v) => v.lang.startsWith('zh')) || null
  }, [])

  const speakText = useCallback((text: string, messageIndex: number) => {
    if (!window.speechSynthesis) return
    // Mark old utterance as inactive, so its onend won't reset speakingIndex
    activeUtteranceRef.current = null
    window.speechSynthesis.cancel()
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current)
      resumeTimerRef.current = null
    }

    setSpeakingIndex(messageIndex)

    const plain = stripMarkdown(text)
    const utterance = new SpeechSynthesisUtterance(plain)
    activeUtteranceRef.current = utterance
    utterance.rate = 1.0
    utterance.volume = 1
    const zhVoice = pickChineseVoice()
    if (zhVoice) {
      utterance.voice = zhVoice
      utterance.lang = zhVoice.lang
      console.log('[TTS] using voice:', zhVoice.name, zhVoice.lang, 'local:', zhVoice.localService)
    } else {
      utterance.lang = 'zh-CN'
      console.log('[TTS] no Chinese voice found, using lang=zh-CN. Available:', window.speechSynthesis.getVoices().map(v => `${v.name}(${v.lang})`))
    }
    utterance.onend = () => {
      console.log('[TTS] onend')
      if (activeUtteranceRef.current === utterance) setSpeakingIndex(null)
      if (resumeTimerRef.current) {
        clearInterval(resumeTimerRef.current)
        resumeTimerRef.current = null
      }
    }
    utterance.onerror = (e) => {
      console.warn('[TTS] onerror:', (e as SpeechSynthesisErrorEvent).error, (e as SpeechSynthesisErrorEvent).charIndex)
      if (activeUtteranceRef.current === utterance) setSpeakingIndex(null)
      if (resumeTimerRef.current) {
        clearInterval(resumeTimerRef.current)
        resumeTimerRef.current = null
      }
    }
    window.speechSynthesis.speak(utterance)
    console.log('[TTS] speak() called, speaking:', window.speechSynthesis.speaking, 'pending:', window.speechSynthesis.pending)
    // Chrome workaround: keep speech alive
    resumeTimerRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }
    }, 10000)
  }, [pickChineseVoice])

  const stopSpeaking = useCallback(() => {
    activeUtteranceRef.current = null
    window.speechSynthesis.cancel()
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
    setSpeakingIndex(null)
  }, [])

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      if (resumeTimerRef.current) clearInterval(resumeTimerRef.current)
    }
  }, [])

  // Server-side ASR via MediaRecorder
  const startServerAsr = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setSpeechError('当前环境不支持录音，请使用 HTTPS 或 localhost 访问')
      return
    }
    setSpeechError(null)
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const chunks: BlobPart[] = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: 'audio/webm' })
        try {
          const formData = new FormData()
          formData.append('audio', blob, 'audio.webm')
          const token = localStorage.getItem('token')
          const res = await fetch('/api/v1/whiteboard-ai/speech-to-text', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          })
          const data = await res.json().catch(() => ({ detail: res.statusText }))
          if (!res.ok) throw new Error(data.detail || '语音识别失败')
          const text = data.text
          if (text) {
            setInputValue(text)
            setTimeout(() => handleSubmitRef.current(), 100)
          } else {
            setSpeechError('未识别到语音内容')
          }
        } catch (err: any) {
          console.error('[ASR] error:', err?.message || err)
          const msg = err?.message || '语音识别失败'
          setSpeechError(msg)
        }
        setIsListening(false)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsListening(true)
    }).catch((err) => {
      console.warn('[MediaRecorder] getUserMedia failed:', err)
      setSpeechError('无法访问麦克风，请检查权限或使用 HTTPS 访问')
    })
  }, [])

  // Speech recognition setup (browser native, works on Edge)
  const startListening = useCallback(() => {
    setSpeechError(null)

    // Chrome (Google blocked in China) or no SpeechRecognition: use server ASR
    if (fallbackModeRef.current || !SpeechRecognitionCtor) {
      startServerAsr()
      return
    }

    try {
      const recognition = new SpeechRecognitionCtor()
      recognition.lang = 'zh-CN'
      recognition.continuous = true
      recognition.interimResults = true

      let finalTranscript = inputValue

      recognition.onresult = (event: any) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interim += transcript
          }
        }
        setInputValue(finalTranscript + interim)
      }

      recognition.onerror = (event: any) => {
        console.warn('[SpeechRecognition] error:', event.error)
        if (event.error === 'network' || event.error === 'service-not-allowed') {
          // Google blocked in China, switch to fallback permanently
          fallbackModeRef.current = true
          setIsListening(false)
          startServerAsr()
          return
        }
        if (event.error === 'not-allowed') {
          setSpeechError('请允许浏览器使用麦克风')
        } else if (event.error === 'no-speech') {
          setSpeechError('未检测到语音，请重试')
        } else {
          setSpeechError(`语音识别失败: ${event.error}`)
        }
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
        if (autoSubmitRef.current) {
          autoSubmitRef.current = false
          setTimeout(() => handleSubmitRef.current(), 50)
        }
      }

      recognitionRef.current = recognition
      recognition.start()
      setIsListening(true)
    } catch (err) {
      console.error('[SpeechRecognition] start failed:', err)
      setSpeechError('语音识别启动失败')
    }
  }, [inputValue, startServerAsr])

  const stopListening = useCallback(() => {
    autoSubmitRef.current = true
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    setIsListening(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 语音讲解自动播放：当最新的助手消息是 voice_explain 时自动开始朗读
  useEffect(() => {
    if (messages.length === 0 || isLoading) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== 'assistant' || lastMsg.action !== 'voice_explain') return
    const text = getMessageText(lastMsg.content)
    if (!text) return
    // 延迟一点让消息渲染完成
    const timer = setTimeout(() => {
      speakText(text, messages.length - 1)
    }, 300)
    return () => clearTimeout(timer)
  }, [messages, isLoading, speakText])

  // 语音讲解和生成图片互斥
  useEffect(() => {
    if (isGenImage) setUseVoice(false)
  }, [isGenImage])

  useEffect(() => {
    if (useVoice) setIsGenImage(false)
  }, [useVoice])

  if (!isOpen) return null

  const buildEffectiveContext = (): Props['context'] => {
    if (!useWhiteboard) {
      // 不参考白板：返回空上下文
      return {}
    }
    // 参考白板时直接截图发给多模态模型，不再提取文字
    return context
  }

  const captureWhiteboard = (): string | undefined => {
    const whiteboardAPI = (window as Window & {
      whiteboardAPI?: { toDataURL?: (options?: Record<string, unknown>) => string }
    }).whiteboardAPI

    if (!whiteboardAPI?.toDataURL) return undefined
    try {
      const dataUrl = whiteboardAPI.toDataURL({
        format: 'jpeg',
        quality: 0.85,
        multiplier: 0.6,
      })
      return dataUrl.split(',')[1]
    } catch {
      return undefined
    }
  }

  const projectTextToWhiteboard = (content: string) => {
    const whiteboardAPI = (window as Window & {
      whiteboardAPI?: { addText?: (text: string) => void }
    }).whiteboardAPI
    if (!whiteboardAPI?.addText) return
    const plainText = stripMarkdown(content)
    // 确保长行按句号/问号/感叹号断行，避免单行太长
    const withBreaks = plainText.replace(/([。！？；\n])\s*/g, '$1\n')
    const collapsed = withBreaks.replace(/\n{3,}/g, '\n\n').trim()
    const finalText = collapsed.length > 500 ? `${collapsed.substring(0, 500)}...` : collapsed
    whiteboardAPI.addText(finalText)
  }

  const projectImageToWhiteboard = (content: string) => {
    const whiteboardAPI = (window as Window & {
      whiteboardAPI?: { addImage?: (src: string) => void }
    }).whiteboardAPI
    if (!whiteboardAPI?.addImage) return
    const fullDataUrl = content.startsWith('data:') ? content : `data:image/png;base64,${content}`
    whiteboardAPI.addImage(fullDataUrl)
  }

  const slashQuery = inputValue.startsWith('/') ? inputValue.slice(1).toLowerCase() : ''
  const visiblePromptCommands = inputValue.startsWith('/')
    ? PROMPT_COMMANDS.filter((item) => item.key.slice(1).startsWith(slashQuery))
    : []

  const resetInput = () => {
    setInputValue('')
    setSelectedPromptIndex(0)
  }

  const applyPromptCommand = async (command: PromptCommand) => {
    const effectiveContext = buildEffectiveContext()
    const whiteboardImage = useWhiteboard ? captureWhiteboard() : undefined
    if (command.mode === 'fill') {
      setInputValue(command.prompt)
      setSelectedPromptIndex(0)
      return
    }
    await executeAction('free_question', effectiveContext, command.prompt, whiteboardImage, command.prompt)
    resetInput()
  }

  const handleSubmit = () => {
    if (inputValue.startsWith('/')) {
      const command = visiblePromptCommands[selectedPromptIndex] || visiblePromptCommands[0]
      if (command) {
        void applyPromptCommand(command)
      }
      return
    }

    const effectiveContext = buildEffectiveContext()
    const finalText = inputValue.trim()
    if (!finalText) return

    // 参考白板时始终截图发给多模态模型
    const whiteboardImage = useWhiteboard ? captureWhiteboard() : undefined

    // 勾选"看黑板"时，先输出用户消息 + 思考消息
    if (useWhiteboard) {
      pushMessages([
        { role: 'user', content: finalText, action: 'reference', timestamp: Date.now() },
        { role: 'assistant', content: '好的，我已经看到了白板内容，让我想想...', action: 'reference', timestamp: Date.now() },
      ])
    }

    // 生成图片模式
    if (isGenImage) {
      void executeAction('generate_image', effectiveContext, finalText, undefined, finalText)
      resetInput()
      return
    }

    // 语音讲解模式
    if (useVoice) {
      void executeAction('voice_explain', effectiveContext, finalText, whiteboardImage, useWhiteboard ? undefined : finalText, { skipUserMessage: useWhiteboard })
      resetInput()
      return
    }

    // 普通问答 / 参考白板问答
    if (useWhiteboard) {
      void executeAction('reference', effectiveContext, finalText, whiteboardImage, undefined, { skipUserMessage: true })
    } else {
      freeQuestion(finalText, effectiveContext, undefined)
    }
    resetInput()
  }

  handleSubmitRef.current = handleSubmit

  const inputPlaceholder = isGenImage
    ? '描述你想生成的课堂图片...'
    : useVoice
      ? '输入讲解内容，AI 将生成语音讲解...'
      : useWhiteboard
        ? '输入问题，AI 将参考黑板内容回答...'
        : '输入课堂问题，或输入 / 选择提示词...'

  const renderAssistantBody = (messageIndex: number, displayContent: string) => {
    const currentMessage = messages[messageIndex]
    const isSpeakingThis = speakingIndex === messageIndex

    if (currentMessage.action === 'generate_image') {
      return (
        <div>
          <img
            src={`data:image/png;base64,${displayContent}`}
            alt="AI 生成图片"
            className="max-w-full cursor-pointer rounded-lg hover:opacity-90"
            onClick={() => setLightboxUrl(`data:image/png;base64,${displayContent}`)}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => projectImageToWhiteboard(displayContent)}
              className="rounded-lg border border-blue-500/25 bg-blue-500/20 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-500/30"
            >
              添加到白板
            </button>
            <button
              type="button"
              onClick={() => setLightboxUrl(`data:image/png;base64,${displayContent}`)}
              className="rounded-lg border border-white/10 bg-white/8 px-2 py-1 text-xs text-white transition-colors hover:bg-white/12"
            >
              放大查看
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="text-white">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }} />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => projectTextToWhiteboard(displayContent)}
            className="rounded-lg border border-blue-500/25 bg-blue-500/20 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-500/30"
          >
            投影到白板
          </button>
          <button
            type="button"
            onClick={() => {
              if (isSpeakingThis) {
                stopSpeaking()
              } else {
                speakText(displayContent, messageIndex)
              }
            }}
            className={`rounded-lg border px-2 py-1 text-xs transition-colors ${
              isSpeakingThis
                ? 'border-rose-500/25 bg-rose-500/15 text-rose-200 hover:bg-rose-500/20'
                : 'border-emerald-500/25 bg-emerald-500/15 text-white hover:bg-emerald-500/20'
            }`}
          >
            {isSpeakingThis ? '停止播放' : '播放'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed z-50 flex h-[560px] max-h-[calc(100vh-80px)] w-[420px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e1a]/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
      style={{ right: `${launcherPosition.x}px`, bottom: `${launcherPosition.y + 64}px` }}
    >
      <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-violet-500/20 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="胖鼠 AI 副班" className="h-6 w-6 rounded-lg" />
          <p className="text-sm font-semibold text-white">胖鼠 AI 副班</p>
          <span className="ml-auto rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-100">
            AI
          </span>
        </div>
        <p className="mt-1 text-xs text-white/80">输入问题，按需勾选参考白板或语音讲解</p>
      </div>

      {!isPaid && (
        <div className="shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
          AI 副班为会员专属功能，操作按钮已锁定。
          <a href="/teacher/membership" className="ml-1 underline text-amber-100 hover:text-white">升级会员</a>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-violet-500/20">
              <img src="/logo.png" alt="" className="h-7 w-7 rounded-lg opacity-70" />
            </div>
            <p className="text-center text-sm text-white/80">直接输入问题，或勾选下方选项后发送。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => {
              const displayContent = getMessageText(msg.content)
              return (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white'
                        : 'border border-white/10 bg-white/5 text-white'
                    }`}
                  >
                    {msg.role === 'assistant' ? renderAssistantBody(idx, displayContent) : <div className="whitespace-pre-wrap text-white">{displayContent}</div>}
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                    AI 正在处理...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {error && (
          <div
            className="mt-3 cursor-pointer rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-sm text-white"
            onClick={clearError}
          >
            {error}，点击关闭
          </div>
        )}
      </div>

      {/* 底部控制区 */}
      <div className="shrink-0 space-y-2 border-t border-white/10 bg-[#0a0e1a]/80 px-4 py-3 text-white">
        {/* 选项行 */}
        <div className="flex items-center gap-3">
          {/* 参考白板 - 勾选 */}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={useWhiteboard}
              onChange={(e) => setUseWhiteboard(e.target.checked)}
              disabled={!isPaid}
              className="h-3.5 w-3.5 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500/30 disabled:opacity-30"
            />
            <span className={isPaid ? 'text-white/90' : 'text-white/30'}>看黑板</span>
          </label>

          {/* 语音讲解 - 勾选 */}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={useVoice}
              onChange={(e) => setUseVoice(e.target.checked)}
              disabled={isGenImage || !isPaid}
              className="h-3.5 w-3.5 rounded border-white/30 bg-white/10 text-emerald-500 focus:ring-emerald-500/30 disabled:opacity-30"
            />
            <span className={isGenImage || !isPaid ? 'text-white/30' : 'text-white/90'}>语音讲解</span>
          </label>

          <div className="flex-1" />

          {/* 生成图片 - 独占按钮 */}
          <button
            type="button"
            onClick={() => isPaid && setIsGenImage((prev) => !prev)}
            disabled={!isPaid}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              isGenImage
                ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md shadow-blue-500/20'
                : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {isGenImage ? '生成图片 ✓' : '生成图片'}
          </button>
        </div>

        {/* 输入行 */}
        <div className="relative flex gap-2">
          {inputMode === 'text' ? (
            <>
              <div className="relative flex-1">
                {visiblePromptCommands.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 z-10 mb-2 overflow-hidden rounded-xl border border-white/10 bg-[#0b1120] shadow-2xl">
                    <div className="border-b border-white/10 px-3 py-2 text-[11px] text-white/70">提示词索引</div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {visiblePromptCommands.map((command, index) => (
                        <button
                          key={command.key}
                          type="button"
                          onClick={() => void applyPromptCommand(command)}
                          className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition-colors ${
                            index === selectedPromptIndex ? 'bg-blue-500/20 text-white' : 'text-white hover:bg-white/6'
                          }`}
                        >
                          <span className="text-sm font-medium text-white">{command.label}</span>
                          <span className="text-xs text-white/70">{command.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    setSelectedPromptIndex(0)
                  }}
                  onKeyDown={(e) => {
                    if (visiblePromptCommands.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setSelectedPromptIndex((prev) => (prev + 1) % visiblePromptCommands.length)
                        return
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setSelectedPromptIndex((prev) => (prev - 1 + visiblePromptCommands.length) % visiblePromptCommands.length)
                        return
                      }
                      if (e.key === 'Tab') {
                        e.preventDefault()
                        const command = visiblePromptCommands[selectedPromptIndex] || visiblePromptCommands[0]
                        if (command) {
                          void applyPromptCommand(command)
                        }
                        return
                      }
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  placeholder={inputPlaceholder}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-white/50 focus:border-blue-500/40 focus:bg-white/8 focus:outline-none"
                />
              </div>

              {/* 切换到语音模式 */}
              <button
                type="button"
                onClick={() => setInputMode('voice')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white"
                title="语音输入"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isLoading || !isPaid}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                发送
              </button>
            </>
          ) : (
            <>
              {/* 语音模式：大按钮覆盖文本框区域 */}
              <button
                type="button"
                onClick={isListening ? stopListening : isPaid ? startListening : undefined}
                disabled={!isPaid && !isListening}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-all ${
                  isListening
                    ? 'border-rose-500/40 bg-rose-500/20 text-rose-300 shadow-lg shadow-rose-500/10'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                {isListening ? '正在录音...点击停止' : '点击说话'}
                {isListening && <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-400" />}
              </button>

              {/* 切换到文字模式 */}
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white"
                title="键盘输入"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                  <rect x="2" y="4" width="20" height="14" rx="2" />
                  <line x1="6" y1="8" x2="6" y2="8" />
                  <line x1="10" y1="8" x2="10" y2="8" />
                  <line x1="14" y1="8" x2="14" y2="8" />
                  <line x1="18" y1="8" x2="18" y2="8" />
                  <line x1="8" y1="12" x2="8" y2="12" />
                  <line x1="12" y1="12" x2="12" y2="12" />
                  <line x1="16" y1="12" x2="16" y2="12" />
                  <line x1="8" y1="16" x2="16" y2="16" />
                </svg>
              </button>
            </>
          )}
        </div>

        {speechError && (
          <p
            className="cursor-pointer text-[11px] text-rose-400"
            onClick={() => setSpeechError(null)}
          >
            {speechError}，点击关闭
          </p>
        )}

        <p className="text-[11px] text-white/60">
          {isListening ? '正在录音...说话即可输入文字' : inputMode === 'text' ? '输入 / 可快速选择常用提示词' : '点击话筒开始语音输入，点击键盘切换文字输入'}
        </p>
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
            type="button"
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
