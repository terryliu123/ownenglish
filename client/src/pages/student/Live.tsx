import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { useAppStore } from '../../stores/app-store'
import { useLiveWebSocket, LiveChallengeSession, LiveTask, RoomInfo, LiveTaskGroupSession, TaskResult, ClassroomShare } from '../../services/websocket'
import { classService, liveService } from '../../services/api'
import { useTranslation } from '../../i18n/useTranslation'
import { useStudentAiContext } from '../../features/student-ai/context/StudentAiContext'
import {
  isReadingTask,
  readingAnswerRequired,
  taskSupportsBlanks,
  taskSupportsPairs,
  taskSupportsSorting,
  taskUsesBooleanAnswer,
  taskUsesMultiChoiceAnswer,
} from '../../features/tasks/task-config'
import { buildTaskAnswerFromAnswerMap, evaluateTaskCorrectness, hasTaskAnswer } from '../../features/tasks/task-evaluation'
import { TaskRichTextOrPlain } from '../../features/tasks/task-preview'
import { StudentTaskQuestionCard, StudentTaskResultCard } from '../../features/tasks/task-live-components'
import { debugLive } from '../../features/live-runtime/debug'
import {
  getChallengeEntryForStudent,
  getSingleQuestionWinnerEntry,
  hasChallengeEntryActivity,
  hasChallengeEntryFinalSubmission,
  isChallengeFinished,
  isChallengeParticipant,
} from '../../features/live-runtime/challengeRuntime'
import { AtmosphereEffects, DanmuScreen, useDanmu } from '../../features/danmu'
import type { ActiveAtmosphereEffect, AtmosphereEffectType } from '../../features/danmu/types/danmu'


function shuffleIndices(length: number) {
  const indices = Array.from({ length }, (_, index) => index)
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]]
  }
  return indices
}

function buildNonAlignedIndices(length: number) {
  if (length <= 1) return [0]

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const shuffled = shuffleIndices(length)
    const isIdentity = shuffled.every((value, index) => value === index)
    if (!isIdentity) return shuffled
  }

  return Array.from({ length }, (_, index) => (index + 1) % length)
}

function buildMatchingLayouts(tasks: LiveTask[]) {
  return tasks.reduce<Record<string, number[]>>((accumulator, task) => {
    if (taskSupportsPairs(task.type) && Array.isArray(task.question.pairs)) {
      const taskId = getLiveTaskId(task)
      if (!taskId) return accumulator
      const pairCount = task.question.pairs.length
      // 始终打乱右侧选项顺序，并尽量避免与左侧保持同排
      accumulator[taskId] = buildNonAlignedIndices(pairCount)
    }
    return accumulator
  }, {})
}

function buildSortingLayouts(tasks: LiveTask[]) {
  return tasks.reduce<Record<string, string[]>>((accumulator, task) => {
    if (taskSupportsSorting(task.type) && Array.isArray(task.question.options)) {
      const taskId = getLiveTaskId(task)
      if (!taskId) return accumulator
      const keys = task.question.options.map((option) => option.key)
      const shuffledIndices = shuffleIndices(keys.length)
      accumulator[taskId] = shuffledIndices.map((index) => keys[index])
    }
    return accumulator
  }, {})
}

function getLiveTaskId(task: Pick<LiveTask, 'task_id'> & { id?: string }) {
  return task.task_id || String(task.id || '')
}

function ChallengeStateIcon({ kind }: { kind: 'finished' | 'spectator' }) {
  if (kind === 'spectator') {
    return (
      <span
        aria-hidden="true"
        className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-600"
      >
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
    >
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10l1 4-6 4-6-4 1-4z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12v6h8v-6" />
      </svg>
    </span>
  )
}

function parseChallengeTimestamp(value?: string | null) {
  if (!value) return NaN
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

function getChallengeStartTimeMs(
  challenge: LiveChallengeSession,
  entry?: LiveChallengeSession['scoreboard'][number],
) {
  const entryStartedAtMs = parseChallengeTimestamp(entry?.started_at)
  if (Number.isFinite(entryStartedAtMs)) {
    return entryStartedAtMs
  }
  return parseChallengeTimestamp(challenge.started_at)
}

function getChallengeResumeIndex(entry: {
  current_index?: number
} | undefined, totalTasks: number) {
  const rawIndex = Number(entry?.current_index ?? 0)
  if (!Number.isFinite(rawIndex) || totalTasks <= 0) {
    return 0
  }
  return Math.min(Math.max(rawIndex, 0), totalTasks - 1)
}

function isSingleQuestionDuelChallenge(challenge: LiveChallengeSession | null | undefined) {
  return challenge?.mode === 'single_question_duel'
}

export default function StudentLive() {
  const { t, tWithParams } = useTranslation()
  const { user, token } = useAppStore()
  const navigate = useNavigate()
  const { setAiContext, loadSettings, setOpen: setAiOpen, settings } = useStudentAiContext()
  const [currentClassId, setCurrentClassId] = useState<string | null>(null)
  const [classLoadState, setClassLoadState] = useState<'loading' | 'ready' | 'empty' | 'selecting'>('loading')
  const [enrolledClasses, setEnrolledClasses] = useState<{id: string; name: string; teacher_name?: string}[]>([])
  const [showClassSelect, setShowClassSelect] = useState(false)
  const [selectedClassName, setSelectedClassName] = useState('')
  const [_roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)

  // 整组任务状态
  const [currentTaskGroup, setCurrentTaskGroup] = useState<LiveTaskGroupSession | null>(null)
  const [answers, setAnswers] = useState<Map<string, string>>(new Map())
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [submitted, setSubmitted] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [taskResults, setTaskResults] = useState<TaskResult[]>([])
  const [localEvaluation, setLocalEvaluation] = useState<Map<string, boolean | null>>(new Map())
  const [matchingLayouts, setMatchingLayouts] = useState<Record<string, number[]>>({})
  const [sortingLayouts, setSortingLayouts] = useState<Record<string, string[]>>({})
  const [currentChallenge, setCurrentChallenge] = useState<LiveChallengeSession | null>(null)
  const [challengeQuestionIndex, setChallengeQuestionIndex] = useState(0)
  const [challengeSubmitted, setChallengeSubmitted] = useState(false)
  const [challengeSubmitState, setChallengeSubmitState] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle')
  const [challengeSubmitMessage, setChallengeSubmitMessage] = useState('')
  const [challengeResult, setChallengeResult] = useState<LiveChallengeSession | null>(null)
  const [challengeIntroCountdown, setChallengeIntroCountdown] = useState(0)
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(0)

  // 弹幕状态
  const danmu = useDanmu()
  const [danmuCooldown, setDanmuCooldown] = useState(0)
  const [activeEffects, setActiveEffects] = useState<ActiveAtmosphereEffect[]>([])

  // Stable danmu callbacks to avoid hooks-in-JSX issue
  const closeDanmuModal = useCallback(() => danmu.closeDanmuModal(), [danmu])
  const setDanmuInput = useCallback((v: string) => danmu.setDanmuInput(v), [danmu])
  const danmuPresetPhrases = useMemo(
    () => danmu.config.presetPhrases?.slice(0, 5) || ['太棒了！', '加油！', '答对了！', '真厉害！', '准备好了！'],
    [danmu.config.presetPhrases],
  )

  // 单题模式（向后兼容）
  const [currentTask, setCurrentTask] = useState<LiveTask | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  const [connectionStatus, setConnectionStatus] = useState<string>(t('connection.waiting'))
  const [sessionNotStarted, setSessionNotStarted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const challengeIntroTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const challengeRoundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const classRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const classRetryCountRef = useRef(0)
  const taskStartTimeRef = useRef<string>('')
  const challengeStartTimeRef = useRef<string>('')
  const currentChallengeIdRef = useRef<string | null>(null)
  const lastChallengeProgressKeyRef = useRef<string | null>(null)

  // 课堂分享状态
  const [showShareModal, setShowShareModal] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [shareText, setShareText] = useState('')
  const [shareImageFile, setShareImageFile] = useState<File | null>(null)
  const [shareImagePreview, setShareImagePreview] = useState<string | null>(null)
  const [shareSending, setShareSending] = useState(false)
  const [sharePending, setSharePending] = useState(false)
  const [broadcastShares, setBroadcastShares] = useState<ClassroomShare[]>([])
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const clearChallengeTimers = useCallback(() => {
    if (challengeIntroTimerRef.current) {
      clearInterval(challengeIntroTimerRef.current)
      challengeIntroTimerRef.current = null
    }
    if (challengeRoundTimerRef.current) {
      clearInterval(challengeRoundTimerRef.current)
      challengeRoundTimerRef.current = null
    }
  }, [])

  const challengeParticipant = useMemo(
    () => isChallengeParticipant(currentChallenge, user?.id),
    [currentChallenge, user],
  )

  // Fetch student's enrolled class
  useEffect(() => {
    if (classRetryTimerRef.current) {
      clearTimeout(classRetryTimerRef.current)
      classRetryTimerRef.current = null
    }

    async function fetchClass() {
      if (user?.role !== 'student' || !token) return
      setClassLoadState('loading')
      try {
        const classes = await classService.getAll()
        console.log('[StudentLive] Fetched classes:', classes)
        if (classes.length > 0) {
          // Store all enrolled classes
          setEnrolledClasses(classes.map((c: any) => ({
            id: c.id,
            name: c.name,
            teacher_name: c.teacher?.name,
          })))
          if (classes.length === 1) {
            // Single class - auto select
            setCurrentClassId(classes[0].id)
            setSelectedClassName(classes[0].name)
            localStorage.setItem('last_student_class_id', classes[0].id)
            setClassLoadState('ready')
            classRetryCountRef.current = 0
            console.log('[StudentLive] Set currentClassId:', classes[0].id)
          } else if (!currentClassId) {
            // Multiple classes AND no class selected yet - show selection dialog
            setClassLoadState('selecting')
            setShowClassSelect(true)
            classRetryCountRef.current = 0
          }
          // If multiple classes but currentClassId is already set, keep current class (do nothing)
        } else {
          const cachedClassId = localStorage.getItem('last_student_class_id')
          if (cachedClassId) {
            setCurrentClassId(cachedClassId)
            setClassLoadState('ready')
            return
          }
          console.log('[StudentLive] No classes found')
          if (!currentClassId && classRetryCountRef.current < 4) {
            classRetryCountRef.current += 1
            classRetryTimerRef.current = setTimeout(fetchClass, 1500)
          } else {
            setClassLoadState('empty')
          }
        }
      } catch (e) {
        console.error('Failed to fetch classes:', e)
        const cachedClassId = localStorage.getItem('last_student_class_id')
        if (cachedClassId) {
          setCurrentClassId(cachedClassId)
          setClassLoadState('ready')
          return
        }
        if (!currentClassId && classRetryCountRef.current < 4) {
          classRetryCountRef.current += 1
          classRetryTimerRef.current = setTimeout(fetchClass, 1500)
        } else {
          setClassLoadState('empty')
        }
      }
    }
    fetchClass()
    return () => {
      if (classRetryTimerRef.current) {
        clearTimeout(classRetryTimerRef.current)
        classRetryTimerRef.current = null
      }
    }
  }, [currentClassId, token, user])

  // 整组任务回调
  const handleNewTaskGroup = useCallback(async (data: LiveTaskGroupSession) => {
    console.log('[StudentLive] New task group received:', data)
    currentChallengeIdRef.current = null
    setCurrentChallenge(null)
    setChallengeResult(null)
    setChallengeSubmitted(false)
    setChallengeSubmitState('idle')
    setChallengeSubmitMessage('')
    setChallengeIntroCountdown(0)
    setCurrentTaskGroup(data)
    setCurrentTask(null)  // 清除单题模式
    setLocalEvaluation(new Map())  // 清除本地评判
    // If student has already submitted, fetch and restore their answers
    if (data.has_submitted) {
      setSubmitted(true)
      setShowResult(false)
      try {
        const submissionData = await liveService.getMyTaskGroupSubmissions(
          data.group_id,
          data.session_id || data.live_session_id || undefined,
        )
        console.log('[StudentLive] Restored submissions:', submissionData)
        // Restore answers from submissions
        const restoredAnswers = new Map<string, string>()
        submissionData.submissions?.forEach((sub: any) => {
          if (sub.answer !== undefined && sub.answer !== null) {
            // Handle different answer formats
            if (Array.isArray(sub.answer)) {
              // For matching: answer is array like [1, 0, 2] - store as comma-separated or individual entries
              // For fill_blank: answer is array of strings
              // For multiple_choice: answer is array of keys
              // Find the task type to determine how to restore
                const task = data.tasks.find(t => getLiveTaskId(t) === sub.task_id)
              if (task && taskSupportsPairs(task.type) && task.question?.pairs) {
                // Restore matching answers: answer array contains left indices for each right position
                sub.answer.forEach((leftIdx: number, rightIdx: number) => {
                  if (leftIdx !== undefined && leftIdx !== -1) {
                    restoredAnswers.set(`${sub.task_id}_right_${rightIdx}`, String(leftIdx))
                  }
                })
              } else if (task && taskSupportsBlanks(task.type) && task.question?.blanks) {
                // Restore fill_blank answers
                sub.answer.forEach((blankAnswer: string, idx: number) => {
                  restoredAnswers.set(`${sub.task_id}_blank_${idx}`, blankAnswer || '')
                })
              } else if (task?.type === 'multiple_choice') {
                // Restore multiple choice as comma-separated
                restoredAnswers.set(sub.task_id, sub.answer.join(','))
              } else {
                // Default: store as comma-separated
                restoredAnswers.set(sub.task_id, sub.answer.join(','))
              }
            } else {
              // Single value answer
              restoredAnswers.set(sub.task_id, String(sub.answer))
            }
          }
        })
        setAnswers(restoredAnswers)
      } catch (err) {
        console.error('[StudentLive] Failed to restore submissions:', err)
      }
    } else {
      setAnswers(new Map())
      setSubmitted(false)
      setShowResult(false)
    }
    setTaskResults([])
    setMatchingLayouts(buildMatchingLayouts(data.tasks))
    setSortingLayouts(buildSortingLayouts(data.tasks))
    setTimeLeft(data.total_countdown)
    taskStartTimeRef.current = new Date().toISOString()

    // Start countdown
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          // 时间到自动提交?          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const handleTaskGroupEnded = useCallback((data: { group_id: string; results: TaskResult[] }) => {
    console.log('[StudentLive] Task group ended:', data)
    setShowResult(true)
    setSubmitted(true)  // 禁止学生再提交
    setTaskResults(data.results)
    // 服务端结果到达，清除本地评判
    setLocalEvaluation(new Map())
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setTimeLeft(0)
    // Keep the result view open until the teacher ends the class.
  }, [])

  const handleChallengeStarted = useCallback((challenge: LiveChallengeSession, isParticipant?: boolean) => {
    const fallbackParticipant = isChallengeParticipant(challenge, user?.id)
    const participant = isParticipant ?? challenge.is_participant ?? fallbackParticipant
    const myEntry = getChallengeEntryForStudent(challenge, user?.id)
    debugLive('student:challenge_started', {
      challengeId: challenge.id,
      userId: user?.id,
      isParticipant,
      challengeIsParticipant: challenge.is_participant,
      fallbackParticipant,
      resolvedParticipant: participant,
      hasEntry: Boolean(myEntry),
    })
    const sameChallenge = currentChallengeIdRef.current === challenge.id
    const nextChallenge = {
      ...challenge,
      is_participant: participant,
    }

    currentChallengeIdRef.current = challenge.id
    if (!sameChallenge) {
      lastChallengeProgressKeyRef.current = null
    }
    setCurrentChallenge(nextChallenge)
    setChallengeResult(null)
    setCurrentTaskGroup(null)
    setCurrentTask(null)
    setSubmitted(false)
    setShowResult(false)
    setChallengeSubmitState('idle')
    setChallengeSubmitMessage('')
    clearChallengeTimers()
    if (!sameChallenge) {
      setAnswers(new Map())
    }
    setMatchingLayouts(buildMatchingLayouts(challenge.tasks))
    setSortingLayouts(buildSortingLayouts(challenge.tasks))
    setChallengeQuestionIndex(getChallengeResumeIndex(myEntry ?? undefined, nextChallenge.tasks.length))
    const hasFinalSubmission = Boolean(myEntry && hasChallengeEntryFinalSubmission(myEntry))
    setChallengeSubmitted(hasFinalSubmission)
    if (hasFinalSubmission) {
      setChallengeSubmitState('submitted')
      setChallengeSubmitMessage(t('challenge.submitChallengeSuccess'))
    } else {
      setChallengeSubmitState('idle')
      setChallengeSubmitMessage('')
    }
    challengeStartTimeRef.current = myEntry?.started_at || (sameChallenge ? challengeStartTimeRef.current : new Date().toISOString())
    const challengeStartedAtMs = getChallengeStartTimeMs(nextChallenge, myEntry ?? undefined)
    const shouldShowIntro = Number.isFinite(challengeStartedAtMs) && (Date.now() - challengeStartedAtMs < 4000)
    if (!sameChallenge) {
      setChallengeIntroCountdown(shouldShowIntro ? 3 : 0)
    } else if (!shouldShowIntro) {
      setChallengeIntroCountdown(0)
    }
    if (isSingleQuestionDuelChallenge(nextChallenge)) {
      const countdownSeconds = nextChallenge.tasks[0]?.countdown_seconds ?? 20
      const elapsedSeconds = Number.isFinite(challengeStartedAtMs)
        ? Math.max(0, Math.floor((Date.now() - challengeStartedAtMs) / 1000))
        : 0
      setChallengeTimeLeft(Math.max(0, countdownSeconds - elapsedSeconds))
    } else {
      setChallengeTimeLeft(0)
    }
  }, [clearChallengeTimers, t, user])

  const handleChallengeScoreboardUpdated = useCallback((data: {
    challenge_id: string
    scoreboard: any[]
    status?: string
    participant_ids?: string[]
    current_round?: number
    current_task_id?: string | null
    round_status?: string
    winner_student_id?: string | null
    lead_student_id?: string | null
  }) => {
    setCurrentChallenge((prev) => {
      if (!prev || prev.id !== data.challenge_id) return prev
      const nextChallenge = {
        ...prev,
        scoreboard: data.scoreboard,
        status: data.status || prev.status,
        participant_ids: data.participant_ids ?? prev.participant_ids,
        current_round: data.current_round ?? prev.current_round,
        current_task_id: data.current_task_id ?? prev.current_task_id,
        round_status: data.round_status ?? prev.round_status,
        winner_student_id: data.winner_student_id ?? prev.winner_student_id,
        lead_student_id: data.lead_student_id ?? prev.lead_student_id,
      }
      const myEntry = getChallengeEntryForStudent(nextChallenge, user?.id)
      debugLive('student:challenge_update', {
        challengeId: nextChallenge.id,
        userId: user?.id,
        resolvedParticipant: isChallengeParticipant(nextChallenge, user?.id),
        hasEntry: Boolean(myEntry),
        status: nextChallenge.status,
      })
      const hasFinalSubmission = Boolean(myEntry && hasChallengeEntryFinalSubmission(myEntry))
      setChallengeSubmitted(hasFinalSubmission)
      if (hasFinalSubmission) {
        setChallengeSubmitState('submitted')
        if (isSingleQuestionDuelChallenge(nextChallenge)) {
          const winner = getSingleQuestionWinnerEntry(nextChallenge)
          if (winner?.student_id === user?.id) {
            setChallengeSubmitMessage(t('challenge.singleQuestionWon'))
          } else if (winner && winner.student_id !== user?.id) {
            setChallengeSubmitMessage(t('challenge.singleQuestionLost'))
          } else {
            setChallengeSubmitMessage(t('challenge.singleQuestionDraw'))
          }
        } else {
          setChallengeSubmitMessage(t('challenge.submitChallengeSuccess'))
        }
      } else if (nextChallenge.mode === 'class_challenge' && myEntry?.rank) {
        setChallengeSubmitState('idle')
        setChallengeSubmitMessage(tWithParams('challenge.currentRank', { rank: myEntry.rank }))
      } else if (nextChallenge.mode === 'duel' && myEntry?.answered_count) {
        setChallengeSubmitState('idle')
        setChallengeSubmitMessage(t('challenge.duelAnswerRecorded'))
      }
      if (myEntry?.started_at) {
        challengeStartTimeRef.current = myEntry.started_at
      }
      if (isSingleQuestionDuelChallenge(nextChallenge) && !isChallengeFinished(nextChallenge)) {
        const startedAtMs = getChallengeStartTimeMs(nextChallenge, myEntry ?? undefined)
        const countdownSeconds = nextChallenge.tasks[0]?.countdown_seconds ?? 20
        const elapsedSeconds = Number.isFinite(startedAtMs)
          ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
          : 0
        setChallengeTimeLeft(Math.max(0, countdownSeconds - elapsedSeconds))
      } else if (isChallengeFinished(nextChallenge)) {
        setChallengeTimeLeft(0)
      }
      return nextChallenge
    })
  }, [t, tWithParams, user])

  const handleChallengeEnded = useCallback((challenge: LiveChallengeSession) => {
    clearChallengeTimers()
    currentChallengeIdRef.current = challenge.id
    setChallengeResult((prev) => ({
      ...(prev ?? currentChallenge ?? challenge),
      ...challenge,
      scoreboard:
        challenge.scoreboard?.length
          ? challenge.scoreboard
          : (currentChallenge?.scoreboard ?? prev?.scoreboard ?? []),
      status: challenge.status || currentChallenge?.status || prev?.status,
    }))
    setCurrentChallenge((prev) => ({
      ...(prev ?? challenge),
      ...challenge,
      scoreboard:
        challenge.scoreboard?.length
          ? challenge.scoreboard
          : (prev?.scoreboard ?? []),
      status: challenge.status || prev?.status,
    }))
    const myEntry = getChallengeEntryForStudent(challenge, user?.id)
    const hasFinalSubmission = Boolean(myEntry && hasChallengeEntryFinalSubmission(myEntry))
    setChallengeSubmitted(hasFinalSubmission)
    if (hasFinalSubmission || (myEntry && hasChallengeEntryActivity(myEntry))) {
      setChallengeSubmitState('submitted')
      setChallengeSubmitMessage(t('challenge.submitChallengeSuccess'))
    } else {
      setChallengeSubmitState('idle')
      setChallengeSubmitMessage('')
    }
    challengeStartTimeRef.current = myEntry?.started_at || ''
    lastChallengeProgressKeyRef.current = null
    setChallengeIntroCountdown(0)
    setChallengeTimeLeft(0)
  }, [clearChallengeTimers, currentChallenge, t, user])

  const handleChallengeError = useCallback((message: string) => {
    debugLive('student:challenge_error', { message, state: challengeSubmitState })
    if (challengeSubmitState === 'submitting' && message === 'No active challenge') {
      return
    }
    if (challengeSubmitState === 'submitting') {
      setChallengeSubmitted(false)
      setChallengeSubmitState('error')
      setChallengeSubmitMessage(t('challenge.submitChallengeFailed'))
    }
  }, [challengeSubmitState, t])

  // 单题模式回调（向后兼容）
  const handleNewTask = useCallback((task: LiveTask) => {
    console.log('[StudentLive] New task received (legacy):', task)
    currentChallengeIdRef.current = null
    setCurrentChallenge(null)
    setChallengeResult(null)
    setCurrentTask(task)
    setCurrentTaskGroup(null)  // 清除整组模式
    setSelectedAnswer(null)
    // If student has already submitted, show submitted state
    setSubmitted(task.has_submitted || false)
    setShowResult(false)
    setTimeLeft(task.countdown_seconds)
    taskStartTimeRef.current = new Date().toISOString()

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const handleTaskEnded = useCallback((data: { task_id: string; correct_answer: any; total_submissions: number }) => {
    setShowResult(true)
    if (currentTask) {
      setCurrentTask((prev) =>
        prev ? { ...prev, question: { ...prev.question, correct_answer: data.correct_answer } } : null
      )
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setTimeLeft(0)
  }, [currentTask])

  const handleSubmissionReceived = useCallback((_data: { task_id: string }) => {
    setSubmitted(true)
  }, [])

  const handleTaskGroupSubmissionReceived = useCallback((_data: { group_id: string }) => {
    setSubmitted(true)
  }, [])

  const handleRoomClosed = useCallback(() => {
    clearChallengeTimers()
    currentChallengeIdRef.current = null
    setCurrentChallenge(null)
    setChallengeResult(null)
    setChallengeSubmitted(false)
    setChallengeIntroCountdown(0)
    setChallengeTimeLeft(0)
    lastChallengeProgressKeyRef.current = null
    setCurrentTaskGroup(null)
    setCurrentTask(null)
    setSubmitted(false)
    setShowResult(false)
    setMatchingLayouts({})
    setSortingLayouts({})
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    navigate('/student')
  }, [clearChallengeTimers, navigate])

  const handleRoomInfo = useCallback((info: RoomInfo) => {
    setSessionNotStarted(false)
    setRoomInfo(info)
    const roomChallenge = info.room_state?.current_challenge ?? (info as RoomInfo & { current_challenge?: LiveChallengeSession | null }).current_challenge
    if (roomChallenge) {
      handleChallengeStarted(roomChallenge)
    }
    // Sync danmu config from server
    const danmuConfig = (info as any).danmu_config
    if (danmuConfig) {
      danmu.handleDanmuConfig(danmuConfig)
    }
  }, [handleChallengeStarted])

  const ws = useLiveWebSocket({
    classId: currentClassId || '',
    token: token || '',
    role: 'student',
    selfUserId: user?.id,
    onError: handleChallengeError,
    // 整组任务
    onNewTaskGroup: handleNewTaskGroup,
    onTaskGroupSubmissionReceived: handleTaskGroupSubmissionReceived,
    onTaskGroupEnded: handleTaskGroupEnded,
    onChallengeStarted: handleChallengeStarted,
    onChallengeProgressUpdated: handleChallengeScoreboardUpdated,
    onChallengeScoreboardUpdated: handleChallengeScoreboardUpdated,
    onChallengeEnded: handleChallengeEnded,
    // 单题模式（向后兼容）
    onNewTask: handleNewTask,
    onTaskEnded: handleTaskEnded,
    onSubmissionReceived: handleSubmissionReceived,
    onRoomClosed: handleRoomClosed,
    onSessionNotStarted: () => {
      setSessionNotStarted(true)
      setConnectionStatus(t('studentLive.sessionNotStarted'))
    },
    onRoomInfo: handleRoomInfo,
    onShareRequestSent: () => {
      setShareSending(false)
      setSharePending(true)
      setShowShareModal(false)
      setShareText('')
      setShareImageFile(null)
      setShareImagePreview(null)
    },
    onShareRequestResponse: (data) => {
      setSharePending(false)
      if (data.status === 'approved') {
        // Will be shown via onClassroomShare
      }
    },
    onClassroomShare: (data) => {
      setBroadcastShares((prev) => [...prev.slice(-9), data])
    },
    onDanmuDisplay: (data) => {
      danmu.handleDanmuDisplay(data as any)
    },
    onDanmuConfig: (data) => {
      danmu.handleDanmuConfig(data as any)
    },
    onDanmuClear: () => {
      danmu.handleDanmuClear()
    },
    onAtmosphereEffect: (data) => {
      const effect = data.effect as AtmosphereEffectType
      const newEffect: ActiveAtmosphereEffect = {
        id: `student-effect-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        effect,
        sourceName: data.sourceName,
      }
      setActiveEffects((prev) => [...prev, newEffect])
      window.setTimeout(() => {
        setActiveEffects((prev) => prev.filter((item) => item.id !== newEffect.id))
      }, 5600)
    },
  })

  // 弹幕倒计时发送
  const handleSendDanmu = useCallback(() => {
    console.log('[DANMU_DEBUG] handleSendDanmu called', {
      input: danmu.danmuInput,
      inputTrimmed: danmu.danmuInput.trim(),
      wsStatus: ws.status,
      cooldown: danmuCooldown,
    })
    if (!danmu.danmuInput.trim() || ws.status !== 'connected' || danmuCooldown > 0) return
    console.log('[DANMU_DEBUG] sending danmu via ws:', danmu.danmuInput.trim())
    ws.sendDanmu(danmu.danmuInput.trim())
    danmu.setDanmuInput('')
    setDanmuCooldown(3)
    const timer = setInterval(() => {
      setDanmuCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [ws, danmu, danmuCooldown])

  // 处理分享图片上传预览
  const handleShareImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setShareImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setShareImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // 发送分享请求
  const handleSendShare = async () => {
    if (!shareText.trim() && !shareImageFile) return
    setShareSending(true)
    try {
      let imageUrl: string | undefined
      if (shareImageFile) {
        const formData = new FormData()
        formData.append('file', shareImageFile)
        const token = localStorage.getItem('token')
        const res = await fetch('/api/v1/images/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        if (!res.ok) throw new Error('Upload failed')
        const data = await res.json()
        imageUrl = data.url
      }
      ws.sendShareRequest(
        shareImageFile ? 'image' : 'text',
        shareText.trim(),
        imageUrl,
      )
    } catch {
      setShareSending(false)
      alert(t('classroomShare.imageUploadFailed'))
    }
  }

  // Update connection status
  useEffect(() => {
    const statusMap: Record<string, string> = {
      connecting: t('connection.connecting'),
      connected: t('connection.connected'),
      disconnected: t('connection.disconnected'),
      error: t('connection.error'),
    }
    setConnectionStatus(statusMap[ws.status] || t('connection.waiting'))
  }, [ws.status])

  // Connect when classId is available
  useEffect(() => {
    if (currentClassId && token) {
      console.log('[StudentLive] Connecting WebSocket for class:', currentClassId)
      ws.connect()
    }
    return () => ws.disconnect()
  }, [currentClassId, token])

  useEffect(() => {
    if (!sessionNotStarted || !currentClassId || !token) return
    const retryTimer = window.setTimeout(() => {
      ws.connect()
    }, 3000)
    return () => window.clearTimeout(retryTimer)
  }, [sessionNotStarted, currentClassId, token, ws.status])

  // 连接成功后获取当前任务（处理任务已开始但后加入的情况）
  useEffect(() => {
    if (ws.status === 'connected') {
      setSessionNotStarted(false)
      console.log('[StudentLive] WebSocket connected, fetching current task...')
      // 设置 AI 助手 context
      const sessionId = ws.roomInfo?.session_id
      setAiContext({ class_id: currentClassId || '', session_id: sessionId || undefined })
      loadSettings(currentClassId || '')
      // 延迟一点发送，确保服务器已准备好
      const timer = setTimeout(() => {
        ws.getCurrentTask()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [ws.status, ws.roomInfo?.session_id])

  // 监听统一悬浮球的分享事件
  useEffect(() => {
    const handleOpenShare = () => setShowShareModal(true)
    window.addEventListener('open-share-modal', handleOpenShare)
    return () => window.removeEventListener('open-share-modal', handleOpenShare)
  }, [])

  useEffect(() => {
    if (!currentChallenge || challengeIntroCountdown <= 0) {
      return
    }
    if (challengeIntroTimerRef.current) {
      clearInterval(challengeIntroTimerRef.current)
    }
    challengeIntroTimerRef.current = setInterval(() => {
      setChallengeIntroCountdown((prev) => {
        if (prev <= 1) {
          if (challengeIntroTimerRef.current) {
            clearInterval(challengeIntroTimerRef.current)
            challengeIntroTimerRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (challengeIntroTimerRef.current) {
        clearInterval(challengeIntroTimerRef.current)
        challengeIntroTimerRef.current = null
      }
    }
  }, [challengeIntroCountdown, currentChallenge?.id])

  useEffect(() => {
    if (
      !currentChallenge
      || !isSingleQuestionDuelChallenge(currentChallenge)
      || !challengeParticipant
      || isChallengeFinished(currentChallenge)
      || challengeIntroCountdown > 0
      || challengeTimeLeft <= 0
    ) {
      return
    }
    if (challengeRoundTimerRef.current) {
      clearInterval(challengeRoundTimerRef.current)
    }
    challengeRoundTimerRef.current = setInterval(() => {
      setChallengeTimeLeft((prev) => {
        if (prev <= 1) {
          if (challengeRoundTimerRef.current) {
            clearInterval(challengeRoundTimerRef.current)
            challengeRoundTimerRef.current = null
          }
          if (!isChallengeFinished(currentChallenge)) {
            ws.endChallenge(currentChallenge.id)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (challengeRoundTimerRef.current) {
        clearInterval(challengeRoundTimerRef.current)
        challengeRoundTimerRef.current = null
      }
    }
  }, [challengeIntroCountdown, challengeParticipant, challengeTimeLeft, currentChallenge, ws])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      clearChallengeTimers()
    }
  }, [clearChallengeTimers])

  // 提交整组任务答案
  const handleSubmitTaskGroup = () => {
    if (!currentTaskGroup || submitted) return

    const unansweredTasks = currentTaskGroup.tasks.filter((task) => {
      const taskId = getLiveTaskId(task)
      if (isReadingTask(task)) {
        if (!readingAnswerRequired(task)) return false
        return !String(answers.get(taskId) || '').trim()
      }
      if (taskSupportsBlanks(task.type) && task.question.blanks) {
        return task.question.blanks.some((_: any, idx: number) => !answers.get(`${taskId}_blank_${idx}`))
      }
      if (taskSupportsPairs(task.type) && task.question.pairs) {
        return task.question.pairs.some((_: any, originalRightIdx: number) =>
          answers.get(`${taskId}_right_${originalRightIdx}`) === undefined
        )
      }
      if (taskSupportsSorting(task.type)) {
        return !answers.has(taskId)
      }
      return !answers.has(taskId)
    })

    if (unansweredTasks.length > 0) {
      const confirmSubmit = window.confirm(tWithParams('task.unansweredWarning', { count: unansweredTasks.length }))
      if (!confirmSubmit) return
    }

    const answersArray: { task_id: string; answer: any }[] = []
    currentTaskGroup.tasks.forEach((task) => {
      const taskId = getLiveTaskId(task)
      const answer = answers.get(taskId)

      if (isReadingTask(task)) {
        if (readingAnswerRequired(task)) {
          answersArray.push({ task_id: taskId, answer: String(answer || '').trim() })
        } else {
          answersArray.push({ task_id: taskId, answer: '__read__' })
        }
        return
      }

      if (taskSupportsPairs(task.type) && task.question.pairs) {
        const pairCount = task.question.pairs.length
        const matchingAnswers: (string | number)[] = new Array(pairCount).fill('')
        task.question.pairs.forEach((_: any, originalRightIdx: number) => {
          const leftIdx = answers.get(`${taskId}_right_${originalRightIdx}`)
          matchingAnswers[originalRightIdx] = leftIdx ?? ''
        })
        answersArray.push({ task_id: taskId, answer: matchingAnswers })
        return
      }

      if (taskSupportsSorting(task.type)) {
        if (answer) {
          answersArray.push({ task_id: taskId, answer: answer.split(',').filter(Boolean) })
        }
        return
      }

      if (answer) {
        if (taskUsesMultiChoiceAnswer(task.type)) {
          answersArray.push({ task_id: taskId, answer: answer.split(',') })
        } else {
          answersArray.push({ task_id: taskId, answer })
        }
        return
      }

      if (taskSupportsBlanks(task.type) && task.question.blanks) {
        const blankAnswers: string[] = []
        task.question.blanks.forEach((_: any, idx: number) => {
          blankAnswers.push(answers.get(`${taskId}_blank_${idx}`) || '')
        })
        answersArray.push({ task_id: taskId, answer: blankAnswers })
      }
    })

    // 本地即时评判
    const evalMap = new Map<string, boolean | null>()
    currentTaskGroup.tasks.forEach((task) => {
      const taskId = getLiveTaskId(task)
      const taskAnswer = answersArray.find(a => a.task_id === taskId)
      if (task.correct_answer != null && taskAnswer) {
        evalMap.set(taskId, evaluateTaskCorrectness(task, taskAnswer.answer, task.correct_answer))
      }
    })
    setLocalEvaluation(evalMap)

      ws.submitTaskGroup(
        currentTaskGroup.group_id,
        answersArray,
        currentTaskGroup.session_id || currentTaskGroup.live_session_id || undefined,
        currentClassId || undefined,
      )
    setSubmitted(true)
    // 立即显示本地评判结果，不等服务端
    if (evalMap.size > 0) {
      setShowResult(true)
    }
  }

  const buildChallengeAnswers = useCallback((challenge: LiveChallengeSession) => {
    return challenge.tasks.reduce<{ task_id: string; answer: unknown }[]>((accumulator, task) => {
      const taskId = getLiveTaskId(task)
      if (!taskId) {
        return accumulator
      }
      const answer = buildTaskAnswerFromAnswerMap(task, answers)
      const shouldInclude = hasTaskAnswer(answer)
      if (shouldInclude) {
        accumulator.push({ task_id: taskId, answer })
      }
      return accumulator
    }, [])
  }, [answers])

  const handleSubmitChallenge = useCallback(() => {
    if (
      !currentChallenge
      || challengeSubmitted
      || challengeSubmitState === 'submitting'
      || !challengeParticipant
      || isChallengeFinished(currentChallenge)
    ) {
      return
    }
    const challengeAnswers = buildChallengeAnswers(currentChallenge)
    if (challengeAnswers.length === 0) {
      setChallengeSubmitState('error')
      setChallengeSubmitMessage(t('challenge.submitChallengeNoAnswer'))
      return
    }
    setChallengeSubmitState('submitting')
    setChallengeSubmitMessage(t('challenge.submitChallengePending'))
    // 本地即时评判挑战答案
    const evalMap = new Map<string, boolean | null>()
    currentChallenge.tasks.forEach((task) => {
      const taskId = getLiveTaskId(task)
      const taskAnswer = challengeAnswers.find(a => a.task_id === taskId)
      if (task.correct_answer != null && taskAnswer) {
        evalMap.set(taskId, evaluateTaskCorrectness(task, taskAnswer.answer, task.correct_answer))
      }
    })
    setLocalEvaluation(evalMap)
    // 乐观更新：本地评判完成即显示结果，不等服务端确认
    setChallengeSubmitState('submitted')
    setChallengeSubmitted(true)
    ws.submitChallenge(currentChallenge.id, challengeAnswers, challengeStartTimeRef.current || null)
  }, [buildChallengeAnswers, challengeParticipant, challengeSubmitted, challengeSubmitState, currentChallenge, t, ws])

  const submitSingleQuestionDuelAnswer = useCallback((taskId: string, answer: string) => {
    if (
      !currentChallenge
      || !challengeParticipant
      || !isSingleQuestionDuelChallenge(currentChallenge)
      || challengeSubmitted
      || challengeSubmitState === 'submitting'
      || isChallengeFinished(currentChallenge)
      || challengeIntroCountdown > 0
    ) {
      return
    }
    setChallengeSubmitState('submitting')
    setChallengeSubmitMessage(t('challenge.singleQuestionAnswerLocked'))
    // 本地即时评判单题抢答
    const task = currentChallenge?.tasks.find(t => getLiveTaskId(t) === taskId)
    if (task?.correct_answer != null) {
      const isCorrect = evaluateTaskCorrectness(task, answer, task.correct_answer)
      const evalMap = new Map<string, boolean | null>([[taskId, isCorrect]])
      setLocalEvaluation(evalMap)
    }
    ws.submitChallenge(
      currentChallenge.id,
      [{ task_id: taskId, answer }],
      challengeStartTimeRef.current || null,
    )
  }, [
    challengeIntroCountdown,
    challengeSubmitState,
    challengeSubmitted,
    currentChallenge,
    challengeParticipant,
    t,
    ws,
  ])

  const handleSelectAnswer = (taskId: string, answer: string, taskType?: string) => {
    const canUpdateAnswer = (
      !submitted
      && !challengeSubmitted
      && challengeSubmitState !== 'submitting'
      && challengeSubmitState !== 'submitted'
      && challengeIntroCountdown === 0
      && (Boolean(currentChallenge) || timeLeft > 0)
    )
    if (canUpdateAnswer) {
        setAnswers(prev => {
          const newAnswers = new Map(prev)
          if (taskType === 'multiple_choice') {
          // 多选题：切换选择状态
          const currentAnswers = newAnswers.get(taskId)
          if (currentAnswers) {
            const answersArray = currentAnswers.split(',')
            if (answersArray.includes(answer)) {
              // 如果已选中，则取消选择
              const filtered = answersArray.filter(a => a !== answer)
              if (filtered.length === 0) {
                newAnswers.delete(taskId)
              } else {
                newAnswers.set(taskId, filtered.join(','))
              }
            } else {
              // 如果未选中，则添加选择
              newAnswers.set(taskId, [...answersArray, answer].join(','))
            }
          } else {
            // 首次选择
            newAnswers.set(taskId, answer)
          }
        } else {
          // 单选题：直接替换
          newAnswers.set(taskId, answer)
        }
        return newAnswers
        })
        if (currentChallenge && isSingleQuestionDuelChallenge(currentChallenge)) {
          submitSingleQuestionDuelAnswer(taskId, answer)
        }
    }
  }

  // 提交单题（向后兼容）
  const handleSubmit = () => {
    if (!selectedAnswer || submitted) return

    ws.submitAnswer(selectedAnswer, taskStartTimeRef.current)
    setSubmitted(true)
  }

  const handleSelectOption = (key: string) => {
    if (!submitted && timeLeft > 0) {
      setSelectedAnswer(key)
    }
  }

  // 计算已回答的题目数
  const getAnsweredCount = () => {
    if (!currentTaskGroup) return 0
    return currentTaskGroup.tasks.filter(task => {
      const taskId = getLiveTaskId(task)
      if (isReadingTask(task)) {
        return !readingAnswerRequired(task) || String(answers.get(taskId) || '').trim() !== ''
      }
      if (taskSupportsBlanks(task.type) && task.question.blanks) {
        // 多填空题 - 检查是否每个空都有答案
        return task.question.blanks.every((_: any, idx: number) => {
          const answer = answers.get(`${taskId}_blank_${idx}`)
          return answer !== undefined && answer.trim() !== ''
        })
      }
      if (taskSupportsPairs(task.type) && task.question.pairs) {
        // 配对题 - 检查是否所有原始右侧项都已配对
        return task.question.pairs.every((_: any, originalRightIdx: number) =>
          answers.get(`${taskId}_right_${originalRightIdx}`) !== undefined
        )
      }
      if (taskSupportsSorting(task.type)) {
        const answer = answers.get(taskId)
        return answer !== undefined && answer !== ''
      }
      // 单选题、多选题、判断题、单填空 - 检查主key
      const answer = answers.get(taskId)
      return answer !== undefined && answer !== ''
    }).length
  }

  const getChallengeAnsweredCount = useCallback(() => {
    if (!currentChallenge) return 0
    return currentChallenge.tasks.filter((task) => {
      const answer = buildTaskAnswerFromAnswerMap(task, answers)
      return hasTaskAnswer(answer)
    }).length
  }, [answers, currentChallenge])

  useEffect(() => {
    if (
      !currentChallenge
      || !challengeParticipant
      || challengeSubmitted
      || challengeSubmitState === 'submitting'
      || isSingleQuestionDuelChallenge(currentChallenge)
    ) {
      return
    }
    const challengeAnswers = buildChallengeAnswers(currentChallenge)
    const answeredCount = getChallengeAnsweredCount()
    const progressKey = JSON.stringify({
      challengeId: currentChallenge.id,
      currentIndex: challengeQuestionIndex,
      answeredCount,
      startedAt: challengeStartTimeRef.current || null,
      answers: challengeAnswers,
    })
    if (lastChallengeProgressKeyRef.current === progressKey) {
      return
    }
    lastChallengeProgressKeyRef.current = progressKey
    ws.updateChallengeProgress(
      currentChallenge.id,
      challengeQuestionIndex,
      answeredCount,
      challengeStartTimeRef.current || null,
      challengeAnswers,
      false,
    )
  }, [buildChallengeAnswers, challengeParticipant, challengeQuestionIndex, challengeSubmitState, challengeSubmitted, currentChallenge, getChallengeAnsweredCount, ws])

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Shared share overlay - visible in ALL views
  const shareOverlay = (
    <>
      {/* Broadcast shares - larger cards */}
      {broadcastShares.length > 0 && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[1100] space-y-3 max-w-lg w-full px-4">
          {broadcastShares.map((share, idx) => (
            <div key={share.share_id + idx} className="bg-white rounded-2xl shadow-xl p-5 border border-amber-100/60" style={{ animation: 'slideIn 0.3s ease-out' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-base font-bold text-amber-700 shadow-sm">{share.shared_by?.[0] || '?'}</div>
                <span className="text-base font-semibold text-gray-800">{tWithParams('classroomShare.sharedBy', { name: share.shared_by })}</span>
                <button onClick={() => setBroadcastShares((prev) => prev.filter((_, i) => i !== idx))} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-sm">✕</button>
              </div>
              {share.content_type === 'image' && share.image_url && (
                <img
                  src={share.image_url}
                  alt="分享"
                  className="rounded-xl w-full max-h-72 object-contain mb-3 cursor-pointer hover:opacity-90 transition-opacity bg-gray-50"
                  onClick={() => setLightboxUrl(share.image_url!)}
                />
              )}
              {share.content && <p className="text-base leading-relaxed text-gray-700 mb-2">{share.content}</p>}
              {share.teacher_comment && <p className="text-sm text-amber-700 mt-2 bg-amber-50 rounded-xl p-3 leading-relaxed">{tWithParams('classroomShare.teacherComment', { comment: share.teacher_comment })}</p>}
            </div>
          ))}
        </div>
      )}
      {sharePending && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-amber-50 border border-amber-200 text-amber-800 px-5 py-3 rounded-2xl text-sm shadow-lg font-medium">{t('classroomShare.waitingReview')}</div>
      )}
      {/* 统一悬浮球 */}
      <div className="fixed bottom-6 right-6 z-50">
        {fabOpen && (
          <div className="absolute bottom-16 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" style={{ minWidth: '160px' }}>
            {danmu.config.enabled && (
              <button
                onClick={() => { danmu.openDanmuModal(); setFabOpen(false) }}
                disabled={ws.status !== 'connected'}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="text-lg">🎆</span>
                <span className="font-medium text-gray-700">{t('danmu.send')}</span>
              </button>
            )}
            <button
              onClick={() => { setShowShareModal(true); setFabOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-50 transition-colors border-t border-gray-100"
            >
              <span className="text-lg">✋</span>
              <span className="font-medium text-gray-700">{t('classroomShare.raiseHand')}</span>
            </button>
            {settings?.enabled && (
              <button
                onClick={() => { setAiContext({ class_id: currentClassId || '', session_id: ws.roomInfo?.session_id || undefined }); loadSettings(currentClassId || ''); setAiOpen(true); setFabOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors border-t border-gray-100"
              >
                <span className="text-lg">🤖</span>
                <span className="font-medium text-gray-700">AI 助手</span>
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg hover:from-pink-400 hover:to-rose-400 transition-all hover:scale-110 flex items-center justify-center overflow-hidden"
          style={{ boxShadow: '0 4px 20px rgba(236, 72, 153, 0.4)' }}
        >
          {fabOpen ? (
            <span className="text-2xl">✕</span>
          ) : (
            <img src="/logo.png" alt="菜单" className="w-8 h-8 rounded-lg object-contain" />
          )}
        </button>
      </div>
      {/* 弹幕发送弹窗 */}
      {danmu.showDanmuModal && (
        <div className="fixed inset-0 z-[1400] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => closeDanmuModal()}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg sm:p-6 p-5 pb-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center"><span className="text-xl">🎆</span></div>
              <h3 className="text-xl font-bold text-gray-800">{t('danmu.send')}</h3>
              <button onClick={() => closeDanmuModal()} className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">✕</button>
            </div>
            <div className="mb-4">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">{t('danmu.presets')}</div>
              <div className="flex flex-wrap gap-2">
                {danmuPresetPhrases.map((phrase) => (
                  <button key={phrase} onClick={() => setDanmuInput(phrase)} className="px-3 py-1.5 rounded-full bg-pink-50 border border-pink-200 text-pink-600 text-sm hover:bg-pink-100 transition-colors">{phrase}</button>
                ))}
              </div>
            </div>
            <textarea value={danmu.danmuInput} onChange={e => setDanmuInput(e.target.value.slice(0, 50))} placeholder={t('danmu.placeholder')} className="w-full border-2 border-gray-200 focus:border-pink-400 rounded-2xl p-4 text-base resize-none focus:outline-none transition-colors" rows={3} autoFocus />
            <div className="flex items-center justify-between mt-1 mb-4">
              <span className="text-xs text-gray-400">{danmu.danmuInput.length}/50</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => closeDanmuModal()} className="flex-1 ghost-button py-3">{t('common.cancel')}</button>
              <button
                onClick={handleSendDanmu}
                disabled={(!danmu.danmuInput.trim() && danmuCooldown === 0) || ws.status !== 'connected' || danmuCooldown > 0}
                className={`flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${danmuCooldown > 0 ? 'opacity-70' : 'hover:from-pink-400 hover:to-rose-400'}`}
              >
                {danmuCooldown > 0 ? `${danmuCooldown}秒后可再发` : t('danmu.sendButton')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1100] flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg sm:p-8 p-6 pb-8 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">{t('classroomShare.raiseHand')}</h3>
              <button onClick={() => setShowShareModal(false)} className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">✕</button>
            </div>
            <textarea
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              placeholder={t('classroomShare.placeholder')}
              className="w-full border-2 border-gray-200 focus:border-amber-400 rounded-2xl p-4 text-base resize-none focus:outline-none transition-colors"
              rows={5}
              autoFocus
            />
            <div className="mt-4">
              <label className="flex items-center justify-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm text-gray-500 hover:bg-amber-50 hover:border-amber-300 cursor-pointer transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 8h.01" /></svg>
                <span className="font-medium">{t('classroomShare.sendImage')}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleShareImageChange} />
              </label>
            </div>
            {shareImagePreview && (
              <div className="mt-4 relative inline-block w-full">
                <img src={shareImagePreview} alt="preview" className="rounded-2xl max-h-48 w-full object-contain bg-gray-50" />
                <button
                  onClick={() => { setShareImageFile(null); setShareImagePreview(null) }}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-7 h-7 text-sm flex items-center justify-center transition-colors"
                >✕</button>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowShareModal(false)} className="flex-1 ghost-button py-3">{t('common.cancel')}</button>
              <button onClick={handleSendShare} disabled={shareSending || (!shareText.trim() && !shareImageFile)} className="flex-1 solid-button py-3 disabled:opacity-50 disabled:cursor-not-allowed">{shareSending ? '...' : t('classroomShare.sendText')}</button>
            </div>
          </div>
        </div>
      )}
      {/* Image lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="放大查看"
            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center text-xl transition-colors"
          >✕</button>
        </div>
      )}
    </>
  )
  const classroomAtmosphere = <AtmosphereEffects effects={activeEffects} />
  const classroomDanmu = <DanmuScreen activeDanmus={danmu.activeDanmus} config={danmu.config} />

  if (challengeResult) {
    const myEntry = getChallengeEntryForStudent(challengeResult, user?.id)
    const myEntrySubmitted = myEntry ? hasChallengeEntryFinalSubmission(myEntry) : false
    const challengeWinner = getSingleQuestionWinnerEntry(challengeResult)
    const isSingleQuestionResult = isSingleQuestionDuelChallenge(challengeResult)
    const myWonSingleQuestion = Boolean(isSingleQuestionResult && myEntry && challengeWinner?.student_id === myEntry.student_id)
    const myLostSingleQuestion = Boolean(isSingleQuestionResult && myEntry && challengeWinner && challengeWinner.student_id !== myEntry.student_id)
    const singleQuestionDraw = Boolean(isSingleQuestionResult && !challengeWinner)
    return (
      <Layout>
        {shareOverlay}
        {classroomAtmosphere}
        {classroomDanmu}
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white py-6 px-4">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="student-card text-center">
              <ChallengeStateIcon kind="finished" />
              {selectedClassName && (
                <p className="text-sm text-gray-500 mb-2">班级：{selectedClassName}</p>
              )}
              <h2 className="text-2xl font-display font-bold mb-2">{currentChallenge?.title || challengeResult.title}</h2>
              <p className="text-muted mb-4">
                {challengeResult.mode === 'single_question_duel'
                  ? t('challenge.singleQuestionDuelFinished')
                  : challengeResult.mode === 'duel'
                    ? t('challenge.duelFinished')
                    : t('challenge.classChallengeFinished')}
              </p>
              {isSingleQuestionResult && (
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                  {myWonSingleQuestion
                    ? t('challenge.singleQuestionWinDetail')
                    : myLostSingleQuestion
                      ? t('challenge.singleQuestionLoseDetail')
                      : singleQuestionDraw
                        ? t('challenge.singleQuestionDrawDetail')
                        : t('challenge.myResultPending')}
                </p>
              )}
              {myEntry && myEntrySubmitted ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {tWithParams('challenge.myResultSummary', {
                    rank: myEntry.rank ?? '-',
                    correct: myEntry.correct_count,
                    total: myEntry.total_tasks,
                  })}
                </p>
              ) : (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {t('challenge.myResultPending')}
                </p>
              )}
            </div>

            <div className="student-card">
              <h3 className="font-display font-semibold text-lg mb-4">{t('challenge.scoreboard')}</h3>
                <div className="space-y-3">
                  {challengeResult.scoreboard.map((entry) => {
                  const entrySubmitted = hasChallengeEntryFinalSubmission(entry)
                  const isWinner = challengeWinner?.student_id === entry.student_id
                  return (
                  <div key={entry.student_id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(24,36,58,0.08)' }}>
                    <div>
                      <div className="font-medium">
                        {entry.rank ?? '-'} · {entry.student_name}
                        {isWinner && <span className="ml-2 text-emerald-600 text-sm">{t('challenge.winner')}</span>}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--muted)' }}>
                        {entrySubmitted
                          ? `${entry.correct_count} / ${entry.total_tasks}`
                          : entry.eliminated_for_round
                            ? t('challenge.failedThisRound')
                            : t('challenge.notSubmitted')}
                      </div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--muted)' }}>
                      {entrySubmitted && entry.total_time_ms ? `${(entry.total_time_ms / 1000).toFixed(1)}s` : t('challenge.notSubmitted')}
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (currentChallenge) {
    const currentChallengeTask = currentChallenge.tasks[challengeQuestionIndex]
    const answeredCount = getChallengeAnsweredCount()
    const myChallengeEntry = getChallengeEntryForStudent(currentChallenge, user?.id)
    const isSingleQuestionMode = isSingleQuestionDuelChallenge(currentChallenge)
    const challengeWinner = getSingleQuestionWinnerEntry(currentChallenge)
    const singleQuestionResolved = Boolean(
      isChallengeFinished(currentChallenge)
      || challengeWinner
      || currentChallenge.round_status === 'draw'
      || currentChallenge.scoreboard.every((entry) => hasChallengeEntryFinalSubmission(entry)),
    )
    const singleQuestionDraw = Boolean(isSingleQuestionMode && singleQuestionResolved && !challengeWinner)
    const mySingleQuestionWon = Boolean(isSingleQuestionMode && myChallengeEntry && challengeWinner?.student_id === myChallengeEntry.student_id)
    const mySingleQuestionLost = Boolean(isSingleQuestionMode && myChallengeEntry && challengeWinner && challengeWinner.student_id !== myChallengeEntry.student_id)
    const mySingleQuestionFailed = Boolean(isSingleQuestionMode && myChallengeEntry?.eliminated_for_round && !challengeWinner)
    const singleQuestionInteractionLocked = Boolean(
      isSingleQuestionMode && (
        challengeIntroCountdown > 0
        || isChallengeFinished(currentChallenge)
        || mySingleQuestionWon
        || mySingleQuestionLost
        || mySingleQuestionFailed
        || singleQuestionDraw
      ),
    )

    if (!challengeParticipant) {
      return (
        <Layout>
        {shareOverlay}
        {classroomAtmosphere}
        {classroomDanmu}
          <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white py-6 px-4">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="student-card text-center">
                <ChallengeStateIcon kind="spectator" />
                {selectedClassName && (
                  <p className="text-sm text-gray-500 mb-2">班级：{selectedClassName}</p>
                )}
                <h2 className="text-2xl font-display font-bold mb-2">{currentChallenge.title}</h2>
                <p className="text-muted">
                  {isSingleQuestionMode ? t('challenge.spectatorWaitingSingleQuestion') : t('challenge.spectatorMode')}
                </p>
                {isSingleQuestionMode && (
                  <p className="text-sm mt-3" style={{ color: 'var(--muted)' }}>
                    {t('challenge.singleQuestionSpectatorDetail')}
                  </p>
                )}
              </div>
              <div className="student-card">
                <h3 className="font-display font-semibold text-lg mb-4">{t('challenge.scoreboard')}</h3>
                <div className="space-y-3">
                  {currentChallenge.scoreboard.map((entry) => (
                    <div key={entry.student_id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(24,36,58,0.08)' }}>
                      <div className="font-medium">{entry.rank ?? '-'} · {entry.student_name}</div>
                      <div className="text-sm" style={{ color: 'var(--muted)' }}>
                        {entry.correct_count} / {entry.total_tasks}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Layout>
      )
    }

    return (
      <Layout>
        {shareOverlay}
        {classroomAtmosphere}
        {classroomDanmu}
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white py-4">
          <div className="sticky top-0 z-10 bg-white shadow-sm border-b">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
              <div>
                {selectedClassName && (
                  <p className="text-xs text-gray-400 mb-1">班级：{selectedClassName}</p>
                )}
                <h1 className="font-display font-bold text-lg">{currentChallenge.title}</h1>
                <p className="text-sm text-gray-500">
                  {isSingleQuestionMode
                    ? t('challenge.singleQuestionTaskLabel')
                    : tWithParams('challenge.questionProgress', {
                        current: challengeQuestionIndex + 1,
                        total: currentChallenge.tasks.length,
                      })}
                </p>
              </div>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                {isSingleQuestionMode
                  ? `${formatTime(challengeTimeLeft)}`
                  : tWithParams('challenge.answerProgress', { answered: answeredCount, total: currentChallenge.tasks.length })}
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {challengeIntroCountdown > 0 && (
              <div className="student-card text-center">
                <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>{t('challenge.challengeStartingSoon')}</p>
                <div className="text-4xl font-display font-bold" style={{ color: 'var(--ink)' }}>
                  {tWithParams('challenge.startCountdown', { count: challengeIntroCountdown })}
                </div>
              </div>
            )}

            {isSingleQuestionMode && challengeIntroCountdown === 0 && (
              <div className="student-card">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-display font-semibold text-lg">{t('challenge.singleQuestionResult')}</h3>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      {mySingleQuestionWon
                        ? t('challenge.singleQuestionWon')
                        : mySingleQuestionLost
                          ? t('challenge.singleQuestionLost')
                          : mySingleQuestionFailed
                            ? t('challenge.failedThisRound')
                            : singleQuestionDraw
                              ? t('challenge.singleQuestionDraw')
                              : currentChallenge.round_status === 'waiting'
                                ? t('challenge.waitingOpponent')
                                : t('challenge.roundActive')}
                    </p>
                  </div>
                  {currentChallenge.round_status === 'won' || singleQuestionResolved ? (
                    <span className="status-badge correct">{t('challenge.roundResolved')}</span>
                  ) : (
                    <span className="status-badge active">
                      {mySingleQuestionFailed ? t('challenge.waitingOpponent') : t('challenge.roundActive')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {currentChallengeTask && (
              <StudentTaskQuestionCard
                task={currentChallengeTask}
                index={challengeQuestionIndex}
                answers={answers}
                submitted={challengeSubmitted || singleQuestionInteractionLocked || challengeIntroCountdown > 0}
                matchingLayout={matchingLayouts[getLiveTaskId(currentChallengeTask)]}
                sortingOrder={sortingLayouts[getLiveTaskId(currentChallengeTask)]}
                onSelectAnswer={handleSelectAnswer}
                onPatchAnswer={(key, value) => {
                  setAnswers((prev) => {
                    const nextAnswers = new Map(prev)
                    if (value === null) {
                      nextAnswers.delete(key)
                    } else {
                      nextAnswers.set(key, value)
                    }
                    return nextAnswers
                  })
                }}
              />
            )}

            <div className="student-card">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {isSingleQuestionMode ? (
                  <>
                    <div className="text-sm" style={{ color: 'var(--muted)' }}>
                      {challengeIntroCountdown > 0
                        ? t('challenge.challengeStartingSoon')
                        : mySingleQuestionWon
                          ? t('challenge.singleQuestionWinDetail')
                          : mySingleQuestionLost
                            ? t('challenge.singleQuestionLoseDetail')
                            : mySingleQuestionFailed
                              ? t('challenge.waitingOpponent')
                              : singleQuestionDraw
                                ? t('challenge.singleQuestionDrawDetail')
                                : tWithParams('challenge.answerProgress', { answered: answeredCount, total: currentChallenge.tasks.length })}
                    </div>
                    <button
                      className="solid-button"
                      disabled={challengeSubmitted || singleQuestionInteractionLocked || challengeIntroCountdown > 0}
                      onClick={handleSubmitChallenge}
                    >
                      {t('challenge.submitChallenge')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="ghost-button"
                      disabled={challengeQuestionIndex === 0 || challengeIntroCountdown > 0}
                      onClick={() => setChallengeQuestionIndex((prev) => Math.max(prev - 1, 0))}
                    >
                      {t('challenge.prevQuestion')}
                    </button>
                    {challengeQuestionIndex < currentChallenge.tasks.length - 1 ? (
                      <button
                        className="solid-button"
                        disabled={challengeIntroCountdown > 0}
                        onClick={() => setChallengeQuestionIndex((prev) => Math.min(prev + 1, currentChallenge.tasks.length - 1))}
                      >
                        {t('challenge.nextQuestion')}
                      </button>
                    ) : (
                      <button className="solid-button" disabled={challengeSubmitted || challengeIntroCountdown > 0} onClick={handleSubmitChallenge}>
                        {t('challenge.submitChallenge')}
                      </button>
                    )}
                  </>
                )}
              </div>
              {challengeSubmitMessage ? (
                <div
                  className="mt-3 text-sm"
                  style={{
                    color:
                      challengeSubmitState === 'error'
                        ? 'var(--danger)'
                        : challengeSubmitState === 'submitted'
                          ? 'var(--success)'
                          : 'var(--muted)',
                  }}
                >
                  {challengeSubmitMessage}
                </div>
              ) : null}
            </div>

            <div className="student-card">
              <h3 className="font-display font-semibold text-lg mb-4">{t('challenge.scoreboard')}</h3>
              <div className="space-y-3">
                {currentChallenge.scoreboard.map((entry) => (
                  <div key={entry.student_id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(24,36,58,0.08)' }}>
                    <div className="font-medium">{entry.rank ?? '-'} · {entry.student_name}</div>
                    <div className="text-sm" style={{ color: 'var(--muted)' }}>
                      {entry.answered_count} / {entry.total_tasks}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // Class selection dialog (only show when explicitly in selecting state with multiple classes)
  if (classLoadState === 'selecting' && showClassSelect && enrolledClasses.length > 1) {
    return (
      <Layout>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-6 text-center">选择班级</h2>
            <div className="space-y-3">
              {enrolledClasses.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => {
                    setCurrentClassId(cls.id)
                    setSelectedClassName(cls.name)
                    setShowClassSelect(false)
                    setClassLoadState('ready')
                    localStorage.setItem('last_student_class_id', cls.id)
                  }}
                  className="w-full text-left px-4 py-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <div className="font-semibold text-base">{cls.name}</div>
                  {cls.teacher_name && <div className="text-sm text-gray-500 mt-1">老师：{cls.teacher_name}</div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // No class enrolled
  if (!currentClassId && classLoadState === 'loading') {
    return (
      <Layout>
        {shareOverlay}
        {classroomAtmosphere}
        {classroomDanmu}
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white flex items-center justify-center p-4">
          <div className="student-card max-w-md w-full text-center">
            <img src="/logo.png" alt="胖鼠互动课堂系统" className="mx-auto mb-4" style={{ width: 48, height: 48, borderRadius: 12 }} />
            <h2 className="text-2xl font-display font-bold mb-2">{t('studentLive.waitingForTask')}</h2>
            <p className="text-muted mb-6">
              {t('studentLive.taskWillAppear')}
            </p>
            <div className="online-indicator">
              <span className={`online-dot ${ws.status === 'connected' ? 'active' : ''}`} />
              <span className="text-sm text-gray-500">
                {t('connection.waiting')}
              </span>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!currentClassId) {
    return (
      <Layout>
        {shareOverlay}
        {classroomAtmosphere}
        {classroomDanmu}
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white flex items-center justify-center p-4">
          <div className="student-card max-w-md w-full text-center">
            <img src="/logo.png" alt="胖鼠互动课堂系统" className="mx-auto mb-4" style={{ width: 48, height: 48, borderRadius: 12 }} />
            <h2 className="text-2xl font-display font-bold mb-2">{t('studentLive.noClassJoined')}</h2>
            <p className="text-muted mb-6">
              {t('studentLive.joinClassPrompt')}
            </p>
            <a href="/join" className="solid-button">
              {t('studentLive.joinClass')}
            </a>
          </div>
        </div>
      </Layout>
    )
  }

  // Session not started — teacher hasn't clicked "开始本节课"
  if (sessionNotStarted) {
    return (
      <Layout>
        {shareOverlay}
        {classroomAtmosphere}
        {classroomDanmu}
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
          <div className="student-card max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-4xl mx-auto mb-6">
              ⏳
            </div>
            <h2 className="text-2xl font-display font-bold mb-3 text-amber-800">{t('studentLive.sessionNotStartedTitle')}</h2>
            <p className="text-amber-700 mb-6 text-sm leading-relaxed">
              {t('studentLive.sessionNotStartedDesc')}
            </p>
            <button
              onClick={() => {
                setSessionNotStarted(false)
                ws.connect()
              }}
              className="solid-button"
            >
              {t('studentLive.retryConnect')}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  // No active task
  if (!currentTaskGroup && !currentTask) {
    return (
      <Layout>
        {shareOverlay}
        {classroomAtmosphere}
        {classroomDanmu}
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white flex items-center justify-center p-4">
          <div className="student-card max-w-md w-full text-center">
            <img src="/logo.png" alt="胖鼠互动课堂系统" className="mx-auto mb-4" style={{ width: 48, height: 48, borderRadius: 12 }} />
            {selectedClassName && (
              <p className="text-sm text-gray-500 mb-2">班级：{selectedClassName}</p>
            )}
            <span className="card-tag mb-4 inline-block">{connectionStatus}</span>
            <h2 className="text-2xl font-display font-bold mb-2">{t('studentLive.waitingForTask')}</h2>
            <p className="text-muted mb-6">
              {t('studentLive.taskWillAppear')}
            </p>
            <div className="online-indicator">
              <span className={`online-dot ${ws.status === 'connected' ? 'active' : ''}`} />
              <span className="text-sm text-gray-500">
                {ws.status === 'connected' ? t('connection.connected') : t('connection.disconnected')}
              </span>
            </div>
          </div>

        </div>
      </Layout>
    )
  }

  // Show result after task ended (整组任务)
  if (showResult && currentTaskGroup) {
    const totalTasks = currentTaskGroup.tasks.length
    const correctCount = (() => {
      // 优先使用服务端结果
      if (taskResults.length > 0) {
        return taskResults.filter((result, index) => {
          const task = currentTaskGroup.tasks[index]
          const studentAnswer = buildTaskAnswerFromAnswerMap(task, answers)
          return evaluateTaskCorrectness(task, studentAnswer, result.correct_answer) === true
        }).length
      }
      // 回退到本地评判
      let count = 0
      currentTaskGroup.tasks.forEach((task) => {
        const taskId = getLiveTaskId(task)
        const localResult = localEvaluation.get(taskId)
        if (localResult === true) count++
      })
      return count
    })()

    return (
      <Layout>
        {shareOverlay}
        {classroomAtmosphere}
        {classroomDanmu}
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white py-6 px-4">
          <div className="max-w-3xl mx-auto">
            {/* 结果头部 */}
            <div className="student-card mb-6 text-center">
              <div className="result-icon large correct mb-4">✓</div>
              <h2 className="text-2xl font-display font-bold mb-2">{t('studentLive.taskCompleted')}</h2>
              <p className="text-muted">
                {tWithParams('studentLive.answeredCorrect', { correct: correctCount, total: totalTasks })}
              </p>
            </div>

            {/* 每道题的结果 */}
            <div className="space-y-4">
              {currentTaskGroup.tasks.map((task, index) => {
                const taskId = getLiveTaskId(task)
                const localCorrect = localEvaluation.get(taskId)
                // 当有本地评判但尚无服务端结果时，构建合成 result
                const syntheticResult = taskResults[index]
                  ?? (localCorrect != null ? { task_id: taskId, correct_answer: task.correct_answer, is_correct: localCorrect } : undefined)
                return (
                  <StudentTaskResultCard
                    key={task.task_id}
                    task={task}
                    index={index}
                    result={syntheticResult}
                    answers={answers}
                  />
                )
              })}
            </div>

            <div className="text-center mt-6">
              <p className="text-muted mb-2">{t('taskLiveUI.waitTeacherDismiss')}</p>
              <p className="text-sm text-gray-400 mb-4">{t('taskLiveUI.teacherDismissHint')}</p>
              <button className="ghost-button" onClick={() => navigate('/student')}>
                {t('studentLive.returnHome')}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // 整组任务 - 学生答题界面
  if (currentTaskGroup) {
    const totalTasks = currentTaskGroup.tasks.length
    const answeredCount = getAnsweredCount()
    const progressPercent = (answeredCount / totalTasks) * 100

    return (
      <Layout>
        {shareOverlay}
        {classroomAtmosphere}
        {classroomDanmu}
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white py-4">
          {/* 顶部进度栏 */}
          <div className="sticky top-0 z-10 bg-white shadow-sm border-b">
            <div className="max-w-3xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  {selectedClassName && (
                    <p className="text-xs text-gray-400 mb-1">班级：{selectedClassName}</p>
                  )}
                  <h1 className="font-display font-bold text-lg">{currentTaskGroup.title}</h1>
                  <p className="text-sm text-gray-500">
                    {tWithParams('task.answeredCount', { answered: answeredCount, total: totalTasks })}
                  </p>
                </div>
                <div className={`timer-pill ${timeLeft <= 30 ? 'warning' : ''}`}>
                  <span className="timer-icon">⏱</span>
                  <span className="timer-text">{formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* 进度条 */}
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* 题目列表 */}
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {currentTaskGroup.tasks.map((task, index) => (
              <StudentTaskQuestionCard
                key={task.task_id}
                task={task}
                index={index}
                answers={answers}
                submitted={submitted}
                matchingLayout={matchingLayouts[getLiveTaskId(task)]}
                sortingOrder={sortingLayouts[getLiveTaskId(task)]}
                onSelectAnswer={handleSelectAnswer}
                onPatchAnswer={(key, value) => {
                  setAnswers(prev => {
                    const nextAnswers = new Map(prev)
                    if (value === null) {
                      nextAnswers.delete(key)
                    } else {
                      nextAnswers.set(key, value)
                    }
                    return nextAnswers
                  })
                }}
              />
            ))}

            {/* 底部提交按钮 */}
            <div className="sticky bottom-4">
              {submitted ? (
                <div className="student-card text-center py-4">
                  <span className="check-icon large">✓</span>
                  <p className="text-lg font-semibold">{t('taskLiveUI.waitingForResult')}</p>
                </div>
              ) : (
                <button
                  className="solid-button wide-button large"
                  onClick={handleSubmitTaskGroup}
                  disabled={timeLeft === 0}
                >
                  {timeLeft === 0 ? t('taskLiveUI.timeUp') : tWithParams('taskLiveUI.submitAnswers', { answered: answeredCount, total: totalTasks })}
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // 单题模式（向后兼容）
  // Show result after task ended
  if (showResult && currentTask) {
    const isCorrect = selectedAnswer === currentTask.question.correct_answer
    return (
      <Layout>
        {shareOverlay}
        {classroomAtmosphere}
        {classroomDanmu}
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white flex items-center justify-center p-4">
          <div className="student-card max-w-lg w-full">
            <div className="text-center mb-6">
              <div className={`result-icon ${isCorrect ? 'correct' : 'incorrect'}`}>
                {isCorrect ? '✓' : '✗'}
              </div>
              <h2 className="text-2xl font-display font-bold mt-4">
                {isCorrect ? t('task.isCorrect') : `${t('task.isWrong')} ${currentTask.question.correct_answer}`}
              </h2>
            </div>

            <div className="question-preview-card">
              <div className="question-text">
                <TaskRichTextOrPlain content={currentTask.question?.text} />
              </div>
              {currentTask.question.options && (
                <div className="option-list">
                  {currentTask.question.options.map((opt) => (
                    <div
                      key={opt.key}
                      className={`option-line ${
                        opt.key === currentTask.question.correct_answer
                          ? 'correct'
                          : opt.key === selectedAnswer && opt.key !== currentTask.question.correct_answer
                          ? 'incorrect'
                          : ''
                      }`}
                    >
                      <span>{opt.key}</span>
                      <p><TaskRichTextOrPlain content={opt.text} /></p>
                      {opt.key === currentTask.question.correct_answer && (
                        <span className="correct-badge">{t('task.correctAnswer')}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-center mt-6">
              <p className="text-muted mb-4">{t('task.waitingForNext')}</p>
              <button className="ghost-button" onClick={() => navigate('/student')}>
                {t('task.returnHome')}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // Active task - student answering (单题模式)
  return (
    <>
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white flex items-center justify-center p-4">
        <div className="student-card max-w-lg w-full">
          {/* Timer */}
          <div className="timer-header mb-6">
            <div className={`timer-circle ${timeLeft <= 10 ? 'warning' : ''}`}>
              <span className="timer-number">{timeLeft}</span>
              <span className="timer-label">{t('task.seconds')}</span>
            </div>
          </div>

          {/* Question */}
          <div className="question-preview-card mb-6">
            <div className="question-text">
              <TaskRichTextOrPlain content={currentTask?.question?.text} />
            </div>

            {/* Options */}
            {currentTask?.question.options && (
              <div className="option-list">
                {currentTask.question.options.map((opt) => (
                  <div
                    key={opt.key}
                    className={`option-line ${selectedAnswer === opt.key ? 'selected' : ''} ${
                      submitted ? 'disabled' : ''
                    }`}
                    onClick={() => handleSelectOption(opt.key)}
                  >
                    <span>{opt.key}</span>
                    <p><TaskRichTextOrPlain content={opt.text} /></p>
                    {selectedAnswer === opt.key && <span className="selected-badge">{t('task.selected')}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* True/False */}
            {taskUsesBooleanAnswer(currentTask?.type) && (
              <div className="tf-options">
                {[
                  { key: 'true', label: t('task.trueOption') },
                  { key: 'false', label: t('task.falseOption') }
                ].map((opt) => (
                  <div
                    key={opt.key}
                    className={`tf-option ${selectedAnswer === opt.key ? 'selected' : ''} ${
                      submitted ? 'disabled' : ''
                    }`}
                    onClick={() => handleSelectOption(opt.key)}
                  >
                    <span>{opt.label}</span>
                    {selectedAnswer === opt.key && <span className="selected-badge">{t('task.selected')}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Fill in the blank */}
            {currentTask && taskSupportsBlanks(currentTask.type) && (
              <div className="fill-blank-container mt-4">
                {currentTask.question.blanks ? (
                  <div className="space-y-3">
                    {currentTask.question.blanks.map((_blank: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{t('task.blankLabel').replace('{{index}}', String(idx + 1))}</span>
                        <input
                          type="text"
                          className="fill-blank-input"
                          placeholder={t('task.inputAnswer')}
                          value={answers.get(`blank_${idx}`) || ''}
                          onChange={(e) => {
                            const value = e.target.value
                            setAnswers(prev => new Map(prev).set(`blank_${idx}`, value))
                          }}
                          disabled={submitted}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="fill-blank-input w-full"
                    placeholder={t('task.inputAnswer')}
                    value={selectedAnswer || ''}
                    onChange={(e) => handleSelectOption(e.target.value)}
                    disabled={submitted}
                  />
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="text-center">
            {submitted ? (
              <div className="submission-confirmed">
                <span className="check-icon">✓</span>
                <p className="text-lg font-semibold">{t('task.submitted')}</p>
              </div>
            ) : (
              <button
                className="solid-button wide-button"
                onClick={handleSubmit}
                disabled={!selectedAnswer || timeLeft === 0}
              >
                {timeLeft === 0 ? t('task.timeUp') : t('task.submitAnswer')}
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
    </>
  )
}
