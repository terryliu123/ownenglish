import { useState, useCallback, useEffect } from 'react'
import { liveTaskService } from '../../../services/api'
import type { TaskHistoryItem, AnalyticsData, SubmissionData, StudentSubmission } from '../types'

export function useHistory(currentClassId: string | null) {
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<TaskHistoryItem | null>(null)
  const [showHistoryAnalysis, setShowHistoryAnalysis] = useState(false)
  const [showDetailView, setShowDetailView] = useState(false)
  const [viewingStudentDetail, setViewingStudentDetail] = useState<StudentSubmission | null>(null)
  const [showHistoryList, setShowHistoryList] = useState(false)
  const [showHistoryPreviewExpanded, setShowHistoryPreviewExpanded] = useState(true)
  const [historySearchQuery, setHistorySearchQuery] = useState('')
  const [studentDetailSearchQuery, setStudentDetailSearchQuery] = useState('')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [submissionData, setSubmissionData] = useState<SubmissionData | null>(null)
  const [submissionLoading, setSubmissionLoading] = useState(false)

  const isHistoryItemViewable = useCallback((item: TaskHistoryItem) => {
    return item.status === 'ended' && (item.submissions ?? 0) > 0
  }, [])

  const formatHistoryItemTime = useCallback((item: TaskHistoryItem) => {
    const raw = item.ended_at || item.published_at
    if (!raw) return null
    return new Date(raw).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [])

  const compareHistoryItems = useCallback(
    (a: TaskHistoryItem, b: TaskHistoryItem) => {
      if (a.title === b.title) {
        const aViewable = isHistoryItemViewable(a) ? 1 : 0
        const bViewable = isHistoryItemViewable(b) ? 1 : 0
        if (aViewable !== bViewable) {
          return bViewable - aViewable
        }
      }

      const dateA = new Date(a.ended_at || a.published_at || 0).getTime()
      const dateB = new Date(b.ended_at || b.published_at || 0).getTime()
      return dateB - dateA
    },
    [isHistoryItemViewable]
  )

  const getHistoryItemKey = useCallback((item: TaskHistoryItem) => {
    return item.session_id ?? `${item.group_id}:${item.published_at || item.ended_at || item.status}`
  }, [])

  const loadTaskHistory = useCallback(async () => {
    if (!currentClassId) return
    try {
      const response = await liveTaskService.getClassTaskHistory(currentClassId)
      if (response.history && Array.isArray(response.history)) {
        console.log('[Task History] Loaded', response.history.length, 'items')
        setTaskHistory(response.history)
      }
    } catch (e) {
      console.error('Failed to load task history:', e)
    }
  }, [currentClassId])

  // Load analytics when analysis view is shown
  useEffect(() => {
    if (!showHistoryAnalysis || !selectedHistoryItem) {
      setAnalyticsData(null)
      return
    }

    async function fetchAnalytics() {
      setAnalyticsLoading(true)
      try {
        const data = await liveTaskService.getTaskGroupAnalytics(
          selectedHistoryItem!.group_id,
          selectedHistoryItem!.session_id ?? undefined
        )
        setAnalyticsData(data as AnalyticsData)
      } catch (e) {
        console.error('Failed to load analytics data:', e)
      } finally {
        setAnalyticsLoading(false)
      }
    }

    void fetchAnalytics()
  }, [showHistoryAnalysis, selectedHistoryItem])

  // Load submissions when detail view is shown
  useEffect(() => {
    if (!showDetailView || !selectedHistoryItem) {
      setSubmissionData(null)
      return
    }

    async function fetchSubmissions() {
      setSubmissionLoading(true)
      try {
        const needsTaskRefresh =
          !selectedHistoryItem!.tasks ||
          selectedHistoryItem!.tasks.some((task: any) => !(task?.id ?? task?.task_id))

        if (needsTaskRefresh) {
          const groupDetail = await liveTaskService.getTaskGroup(selectedHistoryItem!.group_id)
          setSelectedHistoryItem((prev) =>
            prev
              ? {
                  ...prev,
                  tasks: (groupDetail.tasks || []).map((task: any) => {
                    const taskId = task?.id ?? task?.task_id
                    return taskId && !task?.id ? { ...task, id: taskId } : task
                  }) as any,
                }
              : null
          )
        }
        const data = await liveTaskService.getTaskGroupSubmissions(
          selectedHistoryItem!.group_id,
          selectedHistoryItem!.session_id ?? undefined
        )
        setSubmissionData(data as SubmissionData)
      } catch (e) {
        console.error('Failed to load submission data:', e)
      } finally {
        setSubmissionLoading(false)
      }
    }

    void fetchSubmissions()
  }, [showDetailView, selectedHistoryItem])

  const normalizeHistoryTasks = useCallback((tasks?: any[]) => {
    if (!Array.isArray(tasks)) {
      return tasks
    }
    return tasks.map((task) => {
      const taskId = task?.id ?? task?.task_id
      return taskId && !task?.id ? { ...task, id: taskId } : task
    })
  }, [])

  return {
    // State
    taskHistory,
    selectedHistoryItem,
    showHistoryAnalysis,
    showDetailView,
    viewingStudentDetail,
    showHistoryList,
    showHistoryPreviewExpanded,
    historySearchQuery,
    studentDetailSearchQuery,
    analyticsData,
    analyticsLoading,
    submissionData,
    submissionLoading,

    // Setters
    setTaskHistory,
    setSelectedHistoryItem,
    setShowHistoryAnalysis,
    setShowDetailView,
    setViewingStudentDetail,
    setShowHistoryList,
    setShowHistoryPreviewExpanded,
    setHistorySearchQuery,
    setStudentDetailSearchQuery,

    // Helpers
    isHistoryItemViewable,
    formatHistoryItemTime,
    compareHistoryItems,
    getHistoryItemKey,
    loadTaskHistory,
    normalizeHistoryTasks,
  }
}
