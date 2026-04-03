import { useState, useCallback, useEffect } from 'react'
import { liveTaskService, type LiveTaskGroup } from '../../../services/api'
import type { LiveTask, TaskHistoryItem } from '../types'

interface UseTaskGroupsOptions {
  currentClassId: string | null
  currentTaskGroup: { group_id: string } | null
  setTaskGroupSubmissions: (count: number) => void
}

export function useTaskGroups({
  currentClassId,
  currentTaskGroup,
  setTaskGroupSubmissions,
}: UseTaskGroupsOptions) {
  const [taskGroups, setTaskGroups] = useState<LiveTaskGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<LiveTaskGroup | null>(null)

  const loadTaskGroups = useCallback(async () => {
    if (!currentClassId) {
      console.log('[loadTaskGroups] No currentClassId, skipping')
      return
    }
    try {
      const groups = await liveTaskService.getTaskGroups(currentClassId)
      const readyGroups = groups.filter((g) => g.status === 'ready')
      setTaskGroups(readyGroups)
      setSelectedGroup((prev) => {
        if (!prev) return prev
        const nextSelected = readyGroups.find((group) => group.id === prev.id)
        return nextSelected ?? null
      })
    } catch (e) {
      console.error('Failed to load task groups:', e)
    }
  }, [currentClassId])

  const loadGroupDetail = useCallback(async (groupId: string) => {
    try {
      const group = await liveTaskService.getTaskGroup(groupId)
      setSelectedGroup(group)
    } catch (e) {
      console.error('Failed to load group detail:', e)
    }
  }, [])

  const revertToDraft = useCallback(async (groupId: string) => {
    try {
      await liveTaskService.updateTaskGroup(groupId, { status: 'draft' })
      // Remove from taskGroups list since draft groups are filtered out
      setTaskGroups((prev) => prev.filter((g) => g.id !== groupId))
      setSelectedGroup((prev) => (prev?.id === groupId ? null : prev))
    } catch (e) {
      console.error('Failed to revert task group to draft:', e)
      alert('退回草稿失败')
    }
  }, [])

  const loadClassPresence = useCallback(
    async (classId: string) => {
      if (!classId) return null
      try {
        const presence = await liveTaskService.getClassPresence(classId)
        if (
          presence.current_task_group_id &&
          currentTaskGroup &&
          presence.current_task_group_id === currentTaskGroup.group_id
        ) {
          setTaskGroupSubmissions(presence.task_group_submission_count || 0)
        }
        return presence
      } catch (e) {
        console.error('Failed to load class presence:', e)
        return null
      }
    },
    [currentTaskGroup, setTaskGroupSubmissions]
  )

  const loadTaskHistory = useCallback(
    async (classId: string) => {
      if (!classId) return []
      try {
        const response = await liveTaskService.getClassTaskHistory(classId)
        if (response.history && Array.isArray(response.history)) {
          console.log('[Task History] Loaded', response.history.length, 'items')
          return response.history
        }
        return []
      } catch (e) {
        console.error('Failed to load task history:', e)
        return []
      }
    },
    []
  )

  const refreshLiveOverview = useCallback(
    async (
      classId: string,
      options?: {
        includeTaskGroups?: boolean
        includeTaskHistory?: boolean
        includePresence?: boolean
      }
    ) => {
      if (!classId) return
      const tasks: Promise<unknown>[] = []
      if (options?.includeTaskGroups !== false) {
        tasks.push(loadTaskGroups())
      }
      if (options?.includePresence !== false) {
        tasks.push(loadClassPresence(classId))
      }
      await Promise.all(tasks)
    },
    [loadTaskGroups, loadClassPresence]
  )

  // Load task groups when class changes
  useEffect(() => {
    if (!currentClassId) return
    void loadTaskGroups()
  }, [currentClassId, loadTaskGroups])

  const handlePublishGroup = useCallback(
    (
      group: LiveTaskGroup,
      ws: { status: string; publishTaskGroup: (groupId: string, tasks: LiveTask[], totalCountdown: number) => void },
      onSuccess: () => void,
      onError: (message: string) => void
    ) => {
      console.log('[Publish] Publishing group:', group.id)

      if (ws.status !== 'connected') {
        onError('WebSocket未连接')
        return
      }
      if (!group.tasks || group.tasks.length === 0) {
        onError('任务组中没有任务')
        return
      }

      const tasks: LiveTask[] = group.tasks.map((task, index) => ({
        task_id: task.id,
        type: task.type,
        question: task.question as any,
        countdown_seconds: task.countdown_seconds || 30,
        order: index + 1,
        correct_answer: task.correct_answer,
      }))

      const totalCountdown = tasks.reduce((sum, t) => sum + t.countdown_seconds, 0) + 30

      ws.publishTaskGroup(group.id, tasks, totalCountdown)
      onSuccess()
    },
    []
  )

  const handleEnterActiveTask = useCallback(
    (
      item: TaskHistoryItem,
      onLoadGroup: (group: LiveTaskGroup) => void,
      onSetTaskGroup: (taskGroup: {
        group_id: string
        title: string
        tasks: LiveTask[]
        total_countdown: number
      }) => void
    ) => {
      if (item.tasks) {
        onSetTaskGroup({
          group_id: item.group_id,
          title: item.title,
          tasks: item.tasks as LiveTask[],
          total_countdown:
            item.tasks.reduce(
              (sum: number, t: any) => sum + (t.countdown_seconds || 30),
              0
            ) + 30,
        })
      } else {
        liveTaskService.getTaskGroup(item.group_id).then((group) => {
          onLoadGroup(group)
          const tasks: LiveTask[] = group.tasks.map((task: any, index: number) => ({
            task_id: task.id,
            type: task.type,
            question: task.question as any,
            countdown_seconds: task.countdown_seconds || 30,
            order: index + 1,
            correct_answer: task.correct_answer,
          }))
          onSetTaskGroup({
            group_id: item.group_id,
            title: item.title,
            tasks: tasks,
            total_countdown: tasks.reduce((sum, t) => sum + t.countdown_seconds, 0) + 30,
          })
        })
      }
    },
    []
  )

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
    taskGroups,
    selectedGroup,
    setSelectedGroup,
    setTaskGroups,
    loadTaskGroups,
    loadGroupDetail,
    revertToDraft,
    loadClassPresence,
    loadTaskHistory,
    refreshLiveOverview,
    handlePublishGroup,
    handleEnterActiveTask,
    normalizeHistoryTasks,
  }
}
