import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../../stores/app-store'
import { api, liveTaskService } from '../../../services/api'
import { buildLiveWsUrl, getFreshAccessToken as ensureFreshAccessToken } from '../../../services/ws-auth'
import type { LiveTaskGroup } from '../../../services/api'
import type { LiveChallengeSession, TaskHistoryItem } from '../../../services/websocket'
import type { ActiveDanmu, DanmuConfig, ActiveAtmosphereEffect, AtmosphereEffectType } from '../../danmu/types/danmu'
import { debugLive } from '../../live-runtime/debug'
import {
  isChallengeFinished,
  normalizeChallengePayload,
  normalizeRoomInfoPayload,
} from '../../live-runtime/challengeRuntime'

interface WebSocketMessage {
  type: string
  timestamp?: number
  [key: string]: unknown
}

interface StudentSubmission {
  taskId: string
  studentId: string
  studentName: string
  answer: unknown
  submittedAt: string
}

interface LiveRoomStudent {
  id: string
  name: string
  avatar?: string
  joinedAt?: string
}

interface ClassroomSessionSummary {
  id: string
  class_id: string
  teacher_id: string
  title: string | null
  entry_mode: string
  status: string
  started_at: string
}

export interface WhiteboardLiveState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  roomInfoHydrated: boolean
  onlineStudents: Map<string, LiveRoomStudent>
  classroomStudents: Map<string, { id: string; name: string }>
  onlineCount: number
  classroomCount: number
  activeTaskGroup: LiveTaskGroup | null
  submissions: StudentSubmission[]
  submissionCount: number
  pendingShares: any[]
  currentChallenge: LiveChallengeSession | null
  liveSessionId: string | null
  currentClassroomSession: ClassroomSessionSummary | null
  elapsedSeconds: number
  taskHistory: TaskHistoryItem[]
  endedTaskGroups: { groupId: string; endedAt: string }[]
  // 寮瑰箷閰嶇疆
  danmuConfig: DanmuConfig
  // 娲昏穬寮瑰箷鍒楄〃
  activeDanmus: ActiveDanmu[]
  // 娲昏穬姘寸エ鏁堟灉
  activeEffects: ActiveAtmosphereEffect[]
}

function mapStudentsToMap<T extends { id: string; name: string }>(students?: T[]) {
  return new Map((students || []).map((student) => [student.id, student]))
}

function buildActiveTaskGroup(classId: string | null, msg: any): LiveTaskGroup {
  return {
    id: msg.group_id || msg.id || '',
    title: msg.title || '',
    tasks: msg.tasks || [],
    task_count: msg.tasks?.length || msg.task_count || 0,
    class_id: classId || '',
    status: 'ready',
    created_at: msg.created_at || new Date().toISOString(),
    updated_at: msg.updated_at,
  } as LiveTaskGroup
}

function hasOwnKey(value: unknown, key: string) {
  return Boolean(value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key))
}

function getCurrentTaskGroupFromPayload(payload: any) {
  if (hasOwnKey(payload?.room_state, 'current_task_group')) {
    return payload.room_state.current_task_group ?? null
  }
  if (hasOwnKey(payload, 'current_task_group')) {
    return payload.current_task_group ?? null
  }
  if (hasOwnKey(payload?.room_info?.room_state, 'current_task_group')) {
    return payload.room_info.room_state.current_task_group ?? null
  }
  if (hasOwnKey(payload?.room_info, 'current_task_group')) {
    return payload.room_info.current_task_group ?? null
  }
  return undefined
}

function getCurrentChallengeFromPayload(payload: any) {
  if (hasOwnKey(payload?.room_state, 'current_challenge')) {
    return payload.room_state.current_challenge ?? null
  }
  if (hasOwnKey(payload, 'current_challenge')) {
    return payload.current_challenge ?? null
  }
  if (hasOwnKey(payload?.room_info?.room_state, 'current_challenge')) {
    return payload.room_info.room_state.current_challenge ?? null
  }
  if (hasOwnKey(payload?.room_info, 'current_challenge')) {
    return payload.room_info.current_challenge ?? null
  }
  return undefined
}

function getLiveSessionIdFromPayload(payload: any) {
  if (hasOwnKey(payload?.room_state, 'live_session_id')) {
    return payload.room_state.live_session_id ?? null
  }
  if (hasOwnKey(payload, 'live_session_id')) {
    return payload.live_session_id ?? null
  }
  if (hasOwnKey(payload?.room_info?.room_state, 'live_session_id')) {
    return payload.room_info.room_state.live_session_id ?? null
  }
  if (hasOwnKey(payload?.room_info, 'live_session_id')) {
    return payload.room_info.live_session_id ?? null
  }
  return undefined
}

export function useWhiteboardLive(classId: string | null) {
  const { user, token } = useAppStore()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const shareFallbackTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const shouldReconnectRef = useRef(true)
  const pendingPublishRef = useRef<{
    groupId: string
    resolve: () => void
    reject: (error: Error) => void
    timeout: ReturnType<typeof setTimeout>
  } | null>(null)
  const socketWaitersRef = useRef<Array<{ resolve: () => void; reject: (error: Error) => void }>>([])
  const isConnectingRef = useRef(false)

  const [state, setState] = useState<WhiteboardLiveState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    roomInfoHydrated: false,
    onlineStudents: new Map(),
    classroomStudents: new Map(),
    onlineCount: 0,
    classroomCount: 0,
    activeTaskGroup: null,
    submissions: [],
    submissionCount: 0,
    pendingShares: [],
    currentChallenge: null,
    liveSessionId: null,
    currentClassroomSession: null,
    elapsedSeconds: 0,
    taskHistory: [],
    endedTaskGroups: [],
    danmuConfig: { enabled: false, showStudent: true, showSource: false, speed: 'medium', density: 'medium', area: 'bottom', bgColor: 'rgba(0, 0, 0, 0.75)', presetPhrases: ['太棒了！', '加油！', '答对了！', '真厉害！', '准备好了！'] },
    activeEffects: [],
    activeDanmus: [],
  })

  const getFreshAccessToken = useCallback(async () => {
    return ensureFreshAccessToken(token, (accessToken) => {
      useAppStore.getState().setToken(accessToken)
    })
  }, [token])

  useEffect(() => {
    if (!classId) return
    setState((prev) => ({
      ...prev,
      onlineStudents: new Map(),
      classroomStudents: new Map(),
      onlineCount: 0,
      classroomCount: 0,
      activeTaskGroup: null,
      submissions: [],
      submissionCount: 0,
      pendingShares: [],
      currentChallenge: null,
      liveSessionId: null,
      currentClassroomSession: null,
      elapsedSeconds: 0,
      taskHistory: [],
      endedTaskGroups: [],
      error: null,
      roomInfoHydrated: false,
      danmuConfig: { enabled: false, showStudent: true, showSource: false, speed: 'medium', density: 'medium', area: 'bottom', bgColor: 'rgba(0, 0, 0, 0.75)', presetPhrases: ['太棒了！', '加油！', '答对了！', '真厉害！', '准备好了！'] },
    activeEffects: [],
      activeDanmus: [],
    }))
  }, [classId])

  const loadClassPresence = useCallback(async () => {
    if (!classId) return
    try {
      const presence = await liveTaskService.getClassPresence(classId)
      setState((prev) => ({
        ...prev,
        onlineStudents: mapStudentsToMap(
          (presence.online_students || []).map((student: any) => ({
            ...student,
            joinedAt: student.joinedAt || student.joined_at || new Date().toISOString(),
          })),
        ),
        classroomStudents: mapStudentsToMap(presence.classroom_students || []),
        onlineCount: presence.online_student_count || 0,
        classroomCount: presence.classroom_student_count || 0,
      }))
    } catch (error) {
      console.error('[WhiteboardLive] Failed to load class presence:', error)
    }
  }, [classId])

  const hydrateFromRoomPayload = useCallback((payload: any) => {
    if (!payload) return
    const normalizedPayload = normalizeRoomInfoPayload(
      (payload.room_info ? { ...payload, room_info: payload.room_info } : payload) as Record<string, unknown>,
    )
    const roomInfo: any = normalizedPayload
    const roomState: any = normalizedPayload.room_state || roomInfo.room_state || {}
    const currentTaskGroup = getCurrentTaskGroupFromPayload(payload)
    const currentChallenge = getCurrentChallengeFromPayload(normalizedPayload)
    const liveSessionId = getLiveSessionIdFromPayload(normalizedPayload)
    const taskHistory =
      Array.isArray(roomState.task_history)
        ? roomState.task_history
        : (Array.isArray(roomInfo.task_history) ? roomInfo.task_history : undefined)

    setState((prev) => ({
      ...prev,
      onlineStudents: hasOwnKey(roomInfo, 'online_students')
        ? mapStudentsToMap(
            (roomInfo.online_students || []).map((student: any) => ({
              ...student,
              joinedAt: student.joinedAt || student.joined_at || new Date().toISOString(),
            })),
          )
        : prev.onlineStudents,
      classroomStudents:
        hasOwnKey(roomState, 'classroom_students') || hasOwnKey(roomInfo, 'classroom_students')
          ? mapStudentsToMap(roomState.classroom_students || roomInfo.classroom_students || [])
          : prev.classroomStudents,
      onlineCount: hasOwnKey(roomInfo, 'online_student_count')
        ? Number(roomInfo.online_student_count || 0)
        : (hasOwnKey(roomInfo, 'student_count') ? Number(roomInfo.student_count || 0) : prev.onlineCount),
      classroomCount: hasOwnKey(roomInfo, 'classroom_student_count')
        ? Number(roomInfo.classroom_student_count || 0)
        : (hasOwnKey(roomInfo, 'student_count') ? Number(roomInfo.student_count || 0) : prev.classroomCount),
      pendingShares:
        hasOwnKey(roomState, 'pending_shares') || hasOwnKey(roomInfo, 'pending_shares')
          ? (Array.isArray(roomState.pending_shares)
              ? roomState.pending_shares
              : (Array.isArray(roomInfo.pending_shares) ? roomInfo.pending_shares : []))
          : prev.pendingShares,
      submissionCount:
        currentTaskGroup !== undefined
          ? (currentTaskGroup ? Number(roomInfo.task_group_submission_count || 0) : 0)
          : prev.submissionCount,
      activeTaskGroup: currentTaskGroup !== undefined
        ? ((currentTaskGroup as LiveTaskGroup | null) ?? null)
        : prev.activeTaskGroup,
      currentChallenge: currentChallenge !== undefined
        ? ((currentChallenge as LiveChallengeSession | null) ?? null)
        : prev.currentChallenge,
      liveSessionId: liveSessionId !== undefined ? liveSessionId : prev.liveSessionId,
      taskHistory: taskHistory !== undefined ? taskHistory : prev.taskHistory,
      roomInfoHydrated: true,
      danmuConfig: hasOwnKey(roomInfo, 'danmu_config')
        ? (roomInfo.danmu_config as typeof prev.danmuConfig)
        : prev.danmuConfig,
    }))
  }, [])

  const settlePendingPublish = useCallback((error?: Error) => {
    const pending = pendingPublishRef.current
    if (!pending) return
    clearTimeout(pending.timeout)
    pendingPublishRef.current = null
    if (error) {
      pending.reject(error)
      return
    }
    pending.resolve()
  }, [])

  const settleSocketWaiters = useCallback((error?: Error) => {
    const waiters = socketWaitersRef.current.splice(0, socketWaitersRef.current.length)
    if (!waiters.length) return
    if (error) {
      waiters.forEach((waiter) => waiter.reject(error))
      return
    }
    waiters.forEach((waiter) => waiter.resolve())
  }, [])

  const handleMessage = useCallback((message: WebSocketMessage) => {
    const msg = message as any

    switch (message.type) {
      case 'connected':
        setState((prev) => ({ ...prev, roomInfoHydrated: false }))
        hydrateFromRoomPayload(msg)
        break

      case 'room_info':
        hydrateFromRoomPayload(msg.room_info || msg)
        break

      case 'student_joined':
        setState((prev) => {
          const nextOnline = new Map(prev.onlineStudents)
          nextOnline.set(msg.student_id, {
            id: msg.student_id,
            name: msg.student_name,
            avatar: msg.avatar,
            joinedAt: new Date().toISOString(),
          })
          const nextClassroom = new Map(prev.classroomStudents)
          nextClassroom.set(msg.student_id, {
            id: msg.student_id,
            name: msg.student_name,
          })
          return {
            ...prev,
            onlineStudents: nextOnline,
            classroomStudents: nextClassroom,
            onlineCount: msg.student_count || nextOnline.size,
            classroomCount: msg.student_count || nextClassroom.size,
          }
        })
        break

      case 'student_left':
        setState((prev) => {
          const nextOnline = new Map(prev.onlineStudents)
          nextOnline.delete(msg.student_id)
          const nextClassroom = new Map(prev.classroomStudents)
          nextClassroom.delete(msg.student_id)
          return {
            ...prev,
            onlineStudents: nextOnline,
            classroomStudents: nextClassroom,
            onlineCount: msg.student_count || nextOnline.size,
            classroomCount: msg.student_count || nextClassroom.size,
          }
        })
        break

      case 'new_task_group':
        console.log('[WhiteboardLive] new_task_group received (broadcast):', msg.group_id, 'task_count:', msg.tasks?.length)
        setState((prev) => ({
          ...prev,
          activeTaskGroup: buildActiveTaskGroup(classId, msg),
          currentChallenge: null,
          submissions: [],
          submissionCount: 0,
        }))
        break

      case 'task_group_published':
        console.log('[WhiteboardLive] task_group_published received:', msg.group_id, 'task_count:', msg.task_count)
        if (pendingPublishRef.current?.groupId === msg.group_id) {
          settlePendingPublish()
        }
        // 服务端 task_group_data 使用 group_id 而非 id，需规范化
        const rawTaskGroup = msg.task_group as LiveTaskGroup | undefined
        const normalizedTaskGroup: LiveTaskGroup = rawTaskGroup
          ? {
              ...rawTaskGroup,
              id: rawTaskGroup.id || (rawTaskGroup as any).group_id || msg.group_id,
              class_id: rawTaskGroup.class_id || classId || '',
              status: rawTaskGroup.status || 'active',
            } as LiveTaskGroup
          : buildActiveTaskGroup(classId, msg)
        setState((prev) => ({
          ...prev,
          activeTaskGroup: normalizedTaskGroup,
          currentChallenge: null,
          submissions: [],
          submissionCount: 0,
        }))
        break

      case 'task_group_ended':
      case 'task_group_results':
        console.log('[WhiteboardLive] task_group_ended/results received:', msg.group_id)
        setState((prev) => ({
          ...prev,
          activeTaskGroup: null,
          submissions: [],
          submissionCount: 0,
          endedTaskGroups: [
            ...prev.endedTaskGroups,
            { groupId: msg.group_id, endedAt: new Date().toISOString() },
          ],
        }))
        break

      case 'task_submission':
      case 'new_task_group_submission':
      case 'task_group_submission_received':
        console.log('[WhiteboardLive] new_task_group_submission received:', msg.type, 'total_submissions:', msg.total_submissions, 'group_id:', msg.group_id, 'student_id:', msg.student_id, 'is_duplicate:', msg.is_duplicate)
        setState((prev) => ({
          ...prev,
          submissions: msg.is_duplicate ? prev.submissions : [
            ...prev.submissions,
            {
              taskId: msg.task_id,
              studentId: msg.student_id,
              studentName: msg.student_name,
              answer: msg.answer,
              submittedAt: msg.timestamp || new Date().toISOString(),
            },
          ],
          submissionCount: msg.total_submissions ?? prev.submissionCount,
        }))
        break

      case 'student_share_request':
        if (msg.share_id) {
          setState((prev) => {
            const existingIndex = prev.pendingShares.findIndex((share) => share.share_id === msg.share_id)
            if (existingIndex >= 0) {
              const nextShares = [...prev.pendingShares]
              nextShares[existingIndex] = { ...nextShares[existingIndex], ...msg }
              return { ...prev, pendingShares: nextShares }
            }
            return { ...prev, pendingShares: [...prev.pendingShares, msg] }
          })
        }
        break

      case 'share_request_response':
        if (msg.share_id) {
          const fallbackTimer = shareFallbackTimeoutsRef.current.get(msg.share_id)
          if (fallbackTimer) {
            clearTimeout(fallbackTimer)
            shareFallbackTimeoutsRef.current.delete(msg.share_id)
          }
          setState((prev) => ({
            ...prev,
            pendingShares: prev.pendingShares.filter((share) => share.share_id !== msg.share_id),
          }))
        }
        break

      case 'challenge_started':
        setState((prev) => ({
          ...prev,
          activeTaskGroup: null,
          submissions: [],
          submissionCount: 0,
          currentChallenge: normalizeChallengePayload(msg as Record<string, unknown>),
        }))
        break

      case 'challenge_progress_updated':
      case 'challenge_scoreboard_updated':
        setState((prev) => {
          if (!prev.currentChallenge) return prev
          return {
            ...prev,
            currentChallenge: {
              ...prev.currentChallenge,
              ...normalizeChallengePayload({
                challenge: prev.currentChallenge,
                ...msg,
              } as Record<string, unknown>),
            },
          }
        })
        break

      case 'challenge_ended':
        setState((prev) => ({
          ...prev,
          currentChallenge: normalizeChallengePayload({
            challenge: (msg.challenge as LiveChallengeSession) || prev.currentChallenge,
            ...msg,
          } as Record<string, unknown>),
        }))
        break

      case 'error':
        settlePendingPublish(new Error(String(msg.message || 'WebSocket error')))
        setState((prev) => ({ ...prev, error: msg.message || 'WebSocket error' }))
        break

      case 'submission_error':
        console.warn('[WhiteboardLive] Submission error:', msg.message, 'group_id:', msg.group_id)
        break

      case 'danmu_config':
        setState((prev) => ({
          ...prev,
          danmuConfig: {
            enabled: msg.enabled ?? prev.danmuConfig.enabled,
            showStudent: msg.showStudent ?? prev.danmuConfig.showStudent,
            showSource: msg.showSource ?? prev.danmuConfig.showSource,
            speed: msg.speed ?? prev.danmuConfig.speed,
            density: msg.density ?? prev.danmuConfig.density,
            area: msg.area ?? prev.danmuConfig.area,
            bgColor: (msg as any).bgColor ?? prev.danmuConfig.bgColor,
            presetPhrases: Array.isArray((msg as any).presetPhrases)
              ? (msg as any).presetPhrases
              : prev.danmuConfig.presetPhrases,
          },
        }))
        break

      case 'danmu_display': {
        const newDanmu: ActiveDanmu = {
          id: `danmu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: msg.content as string,
          row: msg.row as number,
          showSource: msg.showSource as boolean,
          sourceName: msg.sourceName as string | undefined,
          speed: ((msg.speed as ActiveDanmu['speed']) || 'medium'),
          bgColor: (msg as any).bgColor as string | undefined,
        }
        setState((prev) => {
          const maxDanmus = 20
          const updatedDanmus = [...prev.activeDanmus, newDanmu]
          if (updatedDanmus.length > maxDanmus) {
            return { ...prev, activeDanmus: updatedDanmus.slice(-maxDanmus) }
          }
          return { ...prev, activeDanmus: updatedDanmus }
        })
        // Auto-remove after animation duration
        const speedDuration = { slow: 14000, medium: 9000, fast: 6000 }
        const duration = speedDuration[newDanmu.speed as keyof typeof speedDuration] || 9000
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            activeDanmus: prev.activeDanmus.filter(d => d.id !== newDanmu.id),
          }))
        }, duration)
        break
      }

      case 'danmu_clear':
        setState((prev) => ({ ...prev, activeDanmus: [] }))
        break

      case 'atmosphere_effect': {
        const msg = message as { type: 'atmosphere_effect'; effect: AtmosphereEffectType; sourceName?: string }
        const newEffect: ActiveAtmosphereEffect = {
          id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          effect: msg.effect,
          sourceName: msg.sourceName,
        }
        setState((prev) => ({
          ...prev,
          activeEffects: [...prev.activeEffects, newEffect],
        }))
        // Auto-remove after 3 seconds
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            activeEffects: prev.activeEffects.filter((e) => e.id !== newEffect.id),
          }))
        }, 3500)
        break
      }

      default:
        break
    }
  }, [classId, hydrateFromRoomPayload, settlePendingPublish])

  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 25000)
  }, [])

  const connect = useCallback(() => {
    if (!classId || !user || isConnectingRef.current) return

    const existingState = wsRef.current?.readyState
    if (existingState === WebSocket.OPEN || existingState === WebSocket.CONNECTING) {
      return
    }
    shouldReconnectRef.current = true
    isConnectingRef.current = true
    setState((prev) => ({ ...prev, isConnecting: true, error: null }))

    void (async () => {
      const accessToken = await getFreshAccessToken()
      if (!accessToken) {
        isConnectingRef.current = false
        settleSocketWaiters(new Error('Missing access token'))
        setState((prev) => ({ ...prev, isConnecting: false, error: 'Missing access token' }))
        return
      }

      const ws = new WebSocket(buildLiveWsUrl(classId, accessToken))
      wsRef.current = ws

      ws.onopen = () => {
        isConnectingRef.current = false
        debugLive('whiteboard:open', { classId, userId: user?.id })
        setState((prev) => ({ ...prev, isConnected: true, isConnecting: false }))
        settleSocketWaiters()
        startHeartbeat()
        loadClassPresence()
        ws.send(JSON.stringify({ type: 'get_room_info' }))
      }

      ws.onclose = () => {
          settlePendingPublish(new Error('WebSocket closed'))
          settleSocketWaiters(new Error('WebSocket closed'))
          isConnectingRef.current = false
          debugLive('whiteboard:close', { classId })
          if (wsRef.current === ws) {
            wsRef.current = null
          }
          setState((prev) => ({ ...prev, isConnected: false, isConnecting: false, roomInfoHydrated: false }))
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 2000)
        }
      }

      ws.onerror = () => {
          settlePendingPublish(new Error('WebSocket connection error'))
          settleSocketWaiters(new Error('WebSocket connection error'))
          isConnectingRef.current = false
          debugLive('whiteboard:error', { classId })
          setState((prev) => ({ ...prev, error: 'WebSocket connection error', isConnecting: false, roomInfoHydrated: false }))
          try {
            ws.close()
          } catch {
            // ignore
          }
        }

      ws.onmessage = (event) => {
        try {
          const parsed: WebSocketMessage = JSON.parse(event.data)
          if (parsed.type === 'pong') return
          debugLive('whiteboard:message', parsed.type, parsed)
          handleMessage(parsed)
        } catch (error) {
          console.error('[WhiteboardLive] Failed to parse message:', error)
        }
      }
    })()
  }, [classId, getFreshAccessToken, handleMessage, loadClassPresence, settlePendingPublish, settleSocketWaiters, startHeartbeat, user])

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    settlePendingPublish(new Error('WebSocket disconnected'))
    settleSocketWaiters(new Error('WebSocket disconnected'))
    shareFallbackTimeoutsRef.current.forEach((timer) => clearTimeout(timer))
      shareFallbackTimeoutsRef.current.clear()
      setState((prev) => ({ ...prev, roomInfoHydrated: false }))
      wsRef.current?.close()
      wsRef.current = null
    }, [settlePendingPublish, settleSocketWaiters])

  const ensureSocketOpen = useCallback(async (timeoutMs = 4000) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return true
    }

    return await new Promise<boolean>((resolve) => {
      const activeSocket = wsRef.current
      const readyState = activeSocket?.readyState
      if (readyState === WebSocket.CLOSING || readyState === WebSocket.CLOSED) {
        wsRef.current = null
      }

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.CONNECTING) {
        connect()
      }

      const timeout = setTimeout(() => {
        socketWaitersRef.current = socketWaitersRef.current.filter((waiter) => waiter.resolve !== onResolve)
        resolve(false)
      }, timeoutMs)

      const onResolve = () => {
        clearTimeout(timeout)
        resolve(true)
      }

      const onReject = () => {
        clearTimeout(timeout)
        resolve(false)
      }

      socketWaitersRef.current.push({ resolve: onResolve, reject: onReject })
    })
  }, [connect])

  const sendMessage = useCallback(
    async (
      payload: Record<string, unknown>,
      options?: { ensureOpen?: boolean; timeoutMs?: number }
    ) => {
      if (options?.ensureOpen) {
        const connected = await ensureSocketOpen(options.timeoutMs ?? 4000)
        if (!connected) {
          return false
        }
      }

      const socket = wsRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false
      }

      try {
        socket.send(JSON.stringify(payload))
        return true
      } catch (error) {
        console.warn('[WhiteboardLive] Failed to send message:', payload.type, error)
        return false
      }
    },
    [ensureSocketOpen],
  )

  const publishTaskGroup = useCallback(async (taskGroup: LiveTaskGroup) => {
    const connected = await ensureSocketOpen()
    if (!connected || wsRef.current?.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    if (pendingPublishRef.current) {
      settlePendingPublish(new Error('Publish request superseded'))
    }

    const totalCountdown = Array.isArray(taskGroup.tasks) && taskGroup.tasks.length > 0
      ? taskGroup.tasks.reduce((sum: number, task: any) => sum + (task.countdown_seconds || 30), 0) + 30
      : undefined

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (pendingPublishRef.current?.groupId === taskGroup.id) {
          pendingPublishRef.current = null
          reject(new Error('Publish task group timed out'))
        }
      }, 5000)

      pendingPublishRef.current = {
        groupId: taskGroup.id,
        resolve,
        reject,
        timeout,
      }

      wsRef.current?.send(JSON.stringify({
        type: 'publish_task_group',
        group_id: taskGroup.id,
        total_countdown: totalCountdown,
      }))
    })
  }, [ensureSocketOpen, settlePendingPublish])

  const endTaskGroup = useCallback((groupId: string) => {
    // Optimistically clear active task group
    setState((prev) => {
      if (prev.activeTaskGroup && (prev.activeTaskGroup as any).source_group_id === groupId || prev.activeTaskGroup?.id === groupId) {
        return { ...prev, activeTaskGroup: null }
      }
      return prev
    })
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'end_task_group',
        group_id: groupId,
      }))
    }
  }, [])

  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_session' }))
    }
  }, [])

  const handleShare = useCallback((shareId: string, action: 'approve' | 'reject', comment?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    setState((prev) => ({
      ...prev,
      pendingShares: prev.pendingShares.map((share) =>
        share.share_id === shareId
          ? { ...share, status: action === 'approve' ? 'approving' : 'rejecting', teacher_comment: comment }
          : share,
      ),
    }))

    wsRef.current.send(JSON.stringify({
      type: action === 'approve' ? 'approve_share' : 'reject_share',
      share_id: shareId,
      ...(action === 'approve' && comment ? { teacher_comment: comment } : {}),
    }))

    const fallbackTimer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        pendingShares: prev.pendingShares.map((share) =>
          share.share_id === shareId && (share.status === 'approving' || share.status === 'rejecting')
            ? { ...share, status: 'pending' }
            : share,
        ),
      }))
      shareFallbackTimeoutsRef.current.delete(shareId)
    }, 3000)

    shareFallbackTimeoutsRef.current.set(shareId, fallbackTimer)
  }, [])

  const startChallenge = useCallback((challengeId: string) => {
    console.log('[WhiteboardLive] startChallenge called:', challengeId, 'WebSocket state:', wsRef.current?.readyState)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start_challenge', challenge_id: challengeId }))
      console.log('[WhiteboardLive] start_challenge message sent')
    } else {
      console.error('[WhiteboardLive] WebSocket not open, cannot start challenge. State:', wsRef.current?.readyState)
      throw new Error('WebSocket鏈繛鎺ワ紝鏃犳硶鍚姩鎸戞垬')
    }
  }, [])

  const endChallenge = useCallback((challengeId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_challenge', challenge_id: challengeId }))
    }
  }, [])

  const clearChallenge = useCallback(() => {
    setState((prev) => {
      if (!prev.currentChallenge) return prev
      return isChallengeFinished(prev.currentChallenge)
        ? { ...prev, currentChallenge: null }
        : prev
    })
  }, [])

  const clearShares = useCallback(() => {
    shareFallbackTimeoutsRef.current.forEach((timer) => clearTimeout(timer))
    shareFallbackTimeoutsRef.current.clear()
    setState((prev) => ({ ...prev, pendingShares: [] }))
  }, [])

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  useEffect(() => {
    if (!classId) return
    const interval = setInterval(loadClassPresence, 5000)
    return () => clearInterval(interval)
  }, [classId, loadClassPresence])

  useEffect(() => {
    if (!classId) {
      setState((prev) => ({
        ...prev,
        liveSessionId: null,
        currentClassroomSession: null,
        elapsedSeconds: 0,
      }))
      return
    }

    let cancelled = false

    const loadActiveSession = async () => {
      try {
        const response = await api.get(`/live/sessions/active?class_id=${classId}`)
        const session = (response.data || null) as ClassroomSessionSummary | null
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          liveSessionId: session?.id ?? prev.liveSessionId ?? null,
          currentClassroomSession: session,
          elapsedSeconds: session ? prev.elapsedSeconds : 0,
        }))
      } catch (error) {
        console.error('[WhiteboardLive] Failed to fetch active classroom session:', error)
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          currentClassroomSession: null,
          elapsedSeconds: prev.liveSessionId ? prev.elapsedSeconds : 0,
        }))
      }
    }

    void loadActiveSession()

    return () => {
      cancelled = true
    }
  }, [classId, state.liveSessionId])

  useEffect(() => {
    if (!state.currentClassroomSession || state.currentClassroomSession.status !== 'active') {
      setState((prev) => (prev.elapsedSeconds === 0 ? prev : { ...prev, elapsedSeconds: 0 }))
      return
    }

    const startedAt = new Date(state.currentClassroomSession.started_at).getTime()
    const updateElapsed = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      setState((prev) => (prev.elapsedSeconds === elapsed ? prev : { ...prev, elapsedSeconds: elapsed }))
    }

    updateElapsed()
    const timer = setInterval(updateElapsed, 1000)
    return () => clearInterval(timer)
  }, [state.currentClassroomSession])

  // 寮瑰箷鎺у埗
  const sendDanmuConfig = (config: Partial<DanmuConfig> & { enabled: boolean }) => {
    void sendMessage({ type: 'danmu_config', ...config })
  }
  const getRoomInfo = () => sendMessage({ type: 'get_room_info' }, { ensureOpen: true })
  const triggerDanmu = (content: string) => {
    void sendMessage({ type: 'danmu_trigger', content })
  }
  const clearDanmu = () => {
    void sendMessage({ type: 'danmu_clear' })
  }

  const sendAtmosphereEffect = (effect: AtmosphereEffectType) => {
    void sendMessage({ type: 'atmosphere_effect', effect })
  }

  const startClassroomSession = useCallback(async (title?: string) => {
    if (!classId) return null
    const response = await api.post('/live/sessions/start', {
      class_id: classId,
      title,
      entry_mode: 'whiteboard',
    })
    const session = (response.data || null) as ClassroomSessionSummary | null
    setState((prev) => ({
      ...prev,
      liveSessionId: session?.id ?? prev.liveSessionId,
      currentClassroomSession: session,
      elapsedSeconds: 0,
    }))
    void getRoomInfo()
    return session
  }, [classId])

  const endClassroomSession = useCallback(async () => {
    const sessionId = state.currentClassroomSession?.id || state.liveSessionId
    if (!sessionId) return
    await api.post(`/live/sessions/${sessionId}/end`, {})
    setState((prev) => ({
      ...prev,
      liveSessionId: null,
      currentClassroomSession: null,
      elapsedSeconds: 0,
    }))
    void getRoomInfo()
  }, [state.currentClassroomSession?.id, state.liveSessionId])

  return {
    ...state,
    connect,
    disconnect,
    publishTaskGroup,
    endTaskGroup,
    handleShare,
    clearShares,
    refreshPresence: loadClassPresence,
    getRoomInfo,
    startChallenge,
    endChallenge,
    clearChallenge,
    endSession,
    sendDanmuConfig,
    triggerDanmu,
    clearDanmu,
    sendAtmosphereEffect,
    startClassroomSession,
    endClassroomSession,
    ensureSocketOpen,
  }
}
