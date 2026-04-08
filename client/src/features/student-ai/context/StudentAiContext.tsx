import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { studentAiService } from '../services/studentAiService'
import { classService } from '../../../services/api'

interface AiMessage {
  role: 'user' | 'assistant'
  content: string
  action?: string
  timestamp: number
}

interface StudentAiContextData {
  class_id?: string
  session_id?: string
}

interface AiSettings {
  enabled: boolean
  system_prompt: string
  max_output_length: number
  show_reasoning: boolean
  photo_qa_enabled: boolean
  free_question_enabled: boolean
}

type StudentAiAction = 'free_question' | 'photo_qa'

interface StudentAiContextValue {
  isOpen: boolean
  isLoading: boolean
  error: string | null
  messages: AiMessage[]
  aiContext: StudentAiContextData
  settings: AiSettings | null
  setOpen: (open: boolean) => void
  setAiContext: (context: StudentAiContextData) => void
  loadSettings: (classId: string) => Promise<void>
  executeAction: (action: StudentAiAction, question?: string, image_base64?: string) => Promise<void>
  freeQuestion: (question: string) => void
  clearMessages: () => void
  clearError: () => void
}

const StudentAiContext = createContext<StudentAiContextValue | null>(null)

const DEBOUNCE_MS = 500
const THROTTLE_MS = 2000

const DEFAULT_SETTINGS: AiSettings = {
  enabled: false,
  system_prompt: '',
  max_output_length: 500,
  show_reasoning: false,
  photo_qa_enabled: true,
  free_question_enabled: true,
}

export function StudentAiProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [aiContext, setAiContext] = useState<StudentAiContextData>({})
  const [settings, setSettings] = useState<AiSettings | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const throttleRef = useRef<Map<string, number>>(new Map())

  const checkThrottle = useCallback((action: string): boolean => {
    const now = Date.now()
    const lastCall = throttleRef.current.get(action) || 0
    if (now - lastCall < THROTTLE_MS) return false
    throttleRef.current.set(action, now)
    return true
  }, [])

  const loadSettings = useCallback(async (classId: string) => {
    try {
      const data = await classService.getClassAiSettings(classId)
      console.log('[StudentAiContext] loadSettings response:', data)
      // 确保数据是有效的
      if (data && typeof data === 'object' && 'enabled' in data) {
        setSettings(data)
      } else {
        console.warn('[StudentAiContext] Invalid settings data, using defaults:', data)
        setSettings(DEFAULT_SETTINGS)
      }
    } catch (err) {
      console.error('[StudentAiContext] loadSettings error:', err)
      setSettings(DEFAULT_SETTINGS)
    }
  }, [])

  const executeAction = useCallback(async (action: StudentAiAction, question?: string, image_base64?: string) => {
    if (!checkThrottle(action)) {
      setError('操作太频繁，请稍后再试')
      return
    }

    if (!settings?.enabled) {
      setError('AI 功能未启用')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await studentAiService.respond({ action, question, context: aiContext, image_base64 })
      setMessages(prev => [...prev,
        { role: 'user', content: question || action, action, timestamp: Date.now() },
        { role: 'assistant', content: response.content, action, timestamp: Date.now() }
      ])
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'AI服务调用失败')
    } finally {
      setIsLoading(false)
    }
  }, [checkThrottle, aiContext, settings])

  const freeQuestion = useCallback((question: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => executeAction('free_question', question), DEBOUNCE_MS)
  }, [executeAction])

  const clearMessages = useCallback(() => setMessages([]), [])
  const clearError = useCallback(() => setError(null), [])
  const setOpen = useCallback((open: boolean) => setIsOpen(open), [])

  return (
    <StudentAiContext.Provider value={{
      isOpen, isLoading, error, messages, aiContext, settings,
      setOpen, setAiContext, loadSettings, executeAction, freeQuestion, clearMessages, clearError
    }}>
      {children}
    </StudentAiContext.Provider>
  )
}

export function useStudentAiContext() {
  const ctx = useContext(StudentAiContext)
  if (!ctx) throw new Error('useStudentAiContext must be used within StudentAiProvider')
  return ctx
}
