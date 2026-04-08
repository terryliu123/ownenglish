import { useState, useCallback, useRef } from 'react'
import { whiteboardAiService, type WhiteboardAiRequest } from '../services/whiteboardAiService'

type WhiteboardAiAction = 'reference' | 'generate_image' | 'free_question'

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
  action?: string
  timestamp: number
}

export interface WhiteboardAiState {
  isOpen: boolean
  isLoading: boolean
  error: string | null
  messages: AiMessage[]
  cachedResults: Map<string, { content: string; timestamp: number }>
}

const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存
const DEBOUNCE_MS = 500 // 防抖延迟
const THROTTLE_MS = 2000 // 节流时间

export function useWhiteboardAi() {
  const [state, setState] = useState<WhiteboardAiState>({
    isOpen: false,
    isLoading: false,
    error: null,
    messages: [],
    cachedResults: new Map(),
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const throttleRef = useRef<Map<string, number>>(new Map())

  const setOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, isOpen: open }))
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const checkThrottle = useCallback((action: string): boolean => {
    const now = Date.now()
    const lastCall = throttleRef.current.get(action) || 0
    if (now - lastCall < THROTTLE_MS) {
      return false
    }
    throttleRef.current.set(action, now)
    return true
  }, [])

  const executeAction = useCallback(async (action: WhiteboardAiAction, context: WhiteboardAiRequest['context'], question?: string) => {
    // 检查节流
    if (!checkThrottle(action)) {
      setState(prev => ({ ...prev, error: '操作太频繁，请稍后再试' }))
      return
    }

    // 检查缓存
    const cacheKey = `${action}:${question || ''}`
    const cached = state.cachedResults.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, { role: 'assistant', content: cached.content, action, timestamp: Date.now() }]
      }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await whiteboardAiService.respond({ action, question, context })

      // 更新缓存
      setState(prev => {
        const newCache = new Map(prev.cachedResults)
        newCache.set(cacheKey, { content: response.content, timestamp: Date.now() })
        return {
          ...prev,
          isLoading: false,
          messages: [...prev.messages, { role: 'user', content: question || action, action, timestamp: Date.now() },
            { role: 'assistant', content: response.content, action, timestamp: Date.now() }],
          cachedResults: newCache,
        }
      })
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error?.response?.data?.detail || 'AI服务调用失败',
      }))
    }
  }, [checkThrottle, state.cachedResults])

  const freeQuestion = useCallback((question: string, context: WhiteboardAiRequest['context']) => {
    // 防抖
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      executeAction('free_question', context, question)
    }, DEBOUNCE_MS)
  }, [executeAction])

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }))
  }, [])

  return {
    ...state,
    setOpen,
    clearError,
    executeAction,
    freeQuestion,
    clearMessages,
  }
}
