import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../../i18n/useTranslation'
import { getTaskTypeLabel } from '../../tasks/task-helpers'
import type { LiveTask, TaskHistoryItem } from '../types'
import { useTeacherLive } from './useTeacherLive'
import { useTaskGroups } from './useTaskGroups'
import { useChallenges } from './useChallenges'
import { useHistory } from './useHistory'

export function useTeacherLivePage() {
  const { t, tWithParams } = useTranslation()
  const navigate = useNavigate()

  // Main live hook
  const {
    currentClassId,
    classes,
    loading,
    error,
    roomInfo,
    classPresence,
    setClassPresence,
    currentTaskGroup,
    taskGroupSubmissions,
    taskGroupEnded,
    setTaskGroupSubmissions,
    setTaskGroupEnded,
    setCurrentTaskGroup,
    currentChallenge,
    setCurrentChallenge,
    pendingShareRequests,
    setPendingShareRequests,
    isWsReady,
    ws,
    handleClassChange,
    handleEndSession,
    handleEndTaskGroup,
  } = useTeacherLive()

  // Task groups hook
  const {
    taskGroups,
    selectedGroup,
    setSelectedGroup,
    setTaskGroups,
    loadGroupDetail,
    revertToDraft,
    loadClassPresence,
    loadTaskHistory,
    handlePublishGroup,
    handleEnterActiveTask,
  } = useTaskGroups({ currentClassId, currentTaskGroup, setTaskGroupSubmissions })

  // Challenges hook
  const {
    challengeCreating,
    showDuelModal,
    selectedDuelParticipants,
    showSingleQuestionDuelModal,
    selectedSingleQuestionParticipants,
    selectedSingleQuestionTaskId,
    showChallengeBoard,
    challengeCandidates,
    singleQuestionDuelTasks,
    unsupportedChallengeTypes,
    hasSingleQuestionDuelTasks,
    setShowDuelModal,
    setSelectedDuelParticipants,
    setShowSingleQuestionDuelModal,
    setSelectedSingleQuestionParticipants,
    setSelectedSingleQuestionTaskId,
    createAndStartChallenge,
    handleToggleDuelParticipant,
    handleToggleSingleQuestionParticipant,
    handleOpenChallengeBoard,
    handleCloseChallengeBoard,
    handleEndChallenge,
    resetChallengeState,
  } = useChallenges({ currentClassId, selectedGroup, classPresence, ws })

  // History hook
  const {
    taskHistory,
    selectedHistoryItem,
    showHistoryList,
    showHistoryPreviewExpanded,
    showHistoryAnalysis,
    showDetailView,
    viewingStudentDetail,
    historySearchQuery,
    analyticsData,
    analyticsLoading,
    submissionData,
    submissionLoading,
    setTaskHistory,
    setSelectedHistoryItem,
    setShowHistoryList,
    setShowHistoryPreviewExpanded,
    setHistorySearchQuery,
    setShowHistoryAnalysis,
    setShowDetailView,
    setViewingStudentDetail,
    formatHistoryItemTime,
    compareHistoryItems,
    getHistoryItemKey,
    isHistoryItemViewable,
  } = useHistory(currentClassId)

  // Load class presence periodically
  useEffect(() => {
    if (!currentClassId) return
    const loadPresence = async () => {
      const presence = await loadClassPresence(currentClassId)
      if (presence) setClassPresence(presence)
    }
    loadPresence()
    const intervalId = window.setInterval(loadPresence, 15000)
    return () => window.clearInterval(intervalId)
  }, [currentClassId, loadClassPresence, setClassPresence])

  // Load task history on mount
  useEffect(() => {
    if (!currentClassId) return
    loadTaskHistory(currentClassId).then((history) => {
      if (history.length > 0) setTaskHistory(history)
    })
  }, [currentClassId, loadTaskHistory, setTaskHistory])

  // Handle task group published
  const onTaskGroupPublished = useCallback((groupId: string, tasks: LiveTask[], title: string) => {
    setCurrentTaskGroup({ group_id: groupId, title, tasks, total_countdown: tasks.reduce((sum, t) => sum + t.countdown_seconds, 0) + 30 })
    setTaskGroupSubmissions(0)
    setTaskGroupEnded(false)
    setSelectedGroup(null)
    setTaskGroups((prev) => prev.filter((g) => g.id !== groupId))
    setTaskHistory((prev) => [...prev, { type: 'task_group', group_id: groupId, title, task_count: tasks.length, tasks, published_at: new Date().toISOString(), status: 'active', submissions: 0 }])
  }, [setCurrentTaskGroup, setTaskGroupSubmissions, setTaskGroupEnded, setSelectedGroup, setTaskGroups, setTaskHistory])

  // Handle publish
  const onPublish = useCallback(() => {
    if (!selectedGroup) return
    handlePublishGroup(selectedGroup, ws, () => {
      const tasks: LiveTask[] = selectedGroup.tasks!.map((task, index) => ({ task_id: task.id, type: task.type, question: task.question as any, countdown_seconds: task.countdown_seconds || 30, order: index + 1, correct_answer: task.correct_answer }))
      onTaskGroupPublished(selectedGroup.id, tasks, selectedGroup.title)
    }, alert)
  }, [selectedGroup, ws, onTaskGroupPublished, handlePublishGroup])

  // Handle start challenge
  const onStartChallenge = useCallback((mode: 'class_challenge' | 'duel' | 'single_question_duel', participantIds?: string[], taskId?: string) => {
    createAndStartChallenge(mode, participantIds, taskId, (types) => alert(tWithParams('challenge.unsupportedTypesAlert', { types: types.map((type) => getTaskTypeLabel(type, t, type)).join('、') })), alert, resetChallengeState)
  }, [createAndStartChallenge, t, tWithParams, resetChallengeState])

  // Handle confirm duel
  const onConfirmDuel = useCallback(() => {
    if (selectedDuelParticipants.length !== 2) return
    setShowDuelModal(false)
    onStartChallenge('duel', selectedDuelParticipants)
    setSelectedDuelParticipants([])
  }, [selectedDuelParticipants, onStartChallenge, setShowDuelModal, setSelectedDuelParticipants])

  // Handle confirm single question duel
  const onConfirmSingleQuestionDuel = useCallback(() => {
    if (selectedSingleQuestionParticipants.length !== 2 || !selectedSingleQuestionTaskId) return
    setShowSingleQuestionDuelModal(false)
    onStartChallenge('single_question_duel', selectedSingleQuestionParticipants, selectedSingleQuestionTaskId)
    setSelectedSingleQuestionParticipants([])
    setSelectedSingleQuestionTaskId(null)
  }, [selectedSingleQuestionParticipants, selectedSingleQuestionTaskId, onStartChallenge, setShowSingleQuestionDuelModal, setSelectedSingleQuestionParticipants, setSelectedSingleQuestionTaskId])

  // Handle enter active task
  const onEnterActiveTask = useCallback((item: TaskHistoryItem) => {
    handleEnterActiveTask(item, setSelectedGroup, setCurrentTaskGroup)
  }, [handleEnterActiveTask, setSelectedGroup, setCurrentTaskGroup])

  // Handle end active task
  const onEndActiveTask = useCallback((item: TaskHistoryItem) => {
    if (!window.confirm(tWithParams('live.endTaskConfirm', { title: item.title }))) return
    ws.endTaskGroup(item.group_id)
  }, [ws, tWithParams])

  // Flags
  const hasActiveChallenge = Boolean(currentChallenge && currentChallenge.status !== 'ended' && currentChallenge.status !== 'cancelled')
  const canStartStandardChallenge = Boolean(selectedGroup && selectedGroup.tasks?.length && ws.status === 'connected' && !currentTaskGroup && unsupportedChallengeTypes.length === 0 && !hasActiveChallenge)
  const canStartSingleQuestionDuel = Boolean(selectedGroup && hasSingleQuestionDuelTasks && ws.status === 'connected' && !currentTaskGroup && !hasActiveChallenge)
  const unsupportedChallengeLabels = unsupportedChallengeTypes.map((type) => getTaskTypeLabel(type, t, type))
  const getCurrentClassName = () => classes.find((c) => c.id === currentClassId)?.name || t('live.noClassSelected')

  return {
    // Translation & navigation
    t,
    tWithParams,
    navigate,

    // Loading & error states
    loading,
    error,

    // Class data
    currentClassId,
    classes,
    classPresence,
    roomInfo,
    getCurrentClassName,

    // Task groups
    taskGroups,
    selectedGroup,
    setSelectedGroup,
    setTaskGroups,
    loadGroupDetail,
    revertToDraft,
    handlePublishGroup,

    // Current task group
    currentTaskGroup,
    taskGroupSubmissions,
    taskGroupEnded,
    setCurrentTaskGroup,

    // Challenges
    currentChallenge,
    setCurrentChallenge,
    challengeCreating,
    showDuelModal,
    selectedDuelParticipants,
    showSingleQuestionDuelModal,
    selectedSingleQuestionParticipants,
    selectedSingleQuestionTaskId,
    showChallengeBoard,
    challengeCandidates,
    singleQuestionDuelTasks,
    hasActiveChallenge,
    canStartStandardChallenge,
    canStartSingleQuestionDuel,
    unsupportedChallengeLabels,
    setShowDuelModal,
    setSelectedDuelParticipants,
    setShowSingleQuestionDuelModal,
    setSelectedSingleQuestionParticipants,
    setSelectedSingleQuestionTaskId,
    onConfirmDuel,
    onConfirmSingleQuestionDuel,
    handleToggleDuelParticipant,
    handleToggleSingleQuestionParticipant,
    handleOpenChallengeBoard,
    handleCloseChallengeBoard,
    handleEndChallenge,

    // History
    taskHistory,
    selectedHistoryItem,
    showHistoryList,
    showHistoryPreviewExpanded,
    showHistoryAnalysis,
    showDetailView,
    viewingStudentDetail,
    historySearchQuery,
    analyticsData,
    analyticsLoading,
    submissionData,
    submissionLoading,
    setSelectedHistoryItem,
    setShowHistoryList,
    setShowHistoryPreviewExpanded,
    setHistorySearchQuery,
    setShowHistoryAnalysis,
    setShowDetailView,
    setViewingStudentDetail,
    formatHistoryItemTime,
    compareHistoryItems,
    getHistoryItemKey,
    isHistoryItemViewable,
    onEnterActiveTask,
    onEndActiveTask,

    // Share requests
    pendingShareRequests,
    setPendingShareRequests,

    // WebSocket
    isWsReady,
    ws,

    // Actions
    handleClassChange,
    handleEndSession,
    handleEndTaskGroup,
    onPublish,
    onStartChallenge,
    setClassPresence,
    loadClassPresence,
  }
}
