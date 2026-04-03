import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '../../../stores/app-store'
import { liveTaskService } from '../../../services/api'
// ClassPresenceInfo not needed - using Maps from hook state
import type { LiveTaskGroup } from '../../../services/api'
import type { LiveChallengeSession } from '../../../services/websocket'

interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
  userId?: string
}

interface StudentSubmission {
  taskId: string
  studentId: string
  studentName: string
  answer: any
  submittedAt: string
}

export interface WhiteboardLiveState {
  // 连接状态
  isConnected: boolean
  isConnecting: boolean
  error: string | null

  // 学生状态
  onlineStudents: Map<string, { id: string; name: string; avatar?: string; joinedAt: string }>
  classroomStudents: Map<string, { id: string; name: string }>
  onlineCount: number
  classroomCount: number

  // 任务状态
  activeTaskGroup: LiveTaskGroup | null
  submissions: StudentSubmission[]
  submissionCount: number

  // 分享请求
  pendingShares: any[]

  // 挑战状态
  currentChallenge: LiveChallengeSession | null
}

const getSharesStorageKey = (classId: string | null) => `whiteboard_shares_${classId || 'global'}`

export function useWhiteboardLive(classId: string | null) {
  const { user, token } = useAppStore()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isConnectingRef = useRef(false)

  // 从 localStorage 加载保存的分享
  const loadSavedShares = useCallback(() => {
    if (!classId) return []
    try {
      const saved = localStorage.getItem(getSharesStorageKey(classId))
      console.log('[WhiteboardLive] Loading shares:', { classId, saved: saved ? JSON.parse(saved) : [] })
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      console.error('[WhiteboardLive] Failed to load shares:', e)
      return []
    }
  }, [classId])

  const [state, setState] = useState<WhiteboardLiveState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    onlineStudents: new Map(),
    classroomStudents: new Map(),
    onlineCount: 0,
    classroomCount: 0,
    submissions: [],
    submissionCount: 0,
    pendingShares: loadSavedShares(),
    activeTaskGroup: null,
    currentChallenge: null,
  })

  // 当 classId 变化时，重新加载分享请求
  useEffect(() => {
    if (!classId) return
    const savedShares = loadSavedShares()
    console.log('[WhiteboardLive] Reloading for classId:', classId, { shares: savedShares })
    setState(prev => ({ ...prev, pendingShares: savedShares, activeTaskGroup: null, currentChallenge: null }))
  }, [classId, loadSavedShares])

  // 保存 pendingShares 到 localStorage
  useEffect(() => {
    if (!classId) return
    localStorage.setItem(getSharesStorageKey(classId), JSON.stringify(state.pendingShares))
  }, [state.pendingShares, classId])

  // 清理存储（下课时调用）
  const clearShares = useCallback(() => {
    if (!classId) return
    localStorage.removeItem(getSharesStorageKey(classId))
    setState(prev => ({ ...prev, pendingShares: [], activeTaskGroup: null, currentChallenge: null }))
  }, [classId])

  // 获取 WebSocket URL
  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/api/v1/live/ws?token=${token}&class_id=${classId}`
  }, [token, classId])

  // 加载班级 presence 信息
  const loadClassPresence = useCallback(async () => {
    if (!classId) return
    try {
      const presence = await liveTaskService.getClassPresence(classId)
      setState(prev => ({
        ...prev,
        onlineStudents: new Map(presence.online_students?.map((s: any) => [s.id, s]) || []),
        classroomStudents: new Map(presence.classroom_students?.map((s: any) => [s.id, s]) || []),
        onlineCount: presence.online_student_count || 0,
        classroomCount: presence.classroom_student_count || 0,
      }))
    } catch (e) {
      console.error('[WhiteboardLive] Failed to load class presence:', e)
    }
  }, [classId])

  // 处理 WebSocket 消息
  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('[WhiteboardLive] Received:', message.type, message)

    // 所有消息数据都直接在 message 对象中，不是嵌套在 message.data 中
    const msg = message as any

    switch (message.type) {
      case 'presence':
        // 学生上下线更新
        if (msg.type === 'student_joined') {
          setState(prev => {
            const newOnlineStudents = new Map(prev.onlineStudents)
            newOnlineStudents.set(msg.student_id, {
              id: msg.student_id,
              name: msg.student_name,
              avatar: msg.avatar,
              joinedAt: new Date().toISOString(),
            })
            // 同时更新 classroomStudents（已进入教室的学生）
            const newClassroomStudents = new Map(prev.classroomStudents)
            newClassroomStudents.set(msg.student_id, {
              id: msg.student_id,
              name: msg.student_name,
            })
            return {
              ...prev,
              onlineStudents: newOnlineStudents,
              onlineCount: newOnlineStudents.size,
              classroomStudents: newClassroomStudents,
              classroomCount: newClassroomStudents.size,
            }
          })
        } else if (msg.type === 'student_left') {
          setState(prev => {
            const newOnlineStudents = new Map(prev.onlineStudents)
            newOnlineStudents.delete(msg.student_id)
            // 同时从 classroomStudents 中移除
            const newClassroomStudents = new Map(prev.classroomStudents)
            newClassroomStudents.delete(msg.student_id)
            return {
              ...prev,
              onlineStudents: newOnlineStudents,
              onlineCount: newOnlineStudents.size,
              classroomStudents: newClassroomStudents,
              classroomCount: newClassroomStudents.size,
            }
          })
        }
        break

      case 'new_task_group':
        // 新任务组发布（包含 WebSocket 重连后恢复的任务）
        setState(prev => ({
          ...prev,
          activeTaskGroup: {
            id: msg.group_id,
            title: msg.title,
            tasks: msg.tasks || [],
            task_count: msg.tasks?.length || 0,
            class_id: classId || '',
            status: 'ready',
            created_at: new Date().toISOString(),
          } as LiveTaskGroup,
          currentChallenge: null,
          submissions: [],
          submissionCount: 0,
        }))
        break

      case 'task_group_published':
        // 任务组发布确认 - 服务器返回 group_id 和 task_count
        // 保持当前 activeTaskGroup（已在 publishTaskGroup 中设置）
        setState(prev => {
          // 如果服务器返回了 task_group 对象，使用它；否则保持当前值
          const taskGroup = msg.task_group || prev.activeTaskGroup
          return {
            ...prev,
            activeTaskGroup: taskGroup,
            currentChallenge: null,
            submissions: [],
            submissionCount: 0,
          }
        })
        break

      case 'task_group_ended':
        // 任务组结束
        setState(prev => ({
          ...prev,
          activeTaskGroup: null,
          submissions: [],
          submissionCount: 0,
        }))
        break

      case 'task_submission':
      case 'new_task_group_submission':
        // 学生提交答案（单个任务或任务组）
        setState(prev => ({
          ...prev,
          submissions: [...prev.submissions, {
            taskId: msg.task_id,
            studentId: msg.student_id,
            studentName: msg.student_name,
            answer: msg.answer,
            submittedAt: msg.timestamp || new Date().toISOString(),
          }],
          // 使用服务器返回的 total_submissions 或自增
          submissionCount: msg.total_submissions || prev.submissionCount + 1,
        }))
        break

      case 'student_share_request':
        // 学生分享请求
        console.log('[WhiteboardLive] Student share request received:', msg)
        if (msg.share_id) {
          setState(prev => {
            // 检查是否已存在，避免重复添加
            const exists = prev.pendingShares.some(s => s.share_id === msg.share_id)
            if (exists) {
              // 更新现有分享的状态（如果服务器发送了更新）
              return {
                ...prev,
                pendingShares: prev.pendingShares.map(s =>
                  s.share_id === msg.share_id ? { ...s, ...msg } : s
                ),
              }
            }
            return {
              ...prev,
              pendingShares: [...prev.pendingShares, msg],
            }
          })
        }
        break

      case 'share_request_response':
        // 分享请求响应（通过/拒绝）- 从待处理列表移除，避免一直停留在处理中
        if (msg.share_id) {
          setState(prev => ({
            ...prev,
            pendingShares: prev.pendingShares.filter(s => s.share_id !== msg.share_id),
          }))
        }
        break

      case 'error':
        setState(prev => ({ ...prev, error: msg.message || '未知错误' }))
        break

      // 挑战消息
      case 'challenge_started':
        setState(prev => ({
          ...prev,
          activeTaskGroup: null,
          submissions: [],
          submissionCount: 0,
          currentChallenge: msg.challenge as LiveChallengeSession,
        }))
        break

      case 'challenge_progress_updated':
      case 'challenge_scoreboard_updated':
        setState(prev => {
          if (!prev.currentChallenge) return prev
          return {
            ...prev,
            currentChallenge: {
              ...prev.currentChallenge,
              scoreboard: msg.scoreboard || prev.currentChallenge.scoreboard,
              status: msg.status || prev.currentChallenge.status,
            },
          }
        })
        break

      case 'challenge_ended':
        setState(prev => ({
          ...prev,
          currentChallenge: {
            ...(msg.challenge as LiveChallengeSession || prev.currentChallenge) as LiveChallengeSession,
            scoreboard: msg.scoreboard || (msg.challenge as any)?.scoreboard || prev.currentChallenge?.scoreboard || [],
            status: msg.status || (msg.challenge as any)?.status || 'ended',
          },
        }))
        break
    }
  }, [])

  // 发送心跳
  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }, [])

  // 连接 WebSocket
  const connect = useCallback(() => {
    console.log('[WhiteboardLive] Connect attempt:', { classId, hasToken: !!token, hasUser: !!user })

    if (!classId || !token || !user) {
      console.warn('[WhiteboardLive] Missing required params:', { classId, hasToken: !!token, hasUser: !!user })
      return
    }
    if (isConnectingRef.current) {
      console.log('[WhiteboardLive] Already connecting, skipping...')
      return
    }

    const wsUrl = getWsUrl()
    console.log('[WhiteboardLive] Connecting to:', wsUrl.replace(token, '***TOKEN***'))

    isConnectingRef.current = true
    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WhiteboardLive] WebSocket connected')
      isConnectingRef.current = false
      setState(prev => ({ ...prev, isConnected: true, isConnecting: false }))
      startHeartbeat()
      // 加载初始学生状态
      loadClassPresence()
    }

    ws.onclose = (event) => {
      console.log('[WhiteboardLive] WebSocket disconnected:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      })
      isConnectingRef.current = false
      setState(prev => ({ ...prev, isConnected: false, isConnecting: false }))
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }

      // 3秒后自动重连
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 3000)
    }

    ws.onerror = (e) => {
      console.error('[WhiteboardLive] WebSocket error:', e)
      console.error('[WhiteboardLive] WebSocket readyState:', ws.readyState)
      console.error('[WhiteboardLive] WebSocket URL:', ws.url.replace(token || '', '***TOKEN***'))
      isConnectingRef.current = false
      setState(prev => ({ ...prev, error: '连接错误', isConnecting: false }))
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        if (message.type === 'pong') return
        handleMessage(message)
      } catch (e) {
        console.error('[WhiteboardLive] Failed to parse message:', e)
      }
    }
  }, [classId, token, user, getWsUrl, startHeartbeat, loadClassPresence])

  // 断开连接
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  // 发布任务组
  const publishTaskGroup = useCallback((taskGroup: LiveTaskGroup) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // 构建任务列表数据 - 字段直接放在消息对象中
      const tasks = (taskGroup.tasks || []).map((task: any) => ({
        task_id: task.id,
        type: task.type,
        question: task.question,
        countdown_seconds: task.countdown_seconds || 30,
        correct_answer: task.correct_answer,
      }))

      wsRef.current.send(JSON.stringify({
        type: 'publish_task_group',
        group_id: taskGroup.id,
        tasks: tasks,
        total_countdown: 300,
      }))
    }
    // 同时更新本地状态
    setState(prev => ({
      ...prev,
      activeTaskGroup: taskGroup,
      submissions: [],
      submissionCount: 0,
    }))
  }, [])

  // 结束任务组
  const endTaskGroup = useCallback((groupId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'end_task_group',
        group_id: groupId,
      }))
    }
    setState(prev => ({
      ...prev,
      activeTaskGroup: null,
      submissions: [],
      submissionCount: 0,
    }))
  }, [])

  // 结束课堂（下课）- 通知所有学生退出
  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'end_session',
      }))
    }
  }, [])

  // 处理分享请求
  const handleShare = useCallback((shareId: string, action: 'approve' | 'reject', comment?: string) => {
    // 如果 WebSocket 未连接，先不更新状态，避免卡住
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[WhiteboardLive] Cannot handle share: WebSocket not open')
      return
    }
    // 更新本地状态为处理中，等待服务器确认
    setState(prev => ({
      ...prev,
      pendingShares: prev.pendingShares.map(s =>
        s.share_id === shareId
          ? { ...s, status: action === 'approve' ? 'approving' : 'rejecting', teacher_comment: comment }
          : s
      ),
    }))
    // 发送 WebSocket 消息
    const payload: any = {
      type: action === 'approve' ? 'approve_share' : 'reject_share',
      share_id: shareId,
    }
    if (action === 'approve' && comment) {
      payload.teacher_comment = comment
    }
    wsRef.current.send(JSON.stringify(payload))
    // 3 秒后若仍卡在处理中，自动恢复为 pending，避免服务器未响应时永久卡住
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        pendingShares: prev.pendingShares.map(s =>
          s.share_id === shareId && (s.status === 'approving' || s.status === 'rejecting')
            ? { ...s, status: 'pending' }
            : s
        ),
      }))
    }, 3000)
  }, [])

  // 挑战：开始
  const startChallenge = useCallback((challengeId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start_challenge', challenge_id: challengeId }))
    }
  }, [])

  // 挑战：结束
  const endChallenge = useCallback((challengeId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_challenge', challenge_id: challengeId }))
    }
  }, [])

  // 挑战：清除
  const clearChallenge = useCallback(() => {
    setState(prev => ({ ...prev, currentChallenge: null }))
  }, [])

  // 初始连接
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // 定期刷新学生状态（每15秒）
  useEffect(() => {
    if (!classId) return
    const interval = setInterval(loadClassPresence, 15000)
    return () => clearInterval(interval)
  }, [classId, loadClassPresence])

  return {
    ...state,
    connect,
    disconnect,
    publishTaskGroup,
    endTaskGroup,
    handleShare,
    clearShares,
    refreshPresence: loadClassPresence,
    startChallenge,
    endChallenge,
    clearChallenge,
    endSession,
  }
}
