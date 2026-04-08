import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../../stores/app-store'
import {
  useLiveWebSocket,
  type LiveChallengeSession,
  type LiveTask,
  type RoomInfo,
  type RoomState,
  type LiveTaskGroupSession,
  type TaskHistoryItem,
} from '../../../services/websocket'
import { classService, authService } from '../../../services/api'
import type { ClassPresenceInfo } from '../types'
import { debugLive } from '../../live-runtime/debug'
import {
  normalizeChallengePayload,
  normalizeRoomInfoPayload,
} from '../../live-runtime/challengeRuntime'

export function useTeacherLive() {
  const { user, token } = useAppStore()
  const navigate = useNavigate()

  const [currentClassId, setCurrentClassId] = useState<string | null>(null)
  const currentClassIdRef = useRef<string | null>(null)

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
  const [classPresence, setClassPresence] = useState<ClassPresenceInfo | null>(null)

  const [currentTaskGroup, setCurrentTaskGroup] = useState<LiveTaskGroupSession | null>(null)
  const [taskGroupSubmissions, setTaskGroupSubmissions] = useState<number>(0)
  const [taskGroupEnded, setTaskGroupEnded] = useState(false)

  const [currentChallenge, setCurrentChallenge] = useState<LiveChallengeSession | null>(null)

  const [currentTask, setCurrentTask] = useState<LiveTask | null>(null)
  const [submissions, setSubmissions] = useState<Map<string, number>>(new Map())
  const [showResults, setShowResults] = useState(false)

  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([])

  const [pendingShareRequests, setPendingShareRequests] = useState<any[]>([])
  const [, setBroadcastShares] = useState<any[]>([])

  const [isWsReady, setIsWsReady] = useState(false)
  const isConnectingRef = useRef(false)

  // Sync ref with state for use in callbacks
  useEffect(() => {
    currentClassIdRef.current = currentClassId
  }, [currentClassId])

  // Load classes
  useEffect(() => {
    async function fetchClass() {
      if (!user) {
        const storedToken = localStorage.getItem('token')
        if (!storedToken) {
          setLoading(false)
          setError('请先登录')
          navigate('/login')
          return
        }
        try {
          const userInfo = await authService.getMe()
          useAppStore.getState().setUser(userInfo)
          return
        } catch (e) {
          console.error('Failed to load user:', e)
          localStorage.removeItem('token')
          setLoading(false)
          navigate('/login')
          return
        }
      }

      if (user.role !== 'teacher') {
        setLoading(false)
        setError('仅限教师使用')
        return
      }
      try {
        setLoading(true)
        setError(null)
        const classList = await classService.getAll()
        console.log('Loaded classes:', classList)
        setClasses(classList)
        if (classList.length > 0) {
          setCurrentClassId(classList[0].id)
        } else {
          setCurrentClassId(null)
        }
      } catch (e) {
        console.error('Failed to fetch classes:', e)
        setError('获取班级列表失败')
      } finally {
        setLoading(false)
      }
    }
    fetchClass()
  }, [user, navigate])

  // WebSocket callbacks
  const handleTaskGroupPublished = useCallback((data: LiveTaskGroupSession) => {
    console.log('[Live] Task group published:', data)
    setCurrentChallenge(null)
    setCurrentTaskGroup(data)
    setCurrentTask(null)
    setTaskGroupSubmissions(0)
    setTaskGroupEnded(false)
  }, [])

  const handleNewTaskGroupSubmission = useCallback(
    (data: { group_id: string; student_id: string; total_submissions: number }) => {
      console.log('[Live] New task group submission:', data)
      setTaskGroupSubmissions(data.total_submissions)

      setTaskHistory((prev) =>
        prev.map((item) =>
          item.group_id === data.group_id ? { ...item, submissions: data.total_submissions } : item
        )
      )
    },
    []
  )

  const handleTaskGroupEnded = useCallback(
    (data: { group_id: string; results: any[] }) => {
      console.log('[Live] Task group ended:', data)
      setTaskGroupEnded(true)
      setCurrentTaskGroup(null)
      setCurrentTask(null)
      setTaskGroupSubmissions(0)

      setTaskHistory((prev) =>
        prev.map((item) =>
          item.group_id === data.group_id
            ? { ...item, status: 'ended', ended_at: new Date().toISOString() }
            : item
        )
      )
    },
    []
  )

  const handleChallengeStarted = useCallback((challenge: LiveChallengeSession) => {
    setCurrentChallenge(normalizeChallengePayload({ challenge }))
    setCurrentTask(null)
    setCurrentTaskGroup(null)
  }, [])

  const handleChallengeScoreboardUpdated = useCallback(
    (data: {
      challenge_id: string
      scoreboard: any[]
      status?: string
      participant_ids?: string[]
      current_round?: number
      current_task_id?: string | null
      round_status?: string | null
      winner_student_id?: string | null
      lead_student_id?: string | null
    }) => {
      setCurrentChallenge((prev) => {
        if (!prev || prev.id !== data.challenge_id) return prev
        return normalizeChallengePayload({
          challenge: prev,
          scoreboard: data.scoreboard,
          status: data.status || prev.status,
          participant_ids: data.participant_ids ?? prev.participant_ids,
          current_round: data.current_round ?? prev.current_round,
          current_task_id:
            data.current_task_id !== undefined ? data.current_task_id : prev.current_task_id,
          round_status: data.round_status ?? prev.round_status,
          winner_student_id:
            data.winner_student_id !== undefined
              ? data.winner_student_id
              : prev.winner_student_id,
          lead_student_id:
            data.lead_student_id !== undefined ? data.lead_student_id : prev.lead_student_id,
        })
      })
    },
    []
  )

  const handleChallengeEnded = useCallback((challenge: LiveChallengeSession) => {
    setCurrentChallenge(normalizeChallengePayload({ challenge }))
  }, [])

  const handleNewTask = useCallback((task: LiveTask) => {
    console.log('[Live] New task received:', task)
    setCurrentChallenge(null)
    setCurrentTask(task)
    setCurrentTaskGroup(null)
    setShowResults(false)
    setSubmissions(new Map())
  }, [])

  const handleTaskEnded = useCallback(
    (data: { task_id: string; correct_answer: unknown; total_submissions: number }) => {
      console.log('[Live] Task ended:', data)
      setShowResults(true)
      setCurrentTask((prev) => {
        if (!prev) return null
        return { ...prev, question: { ...prev.question, correct_answer: data.correct_answer } }
      })
      setTimeout(() => {
        setCurrentTask(null)
        setShowResults(false)
      }, 3000)
    },
    []
  )

  const handleNewSubmission = useCallback(
    (data: { task_id: string; student_id: string; total_submissions: number }) => {
      console.log('[Live] New submission:', data)
      setSubmissions((prev) => {
        const newMap = new Map(prev)
        newMap.set(data.task_id, data.total_submissions)
        return newMap
      })
    },
    []
  )

  const handleStudentJoined = useCallback((data: { student_id: string; student_count: number; student_name?: string }) => {
    console.log('[Live] Student joined:', data)
    setRoomInfo((prev) =>
      prev ? { ...prev, student_count: data.student_count } : null
    )
    // Also update classPresence to reflect the new student in classroom
    setClassPresence((prev) => {
      if (!prev) return prev
      if (prev.classroom_student_ids.includes(data.student_id)) return prev
      const newStudent = { id: data.student_id, name: data.student_name || data.student_id }
      return {
        ...prev,
        classroom_student_count: data.student_count,
        classroom_student_ids: [...prev.classroom_student_ids, data.student_id],
        classroom_students: [...prev.classroom_students, newStudent],
      }
    })
  }, [])

  const handleStudentLeft = useCallback((data: { student_id: string; student_count: number }) => {
    console.log('[Live] Student left:', data)
    setRoomInfo((prev) => (prev ? { ...prev, student_count: data.student_count } : null))
    // Also update classPresence to remove the student from classroom
    setClassPresence((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        classroom_student_count: data.student_count,
        classroom_student_ids: prev.classroom_student_ids.filter((id) => id !== data.student_id),
        classroom_students: prev.classroom_students.filter((s) => s.id !== data.student_id),
      }
    })
  }, [])

  const handleRoomClosed = useCallback(() => {
    setCurrentTaskGroup(null)
    setCurrentChallenge(null)
    setCurrentTask(null)
    setShowResults(false)
    setTaskGroupEnded(false)
    setTaskHistory([])
    setIsWsReady(false)
    isConnectingRef.current = false
  }, [])

  const handleRoomInfo = useCallback(
    (info: RoomInfo & { room_state?: RoomState; is_reconnect?: boolean }) => {
      const normalizedInfo = normalizeRoomInfoPayload(info as unknown as Record<string, unknown>)
      console.log('[WebSocket] Room info received:', normalizedInfo)
      debugLive('teacher:room_info', normalizedInfo)
      setRoomInfo(normalizedInfo)
      setIsWsReady(true)
      isConnectingRef.current = false

      if (normalizedInfo.room_state) {
        const roomState = normalizedInfo.room_state

        if (Object.prototype.hasOwnProperty.call(roomState, 'task_history')) {
          setTaskHistory(Array.isArray(roomState.task_history) ? roomState.task_history : [])
        }

        if ('current_task_group' in roomState) {
          setCurrentTaskGroup(roomState.current_task_group ?? null)
          setTaskGroupEnded(roomState.current_task_group?.status !== 'active')
          setTaskGroupSubmissions(roomState.current_task_group ? (normalizedInfo.task_group_submission_count || 0) : 0)
          if (roomState.current_task_group) {
            setCurrentTask(null)
          }
        }
        else {
          setTaskGroupSubmissions(0)
        }

        if ('current_challenge' in roomState) {
          setCurrentChallenge(roomState.current_challenge ?? null)
          if (roomState.current_challenge) {
            setCurrentTask(null)
            setCurrentTaskGroup(null)
          }
        }

        if ('current_task' in roomState) {
          setCurrentTask(roomState.current_task ?? null)
          if (roomState.current_task) {
            setCurrentTaskGroup(null)
          }
        }

        const pendingShares = (roomState as unknown as Record<string, unknown>).pending_shares
        setPendingShareRequests(Array.isArray(pendingShares) ? (pendingShares as any[]) : [])
      }
    },
    []
  )

  const ws = useLiveWebSocket({
    classId: currentClassId || '',
    token: token || '',
    role: 'teacher',
    onNewTaskGroup: handleTaskGroupPublished as any,
    onNewTaskGroupSubmission: handleNewTaskGroupSubmission,
    onTaskGroupEnded: handleTaskGroupEnded,
    onChallengeStarted: handleChallengeStarted,
    onChallengeProgressUpdated: handleChallengeScoreboardUpdated,
    onChallengeScoreboardUpdated: handleChallengeScoreboardUpdated,
    onChallengeEnded: handleChallengeEnded,
    onNewTask: handleNewTask,
    onTaskEnded: handleTaskEnded,
    onNewSubmission: handleNewSubmission,
    onStudentJoined: handleStudentJoined,
    onStudentLeft: handleStudentLeft,
    onRoomClosed: handleRoomClosed,
    onRoomInfo: handleRoomInfo,
    onShareRequest: (data) => {
      setPendingShareRequests((prev) => [...prev, data])
    },
    onClassroomShare: (data) => {
      setBroadcastShares((prev) => [...prev.slice(-9), data])
    },
  })

  const { connect: connectLiveWs, disconnect: disconnectLiveWs } = ws

  useEffect(() => {
    if (currentClassId && token && !isConnectingRef.current) {
      isConnectingRef.current = true
      setIsWsReady(false)
      connectLiveWs()
    }
    return () => {
      disconnectLiveWs()
      isConnectingRef.current = false
      setIsWsReady(false)
    }
  }, [currentClassId, token, connectLiveWs, disconnectLiveWs])

  const handleClassChange = useCallback(
    (newClassId: string) => {
      if (newClassId !== currentClassId) {
        ws.disconnect()
        setCurrentClassId(newClassId)
        setRoomInfo(null)
        setClassPresence(null)
        setCurrentTaskGroup(null)
        setCurrentTask(null)
        setShowResults(false)
        setTaskGroupEnded(false)
        setTaskHistory([])
        setCurrentChallenge(null)
      }
    },
    [currentClassId, ws]
  )

  const handleEndSession = useCallback(() => {
    ws.endSession()
    setCurrentTaskGroup(null)
    setCurrentTask(null)
    setShowResults(false)
    setTaskGroupEnded(false)
    setTaskGroupSubmissions(0)
    setRoomInfo(null)
    setCurrentChallenge(null)
  }, [ws])

  const handleEndTaskGroup = useCallback(() => {
    if (!currentTaskGroup) return
    ws.endTaskGroup(currentTaskGroup.group_id)
  }, [currentTaskGroup, ws])

  const handleEndTask = useCallback(() => {
    if (currentTask) {
      ws.endTask(currentTask.task_id, currentTask.question.correct_answer)
    }
  }, [currentTask, ws])

  return {
    // State
    currentClassId,
    currentClassIdRef,
    classes,
    loading,
    error,
    roomInfo,
    classPresence,
    currentTaskGroup,
    taskGroupSubmissions,
    taskGroupEnded,
    currentChallenge,
    currentTask,
    submissions,
    showResults,
    taskHistory,
    pendingShareRequests,
    isWsReady,
    ws,

    // Setters
    setClassPresence,
    setTaskGroupSubmissions,
    setTaskGroupEnded,
    setCurrentTaskGroup,
    setCurrentTask,
    setCurrentChallenge,
    setTaskHistory,
    setPendingShareRequests,
    setShowResults,

    // Actions
    handleClassChange,
    handleEndSession,
    handleEndTaskGroup,
    handleEndTask,
    connectLiveWs,
    disconnectLiveWs,
  }
}
