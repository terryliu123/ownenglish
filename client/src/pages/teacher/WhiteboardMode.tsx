import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { useTranslation } from '../../i18n/useTranslation'
import { useAppStore } from '../../stores/app-store'
import { classService, liveTaskService } from '../../services/api'
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
}

export default function WhiteboardMode() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAppStore()
  const tWithParams = useCallback(
    (key: string, params: Record<string, string | number>) =>
      Object.entries(params).reduce((value, [paramKey, paramValue]) => value.replace(`{${paramKey}}`, String(paramValue)), t(key)),
    [t]
  )

  // 状态
  const [classes, setClasses] = useState<any[]>([])
  const [currentClassId, setCurrentClassId] = useState<string | null>(null)
  const [mode, setMode] = useState<'lecture' | 'interactive'>('interactive')
  const [currentTool, setCurrentTool] = useState<WhiteboardTool>('pen')
  const [elements, setElements] = useState<WhiteboardElement[]>([])
  const [canvasReady, setCanvasReady] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')

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
    classroomStudents,
    classroomCount,
    pendingShares,
    activeTaskGroup: wsActiveTaskGroup,
    publishTaskGroup,
    endTaskGroup,
    handleShare,
    submissionCount,
    currentChallenge,
    startChallenge,
    endChallenge,
    clearChallenge,
    refreshPresence,
    disconnect,
    clearShares,
    endSession,
  } = useWhiteboardLive(currentClassId)

  const activeTaskGroup = wsActiveTaskGroup

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
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  // 画笔设置
  const [strokeColor, setStrokeColor] = useState('#6366f1')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [eraserSize, setEraserSize] = useState(20)

  // 画布缩放
  const [scale, setScale] = useState(1)

  // 主题设置
  const [theme, setTheme] = useState<WhiteboardTheme>('dark')

  // 分析和明细 Modal 状态
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedGroupForAnalysis, setSelectedGroupForAnalysis] = useState<WhiteboardTaskGroup | null>(null)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [submissionData, setSubmissionData] = useState<any>(null)
  const [submissionLoading, setSubmissionLoading] = useState(false)
  const [viewingStudentDetail, setViewingStudentDetail] = useState<any>(null)

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
      const data = await classService.getAll()
      setClasses(data)
      if (data.length > 0 && !currentClassId) {
        setCurrentClassId(data[0].id)
      }
    } catch (e) {
      console.error('Failed to load classes:', e)
    }
  }

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
      setTaskGroups(readyGroups)
      setPreviewingGroup((prev) => (prev ? readyGroups.find((group) => group.id === prev.id) || null : prev))
    } catch (e) {
      console.error('Failed to load task groups:', e)
    }
  }, [currentClassId])

  const loadTaskHistory = useCallback(async () => {
    if (!currentClassId) return
    try {
      const response = await liveTaskService.getClassTaskHistory(currentClassId)
      const endedItems = Array.isArray(response.history)
        ? response.history.filter((item: TaskHistoryItem) => item.status === 'ended')
        : []
      setPublishedGroups(endedItems.map(mapHistoryItemToGroup))
    } catch (e) {
      console.error('Failed to load task history:', e)
    }
  }, [currentClassId, mapHistoryItemToGroup])

  const handleClearCompleted = useCallback(() => {
    setHiddenGroupIds((prev) => {
      const next = new Set(prev)
      publishedGroups.forEach((g) => next.add(g.id))
      return next
    })
  }, [publishedGroups])

  const refreshWhiteboardOverview = useCallback(async () => {
    if (!currentClassId) return
    await Promise.all([loadTaskGroups(), loadTaskHistory(), refreshPresence()])
  }, [currentClassId, loadTaskGroups, loadTaskHistory, refreshPresence])

  useEffect(() => {
    if (!currentClassId) return
    void refreshWhiteboardOverview()
  }, [currentClassId, refreshWhiteboardOverview])

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
    publishTaskGroup(group)
    setPreviewingGroup(null)
    setTaskGroups(prev => prev.filter(g => g.id !== group.id))
    await refreshWhiteboardOverview()
  }, [publishTaskGroup, refreshWhiteboardOverview])

  // 结束任务
  const handleEndTask = useCallback(async (group: WhiteboardTaskGroup) => {
    if (!window.confirm(`确定要结束任务「${group.title}」吗？`)) {
      return
    }
    endTaskGroup(getSourceGroupId(group))
    setPreviewingGroup(null)
    await refreshWhiteboardOverview()
  }, [endTaskGroup, getSourceGroupId, refreshWhiteboardOverview])

  // 发布全部（发布第一个任务给所有学生）
  const handlePublishAll = useCallback(async () => {
    if (taskGroups.length === 0) return
    const firstGroup = taskGroups[0]
    await handlePublishTask(firstGroup)
  }, [taskGroups, handlePublishTask])

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
      const [groupDetail, analytics] = await Promise.all([
        liveTaskService.getTaskGroup(groupId),
        liveTaskService.getTaskGroupAnalytics(groupId)
      ])
      setSelectedGroupForAnalysis({ ...group, tasks: groupDetail.tasks || [] })
      setAnalyticsData(analytics)
    } catch (e) {
      console.error('Failed to load analysis:', e)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [getSourceGroupId])

  // 查看明细
  const handleViewDetails = useCallback(async (group: WhiteboardTaskGroup) => {
    // 先加载完整任务组数据（包含tasks）
    setShowDetailModal(true)
    setSubmissionLoading(true)
    setViewingStudentDetail(null)
    try {
      const groupId = getSourceGroupId(group)
      const [groupDetail, submissions] = await Promise.all([
        liveTaskService.getTaskGroup(groupId),
        liveTaskService.getTaskGroupSubmissions(groupId)
      ])
      setSelectedGroupForAnalysis({ ...group, tasks: groupDetail.tasks || [] })
      setSubmissionData(submissions)
    } catch (e) {
      console.error('Failed to load details:', e)
    } finally {
      setSubmissionLoading(false)
    }
  }, [getSourceGroupId])

  // 创建并开始挑战的通用方法
  const doCreateChallenge = useCallback(async (mode: 'class_challenge' | 'duel' | 'single_question_duel', participantIds?: string[], taskId?: string) => {
    if (!currentClassId || !previewingGroup) return
    if (activeTaskGroup || currentChallenge) {
      alert(t('challenge.activeConflict'))
      return
    }

    const challengeTasks =
      mode === 'single_question_duel'
        ? (previewingGroup.tasks || []).filter((task) => task.id === taskId)
        : (previewingGroup.tasks || [])

    const supportedTaskTypes =
      mode === 'single_question_duel'
        ? SUPPORTED_SINGLE_QUESTION_DUEL_TASK_TYPES
        : SUPPORTED_CHALLENGE_TASK_TYPES

    const unsupportedTypes = Array.from(
      new Set(challengeTasks.map((task) => task.type).filter((type) => !supportedTaskTypes.has(type)))
    )

    if (unsupportedTypes.length > 0) {
      alert(tWithParams('challenge.unsupportedTypesInline', { types: unsupportedTypes.join('、') }))
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

    if (mode === 'class_challenge' && challengeCandidates.length < 1) {
      alert(t('challenge.noEligibleParticipants'))
      return
    }

    setChallengeCreating(true)
    try {
      const challenge = await liveTaskService.createChallenge({
        class_id: currentClassId,
        task_group_id: previewingGroup.id,
        title: previewingGroup.title,
        mode,
        participant_ids: participantIds,
        task_id: taskId,
      } as any)
      startChallenge(challenge.id)
      setTaskGroups(prev => prev.filter(group => group.id !== previewingGroup.id))
      setPreviewingGroup(null)
      setShowChallengeBoard(true)
      await refreshWhiteboardOverview()
    } catch (e) {
      console.error('Failed to create challenge:', e)
      alert('创建挑战失败')
    } finally {
      setChallengeCreating(false)
    }
  }, [activeTaskGroup, challengeCandidates.length, currentChallenge, currentClassId, previewingGroup, refreshWhiteboardOverview, startChallenge, t, tWithParams])

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
    setShowSingleQuestionDuelModal(true)
  }, [previewingGroup])

  // 确认抢答
  const handleConfirmSingleQuestionDuel = useCallback(() => {
    if (selectedSingleQuestionParticipants.length !== 2 || !selectedSingleQuestionTaskId) return
    setShowSingleQuestionDuelModal(false)
    doCreateChallenge('single_question_duel', selectedSingleQuestionParticipants, selectedSingleQuestionTaskId)
    setSelectedSingleQuestionParticipants([])
    setSelectedSingleQuestionTaskId(null)
  }, [selectedSingleQuestionParticipants, selectedSingleQuestionTaskId, doCreateChallenge])

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
    if (currentChallenge.status === 'ended') {
      void refreshWhiteboardOverview()
    }
  }, [currentChallenge, refreshWhiteboardOverview])

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

  return (
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

          <div className="flex items-center gap-2">
            <span className={`${tc.textMuted} text-sm`}>{t('class.current')}:</span>
            {classes.length > 0 ? (
              <select
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

          <button
            onClick={() => navigate('/teacher/live')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              theme === 'dark'
                ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/30'
                : theme === 'light'
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 border-blue-300'
                : 'bg-purple-100 text-purple-600 hover:bg-purple-200 border-purple-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-sm">{t('whiteboard.switchToLive')}</span>
          </button>

          <button
            onClick={() => {
              // 结束课堂：断开连接、清理状态、返回班级列表
              if (confirm(t('live.endClassConfirm') || '确定要结束课堂吗？下课之后学生将退出课堂任务页面并返回首页。')) {
                // 1. 如果有进行中的任务组，先结束它
                if (activeTaskGroup) {
                  endTaskGroup(activeTaskGroup.id)
                }
                // 2. 如果有进行中的挑战，结束它
                if (currentChallenge) {
                  endChallenge(currentChallenge.id)
                }
                // 3. 发送下课通知给学生（先通知再断开）
                endSession()
                // 4. 断开 WebSocket
                disconnect()
                // 5. 清理分享状态
                clearShares()
                // 6. 清理白板数据
                clearWhiteboardData()
                // 7. 返回班级列表
                navigate('/teacher/classes')
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm">{t('live.endSession')}</span>
          </button>
        </div>
      </header>

      {/* 主体区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧面板 - 学生列表 */}
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
            onPublishAll={handlePublishAll}
            onClose={() => setShowRightPanel(false)}
            onRevertToDraft={handleRevertToDraft}
            onEndTask={handleEndTask}
            onStartClassChallenge={handleStartClassChallenge}
            onStartDuel={handleStartDuel}
            onStartQuickAnswer={handleStartQuickAnswer}
            onPreview={handlePreviewTask}
            onRefresh={() => void refreshWhiteboardOverview()}
            theme={theme}
            activeTaskGroup={activeTaskGroup}
            activeTaskStats={
              activeTaskGroup
                ? new Map([[activeTaskGroup.id, { studentCount: classroomCount, submissionCount }]])
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

                        // Extract correct answer string
                        const correctAnswerRaw = ((): string => {
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
                            {isMatching && task.pairs && task.pairs.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                {task.pairs.map((pair: {left: string, right: string}, pIdx: number) => (
                                  <div key={pIdx} className={`flex items-center gap-2 p-2 rounded ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/60'}`}>
                                    <span className="font-medium text-sm text-indigo-400">{pair.left}</span>
                                    <span className="text-slate-500">→</span>
                                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{pair.right}</span>
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
                      const correctAnswer = (() => {
                        if (!task?.correct_answer) return '';
                        if (typeof task.correct_answer === 'string') {
                          try { const parsed = JSON.parse(task.correct_answer); if (parsed?.value !== undefined) return String(parsed.value); return task.correct_answer; } catch { return task.correct_answer; }
                        }
                        if (typeof task.correct_answer === 'object') {
                          const ansObj = task.correct_answer as Record<string, unknown>;
                          if (ansObj.value !== undefined) return String(ansObj.value);
                          if (ansObj.blanks !== undefined) return JSON.stringify(ansObj.blanks);
                          return JSON.stringify(task.correct_answer);
                        }
                        return String(task.correct_answer);
                      })();

                      let studentAnswer = typeof sub.answer === 'string' ? sub.answer : JSON.stringify(sub.answer);
                      const taskType = task?.type || '';
                      const isChoiceQuestion = taskType === 'single_choice' || taskType === 'multiple_choice';
                      const isTrueFalse = taskType === 'true_false';
                      const isMatching = taskType === 'matching';

                      // 匹配题答案格式化
                      let matchingStudentAnswer: Array<{left: string, right: string}> = [];
                      let matchingCorrectAnswer: Array<{left: string, right: string}> = [];
                      const taskPairs = (task?.question?.pairs || []) as Array<Record<string, string>>;
                      if (isMatching && taskPairs.length > 0) {
                        // 解析学生答案 { "A": "1", "B": "2" } 格式
                        let studentPairs: Record<string, string> = {};
                        if (typeof sub.answer === 'string') {
                          try { studentPairs = JSON.parse(sub.answer); } catch { studentPairs = {}; }
                        } else if (typeof sub.answer === 'object' && sub.answer !== null) {
                          studentPairs = sub.answer as Record<string, string>;
                        }
                        // 解析正确答案
                        let correctPairs: Record<string, string> = {};
                        if (typeof task?.correct_answer === 'string') {
                          try { correctPairs = JSON.parse(task.correct_answer); } catch { correctPairs = {}; }
                        } else if (typeof task?.correct_answer === 'object' && task?.correct_answer !== null) {
                          correctPairs = task.correct_answer as Record<string, string>;
                        }
                        // 构建匹配显示
                        taskPairs.forEach((pair: any) => {
                          const left = pair.left || pair.key || '';
                          const studentRight = studentPairs[left] || '-';
                          const correctRight = correctPairs[left] || pair.right || '-';
                          matchingStudentAnswer.push({ left, right: studentRight });
                          matchingCorrectAnswer.push({ left, right: correctRight });
                        });
                        studentAnswer = matchingStudentAnswer.map(p => `${p.left}→${p.right}`).join(', ');
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
                          {isMatching && matchingStudentAnswer.length > 0 && (
                            <div className="space-y-2 mb-4">
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>匹配结果:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {matchingStudentAnswer.map((pair, pIdx) => {
                                  const correctPair = matchingCorrectAnswer[pIdx];
                                  const isPairCorrect = pair.right === correctPair?.right;
                                  return (
                                    <div key={pIdx} className={`flex items-center gap-2 p-2 rounded ${isPairCorrect ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                      <span className="font-medium text-indigo-400">{pair.left}</span>
                                      <span className="text-slate-500">→</span>
                                      <span className={isPairCorrect ? 'text-emerald-400' : 'text-red-400'}>{pair.right}</span>
                                      {!isPairCorrect && <span className="text-xs text-slate-500">(正确: {correctPair?.right})</span>}
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

      {/* 挑战进行中面板 */}
      {currentChallenge && !showChallengeBoard && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[700px] max-w-[90vw]`}>
          <ChallengePanel
            currentChallenge={currentChallenge}
            onOpenBoard={handleOpenChallengeBoard}
            onEndChallenge={handleEndChallenge}
            onDismissChallenge={clearChallenge}
            t={t}
            tWithParams={tWithParams}
          />
        </div>
      )}

      {/* PK对决选择弹窗 */}
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
      />

      {/* 抢答模式选择弹窗 */}
      <SingleQuestionDuelModal
        show={showSingleQuestionDuelModal}
        tasks={previewingGroup?.tasks || []}
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
      />

      {/* 全屏投屏挑战面板 */}
      {showChallengeBoard && currentChallenge && createPortal(
        <div className="fixed inset-0 z-[99999] flex flex-col" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
          <div className="flex items-center justify-between px-8 py-6">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] mb-3" style={{ color: 'rgba(255,255,255,0.46)' }}>挑战进行中</p>
              <h2 className="text-5xl font-black leading-tight text-white" style={{ letterSpacing: '-0.04em' }}>{currentChallenge.title}</h2>
            </div>
            <div className="flex items-center gap-3">
              <button className="ghost-button py-2 px-4 text-sm" onClick={handleCloseChallengeBoard}>关闭投屏</button>
              {currentChallenge.status !== 'ended' && (
                <button className="ghost-button py-2 px-4 text-sm" onClick={handleEndChallenge}>结束挑战</button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto px-8 pb-8">
            <ChallengePanel
              currentChallenge={currentChallenge}
              onOpenBoard={() => {}}
              onEndChallenge={handleEndChallenge}
              onDismissChallenge={clearChallenge}
              t={t}
              tWithParams={tWithParams}
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
    </div>
  )
}
