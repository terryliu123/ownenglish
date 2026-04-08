import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { debugLive } from '../features/live-runtime/debug'
import {
  normalizeChallengePayload,
  normalizeRoomInfoPayload,
} from '../features/live-runtime/challengeRuntime'

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface TaskQuestion {
  text: string
  options?: { key: string; text: string }[]
  blanks?: { position: number; answer: string }[]
  pairs?: { left: string; right: string }[]
  image_url?: string
  image_caption?: string
  image_name?: string
  correct_answer?: unknown
  [key: string]: unknown
}

export interface LiveTask {
  task_id: string
  type: string
  question: TaskQuestion
  countdown_seconds: number
  order?: number
  correct_answer?: unknown
  has_submitted?: boolean
}

export interface LiveTaskGroupSession {
  group_id: string
  title: string
  tasks: LiveTask[]
  total_countdown: number
  status?: string
  has_submitted?: boolean
  session_id?: string | null
  live_session_id?: string | null
}

export interface LiveTaskGroup {
  id: string
  class_id: string
  title: string
  status: 'draft' | 'ready' | 'archived'
  tasks: LiveTask[]
  task_count?: number
  created_at: string
  updated_at?: string
}

export interface LiveChallengeParticipant {
  student_id: string
  student_name: string
}

export interface LiveChallengeScoreEntry {
  student_id: string
  student_name: string
  answered_count: number
  correct_count: number
  total_tasks: number
  current_index: number
  total_time_ms: number | null
  started_at?: string | null
  submitted: boolean
  locked?: boolean
  eliminated_for_round?: boolean
  first_correct_at?: string | null
  current_task_id?: string | null
  draft_answers?: { task_id: string; answer: unknown }[]
  rank: number | null
}

export interface LiveChallengeSession {
  id: string
  class_id: string
  task_group_id: string
  mode: 'single_question_duel' | 'duel' | 'class_challenge'
  title: string
  participant_ids: string[]
  participants: LiveChallengeParticipant[]
  scoreboard: LiveChallengeScoreEntry[]
  status?: string
  started_at?: string | null
  ended_at?: string | null
  tasks: LiveTask[]
  total_countdown: number
  current_round?: number
  current_task_id?: string | null
  round_status?: string
  winner_student_id?: string | null
  lead_student_id?: string | null
  is_participant?: boolean
}

export interface TaskHistoryItem {
  type: 'task_group'
  session_id?: string | null
  group_id: string
  title: string
  task_count: number
  tasks?: LiveTask[]
  published_at: string | null
  status: 'active' | 'ended' | 'ready'
  submissions: number
  ended_at?: string | null
}

export interface RoomState {
  class_id: string
  teacher_id: string
  student_count: number
  student_ids: string[]
  current_task: LiveTask | null
  current_task_group: LiveTaskGroupSession | null
  current_challenge?: LiveChallengeSession | null
  task_history: TaskHistoryItem[]
  created_at: string
}

export interface RoomInfo {
  class_id: string
  teacher_id: string
  student_count: number
  student_ids: string[]
  has_active_task: boolean
  has_active_task_group?: boolean
  has_active_challenge?: boolean
  current_task_group_id?: string | null
  current_challenge_id?: string | null
  task_group_submission_count?: number
  room_state?: RoomState
  is_reconnect?: boolean
  session_id?: string
  live_session_id?: string | null
  danmu_config?: { enabled: boolean; showStudent: boolean; showSource: boolean; speed: string; density: string; area: string }
}

export interface TaskResult {
  task_id: string
  correct_answer: unknown
  student_answer?: unknown
  is_correct?: boolean
}

export interface ClassroomShare {
  share_id: string
  content_type: 'text' | 'image'
  content: string | null
  image_url: string | null
  shared_by: string
  teacher_comment?: string
}

export interface ShareRequest {
  share_id: string
  student_id: string
  student_name: string
  content_type: 'text' | 'image'
  content: string | null
  image_url: string | null
}

interface UseLiveWebSocketOptions {
  classId: string
  token: string
  role: 'teacher' | 'student'
  onError?: (message: string) => void
  onNewTask?: (task: LiveTask) => void
  onTaskEnded?: (data: { task_id: string; correct_answer: unknown; total_submissions: number }) => void
  onSubmissionReceived?: (data: { task_id: string }) => void
  onNewTaskGroup?: (data: LiveTaskGroupSession) => void
  onTaskGroupSubmissionReceived?: (data: { group_id: string }) => void
  onNewTaskGroupSubmission?: (data: { group_id: string; student_id: string; total_submissions: number }) => void
  onTaskGroupEnded?: (data: { group_id: string; results: TaskResult[] }) => void
  onChallengeStarted?: (challenge: LiveChallengeSession, isParticipant?: boolean) => void
  onChallengeProgressUpdated?: (data: {
    challenge_id: string
    scoreboard: LiveChallengeScoreEntry[]
    status?: string
    participant_ids?: string[]
    current_round?: number
    current_task_id?: string | null
    round_status?: string
    winner_student_id?: string | null
    lead_student_id?: string | null
  }) => void
  onChallengeScoreboardUpdated?: (data: {
    challenge_id: string
    scoreboard: LiveChallengeScoreEntry[]
    status?: string
    participant_ids?: string[]
    current_round?: number
    current_task_id?: string | null
    round_status?: string
    winner_student_id?: string | null
    lead_student_id?: string | null
  }) => void
  onChallengeEnded?: (challenge: LiveChallengeSession) => void
  onStudentJoined?: (data: { student_id: string; student_count: number }) => void
  onStudentLeft?: (data: { student_id: string; student_count: number }) => void
  onNewSubmission?: (data: { task_id: string; student_id: string; total_submissions: number }) => void
  onTaskResults?: (data: { task_id: string; correct_answer: unknown; total_submissions: number }) => void
  onRoomClosed?: () => void
  onSessionNotStarted?: () => void
  onRoomInfo?: (info: RoomInfo) => void
  onTaskPublished?: (data: { task_id: string; task: LiveTask }) => void
  onShareRequest?: (data: ShareRequest) => void
  onShareRequestSent?: (data: { share_id: string; status: string }) => void
  onShareRequestResponse?: (data: { share_id: string; status: 'approved' | 'rejected' }) => void
  onClassroomShare?: (data: ClassroomShare) => void
  onDanmuDisplay?: (data: { content: string; row: number; showSource: boolean; sourceName?: string; speed: string; density: string; area?: string }) => void
  onDanmuConfig?: (data: { enabled: boolean; showStudent: boolean; showSource: boolean; speed: string; density: string; area?: string }) => void
  onDanmuClear?: () => void
  onAtmosphereEffect?: (data: { effect: string; sourceName?: string }) => void
}

export function useLiveWebSocket({
  classId,
  token,
  role,
  onError,
  onNewTask,
  onTaskEnded,
  onSubmissionReceived,
  onNewTaskGroup,
  onTaskGroupSubmissionReceived,
  onNewTaskGroupSubmission,
  onTaskGroupEnded,
  onChallengeStarted,
  onChallengeProgressUpdated,
  onChallengeScoreboardUpdated,
  onChallengeEnded,
  onStudentJoined,
  onStudentLeft,
  onNewSubmission,
  onTaskResults,
  onRoomClosed,
  onSessionNotStarted,
  onRoomInfo,
  onTaskPublished,
  onShareRequest,
  onShareRequestSent,
  onShareRequestResponse,
  onClassroomShare,
  onDanmuDisplay,
  onDanmuConfig,
  onDanmuClear,
  onAtmosphereEffect,
}: UseLiveWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttempts = useRef(0)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingMessagesRef = useRef<string[]>([])
  const MAX_PENDING_MESSAGES = 100

  const callbacksRef = useRef({
    onError,
    onNewTask,
    onTaskEnded,
    onSubmissionReceived,
    onNewTaskGroup,
    onTaskGroupSubmissionReceived,
    onNewTaskGroupSubmission,
    onTaskGroupEnded,
    onChallengeStarted,
    onChallengeProgressUpdated,
    onChallengeScoreboardUpdated,
    onChallengeEnded,
    onStudentJoined,
    onStudentLeft,
    onNewSubmission,
    onTaskResults,
    onRoomClosed,
    onSessionNotStarted,
    onRoomInfo,
    onTaskPublished,
    onShareRequest,
    onShareRequestSent,
    onShareRequestResponse,
    onClassroomShare,
    onDanmuDisplay,
    onDanmuConfig,
    onDanmuClear,
    onAtmosphereEffect,
  })

  useEffect(() => {
    callbacksRef.current = {
      onError,
      onNewTask,
      onTaskEnded,
      onSubmissionReceived,
      onNewTaskGroup,
      onTaskGroupSubmissionReceived,
      onNewTaskGroupSubmission,
      onTaskGroupEnded,
      onChallengeStarted,
      onChallengeProgressUpdated,
      onChallengeScoreboardUpdated,
      onChallengeEnded,
      onStudentJoined,
      onStudentLeft,
      onNewSubmission,
      onTaskResults,
      onRoomClosed,
      onSessionNotStarted,
      onRoomInfo,
      onTaskPublished,
      onShareRequest,
      onShareRequestSent,
      onShareRequestResponse,
      onClassroomShare,
      onDanmuDisplay,
      onDanmuConfig,
      onDanmuClear,
      onAtmosphereEffect,
    }
  }, [
    onError,
    onNewTask,
    onTaskEnded,
    onSubmissionReceived,
    onNewTaskGroup,
    onTaskGroupSubmissionReceived,
    onNewTaskGroupSubmission,
    onTaskGroupEnded,
    onChallengeStarted,
    onChallengeProgressUpdated,
    onChallengeScoreboardUpdated,
    onChallengeEnded,
    onStudentJoined,
    onStudentLeft,
    onNewSubmission,
    onTaskResults,
    onRoomClosed,
    onSessionNotStarted,
    onRoomInfo,
    onTaskPublished,
    onShareRequest,
    onShareRequestSent,
    onShareRequestResponse,
    onClassroomShare,
    onDanmuDisplay,
    onDanmuConfig,
    onDanmuClear,
    onAtmosphereEffect,
  ])

  const handleMessage = useCallback((data: { type: string; [key: string]: unknown }) => {
    const cbs = callbacksRef.current
    console.log('[WebSocket] Received message:', data.type, data)
    debugLive('ws:message', data.type, data)

    switch (data.type) {
      case 'connected': {
        const roomInfoData = data.room_info as Record<string, unknown> | undefined
        const normalizedRoomInfo = normalizeRoomInfoPayload({
          ...roomInfoData,
          room_state: data.room_state as RoomState | undefined,
        })
        const liveSessionId = (roomInfoData?.live_session_id ?? roomInfoData?.session_id) as string | null | undefined
        cbs.onRoomInfo?.({
          ...normalizedRoomInfo,
          is_reconnect: data.is_reconnect as boolean | undefined,
          live_session_id: liveSessionId,
          session_id: liveSessionId ?? undefined,
        })
        setRoomInfo({
          ...normalizedRoomInfo,
          is_reconnect: data.is_reconnect as boolean | undefined,
          live_session_id: liveSessionId,
          session_id: liveSessionId ?? undefined,
        })
        break
      }
      case 'new_task':
      case 'current_task':
        cbs.onNewTask?.(data.task as LiveTask)
        break
      case 'task_ended':
        cbs.onTaskEnded?.({
          task_id: data.task_id as string,
          correct_answer: data.correct_answer,
          total_submissions: data.total_submissions as number,
        })
        break
      case 'submission_received':
        cbs.onSubmissionReceived?.({ task_id: data.task_id as string })
        break
      case 'task_group_submission_received':
        cbs.onTaskGroupSubmissionReceived?.({ group_id: data.group_id as string })
        break
      case 'student_joined':
        cbs.onStudentJoined?.({ student_id: data.student_id as string, student_count: data.student_count as number })
        break
      case 'student_left':
        cbs.onStudentLeft?.({ student_id: data.student_id as string, student_count: data.student_count as number })
        break
      case 'new_submission':
        cbs.onNewSubmission?.({
          task_id: data.task_id as string,
          student_id: data.student_id as string,
          total_submissions: data.total_submissions as number,
        })
        break
      case 'task_results':
        cbs.onTaskResults?.({
          task_id: data.task_id as string,
          correct_answer: data.correct_answer,
          total_submissions: data.total_submissions as number,
        })
        break
      case 'room_closed':
        cbs.onRoomClosed?.()
        break
      case 'room_info': {
        const normalizedRoomInfo = normalizeRoomInfoPayload(data as Record<string, unknown>)
        cbs.onRoomInfo?.(normalizedRoomInfo)
        setRoomInfo(normalizedRoomInfo)
        break
      }
      case 'task_published': {
        const publishedTask = data.task as LiveTask | undefined
        cbs.onTaskPublished?.({
          task_id: publishedTask?.task_id || '',
          task: publishedTask as LiveTask,
        })
        break
      }
      case 'new_task_group':
        cbs.onNewTaskGroup?.({
          group_id: data.group_id as string,
          title: data.title as string,
          tasks: data.tasks as LiveTask[],
          total_countdown: data.total_countdown as number,
          has_submitted: data.has_submitted as boolean | undefined,
          session_id: (data.session_id as string | null | undefined) ?? null,
          live_session_id: (data.live_session_id as string | null | undefined) ?? null,
        })
        break
      case 'new_task_group_submission':
        cbs.onNewTaskGroupSubmission?.({
          group_id: data.group_id as string,
          student_id: data.student_id as string,
          total_submissions: data.total_submissions as number,
        })
        break
      case 'task_group_ended':
        cbs.onTaskGroupEnded?.({
          group_id: data.group_id as string,
          results: data.results as TaskResult[],
        })
        break
      case 'challenge_started':
        cbs.onChallengeStarted?.(
          normalizeChallengePayload(data as Record<string, unknown>),
          (data.is_participant as boolean | undefined)
            ?? ((data.challenge as (LiveChallengeSession & { is_participant?: boolean }) | undefined)?.is_participant),
        )
        break
      case 'challenge_progress_updated':
      case 'challenge_scoreboard_updated': {
        const normalizedChallenge = normalizeChallengePayload(data as Record<string, unknown>)
        const payload = {
          challenge_id: (data.challenge_id as string) || normalizedChallenge.id,
          scoreboard: normalizedChallenge.scoreboard,
          status: normalizedChallenge.status,
          participant_ids: normalizedChallenge.participant_ids,
          current_round: normalizedChallenge.current_round,
          current_task_id: normalizedChallenge.current_task_id,
          round_status: normalizedChallenge.round_status,
          winner_student_id: normalizedChallenge.winner_student_id,
          lead_student_id: normalizedChallenge.lead_student_id,
        }
        if (data.type === 'challenge_progress_updated') {
          cbs.onChallengeProgressUpdated?.(payload)
        } else {
          cbs.onChallengeScoreboardUpdated?.(payload)
        }
        break
      }
      case 'challenge_ended':
        cbs.onChallengeEnded?.(normalizeChallengePayload(data as Record<string, unknown>))
        break
      case 'error':
        console.error('[WebSocket] Error:', data.message)
        debugLive('ws:error', data.message)
        cbs.onError?.(String(data.message ?? ''))
        break
      case 'student_share_request':
        cbs.onShareRequest?.(data as unknown as ShareRequest)
        break
      case 'share_request_sent':
        cbs.onShareRequestSent?.({ share_id: data.share_id as string, status: data.status as string })
        break
      case 'share_request_response':
        cbs.onShareRequestResponse?.({
          share_id: data.share_id as string,
          status: data.status as 'approved' | 'rejected',
        })
        break
      case 'classroom_share':
        cbs.onClassroomShare?.(data as unknown as ClassroomShare)
        break
      case 'danmu_display':
        cbs.onDanmuDisplay?.({
          content: data.content as string,
          row: data.row as number,
          showSource: data.showSource as boolean,
          sourceName: data.sourceName as string | undefined,
          speed: data.speed as string,
          density: data.density as string,
          area: data.area as string | undefined,
        })
        break
      case 'danmu_config':
        cbs.onDanmuConfig?.({
          enabled: data.enabled as boolean,
          showStudent: data.showStudent as boolean,
          showSource: data.showSource as boolean,
          speed: data.speed as string,
          density: data.density as string,
          area: data.area as string | undefined,
        })
        break
      case 'danmu_clear':
        cbs.onDanmuClear?.()
        break
      case 'atmosphere_effect':
        cbs.onAtmosphereEffect?.({
          effect: data.effect as string,
          sourceName: data.sourceName as string | undefined,
        })
        break
      default:
        break
    }
  }, [])

  const connect = useCallback(() => {
    if (
      !classId ||
      !token ||
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    setStatus('connecting')

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // Use Vite dev server proxy in development (port 5173)
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/api/v1/live/ws?token=${encodeURIComponent(token)}&class_id=${encodeURIComponent(classId)}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocket] Connection opened')
      debugLive('ws:open', { classId, role })
      setStatus('connected')
      reconnectAttempts.current = 0
      // Start keep-alive ping every 25s
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          send({ type: 'ping' })
        }
      }, 25000)
      if (pendingMessagesRef.current.length > 0) {
        const queued = [...pendingMessagesRef.current]
        pendingMessagesRef.current = []
        queued.forEach((payload) => {
          try {
            ws.send(payload)
          } catch (error) {
            console.error('[WebSocket] Failed to flush queued message:', error)
          }
        })
      }
    }

    ws.onclose = (event) => {
      console.log('[WebSocket] Connection closed:', event.code, event.reason)
      debugLive('ws:close', { code: event.code, reason: event.reason, classId, role })
      setStatus('disconnected')
      wsRef.current = null
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }

      // 4003 = session not started — don't reconnect, notify student
      if (event.code === 4003) {
        callbacksRef.current.onSessionNotStarted?.()
        return
      }

      if (event.code !== 1000 && reconnectAttempts.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000)
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current += 1
          connect()
        }, delay)
      }

      if (event.code === 1000 && event.reason === 'room_closed') {
        callbacksRef.current.onRoomClosed?.()
      }
    }

    ws.onerror = () => {
      debugLive('ws:onerror', { classId, role })
      setStatus('error')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleMessage(data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
  }, [classId, token, handleMessage])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }
    setStatus('disconnected')
  }, [])

  const send = useCallback((data: Record<string, unknown>) => {
    const payload = JSON.stringify(data)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      debugLive('ws:send', data)
      wsRef.current.send(payload)
      return
    }

    if (data.type === 'challenge_progress' && typeof data.challenge_id === 'string') {
      pendingMessagesRef.current = pendingMessagesRef.current.filter((queuedPayload) => {
        try {
          const queued = JSON.parse(queuedPayload) as Record<string, unknown>
          return !(
            queued.type === 'challenge_progress'
            && queued.challenge_id === data.challenge_id
          )
        } catch {
          return true
        }
      })
    }

    if (pendingMessagesRef.current.length >= MAX_PENDING_MESSAGES) {
      // Drop the oldest non-critical message to stay within limit
      const dropIdx = pendingMessagesRef.current.findIndex(p => {
        try { return JSON.parse(p).type !== 'submit_task_group' && JSON.parse(p).type !== 'submit_answer' } catch { return true }
      })
      if (dropIdx >= 0) {
        pendingMessagesRef.current.splice(dropIdx, 1)
        console.warn('[WebSocket] Pending queue full, dropped oldest non-critical message')
      } else {
        pendingMessagesRef.current.shift()
        console.warn('[WebSocket] Pending queue full (all critical), dropped oldest message')
      }
    }
    pendingMessagesRef.current.push(payload)
    debugLive('ws:queue', data)

    if (
      !wsRef.current
      || wsRef.current.readyState === WebSocket.CLOSED
      || wsRef.current.readyState === WebSocket.CLOSING
    ) {
      connect()
    }
  }, [connect])

  const publishTask = useCallback((taskId: string) => {
    send({ type: 'publish_task', task_id: taskId })
  }, [send])

  const endTask = useCallback((taskId: string, correctAnswer?: unknown) => {
    send({ type: 'end_task', task_id: taskId, correct_answer: correctAnswer })
  }, [send])

  const publishTaskGroup = useCallback((groupId: string, totalCountdown: number) => {
    send({
      type: 'publish_task_group',
      group_id: groupId,
      total_countdown: totalCountdown,
    })
  }, [send])

  const endTaskGroup = useCallback((groupId: string) => {
    send({ type: 'end_task_group', group_id: groupId })
  }, [send])

  const startChallenge = useCallback((challengeId: string) => {
    send({ type: 'start_challenge', challenge_id: challengeId })
  }, [send])

  const endChallenge = useCallback((challengeId: string) => {
    send({ type: 'end_challenge', challenge_id: challengeId })
  }, [send])

  const endSession = useCallback(() => {
    send({ type: 'end_session' })
    disconnect()
  }, [send, disconnect])

  const getRoomInfo = useCallback(() => {
    send({ type: 'get_room_info' })
  }, [send])

  const submitAnswer = useCallback((answer: unknown, startTime?: string) => {
    send({ type: 'submit_answer', answer, start_time: startTime })
  }, [send])

  const getCurrentTask = useCallback(() => {
    send({ type: 'get_current_task' })
  }, [send])

  const submitTaskGroup = useCallback((groupId: string, answers: { task_id: string; answer: unknown }[], sessionId?: string | null) => {
    send({
      type: 'submit_task_group',
      group_id: groupId,
      answers,
      session_id: sessionId ?? undefined,
    })
  }, [send])

  const updateChallengeProgress = useCallback((
    challengeId: string,
    currentIndex: number,
    answeredCount: number,
    startedAt?: string | null,
    answers?: { task_id: string; answer: unknown }[],
    submitted = false,
  ) => {
    send({
      type: 'challenge_progress',
      challenge_id: challengeId,
      current_index: currentIndex,
      answered_count: answeredCount,
      started_at: startedAt ?? undefined,
      answers: answers ?? undefined,
      submitted,
    })
  }, [send])

  const submitChallenge = useCallback((
    challengeId: string,
    answers: { task_id: string; answer: unknown }[],
    startedAt?: string | null,
  ) => {
    send({
      type: 'submit_challenge',
      challenge_id: challengeId,
      answers,
      started_at: startedAt ?? undefined,
    })
  }, [send])

  const ping = useCallback(() => {
    send({ type: 'ping' })
  }, [send])

  const sendShareRequest = useCallback((contentType: 'text' | 'image', content: string, imageUrl?: string) => {
    send({
      type: 'student_share_request',
      content_type: contentType,
      content,
      image_url: imageUrl,
    })
  }, [send])

  const approveShare = useCallback((shareId: string, teacherComment?: string) => {
    send({
      type: 'approve_share',
      share_id: shareId,
      teacher_comment: teacherComment,
    })
  }, [send])

  const rejectShare = useCallback((shareId: string) => {
    send({
      type: 'reject_share',
      share_id: shareId,
    })
  }, [send])

  // Danmu methods
  const sendDanmu = useCallback((content: string) => {
    send({
      type: 'danmu_send',
      content,
    })
  }, [send])

  const sendDanmuConfig = useCallback((config: {
    enabled: boolean
    showStudent: boolean
    showSource: boolean
    speed: string
    density: string
    area?: string
  }) => {
    send({
      type: 'danmu_config',
      ...config,
    })
  }, [send])

  const triggerDanmu = useCallback((content: string) => {
    send({
      type: 'danmu_trigger',
      content,
    })
  }, [send])

  const clearDanmu = useCallback(() => {
    send({ type: 'danmu_clear' })
  }, [send])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return useMemo(() => ({
    status,
    role,
    roomInfo,
    connect,
    disconnect,
    publishTask,
    endTask,
    publishTaskGroup,
    endTaskGroup,
    startChallenge,
    endChallenge,
    endSession,
    getRoomInfo,
    submitAnswer,
    getCurrentTask,
    submitTaskGroup,
    updateChallengeProgress,
    submitChallenge,
    ping,
    sendShareRequest,
    approveShare,
    rejectShare,
    sendDanmu,
    sendDanmuConfig,
    triggerDanmu,
    clearDanmu,
  }), [
    status,
    role,
    roomInfo,
    connect,
    disconnect,
    publishTask,
    endTask,
    publishTaskGroup,
    endTaskGroup,
    startChallenge,
    endChallenge,
    endSession,
    getRoomInfo,
    submitAnswer,
    getCurrentTask,
    submitTaskGroup,
    updateChallengeProgress,
    submitChallenge,
    ping,
    sendShareRequest,
    approveShare,
    rejectShare,
    sendDanmu,
    sendDanmuConfig,
    triggerDanmu,
    clearDanmu,
  ])
}
