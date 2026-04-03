import { useState, useCallback } from 'react'
import { liveTaskService, type LiveTaskGroup } from '../../../services/api'
import type { LiveChallengeSession } from '../types'

const SUPPORTED_CHALLENGE_TASK_TYPES = new Set([
  'single_choice',
  'multiple_choice',
  'fill_blank',
  'true_false',
  'matching',
  'sorting',
  'image_understanding',
])

const SUPPORTED_SINGLE_QUESTION_DUEL_TASK_TYPES = new Set([
  'single_choice',
  'true_false',
  'image_understanding',
  'error_correction',
])

interface UseChallengesOptions {
  currentClassId: string | null
  selectedGroup: LiveTaskGroup | null
  classPresence: {
    classroom_students?: { id: string; name: string }[]
    online_students?: { id: string; name: string }[]
  } | null
  ws: {
    startChallenge: (challengeId: string) => void
    endChallenge: (challengeId: string) => void
  }
}

export function useChallenges({
  currentClassId,
  selectedGroup,
  classPresence,
  ws,
}: UseChallengesOptions) {
  const [challengeCreating, setChallengeCreating] = useState(false)
  const [showDuelModal, setShowDuelModal] = useState(false)
  const [selectedDuelParticipants, setSelectedDuelParticipants] = useState<string[]>([])
  const [showSingleQuestionDuelModal, setShowSingleQuestionDuelModal] = useState(false)
  const [selectedSingleQuestionParticipants, setSelectedSingleQuestionParticipants] = useState<
    string[]
  >([])
  const [selectedSingleQuestionTaskId, setSelectedSingleQuestionTaskId] = useState<string | null>(
    null
  )
  const [showChallengeBoard, setShowChallengeBoard] = useState(false)

  const eligibleParticipantCount = classPresence?.classroom_students?.length
    ? classPresence.classroom_students.length
    : classPresence?.online_students?.length ?? 0

  const challengeCandidates = classPresence?.classroom_students?.length
    ? classPresence.classroom_students
    : classPresence?.online_students ?? []

  const singleQuestionDuelTasks =
    selectedGroup?.tasks?.filter((task) =>
      SUPPORTED_SINGLE_QUESTION_DUEL_TASK_TYPES.has(task.type)
    ) ?? []

  const unsupportedChallengeTypes = selectedGroup?.tasks?.length
    ? Array.from(
        new Set(
          selectedGroup.tasks
            .map((task) => task.type)
            .filter((type) => !SUPPORTED_CHALLENGE_TASK_TYPES.has(type))
        )
      )
    : []

  const hasSingleQuestionDuelTasks = singleQuestionDuelTasks.length > 0

  const createAndStartChallenge = useCallback(
    async (
      mode: 'single_question_duel' | 'duel' | 'class_challenge',
      participantIds?: string[],
      taskId?: string,
      onUnsupportedTypes?: (types: string[]) => void,
      onError?: (message: string) => void,
      onSuccess?: () => void
    ) => {
      if (!currentClassId || !selectedGroup || !selectedGroup.tasks?.length) {
        return
      }

      const supportedTaskTypes =
        mode === 'single_question_duel'
          ? SUPPORTED_SINGLE_QUESTION_DUEL_TASK_TYPES
          : SUPPORTED_CHALLENGE_TASK_TYPES
      const challengeTasks =
        mode === 'single_question_duel'
          ? selectedGroup.tasks.filter((task) => task.id === taskId)
          : selectedGroup.tasks

      const unsupportedTypes = Array.from(
        new Set(
          challengeTasks.map((task) => task.type).filter((type) => !supportedTaskTypes.has(type))
        )
      )

      if (unsupportedTypes.length > 0) {
        onUnsupportedTypes?.(unsupportedTypes)
        return
      }

      if (mode === 'single_question_duel' && !taskId) {
        onError?.('请选择一道题目')
        return
      }

      if (
        (mode === 'single_question_duel' || mode === 'duel') &&
        (!participantIds || participantIds.length !== 2)
      ) {
        onError?.('请选择两位参与者')
        return
      }

      if (mode === 'class_challenge' && eligibleParticipantCount < 1) {
        onError?.('没有符合条件的参与者')
        return
      }

      setChallengeCreating(true)
      try {
        const challenge = await liveTaskService.createChallenge({
          class_id: currentClassId,
          task_group_id: selectedGroup.id,
          mode,
          participant_ids: participantIds,
          task_id: taskId,
        })
        ws.startChallenge(challenge.id)
        onSuccess?.()
      } catch (error) {
        console.error('Failed to create challenge:', error)
        onError?.('创建竞技失败')
      } finally {
        setChallengeCreating(false)
      }
    },
    [currentClassId, selectedGroup, eligibleParticipantCount, ws]
  )

  const handleToggleDuelParticipant = useCallback((studentId: string) => {
    setSelectedDuelParticipants((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId)
      }
      if (prev.length >= 2) {
        return [...prev.slice(1), studentId]
      }
      return [...prev, studentId]
    })
  }, [])

  const handleToggleSingleQuestionParticipant = useCallback((studentId: string) => {
    setSelectedSingleQuestionParticipants((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId)
      }
      if (prev.length >= 2) {
        return [prev[1], studentId]
      }
      return [...prev, studentId]
    })
  }, [])

  const handleOpenChallengeBoard = useCallback(async () => {
    setShowChallengeBoard(true)
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen()
      } catch {
        // Ignore fullscreen request failures
      }
    }
  }, [])

  const handleCloseChallengeBoard = useCallback(async () => {
    setShowChallengeBoard(false)
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        // Ignore fullscreen exit failures
      }
    }
  }, [])

  const handleEndChallenge = useCallback(
    (currentChallenge: LiveChallengeSession | null) => {
      if (!currentChallenge) return
      ws.endChallenge(currentChallenge.id)
    },
    [ws]
  )

  const resetChallengeState = useCallback(() => {
    setShowDuelModal(false)
    setSelectedDuelParticipants([])
    setShowSingleQuestionDuelModal(false)
    setSelectedSingleQuestionParticipants([])
    setSelectedSingleQuestionTaskId(null)
    setShowChallengeBoard(false)
  }, [])

  return {
    // State
    challengeCreating,
    showDuelModal,
    selectedDuelParticipants,
    showSingleQuestionDuelModal,
    selectedSingleQuestionParticipants,
    selectedSingleQuestionTaskId,
    showChallengeBoard,

    // Derived data
    eligibleParticipantCount,
    challengeCandidates,
    singleQuestionDuelTasks,
    unsupportedChallengeTypes,
    hasSingleQuestionDuelTasks,

    // Setters
    setShowDuelModal,
    setSelectedDuelParticipants,
    setShowSingleQuestionDuelModal,
    setSelectedSingleQuestionParticipants,
    setSelectedSingleQuestionTaskId,
    setShowChallengeBoard,

    // Actions
    createAndStartChallenge,
    handleToggleDuelParticipant,
    handleToggleSingleQuestionParticipant,
    handleOpenChallengeBoard,
    handleCloseChallengeBoard,
    handleEndChallenge,
    resetChallengeState,
  }
}

export function formatChallengeDuration(totalTimeMs: number | null | undefined) {
  if (!totalTimeMs || totalTimeMs <= 0) return '--'
  const totalSeconds = totalTimeMs / 1000
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`
  }
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toFixed(1)}s`
}

export { SUPPORTED_CHALLENGE_TASK_TYPES, SUPPORTED_SINGLE_QUESTION_DUEL_TASK_TYPES }
