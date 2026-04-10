import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

import {
  whiteboardAiService,
  type VoiceExplainPayload,
  type WhiteboardAiAction,
  type WhiteboardAiRequest,
  type WhiteboardAiResponse,
} from '../services/whiteboardAiService'

export type { WhiteboardAiAction }
export type { VoiceExplainPayload }

type AiMessageContent = string | Array<string | { text?: string }>

export interface AiMessage {
  role: 'user' | 'assistant'
  content: AiMessageContent
  action?: WhiteboardAiAction
  type?: WhiteboardAiResponse['type']
  parsed?: Record<string, unknown> | VoiceExplainPayload
  timestamp: number
}

interface WhiteboardAiContextValue {
  isOpen: boolean
  isLoading: boolean
  error: string | null
  messages: AiMessage[]
  launcherPosition: { x: number; y: number }
  setOpen: (open: boolean) => void
  setLauncherPosition: (pos: { x: number; y: number }) => void
  executeAction: (
    action: WhiteboardAiAction,
    context: WhiteboardAiRequest['context'],
    question?: string,
    image_base64?: string,
    userLabel?: string,
    options?: { skipUserMessage?: boolean },
  ) => Promise<void>
  freeQuestion: (
    question: string,
    context: WhiteboardAiRequest['context'],
    image_base64?: string,
  ) => void
  pushMessages: (msgs: AiMessage[]) => void
  clearMessages: () => void
  clearError: () => void
}

const WhiteboardAiContext = createContext<WhiteboardAiContextValue | null>(null)

const CACHE_TTL = 5 * 60 * 1000
const DEBOUNCE_MS = 500
const THROTTLE_MS = 2000

const ACTION_LABELS: Record<WhiteboardAiAction, string> = {
  reference: '参考白板',
  generate_image: '生成图片',
  free_question: '自由提问',
  voice_explain: '语音讲解',
}

export function WhiteboardAiProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [cachedResults] = useState<Map<string, { response: WhiteboardAiResponse; timestamp: number }>>(new Map())
  const [launcherPosition, setLauncherPosition] = useState({ x: 24, y: 96 })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const throttleRef = useRef<Map<string, number>>(new Map())
  const messagesRef = useRef<AiMessage[]>([])
  messagesRef.current = messages

  const checkThrottle = useCallback((action: string): boolean => {
    const now = Date.now()
    const lastCall = throttleRef.current.get(action) || 0
    if (now - lastCall < THROTTLE_MS) {
      return false
    }
    throttleRef.current.set(action, now)
    return true
  }, [])

  const appendResponseMessages = useCallback(
    (response: WhiteboardAiResponse, action: WhiteboardAiAction, userContent?: string) => {
      const nextMessages: AiMessage[] = []
      if (userContent) {
        nextMessages.push({ role: 'user', content: userContent, action, timestamp: Date.now() })
      }
      nextMessages.push({
        role: 'assistant',
        content: response.content,
        action,
        type: response.type,
        parsed: response.parsed,
        timestamp: Date.now(),
      })
      setMessages((prev) => [...prev, ...nextMessages])
    },
    [],
  )

  const pushMessages = useCallback((msgs: AiMessage[]) => {
    setMessages((prev) => [...prev, ...msgs])
  }, [])

  const executeAction = useCallback(
    async (
      action: WhiteboardAiAction,
      context: WhiteboardAiRequest['context'],
      question?: string,
      image_base64?: string,
      userLabel?: string,
      options?: { skipUserMessage?: boolean },
    ) => {
      if (!checkThrottle(action)) {
        setError('操作过于频繁，请稍后再试')
        return
      }

      const contextHash = `${context?.whiteboard_text || ''}:${context?.task_title || ''}:${(context?.task_questions || []).join(',')}`
      const cacheKey = `${action}:${question || ''}:${image_base64 ? 'img' : 'noimg'}:${contextHash}`
      const cached = cachedResults.get(cacheKey)
      const userContent = options?.skipUserMessage ? undefined : (userLabel || question || ACTION_LABELS[action])
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        appendResponseMessages(cached.response, action, userContent)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const recentHistory = messagesRef.current
          .slice(-30)
          .map((message) => ({
            role: message.role as 'user' | 'assistant',
            content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
          }))
          .filter((item) => item.content)

        const response = await whiteboardAiService.respond({
          action,
          question,
          context,
          image_base64,
          history: recentHistory.length > 0 ? recentHistory : undefined,
        })

        cachedResults.set(cacheKey, { response, timestamp: Date.now() })
        appendResponseMessages(response, action, userContent)
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'AI 服务调用失败')
      } finally {
        setIsLoading(false)
      }
    },
    [appendResponseMessages, cachedResults, checkThrottle],
  )

  const freeQuestion = useCallback(
    (question: string, context: WhiteboardAiRequest['context'], image_base64?: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        void executeAction('free_question', context, question, image_base64, question)
      }, DEBOUNCE_MS)
    },
    [executeAction],
  )

  const clearMessages = useCallback(() => setMessages([]), [])
  const clearError = useCallback(() => setError(null), [])
  const setOpenCallback = useCallback((open: boolean) => setIsOpen(open), [])

  return (
    <WhiteboardAiContext.Provider
      value={{
        isOpen,
        isLoading,
        error,
        messages,
        launcherPosition,
        setOpen: setOpenCallback,
        setLauncherPosition,
        executeAction,
        freeQuestion,
        pushMessages,
        clearMessages,
        clearError,
      }}
    >
      {children}
    </WhiteboardAiContext.Provider>
  )
}

export function useWhiteboardAiContext() {
  const context = useContext(WhiteboardAiContext)
  if (!context) {
    throw new Error('useWhiteboardAiContext must be used within WhiteboardAiProvider')
  }
  return context
}
