import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { useTranslation } from '../../i18n/useTranslation'
import { useAppStore } from '../../stores/app-store'
import { classService, liveTaskService, api, liveTaskSubmissionService } from '../../services/api'
import { useWhiteboardLive } from '../../features/whiteboard/hooks/useWhiteboardLive'
import { WhiteboardCanvas } from '../../features/whiteboard/components/WhiteboardCanvas'
import { WhiteboardToolbar } from '../../features/whiteboard/components/WhiteboardToolbar'
import { StudentPanel } from '../../features/whiteboard/components/StudentPanel'
import { TaskPanel } from '../../features/whiteboard/components/TaskPanel'
import { TaskPreviewCard } from '../../features/whiteboard/components/TaskPreviewCard'
import { ShareRequestsPanel } from '../../features/whiteboard/components/ShareRequestsPanel'
import { DuelModal } from '../../features/teacher-live/components/DuelModal'
import { SingleQuestionDuelModal } from '../../features/teacher-live/components/SingleQuestionDuelModal'
import { ChallengePanel } from '../../features/teacher-live/components/ChallengePanel'
import { BigscreenActivityLauncherModal } from '../../features/bigscreen-activities/components/BigscreenActivityLauncherModal'
import { isChallengeFinished } from '../../features/live-runtime/challengeRuntime'
import { resolveMatchingAnswerRows } from '../../features/tasks/task-formatting'
import WhiteboardAiLauncher from '../../features/whiteboard-ai/components/WhiteboardAiLauncher'
import WhiteboardAiPanel from '../../features/whiteboard-ai/components/WhiteboardAiPanel'
import { WhiteboardAiProvider } from '../../features/whiteboard-ai/context/WhiteboardAiContext'
import { getTaskTypeLabel } from '../../features/tasks/task-helpers'
import { TeachingAidLibraryModal } from '../../features/teaching-aids/TeachingAidLibraryModal'
import ClassAiSettingsModal from '../../features/whiteboard-ai/components/ClassAiSettingsModal'
import { DanmuScreen, AtmosphereEffects } from '../../features/danmu'
import type { ActiveDanmu, DanmuConfig } from '../../features/danmu/types/danmu'
import { getWhiteboardTourSteps } from '../../features/product-tour/whiteboard-tour-steps'
import { useWhiteboardTour } from '../../features/product-tour/useWhiteboardTour'
import {
  SUPPORTED_CHALLENGE_TASK_TYPES,
  SUPPORTED_SINGLE_QUESTION_DUEL_TASK_TYPES,
} from '../../features/teacher-live/hooks/useChallenges'
import type { WhiteboardTool, WhiteboardElement, WhiteboardTheme } from '../../features/whiteboard/types'
import type { LiveTaskGroup } from '../../services/api'
import type { TaskHistoryItem } from '../../services/websocket'

type WhiteboardTaskGroup = LiveTaskGroup & {
  source_group_id?: string
  session_id?: string | null
  status?: LiveTaskGroup['status'] | 'ended'
}

function getWhiteboardTaskId(task: { id?: string; task_id?: string }) {
  return task.id || task.task_id || ''
}

export default function WhiteboardMode() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAppStore()
  const tWithParams = useCallback(
    (key: string, params: Record<string, string | number>) => {
      let value = t(key)
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        const nextValue = String(paramValue)
        value = value
          .replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), nextValue)
          .replace(new RegExp(`\\{${paramKey}\\}`, 'g'), nextValue)
      })
      Object.values(params).forEach((paramValue, index) => {
        value = value.replace(new RegExp(`\\{${index}\\}`, 'g'), String(paramValue))
      })
      return value
    },
    [t]
  )

  const [classes, setClasses] = useState<any[]>([])
  const [currentClassId, setCurrentClassId] = useState<string | null>(null)
  const [mode, setMode] = useState<'lecture' | 'interactive'>('interactive')
  const [currentTool, setCurrentTool] = useState<WhiteboardTool>('pen')
  const [elements, setElements] = useState<WhiteboardElement[]>([])
  const [canvasReady, setCanvasReady] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const selectedClassStorageKey = useMemo(
    () => `whiteboard_selected_class_${user?.id || 'teacher'}`,
    [user?.id]
  )
  const classroomStartReminderText =
    t('classroom.startReminder') || '请先开始本节课，学生才能加入课堂并参与互动'
  const classroomStartButtonText =
    t('classroom.startSession') || '开始本节课'

  const handleStartSession = async () => {
    try {
      await startClassroomSession()
    } catch (error) {
      alert(t('classroom.startFailed') || '开始课堂失败')
    }
  }

  const handleEndSession = async () => {
    if (!hasActiveClassroomSession) {
      alert(t('classroom.sessionNotActive') || '课堂未在进行中')
      return
    }

    if (!window.confirm(t('classroom.confirmEnd') || '确定要结束本节课吗？下课之后学生将退出课堂任务页面并返回首页。')) {
      return
    }

    try {
      if (activeTaskGroup) {
        endTaskGroup(getSourceGroupId(activeTaskGroup))
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      if (currentChallenge) {
        endChallenge(currentChallenge.id)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      await endClassroomSession()
      disconnect()
      clearShares()
      clearWhiteboardData()
      navigate('/teacher/classroom-review')
    } catch (error) {
      console.error('Failed to end session:', error)
      alert(t('classroom.endFailed') || '结束课堂失败')
    }
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // localStorage 存储键
  const getStorageKey = useCallback((key: string) => `whiteboard_${key}_${currentClassId || 'global'}`, [currentClassId])

  // 从 localStorage 加载白板内容（在画布准备好后）
  useEffect(() => {
    if (!currentClassId || !canvasReady) return
    // 延迟一点时间确保 Fabric.js 完全初始化
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(getStorageKey('canvas'))
        if (saved) {
          const canvasData = JSON.parse(saved)
          // 恢复画布内容
          const api = (window as any).whiteboardAPI
          if (api && canvasData) {
            console.log('[Whiteboard] Restoring canvas data:', canvasData)
            api.loadJSON?.(canvasData)
          }
        }
      } catch (e) {
        console.error('Failed to load whiteboard canvas:', e)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [currentClassId, canvasReady, getStorageKey])

  // 保存白板内容到 localStorage
  const saveCanvasToStorage = useCallback(() => {
    if (!currentClassId) return
    const api = (window as any).whiteboardAPI
    if (api) {
      const canvasData = api.toJSON?.()
      if (canvasData) {
        localStorage.setItem(getStorageKey('canvas'), JSON.stringify(canvasData))
        console.log('[Whiteboard] Saved canvas data')
      }
    }
  }, [currentClassId, getStorageKey])

  // 定期保存画布内容
  useEffect(() => {
    if (!currentClassId) return
    const interval = setInterval(saveCanvasToStorage, 5000) // 每5秒自动保存
    // 监听立即保存事件
    const handleImmediateSave = () => saveCanvasToStorage()
    window.addEventListener('whiteboard:save', handleImmediateSave)
    return () => {
      clearInterval(interval)
      window.removeEventListener('whiteboard:save', handleImmediateSave)
    }
  }, [currentClassId, saveCanvasToStorage])
  const [taskGroups, setTaskGroups] = useState<WhiteboardTaskGroup[]>([])
  const [publishedGroups, setPublishedGroups] = useState<WhiteboardTaskGroup[]>([])
  const [hiddenGroupIds, setHiddenGroupIds] = useState<Set<string>>(new Set())

  // 下课时清除所有白板数据
  const clearWhiteboardData = useCallback((classIdToClear?: string) => {
    const targetClassId = classIdToClear || currentClassId
    if (!targetClassId) return
    const key = (key: string) => `whiteboard_${key}_${targetClassId}`
    localStorage.removeItem(key('canvas'))
    setElements([])
    setTaskGroups([])
    setPublishedGroups([])
    setHiddenGroupIds(new Set())
    ;(window as any).whiteboardAPI?.clearCanvas()
  }, [currentClassId])

  // 生成班级二维码
  const generateClassQRCode = useCallback(async () => {
    if (!currentClassId) return
    const cls = classes.find((c: any) => c.id === currentClassId)
    if (!cls) return

    // 构建加入链接
    const url = new URL('/join', window.location.origin)
    url.searchParams.set('invite_code', cls.invite_code)
    const joinUrl = url.toString()

    try {
      const dataUrl = await QRCode.toDataURL(joinUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 400,
        margin: 2,
      })
      setQrCodeDataUrl(dataUrl)
      setShowQRCode(true)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    }
  }, [currentClassId, classes])

  // 使用新的实时状态 hook
  const {
    isConnected,
    roomInfoHydrated,
    liveSessionId,
    classroomStudents,
    classroomCount,
    pendingShares,
    activeTaskGroup: wsActiveTaskGroup,
    endTaskGroup,
    handleShare,
    submissionCount,
    currentChallenge,
    startChallenge,
    endChallenge,
    clearChallenge,
    refreshPresence,
    getRoomInfo,
    ensureSocketOpen,
    taskHistory: roomTaskHistory,
    disconnect,
    clearShares,
    sendDanmuConfig,
    danmuConfig,
    activeDanmus,
    sendAtmosphereEffect,
    activeEffects,
    currentClassroomSession: classroomSession,
    elapsedSeconds,
    startClassroomSession,
    endClassroomSession,
  } = useWhiteboardLive(currentClassId)

  const activeTaskGroup = wsActiveTaskGroup
  const effectiveClassroomSessionId = classroomSession?.id || liveSessionId || null
  const hasActiveClassroomSession = Boolean(effectiveClassroomSessionId)

  // 监听任务结束（当 activeTaskGroup 从有值变为 null 时，说明任务已结束）
  const prevActiveTaskGroupRef = useRef(wsActiveTaskGroup)
  useEffect(() => {
    if (prevActiveTaskGroupRef.current !== null && wsActiveTaskGroup === null) {
      // 任务组已结束，将其添加到已完成列表
      const ended = prevActiveTaskGroupRef.current
      if (ended) {
        const sourceId = (ended as WhiteboardTaskGroup).source_group_id || ended.id
        setPublishedGroups(prev => {
          if (prev.some(g => (g as WhiteboardTaskGroup).source_group_id === sourceId || g.id === sourceId)) return prev
          return [...prev, { ...ended, status: 'ended' as const } as unknown as WhiteboardTaskGroup]
        })
      }
    }
    prevActiveTaskGroupRef.current = wsActiveTaskGroup
  }, [wsActiveTaskGroup])

  // 挑战模式状态
  const [showDuelModal, setShowDuelModal] = useState(false)
  const [selectedDuelParticipants, setSelectedDuelParticipants] = useState<string[]>([])
  const [showSingleQuestionDuelModal, setShowSingleQuestionDuelModal] = useState(false)
  const [selectedSingleQuestionParticipants, setSelectedSingleQuestionParticipants] = useState<string[]>([])
  const [selectedSingleQuestionTaskId, setSelectedSingleQuestionTaskId] = useState<string | null>(null)
  const [showChallengeBoard, setShowChallengeBoard] = useState(false)
  const [challengeCreating, setChallengeCreating] = useState(false)

  const challengeCandidates = Array.from(classroomStudents.values()).map(s => ({ id: s.id, name: s.name }))
  const [previewingGroup, setPreviewingGroup] = useState<WhiteboardTaskGroup | null>(null)
  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [showSharesPanel, setShowSharesPanel] = useState(false)
  const [showBigscreenLauncher, setShowBigscreenLauncher] = useState(false)
  const [showTeachingAidLibrary, setShowTeachingAidLibrary] = useState(false)
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [openedTeachingAid, setOpenedTeachingAid] = useState<{ name: string; entryUrl: string } | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [classesLoaded, setClassesLoaded] = useState(false)

  // 快速创建班级状态（必须放在所有条件返回之前）
  const [quickClassName, setQuickClassName] = useState('')
  const [quickCreating, setQuickCreating] = useState(false)
  const [quickError, setQuickError] = useState('')

  // 画笔设置
  const [strokeColor, setStrokeColor] = useState('#6366f1')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [eraserSize, setEraserSize] = useState(20)

  // 画布缩放
  const [scale, setScale] = useState(1)

  // 主题设置
  const [theme, setTheme] = useState<WhiteboardTheme>('dark')

  // 氛围设置面板
  const [showDanmuSettings, setShowDanmuSettings] = useState(false)
  const danmuSettingsRef = useRef<HTMLDivElement>(null)
  const [danmuPresetDrafts, setDanmuPresetDrafts] = useState<string[]>([])
  const [showDanmuPresetEditor, setShowDanmuPresetEditor] = useState(false)

  // 点击外部关闭氛围设置面板
  useEffect(() => {
    if (!showDanmuSettings) return
    const handleClickOutside = (e: MouseEvent) => {
      if (danmuSettingsRef.current && !danmuSettingsRef.current.contains(e.target as Node)) {
        setShowDanmuSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDanmuSettings])

  useEffect(() => {
    setDanmuPresetDrafts((danmuConfig.presetPhrases || []).slice(0, 5))
  }, [danmuConfig.presetPhrases, showDanmuSettings])

  useEffect(() => {
    if (!showDanmuSettings) {
      setShowDanmuPresetEditor(false)
    }
  }, [showDanmuSettings])

  const ensureTourLayout = useCallback(() => {
    setMode('interactive')
    setShowLeftPanel(true)
    setShowRightPanel(true)
  }, [])

  const whiteboardTourSteps = useMemo(
    () => getWhiteboardTourSteps({ ensureInteractiveLayout: ensureTourLayout }),
    [ensureTourLayout]
  )

  const { openTour } = useWhiteboardTour({
    steps: whiteboardTourSteps,
    canAutoStart: Boolean(currentClassId && classesLoaded && !hasActiveClassroomSession && !openedTeachingAid),
    beforeOpen: ensureTourLayout,
  })

  const normalizeDanmuPresetPhrases = useCallback((phrases: string[]) => {
    const normalized: string[] = []
    phrases.forEach((phrase) => {
      const trimmed = phrase.trim()
      if (!trimmed || normalized.includes(trimmed)) return
      normalized.push(trimmed.slice(0, 20))
    })
    return normalized.slice(0, 5)
  }, [])

  const persistDanmuPresetPhrases = useCallback((phrases: string[]) => {
    const normalized = normalizeDanmuPresetPhrases(phrases)
    setDanmuPresetDrafts(normalized)
    sendDanmuConfig({ ...danmuConfig, presetPhrases: normalized })
  }, [danmuConfig, normalizeDanmuPresetPhrases, sendDanmuConfig])

  const handleDanmuPresetDraftChange = useCallback((index: number, value: string) => {
    setDanmuPresetDrafts((prev) => {
      const next = [...prev]
      next[index] = value.slice(0, 20)
      return next
    })
  }, [])

  const addDanmuPresetPhrase = useCallback(() => {
    if (danmuPresetDrafts.length >= 5) return
    const next = [...danmuPresetDrafts, `预设语句${danmuPresetDrafts.length + 1}`]
    persistDanmuPresetPhrases(next)
  }, [danmuPresetDrafts, persistDanmuPresetPhrases])

  const removeDanmuPresetPhrase = useCallback((index: number) => {
    const next = [...danmuPresetDrafts]
    next.splice(index, 1)
    persistDanmuPresetPhrases(next)
  }, [danmuPresetDrafts, persistDanmuPresetPhrases])

  // 分析和明细 Modal 状态
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedGroupForAnalysis, setSelectedGroupForAnalysis] = useState<WhiteboardTaskGroup | null>(null)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [submissionData, setSubmissionData] = useState<any>(null)
  const [submissionLoading, setSubmissionLoading] = useState(false)
  const [viewingStudentDetail, setViewingStudentDetail] = useState<any>(null)
  const singleQuestionDuelTasks = useMemo(
    () => (previewingGroup?.tasks || []).filter((task: any) => SUPPORTED_SINGLE_QUESTION_DUEL_TASK_TYPES.has(task.type)),
    [previewingGroup],
  )

  // 主题样式配置
  const getThemeClasses = (theme: WhiteboardTheme) => {
    switch (theme) {
      case 'light':
        return {
          bg: 'bg-slate-50',
          headerBg: 'bg-white/95 border-slate-200',
          text: 'text-slate-900',
          textMuted: 'text-slate-600',
          textMutedHover: 'hover:text-slate-800',
          panelBg: 'bg-white/95 border-slate-200',
          buttonBg: 'bg-slate-100 hover:bg-slate-200',
          selectBg: 'bg-white border-slate-300',
          accent: 'text-blue-600',
          divider: 'bg-slate-300',
          modeSwitchBg: 'bg-slate-200/50',
          onlineBadge: 'bg-slate-100 border-slate-200',
          panelToggle: 'bg-white/80 border-slate-200',
        }
      case 'colorful':
        return {
          bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
          headerBg: 'bg-white/80 border-purple-200 backdrop-blur-xl',
          text: 'text-purple-900',
          textMuted: 'text-purple-600',
          textMutedHover: 'hover:text-purple-800',
          panelBg: 'bg-white/80 border-purple-200 backdrop-blur-xl',
          buttonBg: 'bg-purple-100 hover:bg-purple-200',
          selectBg: 'bg-white border-purple-300',
          accent: 'text-purple-600',
          divider: 'bg-purple-200',
          modeSwitchBg: 'bg-purple-100/50',
          onlineBadge: 'bg-purple-100 border-purple-200',
          panelToggle: 'bg-white/60 border-purple-200',
        }
      default: // dark
        return {
          bg: 'bg-[#0f0f13]',
          headerBg: 'bg-[#1a1a22]/95 border-slate-800',
          text: 'text-slate-100',
          textMuted: 'text-slate-400',
          textMutedHover: 'hover:text-slate-200',
          panelBg: 'bg-[#1a1a22]/95 border-slate-800',
          buttonBg: 'bg-slate-800 hover:bg-slate-700',
          selectBg: 'bg-slate-800 border-slate-700',
          accent: 'text-indigo-400',
          divider: 'bg-slate-700',
          modeSwitchBg: 'bg-slate-800/50',
          onlineBadge: 'bg-slate-800/50 border-slate-700',
          panelToggle: 'bg-slate-800/80 border-slate-700',
        }
    }
  }

  const themeClasses = getThemeClasses(theme)

  // WebSocket 连接由 useWhiteboardLive 管理，无需额外调用

  // 等待 AppProvider 完成登录恢复
  useEffect(() => {
    // 给 AppProvider 时间从 localStorage 恢复登录状态
    const timer = setTimeout(() => {
      setIsAuthChecking(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // 认证检查 - 在 isAuthChecking 完成后执行
  useEffect(() => {
    if (isAuthChecking) return // 还在检查中，不执行

    if (user?.role !== 'teacher') {
      navigate('/')
      return
    }

    // 已认证且是教师，加载班级
    loadClasses()
  }, [isAuthChecking, user, navigate])

  const loadClasses = async () => {
    try {
      const [data, activeSessions] = await Promise.all([
        classService.getAll(),
        api.get('/live/sessions', { params: { status: 'active', limit: 20 } }).then((r) => r.data).catch(() => []),
      ])
      setClasses(data)
      setClassesLoaded(true)
      if (data.length === 0) {
        setCurrentClassId(null)
        localStorage.removeItem(selectedClassStorageKey)
        return
      }

      const validCurrentClassId =
        currentClassId && data.some((cls: any) => cls.id === currentClassId) ? currentClassId : null
      const storedClassId = localStorage.getItem(selectedClassStorageKey)
      const validStoredClassId =
        storedClassId && data.some((cls: any) => cls.id === storedClassId) ? storedClassId : null
      const activeClassId = Array.isArray(activeSessions)
        ? (
            activeSessions.find(
              (session: any) => session?.class_id && data.some((cls: any) => cls.id === session.class_id),
            )?.class_id ?? null
          )
        : null

      const nextClassId = validCurrentClassId || activeClassId || validStoredClassId || data[0].id
      if (nextClassId !== currentClassId) {
        setCurrentClassId(nextClassId)
      }
    } catch (e) {
      console.error('Failed to load classes:', e)
    }
  }

  useEffect(() => {
    if (!currentClassId) return
    localStorage.setItem(selectedClassStorageKey, currentClassId)
  }, [currentClassId, selectedClassStorageKey])

  const getSourceGroupId = useCallback((group: LiveTaskGroup | WhiteboardTaskGroup) => {
    return (group as WhiteboardTaskGroup).source_group_id || group.id
  }, [])

  const mapHistoryItemToGroup = useCallback((item: TaskHistoryItem): WhiteboardTaskGroup => {
    const syntheticId = item.session_id || `${item.group_id}:${item.published_at || item.ended_at || item.status}`
    return {
      id: syntheticId,
      class_id: currentClassId || '',
      title: item.title,
      status: 'archived',
      task_count: item.task_count,
      tasks: (item.tasks || []) as unknown as LiveTaskGroup['tasks'],
      created_at: item.published_at || item.ended_at || new Date().toISOString(),
      updated_at: item.ended_at || item.published_at || new Date().toISOString(),
      source_group_id: item.group_id,
      session_id: item.session_id ?? null,
    }
  }, [currentClassId])

  const loadTaskGroups = useCallback(async () => {
    if (!currentClassId) return
    try {
      const groups = await liveTaskService.getTaskGroups(currentClassId)
      // 待发布任务只包含 ready 状态（draft 草稿需要在任务准备页面管理）
      const readyGroups: WhiteboardTaskGroup[] = groups.filter((g: LiveTaskGroup) => g.status === 'ready')
      setTaskGroups((prev) =>
        readyGroups.map((group) => {
          const previousGroup = prev.find((item) => item.id === group.id)
          if ((!group.tasks || group.tasks.length === 0) && previousGroup?.tasks?.length) {
            return {
              ...group,
              tasks: previousGroup.tasks,
              task_count: group.task_count ?? previousGroup.tasks.length,
            }
          }
          return group
        }),
      )
      setPreviewingGroup((prev) => {
        if (!prev) return prev
        const matchedGroup = readyGroups.find((group) => group.id === prev.id)
        if (!matchedGroup) return null
        if ((!matchedGroup.tasks || matchedGroup.tasks.length === 0) && prev.tasks?.length) {
          return {
            ...matchedGroup,
            tasks: prev.tasks,
            task_count: matchedGroup.task_count ?? prev.tasks.length,
            source_group_id: prev.source_group_id,
            session_id: prev.session_id,
          }
        }
        return matchedGroup
      })
    } catch (e) {
      console.error('Failed to load task groups:', e)
    }
  }, [currentClassId])

  const loadTaskHistory = useCallback(async () => {
    if (!currentClassId) {
      setPublishedGroups([])
      return
    }
    if (!effectiveClassroomSessionId && !classroomSession?.started_at) {
      return
    }
    try {
      const response = await liveTaskService.getClassTaskHistory(currentClassId)
      const persistedHistory = Array.isArray(response.history) ? response.history : []
      const runtimeHistory = Array.isArray(roomTaskHistory)
        ? roomTaskHistory.map((item) => ({
            ...item,
            session_id: item.session_id ?? effectiveClassroomSessionId ?? null,
          }))
        : []
      const allHistoryMap = new Map<string, TaskHistoryItem>()
      ;[...persistedHistory, ...runtimeHistory].forEach((item) => {
        const key = item.session_id || `${item.group_id}:${item.published_at || item.ended_at || item.status}`
        allHistoryMap.set(key, item)
      })
      const allHistory = Array.from(allHistoryMap.values())
      // 显示所有已结束的任务：优先按 session_id 匹配，
      // 如果 session_id 不匹配则按时间窗口匹配（课堂开始之后发布的都算）
      const sessionStartedAt = classroomSession?.started_at ? new Date(classroomSession.started_at).getTime() : 0
      const endedItems = allHistory.filter((item: TaskHistoryItem) => {
        if (item.status !== 'ended') return false
        if (effectiveClassroomSessionId && item.session_id === effectiveClassroomSessionId) return true
        // session_id 不匹配时，按发布时间判断是否属于当前课堂
        if (!sessionStartedAt) return false
        const publishedAt = item.published_at ? new Date(item.published_at).getTime() : 0
        const endedAt = item.ended_at ? new Date(item.ended_at).getTime() : 0
        return Math.max(publishedAt, endedAt) >= sessionStartedAt
      })
      const apiGroups = endedItems.map(mapHistoryItemToGroup)
      // 合并：内存中已有的数据（如刚结束的任务）不丢失
      setPublishedGroups((prev) => {
        const merged = [...prev]
        const existingIds = new Set(prev.map(g => getSourceGroupId(g)))
        for (const g of apiGroups) {
          if (!existingIds.has(getSourceGroupId(g))) {
            merged.push(g)
          }
        }
        return merged
      })
    } catch (e) {
      console.error('Failed to load task history:', e)
    }
  }, [currentClassId, classroomSession?.started_at, effectiveClassroomSessionId, mapHistoryItemToGroup, roomTaskHistory])

  const handleClearCompleted = useCallback(() => {
    setHiddenGroupIds((prev) => {
      const next = new Set(prev)
      publishedGroups.forEach((g) => next.add(g.id))
      return next
    })
  }, [publishedGroups])

  const refreshWhiteboardOverview = useCallback(async () => {
    if (!currentClassId) return
    await Promise.all([loadTaskGroups(), loadTaskHistory()])
    void refreshPresence()
  }, [currentClassId, loadTaskGroups, loadTaskHistory, refreshPresence])

  useEffect(() => {
    if (!currentClassId) return
    void refreshWhiteboardOverview()
  }, [currentClassId, refreshWhiteboardOverview])

  useEffect(() => {
    if (!currentClassId || !roomInfoHydrated) return
    void loadTaskHistory()
  }, [currentClassId, roomInfoHydrated, loadTaskHistory])

  // 处理元素更新
  const handleElementsChange = useCallback((newElements: WhiteboardElement[]) => {
    setElements(newElements)
    // TODO: 同步到 WebSocket
  }, [])

  // 投影学生分享内容到白板
  const handleProjectShare = useCallback((_shareId: string, content: any) => {
    const api = (window as any).whiteboardAPI
    if (!api) return

    const x = Math.random() * 200 + 100
    const y = Math.random() * 200 + 100

    if (content.content_type === 'image' && content.image_url) {
      // 不传递 scale，让 addImage 自动计算为画布宽度的 1/3
      api.addImage(content.image_url, x, y)
    } else if (content.content) {
      api.addText(content.content, x, y)
    }
  }, [])

  // 发布任务（发布给所有学生）
  const handlePublishTask = useCallback(async (group: WhiteboardTaskGroup) => {
    if (!effectiveClassroomSessionId) {
      alert(classroomStartReminderText)
      return
    }
    const socketReady = await ensureSocketOpen()
    if (!socketReady) {
      alert(t('connection.error') || '课堂连接未建立，请刷新课堂教学页面后重试')
      return
    }
    const sourceGroupId = getSourceGroupId(group)
    const groupToPublish = {
      ...group,
      id: sourceGroupId,
    }
    const totalCountdown = Array.isArray(groupToPublish.tasks) && groupToPublish.tasks.length > 0
      ? groupToPublish.tasks.reduce((sum: number, task: any) => sum + (task.countdown_seconds || 30), 0) + 30
      : undefined
    try {
      await liveTaskService.publishTaskGroup(sourceGroupId, totalCountdown)
      void getRoomInfo()
    } catch (error) {
      console.error('Failed to publish task group:', error)
      const publishError = error as { response?: { data?: { detail?: unknown } }; message?: unknown } | null
      const rawMessage =
        publishError?.response?.data?.detail ??
        publishError?.message
      const message = rawMessage ? String(rawMessage) : t('connection.error')
      alert(message)
      return
    }
    setPreviewingGroup(null)
    setTaskGroups(prev => prev.filter(g => getSourceGroupId(g) !== sourceGroupId))
    await refreshWhiteboardOverview()
    return
    let publishableGroup = group
    if (!publishableGroup.tasks || publishableGroup.tasks.length === 0) {
      try {
        const fullGroup = await liveTaskService.getTaskGroup(getSourceGroupId(group))
        publishableGroup = {
          ...fullGroup,
          source_group_id: group.source_group_id,
          session_id: group.session_id,
        }
      } catch (error) {
        console.error('Failed to load task group before publish:', error)
      }
    }
    if (!publishableGroup.tasks || publishableGroup.tasks.length === 0) {
      alert(t('teacherLive.noTasksInGroup') || '该任务组没有题目')
      return
    }
    try {
      const totalCountdown = Array.isArray(publishableGroup.tasks) && publishableGroup.tasks.length > 0
        ? publishableGroup.tasks.reduce((sum: number, task: any) => sum + (task.countdown_seconds || 30), 0) + 30
        : undefined
      await liveTaskService.publishTaskGroup(getSourceGroupId(publishableGroup), totalCountdown)
      void getRoomInfo()
    } catch (error) {
      console.error('Failed to publish task group:', error)
      const publishError = error as { response?: { data?: { detail?: unknown } }; message?: unknown } | null
      const rawMessage =
        publishError?.response?.data?.detail ??
        publishError?.message
      const message = rawMessage ? String(rawMessage) : t('connection.error')
      alert(message)
      return
    }
    setPreviewingGroup(null)
    setTaskGroups(prev => prev.filter(g => getSourceGroupId(g) !== getSourceGroupId(publishableGroup)))
    await refreshWhiteboardOverview()
  }, [effectiveClassroomSessionId, classroomStartReminderText, ensureSocketOpen, getRoomInfo, getSourceGroupId, refreshWhiteboardOverview, t])

  // 结束任务
  const handleEndTask = useCallback(async (group: WhiteboardTaskGroup) => {
    if (!window.confirm(`确定要结束任务「${group.title}」吗？`)) return
    endTaskGroup(getSourceGroupId(group))
    setPreviewingGroup(null)
    // 立即将任务移到已完成列表（不等服务器通知）
    const sourceId = getSourceGroupId(group)
    setPublishedGroups(prev => {
      // 避免重复添加
      if (prev.some(g => getSourceGroupId(g) === sourceId)) return prev
      return [...prev, { ...group, status: 'ended' as const } as unknown as WhiteboardTaskGroup]
    })
  }, [endTaskGroup, getSourceGroupId])

  // 发布全部（发布第一个任务给所有学生）
  // 退回草稿
  const handleRevertToDraft = useCallback(async (group: WhiteboardTaskGroup) => {
    if (!window.confirm(`确定要将任务组「${group.title}」退回草稿状态吗？`)) {
      return
    }
    try {
      await liveTaskService.updateTaskGroup(getSourceGroupId(group), { status: 'draft' })
      await refreshWhiteboardOverview()
    } catch (e) {
      console.error('Failed to revert to draft:', e)
      alert('退回草稿失败，请重试')
    }
  }, [getSourceGroupId, refreshWhiteboardOverview])

  // 查看分析
  const handleViewAnalysis = useCallback(async (group: WhiteboardTaskGroup) => {
    // 先加载完整任务组数据（包含tasks）
    setShowAnalysisModal(true)
    setAnalyticsLoading(true)
    try {
      const groupId = getSourceGroupId(group)
      // 优先使用任务的 session_id，如果为空则使用当前活跃 session
        const effectiveSessionId = group.session_id || effectiveClassroomSessionId
      const [groupDetail, analytics] = await Promise.all([
        liveTaskService.getTaskGroup(groupId),
        liveTaskService.getTaskGroupAnalytics(groupId, effectiveSessionId)
      ])
      setSelectedGroupForAnalysis({ ...group, tasks: groupDetail.tasks || [] })
      setAnalyticsData(analytics)
    } catch (e) {
      console.error('Failed to load analysis:', e)
      setShowAnalysisModal(false)
      alert('加载分析数据失败，该任务可能已被删除')
    } finally {
      setAnalyticsLoading(false)
    }
  }, [effectiveClassroomSessionId, getSourceGroupId])

  // 查看明细
  const handleViewDetails = useCallback(async (group: WhiteboardTaskGroup) => {
    // 先加载完整任务组数据（包含tasks）
    setShowDetailModal(true)
    setSubmissionLoading(true)
    setViewingStudentDetail(null)
    try {
      const groupId = getSourceGroupId(group)
      // 优先使用任务的 session_id，如果为空则使用当前活跃 session
        const effectiveSessionId = group.session_id || effectiveClassroomSessionId
      const [groupDetail, submissions, sessionSummary] = await Promise.all([
        liveTaskService.getTaskGroup(groupId),
        liveTaskService.getTaskGroupSubmissions(groupId, effectiveSessionId),
        // 获取课堂学生参与列表，用于过滤
        effectiveSessionId ? api.get(`/live/sessions/${effectiveSessionId}/summary`).then(r => r.data).catch(() => null) : Promise.resolve(null)
      ])
      setSelectedGroupForAnalysis({ ...group, tasks: groupDetail.tasks || [] })

      // 过滤：只显示当前课堂参与的学生（参照课堂回顾）
      if (sessionSummary?.all_students && submissions?.students) {
        const sessionStudentIds = new Set(sessionSummary.all_students.map((s: any) => s.student_id))
        submissions.students = submissions.students.filter((s: any) => sessionStudentIds.has(s.student_id))
      }
      setSubmissionData(submissions)
    } catch (e) {
      console.error('Failed to load details:', e)
      setShowDetailModal(false)
      alert('加载答题明细失败，该任务可能已被删除')
    } finally {
      setSubmissionLoading(false)
    }
  }, [effectiveClassroomSessionId, getSourceGroupId])

  // 创建并开始挑战的通用方法
  const doCreateChallenge = useCallback(async (mode: 'class_challenge' | 'duel' | 'single_question_duel', participantIds?: string[], taskId?: string) => {
    if (!currentClassId || !previewingGroup) return
    if (activeTaskGroup || currentChallenge) {
      alert(t('challenge.activeConflict'))
      return
    }
    if (!isConnected) {
      alert(t('connection.error'))
      return
    }

    const challengeTasks =
      mode === 'single_question_duel'
        ? (previewingGroup.tasks || []).filter((task: any) => getWhiteboardTaskId(task) === taskId)
        : (previewingGroup.tasks || [])

    const supportedTaskTypes =
      mode === 'single_question_duel'
        ? SUPPORTED_SINGLE_QUESTION_DUEL_TASK_TYPES
        : SUPPORTED_CHALLENGE_TASK_TYPES

    const unsupportedTypes = Array.from(
      new Set(challengeTasks.map((task) => task.type).filter((type) => !supportedTaskTypes.has(type)))
    )

    if (unsupportedTypes.length > 0) {
      const typeLabels = unsupportedTypes.map(type => getTaskTypeLabel(type, t, type))
      alert(tWithParams('challenge.unsupportedTypesInline', { types: typeLabels.join('、') }))
      return
    }

    if ((mode === 'duel' || mode === 'single_question_duel') && (!participantIds || participantIds.length !== 2)) {
      alert(t('challenge.selectTwoParticipants'))
      return
    }

    if (mode === 'single_question_duel' && !taskId) {
      alert(t('challenge.selectBuzzQuestion'))
      return
    }
    if (mode === 'single_question_duel' && challengeTasks.length !== 1) {
      alert(t('challenge.selectBuzzQuestion'))
      return
    }

    if (mode === 'class_challenge' && challengeCandidates.length < 1) {
      alert(t('challenge.noEligibleParticipants'))
      return
    }

    const effectiveParticipantIds =
      mode === 'class_challenge'
        ? challengeCandidates.map((student) => student.id)
        : participantIds

    setChallengeCreating(true)
    try {
      console.log('[Whiteboard] Creating challenge:', { mode, participantIds: effectiveParticipantIds, taskId })
      const challenge = await liveTaskService.createChallenge({
        class_id: currentClassId,
        task_group_id: getSourceGroupId(previewingGroup),
        title: previewingGroup.title,
        mode,
        participant_ids: effectiveParticipantIds,
        task_id: taskId,
      } as any)
      console.log('[Whiteboard] Challenge created:', challenge)
      if (challenge?.id) {
        console.log('[Whiteboard] Starting challenge:', challenge.id)
        startChallenge(challenge.id)
      } else {
        console.error('[Whiteboard] Challenge created but no id returned')
        alert('创建挑战失败：未返回挑战ID')
      }
      setPreviewingGroup(null)
      await refreshWhiteboardOverview()
    } catch (e: any) {
      console.error('[Whiteboard] Failed to create or start challenge:', e)
      alert(e?.message || '创建挑战失败')
    } finally {
      setChallengeCreating(false)
    }
  }, [activeTaskGroup, challengeCandidates.length, currentChallenge, currentClassId, getSourceGroupId, isConnected, previewingGroup, refreshWhiteboardOverview, startChallenge, t, tWithParams])

  // 发起全班挑战
  const handleStartClassChallenge = useCallback(() => {
    if (!previewingGroup) return
    doCreateChallenge('class_challenge')
  }, [previewingGroup, doCreateChallenge])

  // 发起 PK 对决
  const handleStartDuel = useCallback(() => {
    if (!previewingGroup) return
    setShowDuelModal(true)
  }, [previewingGroup])

  // 确认 PK 对决
  const handleConfirmDuel = useCallback(() => {
    if (selectedDuelParticipants.length !== 2) return
    setShowDuelModal(false)
    doCreateChallenge('duel', selectedDuelParticipants)
    setSelectedDuelParticipants([])
  }, [selectedDuelParticipants, doCreateChallenge])

  // 发起抢答模式
  const handleStartQuickAnswer = useCallback(() => {
    if (!previewingGroup) return
    if (singleQuestionDuelTasks.length === 0) {
      alert(t('challenge.selectBuzzQuestion'))
      return
    }
    setSelectedSingleQuestionTaskId((prev) => {
      if (prev && singleQuestionDuelTasks.some((task: any) => getWhiteboardTaskId(task) === prev)) {
        return prev
      }
      return getWhiteboardTaskId(singleQuestionDuelTasks[0] as any) || null
    })
    setShowSingleQuestionDuelModal(true)
  }, [previewingGroup, singleQuestionDuelTasks, t])

  // 确认抢答
  const handleConfirmSingleQuestionDuel = useCallback(() => {
    if (selectedSingleQuestionParticipants.length !== 2) {
      alert(t('challenge.selectTwoParticipants'))
      return
    }
    if (!selectedSingleQuestionTaskId) {
      alert(t('challenge.selectBuzzQuestion'))
      return
    }
    setShowSingleQuestionDuelModal(false)
    doCreateChallenge('single_question_duel', selectedSingleQuestionParticipants, selectedSingleQuestionTaskId)
    setSelectedSingleQuestionParticipants([])
    setSelectedSingleQuestionTaskId(null)
  }, [doCreateChallenge, selectedSingleQuestionParticipants, selectedSingleQuestionTaskId, t])

  // 结束挑战
  const handleEndChallenge = useCallback(() => {
    if (!currentChallenge) return
    endChallenge(currentChallenge.id)
    setPreviewingGroup(null)
    void refreshWhiteboardOverview()
  }, [currentChallenge, endChallenge, refreshWhiteboardOverview])

  // 打开挑战投屏
  const handleOpenChallengeBoard = useCallback(async () => {
    setShowChallengeBoard(true)
    if (!document.fullscreenElement) {
      try { await document.documentElement.requestFullscreen() } catch { /* ignore */ }
    }
  }, [])

  // 关闭挑战投屏
  const handleCloseChallengeBoard = useCallback(async () => {
    setShowChallengeBoard(false)
    if (document.fullscreenElement) {
      try { await document.exitFullscreen() } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (!currentChallenge) {
      setShowChallengeBoard(false)
      return
    }
    if (isChallengeFinished(currentChallenge)) {
      void refreshWhiteboardOverview()
    }
  }, [currentChallenge, refreshWhiteboardOverview])

  // 当活跃任务组结束时刷新已完成列表
  const prevActiveRef = useRef(activeTaskGroup)
  useEffect(() => {
    if (prevActiveRef.current && !activeTaskGroup && effectiveClassroomSessionId) {
      void refreshWhiteboardOverview()
    }
    prevActiveRef.current = activeTaskGroup
  }, [activeTaskGroup, effectiveClassroomSessionId, refreshWhiteboardOverview])

  useEffect(() => {
    if (isConnected) {
      void refreshWhiteboardOverview()
    }
  }, [isConnected, refreshWhiteboardOverview])

  // 预览任务 - 加载完整任务数据
  const handlePreviewTask = useCallback(async (group: WhiteboardTaskGroup) => {
    try {
      // 加载完整任务组详情（包含 tasks）
      const fullGroup = await liveTaskService.getTaskGroup(getSourceGroupId(group))
      setPreviewingGroup({ ...fullGroup, source_group_id: group.source_group_id, session_id: group.session_id })
    } catch (e) {
      console.error('Failed to load task group details:', e)
      // 如果加载失败，至少显示基本信息
      setPreviewingGroup(group)
    }
  }, [getSourceGroupId])

  // 关闭预览
  const handleClosePreview = useCallback(() => {
    setPreviewingGroup(null)
  }, [])

  // 从预览发布任务
  const handlePublishFromPreview = useCallback(() => {
    if (previewingGroup) {
      handlePublishTask(previewingGroup)
      setPreviewingGroup(null)
    }
  }, [previewingGroup, handlePublishTask])

  // 将题目投影到白板
  const handleProjectToWhiteboard = useCallback((group: LiveTaskGroup) => {
    const api = (window as any).whiteboardAPI
    if (!api) return

    const tasks = group.tasks || []
    if (tasks.length === 0) return

    // 根据主题设置文字颜色
    const textColor = theme === 'dark' ? '#f8fafc' : '#1e293b'

    // 从 TipTap JSON 中提取纯文本
    const extractTextFromTipTap = (node: any): string => {
      if (!node) return ''
      if (typeof node === 'string') return node
      if (Array.isArray(node)) {
        return node.map(extractTextFromTipTap).join('')
      }
      if (typeof node === 'object') {
        // TipTap text 节点
        if (node.type === 'text' && node.text) {
          return node.text
        }
        // TipTap paragraph 或其他容器节点
        if (node.content && Array.isArray(node.content)) {
          const text = node.content.map(extractTextFromTipTap).join('')
          // 段落之间加换行
          if (node.type === 'paragraph' || node.type === 'heading') {
            return text + '\n'
          }
          return text
        }
        // 如果是 doc 节点但没有 content（容错）
        if (node.type === 'doc') {
          return ''
        }
      }
      return ''
    }

    // 深度解析阅读题内容（处理各种可能的格式）
    const extractReadingContent = (val: any): string => {
      if (!val) return ''
      if (typeof val === 'string') {
        // 已经是字符串，但可能是 JSON 字符串
        try {
          const parsed = JSON.parse(val)
          return extractReadingContent(parsed)
        } catch {
          return val
        }
      }
      if (Array.isArray(val)) {
        return val.map(extractReadingContent).join('\n')
      }
      if (typeof val === 'object') {
        // TipTap doc 格式
        if (val.type === 'doc' && Array.isArray(val.content)) {
          return extractTextFromTipTap(val)
        }
        // 直接是 content 数组
        if (Array.isArray(val.content)) {
          return extractTextFromTipTap({ type: 'doc', content: val.content })
        }
        // 尝试提取所有文本内容
        const texts: string[] = []
        const extractAllTexts = (obj: any) => {
          if (!obj) return
          if (typeof obj === 'string') {
            texts.push(obj)
            return
          }
          if (Array.isArray(obj)) {
            obj.forEach(extractAllTexts)
            return
          }
          if (typeof obj === 'object') {
            // 跳过 marks 和 attrs
            if (obj.marks || obj.attrs) {
              // 只处理 text 和 content
              if (obj.text) texts.push(obj.text)
              if (obj.content) extractAllTexts(obj.content)
              return
            }
            Object.values(obj).forEach(extractAllTexts)
          }
        }
        extractAllTexts(val)
        return texts.join(' ')
      }
      return String(val)
    }

    // 安全获取字符串
    const safeStr = (val: any): string => {
      if (val === null || val === undefined) return ''
      if (typeof val === 'string') {
        // 尝试解析字符串化的 JSON (TipTap 格式)
        try {
          const parsed = JSON.parse(val)
          if (parsed && typeof parsed === 'object') {
            if (parsed.type === 'doc' || Array.isArray(parsed.content)) {
              return extractTextFromTipTap(parsed)
            }
          }
        } catch {
          // 不是 JSON，直接返回字符串
        }
        return val
      }
      if (Array.isArray(val)) return val.map(item => safeStr(item)).join('')
      if (val && typeof val === 'object') {
        // TipTap JSON 内容
        if (val.type === 'doc' && Array.isArray(val.content)) {
          return extractTextFromTipTap(val)
        }
        // 普通对象，尝试获取文本属性
        if (val.text) return safeStr(val.text)
        if (val.content) return safeStr(val.content)
        if (val.question) return safeStr(val.question)
        // 备用：如果有 content 字段但不是数组，尝试直接提取
        if (Array.isArray(val.content)) {
          return extractTextFromTipTap({ type: 'doc', content: val.content })
        }
        // 最后尝试：提取所有字符串值
        try {
          const jsonStr = JSON.stringify(val)
          // 如果对象很小，可能是错误数据，返回空
          if (jsonStr.length < 50) return ''
          // 尝试从 JSON 中提取 text 字段
          const textMatches = jsonStr.match(/"text":"([^"]+)"/g)
          if (textMatches) {
            return textMatches.map(m => m.replace(/"text":"/, '').replace(/"$/, '')).join(' ')
          }
        } catch {
          // ignore
        }
        return ''
      }
      return String(val)
    }

    // 格式化填空题文本，将答案插入到空格中
    const formatFillBlankQuestion = (q: any): string => {
      const text = safeStr(q?.text)
      const blanks = q?.blanks || []
      if (!text || blanks.length === 0) return text

      // 按位置排序填空
      const sortedBlanks = [...blanks].sort((a, b) => (a.position || 0) - (b.position || 0))

      // 构建带答案的文本
      const answers = sortedBlanks.map((b: any) => `___${b.answer || ''}___`).join(', ')
      return `${text} (答案: ${answers})`
    }

    // 每道题单独投影，避免过长
    const startX = 50
    let currentY = 50
    const lineHeight = 35

    // 添加标题
    const title = safeStr(group.title)
    api.addText?.(`[${title}] (${tasks.length}题)`, startX, currentY, textColor)
    currentY += lineHeight + 10

    tasks.forEach((task: any, idx: number) => {
      const q = task.question as any
      let questionText = ''

      if (typeof q === 'string') {
        questionText = q
      } else if (q && typeof q === 'object') {
        // 填空题特殊处理
        if (task.type === 'fill_blank' || q?.blanks?.length) {
          questionText = formatFillBlankQuestion(q)
        } else if (task.type === 'reading') {
          // 阅读题的题目通常是可选的，如果没有则显示类型
          questionText = safeStr(q.text || q.question) || '阅读理解'
        } else if (task.type === 'experiment') {
          // 实验题显示类型
          questionText = safeStr(q.text || q.question) || '实验题'
        } else {
          questionText = safeStr(q.text || q.content || q.question)
        }
      }

      // 题目
      api.addText?.(`${idx + 1}. ${questionText}`, startX, currentY, textColor)
      currentY += lineHeight

      // 实验题 - 显示URL并尝试加载iframe
      if (task.type === 'experiment') {
        const expUrl = q?.html_url || q?.url || q?.experimentUrl || q?.externalUrl || ''
        if (expUrl && typeof expUrl === 'string') {
          api.addText?.(`   实验链接: ${expUrl}`, startX + 20, currentY, textColor)
          currentY += lineHeight - 5
          // 提示用户可以通过浏览器打开
          api.addText?.(`   (请在浏览器中打开此链接)`, startX + 20, currentY, textColor)
          currentY += lineHeight - 5
        }
      }

      // 选项（选择题）
      const options = q?.options || []
      if (Array.isArray(options) && options.length > 0) {
        options.forEach((opt: any, optIdx: number) => {
          const label = String.fromCharCode(65 + optIdx)
          const optText = typeof opt === 'string' ? opt : safeStr(opt?.text || opt?.content || '')
          api.addText?.(`   ${label}. ${optText}`, startX + 20, currentY, textColor)
          currentY += lineHeight - 5
        })
      }

      // 判断题选项
      if (task.type === 'true_false') {
        api.addText?.('   A. 正确 (True)', startX + 20, currentY, textColor)
        currentY += lineHeight - 5
        api.addText?.('   B. 错误 (False)', startX + 20, currentY, textColor)
        currentY += lineHeight - 5
      }

      // 匹配题 - 只显示左右列，不显示答案
      const pairs = q?.pairs || []
      if (task.type === 'matching' || pairs.length > 0) {
        const leftItems = pairs.map((p: any) => safeStr(p.left || p.item || '')).filter(Boolean)
        const rightItems = pairs.map((p: any) => safeStr(p.right || p.match || '')).filter(Boolean)

        if (leftItems.length > 0) {
          api.addText?.('   左列:', startX + 20, currentY, textColor)
          currentY += lineHeight - 5
          leftItems.forEach((item: string, i: number) => {
            api.addText?.(`      ${i + 1}. ${item}`, startX + 20, currentY, textColor)
            currentY += lineHeight - 5
          })

          api.addText?.('   右列:', startX + 20, currentY, textColor)
          currentY += lineHeight - 5
          rightItems.forEach((item: string, i: number) => {
            api.addText?.(`      ${String.fromCharCode(65 + i)}. ${item}`, startX + 20, currentY, textColor)
            currentY += lineHeight - 5
          })
        }
      }

      // 阅读题 - 显示文章和问题
      if (task.type === 'reading') {
        // 调试日志，帮助确认数据结构
        console.log('Reading task question:', JSON.parse(JSON.stringify(q)))
        console.log('Passage raw:', q?.passage)
        console.log('Passage type:', typeof q?.passage)
        if (q?.passage && typeof q.passage === 'object') {
          console.log('Passage has type:', q.passage.type)
          console.log('Passage has content:', Array.isArray(q.passage.content))
        }

        const passage = extractReadingContent(q?.passage)
        const prompt = extractReadingContent(q?.prompt)

        console.log('Extracted passage:', passage?.substring(0, 100))
        console.log('Extracted prompt:', prompt?.substring(0, 100))

        if (passage) {
          api.addText?.('   阅读材料:', startX + 20, currentY, textColor)
          currentY += lineHeight - 5

          // 将文章按段落分割，每段作为一个文本对象（保留换行）
          const paragraphs = passage.split('\n').filter((line: string) => line.trim())
          if (paragraphs.length === 0 && passage.trim()) {
            // 如果没有换行但内容存在，作为一个整体添加（允许自动换行）
            api.addText?.(`      ${passage}`, startX + 20, currentY, textColor)
            currentY += lineHeight * 2
          } else {
            paragraphs.forEach((paragraph: string) => {
              // 每段作为一个文本对象，Fabric.js IText 会自动处理换行
              api.addText?.(`      ${paragraph}`, startX + 20, currentY, textColor)
              // 根据段落长度估算高度（每60字符约一行）
              const lines = Math.ceil(paragraph.length / 60)
              currentY += lineHeight * Math.max(1, lines * 0.6)
            })
          }
        } else {
          api.addText?.('   [阅读材料为空]', startX + 20, currentY, textColor)
          currentY += lineHeight - 5
        }

        if (prompt) {
          api.addText?.('   问题:', startX + 20, currentY, textColor)
          currentY += lineHeight - 5
          // 限制问题长度
          const maxLineLength = 60
          for (let i = 0; i < prompt.length; i += maxLineLength) {
            const chunk = prompt.substring(i, i + maxLineLength)
            api.addText?.(`      ${chunk}`, startX + 20, currentY, textColor)
            currentY += lineHeight - 8
          }
        }
      }

      // 答案（填空题、匹配题已在题目中处理或不显示，此处跳过）
      if (task.type !== 'fill_blank' && task.type !== 'matching') {
        const answer = q?.correctAnswer || q?.correct_answer || q?.answer
        if (answer) {
          let answerText = ''
          if (typeof answer === 'string') {
            answerText = answer
          } else if (Array.isArray(answer)) {
            answerText = answer.map((a: any) => safeStr(a)).join(', ')
          } else {
            answerText = safeStr(answer)
          }
          api.addText?.(`   答案: ${answerText}`, startX + 20, currentY, textColor)
          currentY += lineHeight - 5
        }
      }

      currentY += 15 // 题目间距
    })

    // 关闭预览
    setPreviewingGroup(null)
  }, [theme])

  const tc = themeClasses

  // 认证检查中显示加载状态
  if (isAuthChecking) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center ${tc.bg} ${tc.text}`}>
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-slate-400">正在恢复登录状态...</p>
      </div>
    )
  }

  // 未登录或非教师角色
  if (!user || user.role !== 'teacher') {
    return null
  }

  // 没有班级时显示引导弹窗
  if (classesLoaded && classes.length === 0) {
    const handleQuickCreateClass = async () => {
      const name = quickClassName.trim()
      if (!name) { setQuickError('请输入班级名称'); return }
      setQuickCreating(true)
      setQuickError('')
      try {
        const newClass = await classService.create({ name })
        setClasses([newClass])
        setCurrentClassId(newClass.id)
        setClassesLoaded(true)
      } catch (e: any) {
        setQuickError(e?.response?.data?.detail || '创建失败')
      } finally {
        setQuickCreating(false)
      }
    }

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0f0f13] text-slate-100">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-indigo-500/30">
              🏫
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">还没有创建班级</h2>
            <p className="text-slate-400 leading-relaxed">
              请先创建一个班级，才能开始互动课堂。学生加入班级后即可参与实时互动。
            </p>
          </div>
          <div className="bg-[#1a1a22] rounded-2xl p-6 border border-slate-700">
            <h3 className="text-base font-semibold text-white mb-4">快速创建班级</h3>
            <input
              type="text"
              value={quickClassName}
              onChange={(e) => { setQuickClassName(e.target.value); setQuickError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickCreateClass() }}
              placeholder="输入班级名称，如：周六上午班"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              autoFocus
            />
            {quickError && <p className="mt-2 text-sm text-red-400">{quickError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleQuickCreateClass}
                disabled={quickCreating}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50"
              >
                {quickCreating ? '创建中...' : '创建并进入'}
              </button>
              <button
                onClick={() => navigate('/teacher/classes')}
                className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-600 transition-colors"
              >
                班级管理
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <WhiteboardAiProvider>
    <div className={`h-screen flex flex-col overflow-hidden ${tc.bg} ${tc.text}`}>
      {/* 顶部栏 */}
      <header className={`h-16 flex items-center justify-between px-6 border-b backdrop-blur-xl z-50 ${tc.headerBg}`}>
        {/* 左侧：返回 + 班级选择 */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/teacher')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${tc.textMuted} ${tc.textMutedHover} hover:bg-black/10`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm">{t('common.back')}</span>
          </button>

          <div className={`h-6 w-px ${tc.divider}`} />

          {/* 氛围设置按钮 - 放在左侧 */}
          <div className="relative" ref={danmuSettingsRef} data-tour="whiteboard-danmu-settings">
            <button
              onClick={() => setShowDanmuSettings(!showDanmuSettings)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-lg ${
                danmuConfig.enabled
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-500/30 hover:shadow-pink-500/50'
                  : theme === 'dark'
                  ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600/80 shadow-black/20'
                  : 'bg-white/90 text-slate-600 hover:bg-white shadow-black/10'
              }`}
            >
              <span className="text-lg">🎆</span>
              <span className="text-sm font-medium">氛围</span>
            </button>

            {/* 氛围设置面板 - 向下展开 */}
            {showDanmuSettings && (
              <div
                className="absolute left-0 top-full mt-2 z-[200] rounded-xl shadow-2xl border"
                style={{ minWidth: '420px', background: theme === 'dark' ? '#1e293b' : '#fff' }}
              >
                <div className="p-4 border-b border-slate-200/20">
                  <h4 className="text-base font-semibold" style={{ color: theme === 'dark' ? '#e2e8f0' : '#334155' }}>🎆 氛围设置</h4>
                </div>
                <div className="p-5 space-y-5">
                  {/* 弹幕开关 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>弹幕</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const enabled = !danmuConfig.enabled
                        sendDanmuConfig({ ...danmuConfig, enabled })
                      }}
                      className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                        danmuConfig.enabled
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg shadow-pink-500/40'
                          : theme === 'dark'
                          ? 'bg-slate-600'
                          : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                          danmuConfig.enabled ? 'translate-x-8 left-0' : 'translate-x-0.5 left-0'
                        }`}
                        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.25)' }}
                      />
                    </button>
                  </div>

                  {/* 弹幕速度 */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium flex-shrink-0" style={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>速度</span>
                    <div className="flex gap-2 ml-auto">
                      {(['slow', 'medium', 'fast'] as const).map(speed => (
                        <button
                          key={speed}
                          onClick={(e) => { e.stopPropagation(); sendDanmuConfig({ ...danmuConfig, speed }) }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            danmuConfig.speed === speed
                              ? 'bg-pink-500 text-white shadow'
                              : theme === 'dark'
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {speed === 'slow' ? '慢速' : speed === 'medium' ? '中速' : '快速'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 弹幕区域 */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium flex-shrink-0" style={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>区域</span>
                    <div className="flex gap-2 ml-auto">
                      {(['full', 'bottom', 'middle'] as const).map(area => (
                        <button
                          key={area}
                          onClick={(e) => { e.stopPropagation(); sendDanmuConfig({ ...danmuConfig, area }) }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            danmuConfig.area === area
                              ? 'bg-pink-500 text-white shadow'
                              : theme === 'dark'
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {area === 'full' ? '全屏' : area === 'bottom' ? '下方' : '中间'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 弹幕背景颜色 */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium flex-shrink-0" style={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>颜色</span>
                    <div className="flex gap-3 ml-auto">
                      {[
                        { label: '黑色', value: 'rgba(0, 0, 0, 0.75)' },
                        { label: '红色', value: 'rgba(220, 38, 38, 0.75)' },
                        { label: '蓝色', value: 'rgba(37, 99, 235, 0.75)' },
                        { label: '绿色', value: 'rgba(22, 163, 74, 0.75)' },
                        { label: '紫色', value: 'rgba(147, 51, 234, 0.75)' },
                      ].map(color => (
                        <button
                          key={color.value}
                          onClick={(e) => { e.stopPropagation(); sendDanmuConfig({ ...danmuConfig, bgColor: color.value }) }}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${danmuConfig.bgColor === color.value ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: color.value, boxShadow: danmuConfig.bgColor === color.value ? '0 0 0 2px white, 0 0 8px rgba(255,255,255,0.5)' : 'none' }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 氛围效果 */}
                  <div className="rounded-xl border border-slate-200/20 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium" style={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>
                          弹幕预制语句
                        </div>
                        <div className="text-xs mt-1" style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
                          最多 5 条，学生端发送弹幕时会显示这些语句。
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDanmuPresetEditor((prev) => !prev)
                        }}
                        disabled={false}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          danmuPresetDrafts.length >= 5
                            ? theme === 'dark'
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : theme === 'dark'
                            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        新增
                      </button>
                    </div>

                    {showDanmuPresetEditor && (
                      <>
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addDanmuPresetPhrase()
                            }}
                            disabled={danmuPresetDrafts.length >= 5}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              danmuPresetDrafts.length >= 5
                                ? theme === 'dark'
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : theme === 'dark'
                                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            新增语句
                          </button>
                        </div>
                    <div className="space-y-2">
                      {danmuPresetDrafts.length > 0 ? (
                        danmuPresetDrafts.map((phrase, index) => (
                          <div key={`danmu-preset-${index}`} className="flex items-center gap-2">
                            <input
                              value={phrase}
                              maxLength={20}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleDanmuPresetDraftChange(index, e.target.value)}
                              onBlur={() => persistDanmuPresetPhrases(danmuPresetDrafts)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  persistDanmuPresetPhrases(danmuPresetDrafts)
                                }
                              }}
                              placeholder={`预设语句 ${index + 1}`}
                              className={`flex-1 rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-pink-500/40 ${
                                theme === 'dark'
                                  ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500'
                                  : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
                              }`}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeDanmuPresetPhrase(index)
                              }}
                              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                theme === 'dark'
                                  ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              }`}
                            >
                              删除
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs" style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
                          暂无预制语句，点击“新增语句”开始设置。
                        </div>
                      )}
                    </div>
                      </>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/20">
                    <span className="text-sm font-medium flex-shrink-0" style={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>氛围效果</span>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {[
                        { type: 'cheer' as const, emoji: '🎉', label: '欢呼' },
                        { type: 'fireworks' as const, emoji: '🎆', label: '烟花' },
                        { type: 'stars' as const, emoji: '⭐', label: '星星' },
                        { type: 'hearts' as const, emoji: '💖', label: '爱心' },
                        { type: 'flame' as const, emoji: '🔥', label: '火焰' },
                      ].map(item => (
                        <button
                          key={item.type}
                          onClick={(e) => { e.stopPropagation(); sendAtmosphereEffect(item.type) }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 transition-all"
                          title={item.label}
                        >
                          <span>{item.emoji}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`h-6 w-px ${tc.divider}`} />

          <div className="flex items-center gap-2">
            <span className={`${tc.textMuted} text-sm`}>{t('class.current')}:</span>
            {classes.length > 0 ? (
                <select
                  data-tour="whiteboard-class-select"
                  value={currentClassId || ''}
                onChange={(e) => {
                  const newClassId = e.target.value
                  if (newClassId !== currentClassId) {
                    // 切换班级前清除旧班级的本地数据
                    clearWhiteboardData(currentClassId || undefined)
                    setCurrentClassId(newClassId)
                  }
                }}
                className={`rounded-lg px-3 py-1.5 text-sm focus:outline-none min-w-[120px] appearance-none cursor-pointer transition-colors ${tc.selectBg} ${tc.text}`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 8px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '16px',
                  paddingRight: '32px'
                }}
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id} className={`${tc.selectBg} ${tc.text} py-2`}>{cls.name}</option>
                ))}
              </select>
            ) : (
              <span className={`${tc.textMuted} text-sm`}>{t('whiteboard.noClassSelected')}</span>
            )}
            {currentClassId && (
              <button
                onClick={generateClassQRCode}
                className={`ml-2 p-2 rounded-lg transition-colors ${tc.textMutedHover} hover:bg-black/10`}
                title="显示班级二维码"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 中间：模式切换 */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 p-1 rounded-full border ${tc.modeSwitchBg} ${theme === 'dark' ? 'border-slate-700' : theme === 'light' ? 'border-slate-300' : 'border-purple-200'}`}>
            <button
              onClick={() => setMode('lecture')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                mode === 'lecture'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                  : `${tc.textMuted} ${tc.textMutedHover}`
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {t('whiteboard.lectureMode')}
            </button>
            <button
              onClick={() => setMode('interactive')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                mode === 'interactive'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                  : `${tc.textMuted} ${tc.textMutedHover}`
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              {t('whiteboard.interactiveMode')}
            </button>
          </div>
        </div>

        {/* 右侧：主题选择 + 在线人数 + 结束 */}
        <div className="flex items-center gap-4">
          {/* 主题选择 */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as WhiteboardTheme)}
            className={`rounded-lg px-3 py-1.5 text-sm focus:outline-none cursor-pointer border ${tc.selectBg} ${tc.text}`}
          >
            <option value="dark">🌙 深色</option>
            <option value="light">☀️ 浅色</option>
            <option value="colorful">🌈 彩色</option>
          </select>

          {!openedTeachingAid && (
            <>
              <button
                onClick={() => setShowBigscreenLauncher(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? 'bg-cyan-500/14 text-cyan-100 hover:bg-cyan-500/24 border-cyan-400/40'
                    : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16v10H4zM8 21h8M9 15v6m6-6v6" />
                </svg>
                <span className="text-sm">{t('bigscreenActivities.messages.whiteboardEntry')}</span>
              </button>

              <button
                onClick={() => setShowTeachingAidLibrary(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30'
                    : theme === 'light'
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-300'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-300'
                }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3v5.25m0 0A2.25 2.25 0 0012 10.5a2.25 2.25 0 002.25-2.25V3M9.75 8.25H6a2.25 2.25 0 00-2.25 2.25v7.5A2.25 2.25 0 006 20.25h12a2.25 2.25 0 002.25-2.25v-7.5A2.25 2.25 0 0018 8.25h-3.75M9 14.25h6m-6 3h6" />
                  </svg>
                  <span className="text-sm">{t('teacherTeachingAids.openLibrary')}</span>
                </button>

                <button
                  onClick={() => setShowAiSettings(true)}
                  data-tour="whiteboard-ai-settings"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border-purple-500/30'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300'
                  }`}
                >
                  <span className="text-lg">🤖</span>
                  <span className="text-sm">AI 设置</span>
                </button>
                <button
                  onClick={openTour}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-800/80 text-slate-200 hover:bg-slate-700 border-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                  }`}
                >
                  <span className="text-sm">?</span>
                  <span className="text-sm">查看引导</span>
                </button>
            </>
          )}

          {/* 课堂会话控制 */}
          <div data-tour="whiteboard-session-controls" className="flex items-center gap-3">
          {!hasActiveClassroomSession ? (
            <button
              onClick={handleStartSession}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{classroomStartButtonText}</span>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-mono font-semibold">{formatTime(elapsedSeconds)}</span>
              </div>
              <button
                onClick={handleEndSession}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                <span className="text-sm">{t('classroom.endSession') || '结束本节课'}</span>
              </button>
            </>
          )}
          </div>

        </div>
      </header>

      {/* 主体区域 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 未开始本节课提醒横幅 */}
        {currentClassId && !hasActiveClassroomSession && (roomInfoHydrated || !isConnected) && (
            <div className="absolute inset-x-0 top-0 z-[100] flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto mt-3 flex items-center gap-3 px-5 py-2.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/30">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium">{classroomStartReminderText}</span>
              <button
                onClick={handleStartSession}
                className="ml-1 px-3 py-1 bg-white text-amber-600 rounded-lg text-sm font-bold hover:bg-amber-50 transition-colors"
              >
                {classroomStartButtonText}
              </button>
            </div>
          </div>
        )}
        {showLeftPanel && (mode === 'interactive' || pendingShares.length > 0) && (
          <StudentPanel
            classroomStudents={classroomStudents}
            classroomCount={classroomCount}
            pendingShares={pendingShares}
            onClose={() => setShowLeftPanel(false)}
            onShowShares={() => setShowSharesPanel(true)}
            theme={theme}
          />
        )}

        {/* 中央白板区域 */}
        <main className="flex-1 relative flex flex-col overflow-hidden">
          {/* 学生分享请求面板 - 点击举手图标后显示 */}
          {showSharesPanel && pendingShares.length > 0 && (
            <ShareRequestsPanel
              shareRequests={pendingShares}
              onApprove={(shareId, comment) => handleShare(shareId, 'approve', comment)}
              onReject={(shareId) => handleShare(shareId, 'reject')}
              onRejectAll={() => pendingShares.forEach((s) => handleShare(s.share_id, 'reject'))}
              onProject={handleProjectShare}
              onClose={() => setShowSharesPanel(false)}
              theme={theme}
            />
          )}

          {/* 白板画布 */}
          <div className="flex-1 relative whiteboard-container">
            {/* 弹幕显示层 */}
            <DanmuScreen activeDanmus={activeDanmus as ActiveDanmu[]} config={danmuConfig as DanmuConfig} />
            {/* 氛围效果层 */}
            <AtmosphereEffects effects={activeEffects as any} />

            <WhiteboardCanvas
              elements={elements}
              onElementsChange={handleElementsChange}
              currentTool={currentTool}
              mode={mode}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              eraserSize={eraserSize}
              theme={theme}
              scale={scale}
              onScaleChange={setScale}
              onReady={() => setCanvasReady(true)}
            />

            {/* 任务预览卡片 */}
            {previewingGroup && mode === 'interactive' && (
              <TaskPreviewCard
                taskGroup={previewingGroup}
                onPublish={handlePublishFromPreview}
                onClose={handleClosePreview}
                onProjectToWhiteboard={handleProjectToWhiteboard}
                onStartClassChallenge={handleStartClassChallenge}
                onStartDuel={handleStartDuel}
                onStartQuickAnswer={handleStartQuickAnswer}
              />
            )}

            {/* 已发布任务状态卡片 */}
            {activeTaskGroup && mode === 'interactive' && !previewingGroup && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium shadow-lg z-10">
                当前任务: {activeTaskGroup.title}
              </div>
            )}

            {/* 面板展开按钮 */}
            {!showLeftPanel && (mode === 'interactive' || pendingShares.length > 0) && (
              <button
                onClick={() => setShowLeftPanel(true)}
                className={`absolute left-4 top-4 p-2 rounded-lg border transition-colors z-10 ${tc.panelToggle} ${tc.textMuted} ${tc.textMutedHover}`}
                title="打开学生面板"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {pendingShares.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                    {pendingShares.length}
                  </span>
                )}
              </button>
            )}

            {!showRightPanel && mode === 'interactive' && (
              <button
                onClick={() => setShowRightPanel(true)}
                className={`absolute right-4 top-4 p-2 rounded-lg border transition-colors z-10 ${tc.panelToggle} ${tc.textMuted} ${tc.textMutedHover}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </button>
            )}
          </div>

          {/* 底部工具栏 */}
          <WhiteboardToolbar
            currentTool={currentTool}
            onToolChange={setCurrentTool}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            eraserSize={eraserSize}
            theme={theme}
            onStrokeColorChange={setStrokeColor}
            onStrokeWidthChange={setStrokeWidth}
            onEraserSizeChange={setEraserSize}
            scale={scale}
            onZoomIn={() => setScale(s => Math.min(5, s * 1.2))}
            onZoomOut={() => setScale(s => Math.max(0.1, s / 1.2))}
            onResetZoom={() => setScale(1)}
          />
        </main>

        {/* 右侧面板 - 任务控制 */}
        {showRightPanel && mode === 'interactive' && (
          <TaskPanel
            taskGroups={taskGroups}
            publishedGroups={publishedGroups.filter((g) => !hiddenGroupIds.has(g.id))}
            onClearCompleted={handleClearCompleted}
            previewingGroup={previewingGroup}
            onClose={() => setShowRightPanel(false)}
            onRevertToDraft={handleRevertToDraft}
            onEndTask={handleEndTask}
            onPreview={handlePreviewTask}
            onRefresh={() => void refreshWhiteboardOverview()}
              theme={theme}
              activeTaskGroup={activeTaskGroup}
              activeTaskStats={
                activeTaskGroup
                ? new Map([
                    [activeTaskGroup.id, { studentCount: classroomCount, submissionCount }],
                    [getSourceGroupId(activeTaskGroup), { studentCount: classroomCount, submissionCount }],
                  ])
                : new Map()
              }
            onViewAnalysis={handleViewAnalysis}
            onViewDetails={handleViewDetails}
          />
        )}
      </div>

      {/* 分析 Modal */}
      {showAnalysisModal && selectedGroupForAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl ${
            theme === 'dark' ? 'bg-[#1a1a22] border border-slate-700' : 'bg-white border border-slate-200'
          }`}>
            <div className={`flex items-center justify-between p-4 border-b ${
              theme === 'dark' ? 'border-slate-700 bg-gradient-to-r from-indigo-500/20 to-purple-500/20' : 'border-slate-200 bg-gradient-to-r from-indigo-100 to-purple-100'
            }`}>
              <div>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedGroupForAnalysis.title}</h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>任务分析</p>
              </div>
              <button onClick={() => setShowAnalysisModal(false)} className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
              }`}>✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="animate-spin mr-3">⏳</span>
                  <p>加载中...</p>
                </div>
              ) : analyticsData ? (
                <div className="space-y-6">
                  {/* 统计卡片 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                      <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>总学生数</p>
                      <p className="text-2xl font-bold text-indigo-500">{analyticsData.total_students || 0}</p>
                    </div>
                    <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                      <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>平均正确率</p>
                      <p className={`text-2xl font-bold ${(analyticsData.summary_rate || 0) >= 60 ? 'text-emerald-500' : 'text-red-500'}`}>{Math.round(analyticsData.summary_rate || 0)}%</p>
                    </div>
                    <div className={`p-4 rounded-xl text-center ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                      <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>总结</p>
                      <p className="text-lg font-medium text-amber-500">{typeof analyticsData.summary_label === 'string' ? analyticsData.summary_label : '-'}</p>
                    </div>
                  </div>
                  {/* 题目统计 */}
                  <div>
                    <h4 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>题目统计</h4>
                    <div className="space-y-3">
                      {(analyticsData.task_analytics || []).map((task: any, idx: number) => {
                        // Helper to extract plain text from rich text object
                        const extractText = (obj: any): string => {
                          if (typeof obj === 'string') return obj;
                          if (obj && typeof obj === 'object') {
                            if (obj.content && Array.isArray(obj.content)) return obj.content.map(extractText).join('');
                            if (obj.text) return obj.text;
                            if (obj.type === 'text' && obj.text) return obj.text;
                          }
                          return '';
                        };

                        let questionText: string;
                        if (typeof task.question_text === 'string') {
                          try {
                            const parsed = JSON.parse(task.question_text);
                            questionText = extractText(parsed) || task.question_text;
                          } catch {
                            questionText = task.question_text;
                          }
                        } else if (task.question_text && typeof task.question_text === 'object') {
                          questionText = extractText(task.question_text) || JSON.stringify(task.question_text);
                        } else {
                          questionText = String(task.question_text ?? '');
                        }

                        // Check if this is a choice type question
                        const taskType = task.type as string;
                        const isChoiceQuestion = taskType === 'single_choice' || taskType === 'multiple_choice' || taskType === 'true_false';
                        const isTrueFalse = taskType === 'true_false';
                        const isFillBlank = taskType === 'fill_blank';
                        const isMatching = taskType === 'matching';

                        // Extract options for choice questions
                        const taskOptions = (task.options as Array<{key: string, text?: string}> | undefined) || [];
                        const showOptions = isChoiceQuestion && taskOptions.length > 0;

                        const matchingCorrectRows = isMatching
                          ? resolveMatchingAnswerRows(task.correct_answer, task.pairs, { fallbackToPairs: true })
                          : []

                        // Extract correct answer string
                        const correctAnswerRaw = ((): string => {
                          if (isMatching) {
                            return matchingCorrectRows.map((row) => `${row.leftText} -> ${row.rightText}`).join(' / ')
                          }
                          const ans = task.correct_answer as unknown;
                          if (ans === null || ans === undefined) return '';
                          if (typeof ans === 'string') return ans;
                          if (typeof ans === 'boolean') return ans ? 'TRUE' : 'FALSE';
                          if (typeof ans === 'object') {
                            const ansObj = ans as Record<string, unknown>;
                            if (ansObj.value !== undefined) {
                              if (typeof ansObj.value === 'boolean') return ansObj.value ? 'TRUE' : 'FALSE';
                              return String(ansObj.value);
                            }
                            return JSON.stringify(ans);
                          }
                          return String(ans);
                        })();
                        const correctAnswerStr = correctAnswerRaw.toUpperCase();

                        const wrongCount = task.total_submissions - task.correct_count;

                        return (
                          <div key={idx} className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/30 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                            <div className="flex items-start gap-3 mb-2">
                              <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-slate-700 text-white">{idx + 1}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${(task.primary_rate || 0) >= 60 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {(task.primary_rate || 0) >= 60 ? '✓ 正确率高' : '✗ 需关注'}
                              </span>
                            </div>

                            {/* Correct/Wrong count summary */}
                            <div className="flex items-center gap-4 text-sm mb-3">
                              <span className="text-emerald-500">✓ 正确 {task.correct_count || 0}人</span>
                              <span className="text-red-500">✗ 错误 {wrongCount}人</span>
                              <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}>共{task.total_submissions || 0}人答题</span>
                            </div>

                            {/* Question text */}
                            <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{questionText}</p>

                            {/* Options for choice questions */}
                            {!!showOptions && (
                              <div className="space-y-2 mb-3">
                                {taskOptions.map((opt: {key: string, text?: string}, oIdx: number) => {
                                  const isCorrectAnswer = correctAnswerStr === opt.key.toUpperCase();
                                  return (
                                    <div key={oIdx} className={`flex items-center gap-3 p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/60'}`}>
                                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${isCorrectAnswer ? 'bg-emerald-500 text-white' : theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                                        {opt.key}
                                      </span>
                                      <span className={`flex-1 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{String(opt.text || '')}</span>
                                      {isCorrectAnswer && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">正确答案</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Pairs for matching questions */}
                            {isMatching && matchingCorrectRows.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                {matchingCorrectRows.map((pair, pIdx: number) => (
                                  <div key={pIdx} className={`flex items-center gap-2 p-2 rounded ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/60'}`}>
                                    <span className="font-medium text-sm text-indigo-400">{pair.leftText}</span>
                                    <span className="text-slate-500">→</span>
                                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{pair.rightText}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Fill in the blanks */}
                            {isFillBlank && task.correct_answer && (
                              <div className={`p-3 rounded-lg mb-3 ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                                <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>参考答案</p>
                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                  {(() => {
                                    const ans = task.correct_answer;
                                    if (Array.isArray(ans)) return ans.join(', ');
                                    if (typeof ans === 'object' && ans !== null) {
                                      const ansObj = ans as Record<string, unknown>;
                                      if (ansObj.blanks && Array.isArray(ansObj.blanks)) return (ansObj.blanks as string[]).join(', ');
                                      if (ansObj.value && Array.isArray(ansObj.value)) return (ansObj.value as string[]).join(', ');
                                      return JSON.stringify(ans);
                                    }
                                    return String(ans);
                                  })() as string}
                                </p>
                              </div>
                            )}

                            {/* True/False question display */}
                            {isTrueFalse && !showOptions && (
                              <div className="space-y-2 mb-3">
                                <div className={`flex items-center gap-3 p-2 rounded-lg ${correctAnswerStr === 'TRUE' || correctAnswerStr === 'T' || correctAnswerStr === '正确' ? (theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50') : (theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/60')}`}>
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${correctAnswerStr === 'TRUE' || correctAnswerStr === 'T' || correctAnswerStr === '正确' ? 'bg-emerald-500 text-white' : theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>T</span>
                                  <span className={`flex-1 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>正确 (True)</span>
                                  {(correctAnswerStr === 'TRUE' || correctAnswerStr === 'T' || correctAnswerStr === '正确') && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">正确答案</span>}
                                </div>
                                <div className={`flex items-center gap-3 p-2 rounded-lg ${correctAnswerStr === 'FALSE' || correctAnswerStr === 'F' || correctAnswerStr === '错误' ? (theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50') : (theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/60')}`}>
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${correctAnswerStr === 'FALSE' || correctAnswerStr === 'F' || correctAnswerStr === '错误' ? 'bg-emerald-500 text-white' : theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>F</span>
                                  <span className={`flex-1 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>错误 (False)</span>
                                  {(correctAnswerStr === 'FALSE' || correctAnswerStr === 'F' || correctAnswerStr === '错误') && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">正确答案</span>}
                                </div>
                              </div>
                            )}

                            {/* 答题分布 */}
                            {task.answer_distribution && task.answer_distribution.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-700/30">
                                <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>答题分布</p>
                                <div className="space-y-1.5">
                                  {task.answer_distribution.map((dist: any, dIdx: number) => (
                                    <div key={dIdx} className="flex items-center gap-2">
                                      <span className={`text-xs w-6 ${dist.is_correct ? 'text-emerald-400' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{dist.key}</span>
                                      <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'rgba(24,36,58,0.06)' }}>
                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${dist.percentage}%`, background: dist.is_correct ? '#11998e' : '#667eea', minWidth: dist.count > 0 ? '4px' : '0' }} />
                                      </div>
                                      <span className={`text-xs w-20 text-right ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{dist.count}人 ({Math.round(dist.percentage)}%)</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className={`text-center py-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>暂无分析数据</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 明细 Modal */}
      {showDetailModal && selectedGroupForAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl ${
            theme === 'dark' ? 'bg-[#1a1a22] border border-slate-700' : 'bg-white border border-slate-200'
          }`}>
            <div className={`flex items-center justify-between p-4 border-b ${
              theme === 'dark' ? 'border-slate-700 bg-gradient-to-r from-emerald-500/20 to-teal-500/20' : 'border-slate-200 bg-gradient-to-r from-emerald-100 to-teal-100'
            }`}>
              <div>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedGroupForAnalysis.title}</h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>学生答题明细</p>
              </div>
              <div className="flex items-center gap-2">
                {viewingStudentDetail && (
                  <button onClick={() => setViewingStudentDetail(null)} className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                  }`}>← 返回</button>
                )}
                {!viewingStudentDetail && submissionData?.students?.length > 0 && (
                  <button
                    onClick={async () => {
                      if (!confirm('确定要删除所有提交记录吗？学生需要重新作答。')) return
                      try {
                        const groupId = getSourceGroupId(selectedGroupForAnalysis)
                          const sessionId = selectedGroupForAnalysis.session_id || effectiveClassroomSessionId || undefined
                        await liveTaskSubmissionService.deleteTaskGroupSubmissions(groupId, sessionId)
                        await handleViewDetails(selectedGroupForAnalysis)
                      } catch (e) {
                        console.error('Failed to delete submissions:', e)
                        alert('删除失败')
                      }
                    }}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-colors bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20`}
                  >
                    🗑️ 删除提交
                  </button>
                )}
                <button onClick={() => { setViewingStudentDetail(null); setShowDetailModal(false); }} className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                }`}>✕</button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {viewingStudentDetail ? (
                /* 学生详情视图 */
                <div className="space-y-4">
                  <button onClick={() => setViewingStudentDetail(null)} className={`text-sm ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'}`}>← 返回列表</button>
                  <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-indigo-50 border border-indigo-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-lg font-bold text-white">{viewingStudentDetail.student_name?.charAt(0) || '?'}</div>
                        <h4 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{viewingStudentDetail.student_name}</h4>
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-bold ${viewingStudentDetail.correct_count === (selectedGroupForAnalysis.tasks?.length || 0) ? 'text-emerald-500' : 'text-red-500'}`}>{viewingStudentDetail.correct_count}/{selectedGroupForAnalysis.tasks?.length || 0}</p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>正确数</p>
                      </div>
                    </div>
                  </div>
                  <h4 className={`font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>答题详情</h4>
                  <div className="space-y-4">
                    {/* 按照任务顺序排序提交 */}
                    {(() => {
                      // 创建任务 ID 到顺序的映射
                      const taskOrderMap = new Map<string, number>();
                      selectedGroupForAnalysis.tasks?.forEach((t: any, index: number) => {
                        const taskId = t.task_id || t.id;
                        if (taskId) taskOrderMap.set(taskId, index);
                      });

                      // 按任务顺序排序提交
                      const sortedSubmissions = [...(viewingStudentDetail.submissions || [])].sort((a: any, b: any) => {
                        const orderA = taskOrderMap.get(a.task_id) ?? 999;
                        const orderB = taskOrderMap.get(b.task_id) ?? 999;
                        return orderA - orderB;
                      });

                      return sortedSubmissions.map((sub: any, idx: number) => {
                      // 查找对应任务
                      const task = selectedGroupForAnalysis.tasks?.find((t: any) => (t.task_id || t.id) === sub.task_id);

                      // 提取题目文本
                      const extractText = (obj: any): string => {
                        if (typeof obj === 'string') return obj;
                        if (obj && typeof obj === 'object') {
                          if (obj.content && Array.isArray(obj.content)) return obj.content.map(extractText).join('');
                          if (obj.text) return obj.text;
                          if (obj.type === 'text' && obj.text) return obj.text;
                        }
                        return '';
                      };

                      let questionText = '';
                      let questionObj: any = null;
                      if (task?.question) {
                        if (typeof task.question === 'string') {
                          try { questionObj = JSON.parse(task.question); questionText = extractText(questionObj); } catch { questionText = task.question; }
                        } else if (typeof task.question === 'object') {
                          questionObj = task.question;
                          if (questionObj.text) {
                            if (typeof questionObj.text === 'string') {
                              try { const parsed = JSON.parse(questionObj.text); questionText = extractText(parsed); } catch { questionText = questionObj.text; }
                            } else if (typeof questionObj.text === 'object') questionText = extractText(questionObj.text);
                          }
                          if (!questionText && questionObj.content) questionText = extractText(questionObj);
                        }
                      }

                      // 提取选项
                      let options: any[] = [];
                      if (questionObj?.options && Array.isArray(questionObj.options)) options = questionObj.options;
                      else if (questionObj?.choices && Array.isArray(questionObj.choices)) options = questionObj.choices;

                      // 获取正确答案
                      const taskType = task?.type || '';
                      const isChoiceQuestion = taskType === 'single_choice' || taskType === 'multiple_choice';
                      const isTrueFalse = taskType === 'true_false';
                      const isMatching = taskType === 'matching';
                      const taskPairs = (task?.question?.pairs || []) as Array<{ left: unknown; right: unknown }>;
                      const matchingCorrectRows = isMatching
                        ? resolveMatchingAnswerRows(task?.correct_answer, taskPairs, { fallbackToPairs: true })
                        : [];
                      const matchingStudentRows = isMatching
                        ? resolveMatchingAnswerRows(sub.answer, taskPairs)
                        : [];

                      const correctAnswer = (() => {
                        if (isMatching) {
                          return matchingCorrectRows.map((row) => `${row.leftText}→${row.rightText}`).join(', ');
                        }
                        if (!task?.correct_answer) return '';
                        let answer = '';
                        if (typeof task.correct_answer === 'string') {
                          try {
                            const parsed = JSON.parse(task.correct_answer);
                            if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
                              answer = String(parsed.value);
                            } else if (typeof parsed === 'string') {
                              answer = parsed;
                            } else {
                              answer = task.correct_answer;
                            }
                          } catch { answer = task.correct_answer; }
                        } else if (typeof task.correct_answer === 'object') {
                          const ansObj = task.correct_answer as Record<string, unknown>;
                          if (ansObj.value !== undefined) answer = String(ansObj.value);
                          else if (ansObj.blanks !== undefined) return JSON.stringify(ansObj.blanks);
                          else answer = JSON.stringify(task.correct_answer);
                        } else {
                          answer = String(task.correct_answer);
                        }
                        return answer.trim();
                      })();

                      let studentAnswer = (() => {
                        let ans = sub.answer;
                        if (typeof ans === 'string') {
                          try {
                            const parsed = JSON.parse(ans);
                            ans = typeof parsed === 'string' ? parsed : ans;
                          } catch { /* keep original */ }
                        } else {
                          ans = JSON.stringify(ans);
                        }
                        return String(ans).trim();
                      })();

                      if (isMatching && matchingStudentRows.length > 0) {
                        studentAnswer = matchingStudentRows.map((row) => `${row.leftText}→${row.rightText}`).join(', ');
                      }

                      return (
                        <div key={idx} className={`p-5 rounded-xl ${theme === 'dark' ? 'bg-[#1e1e28] border border-slate-700' : 'bg-white border border-slate-200'}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium" style={{ background: 'rgba(0,0,0,0.06)', color: '#666' }}>{idx + 1}</span>
                            <span className={`text-xs px-2 py-0.5 rounded border ${sub.is_correct ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>{sub.is_correct ? '✓ 正确' : '✗ 错误'}</span>
                          </div>

                          <p className={`text-base font-medium mb-4 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{questionText || '题目'}</p>

                          {/* 选择题选项 */}
                          {isChoiceQuestion && options.length > 0 && (
                            <div className="space-y-2 mb-4">
                              {options.map((opt: any, oIdx: number) => {
                                const optKey = opt.key || opt.id || String.fromCharCode(65 + oIdx);
                                const optText = opt.text || opt.content || opt.value || '';
                                const isSelected = studentAnswer.toUpperCase() === optKey.toUpperCase();
                                const isCorrect = correctAnswer.toUpperCase() === optKey.toUpperCase();
                                return (
                                  <div key={oIdx} className="flex items-center gap-3 py-2 border-b border-slate-700/30 last:border-0">
                                    <span className={`text-sm font-medium min-w-[20px] ${isCorrect ? 'text-emerald-400' : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{optKey}</span>
                                    <span className={`flex-1 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{String(optText || '')}</span>
                                    {isSelected && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">你的答案</span>}
                                    {isCorrect && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">正确答案</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 判断题选项 */}
                          {isTrueFalse && (
                            <div className="space-y-2 mb-4">
                              {['T', 'F'].map((optKey) => {
                                const isSelected = studentAnswer.toUpperCase() === optKey;
                                const isCorrect = correctAnswer.toUpperCase() === optKey;
                                return (
                                  <div key={optKey} className={`flex items-center gap-3 p-3 rounded-lg ${isCorrect ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-800/30'}`}>
                                    <span className={`text-sm font-medium w-7 h-7 rounded-full flex items-center justify-center ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{optKey}</span>
                                    <span className={`flex-1 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{optKey === 'T' ? '正确 (True)' : '错误 (False)'}</span>
                                    {isSelected && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">你的答案</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 匹配题显示 */}
                          {isMatching && matchingStudentRows.length > 0 && (
                            <div className="space-y-2 mb-4">
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>匹配结果:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {matchingStudentRows.map((pair, pIdx) => {
                                  const correctPair = matchingCorrectRows[pIdx];
                                  const isPairCorrect = pair.leftText === correctPair?.leftText && pair.rightText === correctPair?.rightText;
                                  return (
                                    <div key={pIdx} className={`flex items-center gap-2 p-2 rounded ${isPairCorrect ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                      <span className="font-medium text-indigo-400">{pair.leftText}</span>
                                      <span className="text-slate-500">→</span>
                                      <span className={isPairCorrect ? 'text-emerald-400' : 'text-red-400'}>{pair.rightText}</span>
                                      {!isPairCorrect && correctPair && (
                                        <span className="text-xs text-slate-500">(正确: {correctPair.leftText}→{correctPair.rightText})</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 答案信息 */}
                          <div className={`p-3 rounded-lg ${sub.is_correct ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>你的答案: </span>
                                <span className={`text-sm font-medium ${sub.is_correct ? 'text-emerald-400' : 'text-red-400'}`}>{studentAnswer || '-'}</span>
                              </div>
                              <div>
                                <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>正确答案: </span>
                                <span className="text-sm font-medium text-emerald-400">{correctAnswer || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  })()}
                  </div>
                </div>
              ) : submissionLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="animate-spin mr-3">⏳</span>
                  <p>加载中...</p>
                </div>
              ) : submissionData?.students?.length > 0 ? (
                <div className="space-y-3">
                  {submissionData.students.map((student: any, idx: number) => (
                    <div key={idx} onClick={() => setViewingStudentDetail(student)} className={`p-4 rounded-xl cursor-pointer transition-colors ${theme === 'dark' ? 'bg-slate-800/30 border border-slate-700 hover:bg-slate-800/50' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>{student.student_name?.charAt(0) || '?'}</div>
                          <span className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{student.student_name}</span>
                        </div>
                        <span className={`text-lg font-bold ${student.correct_count === (selectedGroupForAnalysis.tasks?.length || 0) ? 'text-emerald-500' : 'text-amber-500'}`}>{student.correct_count}/{selectedGroupForAnalysis.tasks?.length || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-center py-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>暂无答题数据</p>
              )}
            </div>
          </div>
        </div>
      )}

      <TeachingAidLibraryModal
        open={showTeachingAidLibrary}
        onClose={() => setShowTeachingAidLibrary(false)}
        onOpenTeachingAid={({ name, entryUrl }) => setOpenedTeachingAid({ name, entryUrl })}
      />

      <ClassAiSettingsModal
        open={showAiSettings}
        classId={currentClassId || ''}
        onClose={() => setShowAiSettings(false)}
      />

      <BigscreenActivityLauncherModal
        open={showBigscreenLauncher}
        classId={currentClassId}
        students={challengeCandidates}
        onClose={() => setShowBigscreenLauncher(false)}
        onGoManage={() => {
          setShowBigscreenLauncher(false)
          navigate('/teacher/bigscreen-activities')
        }}
        onLaunch={(session) => {
          setShowBigscreenLauncher(false)
          navigate(`/teacher/bigscreen-activities/run/${session.id}`)
        }}
      />

      {openedTeachingAid && createPortal(
        <div className="fixed inset-0 z-[1500] bg-black/70 backdrop-blur-sm p-6">
          <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#10131a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('teacherTeachingAids.openLibrary')}</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{openedTeachingAid.name}</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOpenedTeachingAid(null)}
                  className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  {t('teacherTeachingAids.close')}
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white">
              <iframe
                src={openedTeachingAid.entryUrl}
                title={openedTeachingAid.name}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 挑战进行中面板 */}
      {currentChallenge && !showChallengeBoard && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[1200] w-[700px] max-w-[90vw] overflow-auto"
          style={{
            top: 'max(92px, calc(env(safe-area-inset-top, 0px) + 24px))',
            bottom: '16px',
          }}
        >
          <ChallengePanel
            currentChallenge={currentChallenge}
            onOpenBoard={handleOpenChallengeBoard}
            onEndChallenge={handleEndChallenge}
            onDismissChallenge={clearChallenge}
            t={t}
            tWithParams={tWithParams}
            variant="compact"
          />
        </div>
      )}

      {/* PK对决选择弹窗 */}
      {showDuelModal && createPortal(
        <DuelModal
          show={showDuelModal}
          selectedParticipants={selectedDuelParticipants}
          challengeCandidates={challengeCandidates}
          challengeCreating={challengeCreating}
          onClose={() => setShowDuelModal(false)}
          onToggleParticipant={(id) => {
            setSelectedDuelParticipants(prev => {
              if (prev.includes(id)) return prev.filter(p => p !== id)
              if (prev.length >= 2) return [...prev.slice(1), id]
              return [...prev, id]
            })
          }}
          onConfirm={handleConfirmDuel}
          t={t}
          tWithParams={tWithParams}
        />,
        document.body
      )}

      {/* 抢答模式选择弹窗 */}
      {showSingleQuestionDuelModal && createPortal(
        <SingleQuestionDuelModal
          show={showSingleQuestionDuelModal}
          tasks={singleQuestionDuelTasks}
          selectedTaskId={selectedSingleQuestionTaskId}
          selectedParticipants={selectedSingleQuestionParticipants}
          challengeCandidates={challengeCandidates}
          challengeCreating={challengeCreating}
          onClose={() => setShowSingleQuestionDuelModal(false)}
          onSelectTask={(id) => setSelectedSingleQuestionTaskId(id)}
          onToggleParticipant={(id) => {
            setSelectedSingleQuestionParticipants(prev => {
              if (prev.includes(id)) return prev.filter(p => p !== id)
              if (prev.length >= 2) return [prev[1], id]
              return [...prev, id]
            })
          }}
          onConfirm={handleConfirmSingleQuestionDuel}
          t={t}
          tWithParams={tWithParams}
        />,
        document.body
      )}

      {/* 全屏投屏挑战面板 */}
      {showChallengeBoard && currentChallenge && createPortal(
        <div
          className="fixed inset-0 z-[2147483000] flex flex-col"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          }}
        >
          <div
            className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-8 py-6"
            style={{
              paddingTop: 'max(112px, calc(env(safe-area-inset-top, 0px) + 48px))',
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.82))',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div>
              <p className="text-xs uppercase tracking-[0.32em] mb-3" style={{ color: 'rgba(255,255,255,0.46)' }}>挑战进行中</p>
              <h2 className="text-5xl font-black leading-tight text-white" style={{ letterSpacing: '-0.04em' }}>{currentChallenge.title}</h2>
            </div>
            <div className="relative z-20 flex items-center gap-3">
              <button className="ghost-button py-2 px-4 text-sm" onClick={handleCloseChallengeBoard}>关闭投屏</button>
              {!isChallengeFinished(currentChallenge) && (
                <button className="ghost-button py-2 px-4 text-sm" onClick={handleEndChallenge}>结束挑战</button>
              )}
            </div>
          </div>
          <div
            className="flex-1 overflow-auto px-8 pb-8"
            style={{
              paddingTop: 'max(220px, calc(env(safe-area-inset-top, 0px) + 156px))',
            }}
          >
            <ChallengePanel
              currentChallenge={currentChallenge}
              onOpenBoard={() => {}}
              onEndChallenge={handleEndChallenge}
              onDismissChallenge={clearChallenge}
              t={t}
              tWithParams={tWithParams}
              variant="board"
            />
          </div>
        </div>,
        document.body
      )}

      {/* 班级二维码弹窗 */}
      {showQRCode && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowQRCode(false)}>
          <div className={`relative p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowQRCode(false)}
              className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>扫码加入班级</h3>
              <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>学生扫描二维码即可加入当前班级</p>
              {qrCodeDataUrl && (
                <div className="flex justify-center">
                  <img src={qrCodeDataUrl} alt="班级二维码" className="w-80 h-80 rounded-xl shadow-lg" />
                </div>
              )}
              <div className={`mt-6 p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>邀请码</p>
                <p className={`text-2xl font-mono font-bold tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {classes.find((c: any) => c.id === currentClassId)?.invite_code || ''}
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* AI 助手悬浮球 */}
      <WhiteboardAiLauncher />
      <WhiteboardAiPanel context={{
        task_title: activeTaskGroup?.title,
        task_questions: activeTaskGroup?.tasks?.map((t: any) => t.question),
        class_id: currentClassId ?? undefined,
      }} />
    </div>
    </WhiteboardAiProvider>
  )
}
