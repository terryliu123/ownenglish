import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../../i18n/useTranslation'
import { getTaskTypeLabel } from '../../tasks/task-helpers'
import type { TaskHistoryItem } from '../types'
import { useTeacherLive } from './useTeacherLive'
import { useTaskGroups } from './useTaskGroups'
import { useChallenges } from './useChallenges'
import { useHistory } from './useHistory'

export function useTeacherLivePage() {
  const { t, tWithParams } = useTranslation()
  const navigate = useNavigate()

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

  const {
    taskGroups,
    selectedGroup,
    setSelectedGroup,
    setTaskGroups,
    loadGroupDetail,
    revertToDraft,
    loadClassPresence,
    loadTaskHistory,
    refreshLiveOverview,
    handlePublishGroup,
  } = useTaskGroups({ currentClassId, currentTaskGroup, setTaskGroupSubmissions })

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

  useEffect(() => {
    if (!currentClassId) return
    const loadPresence = async () => {
      const presence = await loadClassPresence(currentClassId)
      if (presence) setClassPresence(presence)
    }
    void loadPresence()
    const intervalId = window.setInterval(loadPresence, 15000)
    return () => window.clearInterval(intervalId)
  }, [currentClassId, loadClassPresence, setClassPresence])

  useEffect(() => {
    if (!currentClassId) return
    void loadTaskHistory(currentClassId).then((history) => {
      setTaskHistory(history)
    })
  }, [currentClassId, loadTaskHistory, setTaskHistory])

  const syncOverview = useCallback(async () => {
    if (!currentClassId) return
    ws.getRoomInfo()
    await refreshLiveOverview(currentClassId, {
      includeTaskGroups: true,
      includeTaskHistory: true,
      includePresence: true,
      onHistoryLoaded: setTaskHistory,
    })
  }, [currentClassId, refreshLiveOverview, setTaskHistory, ws])

  const onPublish = useCallback(() => {
    if (!selectedGroup) return
    handlePublishGroup(
      selectedGroup,
      ws,
      () => {
        setSelectedGroup(null)
        void syncOverview()
      },
      alert
    )
  }, [handlePublishGroup, selectedGroup, setSelectedGroup, syncOverview, ws])

  const onStartChallenge = useCallback(
    (
      mode: 'class_challenge' | 'duel' | 'single_question_duel',
      participantIds?: string[],
      taskId?: string
    ) => {
      createAndStartChallenge(
        mode,
        participantIds,
        taskId,
        (types) =>
          alert(
            tWithParams('challenge.unsupportedTypesAlert', {
              types: types.map((type) => getTaskTypeLabel(type, t, type)).join('\u3001'),
            })
          ),
        alert,
        () => {
          resetChallengeState()
          setSelectedGroup(null)
          void syncOverview()
        }
      )
    },
    [createAndStartChallenge, resetChallengeState, setSelectedGroup, syncOverview, t, tWithParams]
  )

  const onConfirmDuel = useCallback(() => {
    if (selectedDuelParticipants.length !== 2) return
    setShowDuelModal(false)
    onStartChallenge('duel', selectedDuelParticipants)
    setSelectedDuelParticipants([])
  }, [onStartChallenge, selectedDuelParticipants, setSelectedDuelParticipants, setShowDuelModal])

  const onConfirmSingleQuestionDuel = useCallback(() => {
    if (selectedSingleQuestionParticipants.length !== 2 || !selectedSingleQuestionTaskId) return
    setShowSingleQuestionDuelModal(false)
    onStartChallenge('single_question_duel', selectedSingleQuestionParticipants, selectedSingleQuestionTaskId)
    setSelectedSingleQuestionParticipants([])
    setSelectedSingleQuestionTaskId(null)
  }, [
    onStartChallenge,
    selectedSingleQuestionParticipants,
    selectedSingleQuestionTaskId,
    setSelectedSingleQuestionParticipants,
    setSelectedSingleQuestionTaskId,
    setShowSingleQuestionDuelModal,
  ])

  const onEnterActiveTask = useCallback((item: TaskHistoryItem) => {
    if (item.status !== 'active') return
    setShowHistoryList(false)
    setSelectedHistoryItem(null)
    ws.getRoomInfo()
  }, [setSelectedHistoryItem, setShowHistoryList, ws])

  const onEndActiveTask = useCallback((item: TaskHistoryItem) => {
    if (!window.confirm(tWithParams('live.endTaskConfirm', { title: item.title }))) return
    ws.endTaskGroup(item.group_id)
  }, [tWithParams, ws])

  const hasActiveChallenge = Boolean(
    currentChallenge &&
      currentChallenge.status !== 'ended' &&
      currentChallenge.status !== 'cancelled'
  )

  const canStartStandardChallenge = Boolean(
    selectedGroup &&
      selectedGroup.tasks?.length &&
      ws.status === 'connected' &&
      !currentTaskGroup &&
      unsupportedChallengeTypes.length === 0 &&
      !hasActiveChallenge
  )

  const canStartSingleQuestionDuel = Boolean(
    selectedGroup &&
      hasSingleQuestionDuelTasks &&
      ws.status === 'connected' &&
      !currentTaskGroup &&
      !hasActiveChallenge
  )

  const unsupportedChallengeLabels = unsupportedChallengeTypes.map((type) =>
    getTaskTypeLabel(type, t, type)
  )

  const getCurrentClassName = () =>
    classes.find((classItem) => classItem.id === currentClassId)?.name || t('live.noClassSelected')

  return {
    t,
    tWithParams,
    navigate,
    loading,
    error,
    currentClassId,
    classes,
    classPresence,
    roomInfo,
    getCurrentClassName,
    taskGroups,
    selectedGroup,
    setSelectedGroup,
    setTaskGroups,
    loadGroupDetail,
    revertToDraft,
    handlePublishGroup,
    currentTaskGroup,
    taskGroupSubmissions,
    taskGroupEnded,
    setCurrentTaskGroup,
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
    pendingShareRequests,
    setPendingShareRequests,
    isWsReady,
    ws,
    handleClassChange,
    handleEndSession,
    handleEndTaskGroup,
    onPublish,
    onStartChallenge,
    setClassPresence,
    loadClassPresence,
  }
}
