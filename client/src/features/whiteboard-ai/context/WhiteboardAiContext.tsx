import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { whiteboardAiService, type WhiteboardAiRequest } from '../services/whiteboardAiService'

type AiMessageContent = string | Array<string | { text?: string }>

interface AiMessage {
  role: 'user' | 'assistant'
  content: AiMessageContent
  action?: string
  timestamp: number
}

type WhiteboardAiAction = 'reference' | 'generate_image' | 'free_question'

interface WhiteboardAiContextValue {
  isOpen: boolean
  isLoading: boolean
  error: string | null
  messages: AiMessage[]
  launcherPosition: { x: number; y: number }
  setOpen: (open: boolean) => void
  setLauncherPosition: (pos: { x: number; y: number }) => void
  executeAction: (action: WhiteboardAiAction, context: WhiteboardAiRequest['context'], question?: string, image_base64?: string) => Promise<void>
  freeQuestion: (question: string, context: WhiteboardAiRequest['context'], image_base64?: string) => void
  clearMessages: () => void
  clearError: () => void
}

const WhiteboardAiContext = createContext<WhiteboardAiContextValue | null>(null)

const CACHE_TTL = 5 * 60 * 1000
const DEBOUNCE_MS = 500
const THROTTLE_MS = 2000

export function WhiteboardAiProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [cachedResults] = useState<Map<string, { content: string; timestamp: number }>>(new Map())
  const [launcherPosition, setLauncherPosition] = useState({ x: 24, y: 96 })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const throttleRef = useRef<Map<string, number>>(new Map())

  const checkThrottle = useCallback((action: string): boolean => {
    const now = Date.now()
    const lastCall = throttleRef.current.get(action) || 0
    if (now - lastCall < THROTTLE_MS) return false
    throttleRef.current.set(action, now)
    return true
  }, [])

  const executeAction = useCallback(async (action: WhiteboardAiAction, context: WhiteboardAiRequest['context'], question?: string, image_base64?: string) => {
    if (!checkThrottle(action)) {
      setError('操作过于频繁，请稍后再试')
      return
    }

    const cacheKey = `${action}:${question || ''}:${image_base64 ? 'img' : 'noimg'}`
    const cached = cachedResults.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setMessages(prev => [...prev, { role: 'user', content: question || action, action, timestamp: Date.now() },
        { role: 'assistant', content: cached.content, action, timestamp: Date.now() }])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await whiteboardAiService.respond({ action, question, context, image_base64 })
      cachedResults.set(cacheKey, { content: response.content, timestamp: Date.now() })
      setMessages(prev => [...prev,
        { role: 'user', content: question || action, action, timestamp: Date.now() },
        { role: 'assistant', content: response.content, action, timestamp: Date.now() }
      ])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'AI 服务调用失败')
    } finally {
      setIsLoading(false)
    }
  }, [checkThrottle, cachedResults])

  const freeQuestion = useCallback((question: string, context: WhiteboardAiRequest['context'], image_base64?: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => executeAction('free_question', context, question, image_base64), DEBOUNCE_MS)
  }, [executeAction])

  const clearMessages = useCallback(() => setMessages([]), [])
  const clearError = useCallback(() => setError(null), [])
  const setOpen = useCallback((open: boolean) => setIsOpen(open), [])

  return (
    <WhiteboardAiContext.Provider value={{
      isOpen, isLoading, error, messages, launcherPosition,
      setOpen, setLauncherPosition, executeAction, freeQuestion, clearMessages, clearError
    }}>
      {children}
    </WhiteboardAiContext.Provider>
  )
}

export function useWhiteboardAiContext() {
  const ctx = useContext(WhiteboardAiContext)
  if (!ctx) throw new Error('useWhiteboardAiContext must be used within WhiteboardAiProvider')
  return ctx
}
