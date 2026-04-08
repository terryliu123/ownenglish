import { useEffect, useState } from 'react'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import { useTranslation } from '../../i18n/useTranslation'
import {
  classService,
  liveTaskService,
  LiveTaskData,
  LiveTaskGroup,
  membershipService,
  type MembershipSnapshot,
} from '../../services/api'
import { TipTapEditor } from '../../components/editor/TipTapEditor'
import {
  isReadingTask as isReadingTaskType,
  isReadingType,
  taskSupportsPassage,
  taskUsesBooleanAnswer,
} from '../../features/tasks/task-config'
import {
  buildManualTaskPayload,
  buildTaskUpdatePayload,
  cloneTaskForEditing,
  EMPTY_TIPTAP_DOC,
  hasRichTextContent,
} from '../../features/tasks/task-editing'
import { ManualTaskComposer, TaskPreviewEditForm } from '../../features/tasks/task-editor-components'
import {
  formatTaskAnswerDisplay,
  getTaskTypeLabel,
  shouldShowChoiceOptions,
  shouldShowGenericCorrectAnswer,
} from '../../features/tasks/task-helpers'
import { TaskDetailPreview, TaskRichTextOrPlain } from '../../features/tasks/task-preview'

// 步骤定义
const STEPS = [
  { id: 1, labelKey: 'taskGroup.stepCreate', descKey: 'taskGroup.stepCreateDesc' },
  { id: 2, labelKey: 'taskGroup.stepAdd', descKey: 'taskGroup.stepAddDesc' },
  { id: 3, labelKey: 'taskGroup.stepPreview', descKey: 'taskGroup.stepPreviewDesc' },
  { id: 4, labelKey: 'taskGroup.stepReady', descKey: 'taskGroup.stepReadyDesc' },
]

export default function TeacherTaskGroups() {
  const { t, tWithParams } = useTranslation()
  // 数据状态
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [groups, setGroups] = useState<LiveTaskGroup[]>([])
  const [membership, setMembership] = useState<MembershipSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // 弹窗状态
  const [showModal, setShowModal] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [editingGroup, setEditingGroup] = useState<LiveTaskGroup | null>(null)
  const [createdGroups, setCreatedGroups] = useState<LiveTaskGroup[]>([])
  const [tasks, setTasks] = useState<LiveTaskData[]>([])

  // 表单状态
  const [groupTitle, setGroupTitle] = useState('')
  const [createMethod, setCreateMethod] = useState<'manual' | 'ai-generate' | 'ai-import'>('manual')

  // 分享相关状态
  const [showShareModal, setShowShareModal] = useState(false)
  const [showSharesListModal, setShowSharesListModal] = useState(false)
  const [sharingGroup, setSharingGroup] = useState<LiveTaskGroup | null>(null)
  const [shareName, setShareName] = useState('')
  const [shareDescription, setShareDescription] = useState('')
  const [shareExpiresDays, setShareExpiresDays] = useState<number | null>(null)
  const [sharesList, setSharesList] = useState<Array<{
    id: string
    share_token: string
    share_name: string
    share_description?: string
    is_active: boolean
    view_count: number
    copy_count: number
    expires_at?: string
    created_at: string
  }>>([])
  const [shareLoading, setShareLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    loadClasses()
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      loadGroups()
    } else {
      // 没有选择班级时，重置 loading 状态
      setLoading(false)
    }
  }, [selectedClassId])

  async function loadClasses() {
    try {
      const [data, membershipData] = await Promise.all([
        classService.getAll(),
        membershipService.getMyMembership(),
      ])
      setClasses(data)
      setMembership(membershipData)
      if (data.length > 0) setSelectedClassId(data[0].id)
    } catch (error) {
      console.error('Failed to load classes:', error)
    }
  }

  function getMembershipMessage(error: any, fallback: string) {
    const detail = error?.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (detail?.message) return detail.message
    return fallback
  }

  async function loadGroups() {
    setLoading(true)
    try {
      const data = await liveTaskService.getTaskGroups(selectedClassId)
      setGroups(data)
    } catch (error) {
      console.error('Failed to load task groups:', error)
    } finally {
      setLoading(false)
    }
  }

  // 鎵撳紑鍒涘缓寮圭獥
  function openCreateModal() {
    if (membership?.limits.max_task_groups != null && (membership.usage.task_group_count ?? 0) >= membership.limits.max_task_groups) {
      alert(getMembershipMessage({ response: { data: { detail: { message: t('membership.usageTaskGroups').replace('{{used}}', String(membership.usage.task_group_count)).replace('{{limit}}', String(membership.limits.max_task_groups)) } } } }, t('taskGroup.operationFailed')))
      return
    }
    setShowModal(true)
    setCurrentStep(1)
    setEditingGroup(null)
    setCreatedGroups([])
    setTasks([])
    setGroupTitle('')
    setCreateMethod('manual')
    // 默认选中当前选中的班级（如果有）
    if (selectedClassId) {
      setSelectedClassIds([selectedClassId])
    } else if (classes.length > 0) {
      setSelectedClassIds([classes[0].id])
    } else {
      setSelectedClassIds([])
    }
  }

  // 鎵撳紑缂栬緫寮圭獥
  async function openEditModal(group: LiveTaskGroup) {
    setShowModal(true)
    setEditingGroup(group)
    setGroupTitle(group.title)
    setCurrentStep(3)
    try {
      const detail = await liveTaskService.getTaskGroup(group.id)
      setTasks(detail.tasks || [])
    } catch (error) {
      console.error('Failed to load group detail:', error)
      setTasks([])
    }
  }

  // 鍏抽棴寮圭獥
  function closeModal() {
    setShowModal(false)
    setCurrentStep(1)
    setEditingGroup(null)
    setTasks([])
    setGroupTitle('')
  }

  // 姝ラ1锛氬垱寤轰换鍔＄粍
  async function handleCreateGroup() {
    if (!groupTitle.trim() || selectedClassIds.length === 0) {
      alert(t('taskGroup.titleRequiredAlert'))
      return
    }
    try {
      // 为每个选中的班级创建任务组
      const createdGroups: LiveTaskGroup[] = []
      for (const classId of selectedClassIds) {
        const group = await liveTaskService.createTaskGroup({
          class_id: classId,
          title: groupTitle.trim(),
        })
        createdGroups.push(group)
      }
      // 保存所有创建的任务组，使用第一个作为编辑对象
      if (createdGroups.length > 0) {
        setCreatedGroups(createdGroups)
        setEditingGroup(createdGroups[0])
        setCurrentStep(2)
        await loadGroups()
      }
    } catch (error) {
      alert(getMembershipMessage(error, t('taskGroup.createGroupFailed')))
    }
  }

  // 纭灏辩华
  async function handleReady() {
    if (!editingGroup) return
    try {
      await liveTaskService.updateTaskGroup(editingGroup.id, { status: 'ready' })
      await loadGroups()
      alert(t('taskGroup.readyMarked'))
      closeModal()
    } catch (error) {
      alert(t('taskGroup.operationFailed'))
    }
  }

  // 保存为草稿
  async function handleSaveDraft() {
    if (!editingGroup) return
    try {
      await liveTaskService.updateTaskGroup(editingGroup.id, { status: 'draft' })
      alert(t('taskGroup.savedDraft'))
      closeModal()
      await loadGroups()
    } catch (error) {
      alert(t('taskGroup.saveDraftFailed'))
    }
  }

  // 鍗＄墖涓婃爣璁颁负灏辩华
  async function markAsReady(groupId: string) {
    try {
      await liveTaskService.updateTaskGroup(groupId, { status: 'ready' })
      alert(t('taskGroup.readyMarked'))
      await loadGroups()
    } catch (error) {
      alert(t('taskGroup.operationFailed'))
    }
  }

  // 删除任务组
  async function handleDeleteGroup(groupId: string) {
    if (!confirm(t('taskGroup.deleteGroupConfirm'))) return
    try {
      await liveTaskService.deleteTaskGroup(groupId)
      await loadGroups()
    } catch (error) {
      alert(t('taskGroup.deleteGroupFailed'))
    }
  }

  // 打开分享弹窗
  function openShareModal(group: LiveTaskGroup) {
    setSharingGroup(group)
    setShareName(group.title)
    setShareDescription('')
    setShareExpiresDays(null)
    setShowShareModal(true)
  }

  // 打开分享列表弹窗
  async function openSharesListModal(group: LiveTaskGroup) {
    setSharingGroup(group)
    setShowSharesListModal(true)
    await loadShares(group.id)
  }

  // 加载分享列表
  async function loadShares(groupId: string) {
    setShareLoading(true)
    try {
      const data = await liveTaskService.getTaskGroupShares(groupId)
      setSharesList(data)
    } catch (error) {
      console.error('Failed to load shares:', error)
      alert(t('taskGroup.loadSharesFailed'))
    } finally {
      setShareLoading(false)
    }
  }

  // 创建分享
  async function handleCreateShare() {
    if (!sharingGroup) return
    if (!shareName.trim()) {
      alert(t('taskGroup.shareNameRequired'))
      return
    }
    setShareLoading(true)
    try {
      await liveTaskService.shareTaskGroup(sharingGroup.id, {
        share_name: shareName.trim(),
        share_description: shareDescription.trim() || undefined,
        expires_days: shareExpiresDays,
      })
      alert(t('taskGroup.shareCreated'))
      setShowShareModal(false)
      // 如果分享列表弹窗是打开的，刷新列表
      if (showSharesListModal) {
        await loadShares(sharingGroup.id)
      }
    } catch (error) {
      alert(t('taskGroup.shareCreateFailed'))
    } finally {
      setShareLoading(false)
    }
  }

  // 删除分享
  async function handleDeleteShare(shareId: string) {
    if (!confirm(t('taskGroup.deleteShareConfirm'))) return
    try {
      await liveTaskService.deleteTaskGroupShare(shareId)
      if (sharingGroup) {
        await loadShares(sharingGroup.id)
      }
    } catch (error) {
      alert(t('taskGroup.deleteShareFailed'))
    }
  }

  // 复制分享链接
  function copyShareLink(token: string) {
    const link = `${window.location.origin}/share/task-group/${token}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    })
  }

  // 关闭分享弹窗
  function closeShareModal() {
    setShowShareModal(false)
    setSharingGroup(null)
    setShareName('')
    setShareDescription('')
    setShareExpiresDays(null)
  }

  // 关闭分享列表弹窗
  function closeSharesListModal() {
    setShowSharesListModal(false)
    setSharingGroup(null)
    setSharesList([])
  }

  const filteredGroups = groups.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const taskGroupLimit = membership?.limits.max_task_groups
  const taskGroupUsage = membership?.usage.task_group_count ?? groups.length
  const canCreateTaskGroup = taskGroupLimit == null || taskGroupUsage < taskGroupLimit
  const canUseAi = membership?.can_use_ai ?? false

  return (
    <Layout sidebar={<TeacherSidebar activePage="task-groups" />} leftSidebar={<TeacherLeftSidebar activePage="task-groups" />}>
      <div className="panel-page">
        {/* 深蓝顶栏 */}
        <section className="surface-card mb-4 mt-4" style={{ background: 'linear-gradient(135deg, #18324a 0%, #2a4a6a 100%)' }}>
          <div className="p-4">
            <div className="flex items-center justify-between gap-4">
              {/* 左侧：标题 */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <span className="text-lg">📋</span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>{t('taskGroup.preClassEyebrow')}</p>
                  <h2 className="text-base font-semibold" style={{ color: '#fff' }}>{t('taskGroup.managementTitle')}</h2>
                </div>
              </div>

              {/* 右侧：会员 + 创建按钮 */}
              <div className="flex items-center gap-3">
                {membership && (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                    onClick={() => window.location.href = '/teacher/membership'}
                    title={membership.plan_name}
                  >
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {t('membership.usageTaskGroups').replace('{{used}}', String(taskGroupUsage)).replace('{{limit}}', taskGroupLimit == null ? '∞' : String(taskGroupLimit))}
                    </span>
                  </div>
                )}
                <button
                  onClick={openCreateModal}
                  className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                  disabled={!canCreateTaskGroup}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    opacity: canCreateTaskGroup ? 1 : 0.5,
                    cursor: canCreateTaskGroup ? 'pointer' : 'not-allowed',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('taskGroup.createTask')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 鐝骇閫夋嫨鍜屾悳绱㈡爮 */}
        <section className="panel-section mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* 鐝骇閫夋嫨 */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600 whitespace-nowrap">{t('taskGroup.selectClassLabel')}</label>
              {classes.length === 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">{t('class.noClass')}</span>
                  <a
                    href="/teacher/classes"
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    {t('class.createFirst')}
                  </a>
                </div>
              ) : (
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 min-w-[180px]"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 鍒嗛殧绾?*/}
            <div className="hidden sm:block w-px h-8 bg-slate-200" />

            {/* 鎼滅储 */}
            <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('taskGroup.searchGroupsPlaceholder')}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <span className="text-sm text-slate-500 whitespace-nowrap">
                {t('common.count').replace('{{count}}', String(filteredGroups.length))}
              </span>
            </div>
          </div>
        </section>

        {/* 浠诲姟缁勫垪琛?*/}
        <section className="panel-section flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-slate-500">{t('common.loading')}</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mx-auto mb-4">
                📝
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">{t('taskGroup.emptyTitle')}</h3>
              <p className="text-slate-500 mb-6">{t('taskGroup.emptyDesc')}</p>
              <button onClick={openCreateModal} className="btn btn-primary" disabled={!canCreateTaskGroup}>
                {t('taskGroup.createFirstGroup')}
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-lg hover:shadow-slate-200/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    {/* 宸︿晶锛氱紪杈戝浘鏍?*/}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>

                    {/* 鍙充晶锛氱姸鎬佹寜閽?*/}
                    {group.status === 'ready' ? (
                      <button
                        disabled
                        className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border-2 border-green-200 rounded-xl shadow-sm"
                      >
                        {t('taskGroup.statusReady')}
                      </button>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        {t('taskGroup.statusDraft')}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-1" title={group.title}>
                    {group.title}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {tWithParams('taskGroup.taskCountBadge', { count: group.task_count || 0 })}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(group.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => openEditModal(group)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                      {t('taskGroup.viewEditAction')}
                    </button>
                    <button
                      onClick={() => openSharesListModal(group)}
                      className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                      title={t('taskGroup.shareManage')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                    {group.status === 'draft' && (
                      <button
                        onClick={() => markAsReady(group.id)}
                        className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-xl transition-colors hover:bg-green-200"
                      >
                        {t('taskGroup.markReadyAction')}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 鍒涘缓/缂栬緫寮圭獥 */}
      {showModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            {/* 寮圭獥澶撮儴 */}
            <div className="px-8 py-6 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {editingGroup ? t('taskGroup.editGroup') : t('taskGroup.createGroup')}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {editingGroup?.title || t('taskGroup.followCreate')}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 姝ラ瀵艰埅 */}
              <div className="flex items-center justify-center mt-6">
                <div className="flex items-center gap-2">
                  {STEPS.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <div
                        className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all ${
                          currentStep === step.id
                            ? 'bg-blue-500 text-white'
                            : currentStep > step.id
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span className="text-lg font-bold">{step.id}</span>
                        <span className="text-xs">{t(step.labelKey)}</span>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div className="w-8 h-0.5 mx-2 bg-slate-200" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 寮圭獥鍐呭 */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-8">
                {currentStep === 1 && (
                  <Step1Create
                    classes={classes}
                    selectedClassIds={selectedClassIds}
                    setSelectedClassIds={setSelectedClassIds}
                    groupTitle={groupTitle}
                    setGroupTitle={setGroupTitle}
                    onCreate={handleCreateGroup}
                  />
                )}
                {currentStep === 2 && editingGroup && (
                  <Step2AddTasks
                    group={editingGroup}
                    allGroups={createdGroups}
                    existingTasks={tasks}
                    createMethod={createMethod}
                    setCreateMethod={setCreateMethod}
                    canUseAi={canUseAi}
                    onSuccess={(newTasks) => {
                      setTasks(newTasks)
                      setCurrentStep(3)
                    }}
                    onBack={() => {
                      if (tasks.length > 0) {
                        setCurrentStep(3)
                        return
                      }
                      closeModal()
                    }}
                  />
                )}
                {currentStep === 3 && editingGroup && (
                  <Step3Preview
                    groupId={editingGroup.id}
                    tasks={tasks}
                    setTasks={setTasks}
                    onAddMore={() => setCurrentStep(2)}
                    onNext={() => setCurrentStep(4)}
                    onBack={() => setCurrentStep(2)}
                  />
                )}
                {currentStep === 4 && editingGroup && (
                  <Step4Confirm
                    group={editingGroup}
                    taskCount={tasks.length}
                    onBack={() => setCurrentStep(3)}
                    onReady={handleReady}
                    onSaveDraft={handleSaveDraft}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 创建分享弹窗 */}
      {showShareModal && sharingGroup && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
            {/* 弹窗头部 */}
            <div className="px-8 py-6 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{t('taskGroup.shareTaskGroup')}</h3>
                  <p className="text-sm text-slate-500 mt-1">{sharingGroup.title}</p>
                </div>
                <button
                  onClick={closeShareModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('taskGroup.shareNameLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shareName}
                  onChange={(e) => setShareName(e.target.value)}
                  placeholder={t('taskGroup.shareNamePlaceholder')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                />
                <p className="text-xs text-slate-500 mt-2">{t('taskGroup.shareNameHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('taskGroup.shareDescription')}
                </label>
                <textarea
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  placeholder={t('taskGroup.shareDescriptionPlaceholder')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('taskGroup.expireDays')}
                </label>
                <select
                  value={shareExpiresDays === null ? '' : String(shareExpiresDays)}
                  onChange={(e) => setShareExpiresDays(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">{t('taskGroup.shareNeverExpire')}</option>
                  <option value="7">{t('taskGroup.share7Days')}</option>
                  <option value="30">{t('taskGroup.share30Days')}</option>
                  <option value="90">{t('taskGroup.share90Days')}</option>
                </select>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-700">
                <p className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {t('taskGroup.shareHelpText')}
                  </span>
                </p>
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="px-8 py-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={closeShareModal}
                className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateShare}
                disabled={shareLoading || !shareName.trim()}
                className="px-6 py-2.5 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {shareLoading ? t('taskGroup.shareCreating') : t('taskGroup.shareCreateAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分享列表弹窗 */}
      {showSharesListModal && sharingGroup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* 弹窗头部 */}
            <div className="px-8 py-6 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{t('taskGroup.sharesManageTitle')}</h3>
                  <p className="text-sm text-slate-500 mt-1">{sharingGroup.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openShareModal(sharingGroup)}
                    className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                  >
                    + {t('taskGroup.shareCreateAction')}
                  </button>
                  <button
                    onClick={closeSharesListModal}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-8">
              {shareLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-slate-500">{t('common.loading')}</span>
                </div>
              ) : sharesList.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mx-auto mb-4">
                    🔗
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">{t('taskGroup.sharesEmptyTitle')}</h3>
                  <p className="text-slate-500 mb-6">{t('taskGroup.sharesEmptyDesc')}</p>
                  <button
                    onClick={() => openShareModal(sharingGroup)}
                    className="btn btn-primary"
                  >
                    {t('taskGroup.shareCreateAction')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sharesList.map((share) => (
                    <div
                      key={share.id}
                      className={`p-4 rounded-xl border ${share.is_active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-60'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 mb-1">{share.share_name}</h4>
                          {share.share_description && (
                            <p className="text-sm text-slate-500 mb-2">{share.share_description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {tWithParams('taskGroup.shareViewCount', { count: share.view_count })}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              {tWithParams('taskGroup.shareCopyCount', { count: share.copy_count })}
                            </span>
                            {share.expires_at && (
                              <span className="flex items-center gap-1 text-amber-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {tWithParams('taskGroup.shareExpiresAt', { date: new Date(share.expires_at).toLocaleDateString() })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => copyShareLink(share.share_token)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              copiedToken === share.share_token
                                ? 'bg-green-100 text-green-700'
                                : 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                            }`}
                          >
                            {copiedToken === share.share_token ? t('taskGroup.copied') : t('taskGroup.copyLink')}
                          </button>
                          <button
                            onClick={() => handleDeleteShare(share.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('taskGroup.deleteShareTitle')}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

// 姝ラ1锛氬垱寤轰换鍔＄粍
function Step1Create({
  classes,
  selectedClassIds,
  setSelectedClassIds,
  groupTitle,
  setGroupTitle,
  onCreate,
}: {
  classes: { id: string; name: string }[]
  selectedClassIds: string[]
  setSelectedClassIds: (ids: string[]) => void
  groupTitle: string
  setGroupTitle: (title: string) => void
  onCreate: () => void
}) {
  const { t } = useTranslation()

  const toggleClassSelection = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(selectedClassIds.filter(id => id !== classId))
    } else {
      setSelectedClassIds([...selectedClassIds, classId])
    }
  }

  const isAllSelected = selectedClassIds.length === classes.length && classes.length > 0
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClassIds([])
    } else {
      setSelectedClassIds(classes.map(c => c.id))
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              {t('taskGroup.selectClass')} <span className="text-red-500">*</span>
            </label>
            {classes.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {isAllSelected ? '取消全选' : '全选'}
              </button>
            )}
          </div>
          {classes.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm text-slate-500 mb-2">{t('class.noClass')}</p>
              <a
                href="/teacher/classes"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('class.createFirst')} →
              </a>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
              {classes.map((cls) => (
                <label
                  key={cls.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    selectedClassIds.includes(cls.id) ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedClassIds.includes(cls.id)}
                    onChange={() => toggleClassSelection(cls.id)}
                    className="w-4 h-4 text-blue-500 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className={`text-sm ${selectedClassIds.includes(cls.id) ? 'text-slate-900 font-medium' : 'text-slate-700'}`}>
                    {cls.name}
                  </span>
                </label>
              ))}
            </div>
          )}
          {selectedClassIds.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              已选择 {selectedClassIds.length} 个班级
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('taskGroup.inputTitle')}<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            placeholder={t('taskGroup.fieldTitlePlaceholder') || 'Unit 1 Greetings'}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          <p className="text-xs text-slate-500 mt-2">
            {t('taskGroup.titleFormatTip')}
          </p>
        </div>

        <button
          onClick={onCreate}
          disabled={!groupTitle.trim() || selectedClassIds.length === 0}
          className="w-full py-3.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('taskGroup.createAndNext')}
        </button>
      </div>
    </div>
  )
}

// 步骤2：添加题目
function Step2AddTasks({
  group,
  allGroups,
  existingTasks,
  createMethod,
  setCreateMethod,
  canUseAi,
  onSuccess,
  onBack,
}: {
  group: LiveTaskGroup
  allGroups: LiveTaskGroup[]
  existingTasks: LiveTaskData[]
  createMethod: 'manual' | 'ai-generate' | 'ai-import'
  setCreateMethod: (method: 'manual' | 'ai-generate' | 'ai-import') => void
  canUseAi: boolean
  onSuccess: (tasks: LiveTaskData[]) => void
  onBack: () => void
}) {
  const { t, tWithParams } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [taskMode, setTaskMode] = useState<'objective' | 'reading' | 'experiment'>('objective')

  // 手动创建表单状态
  const [manualType, setManualType] = useState('single_choice')
  const [manualText, setManualText] = useState<Record<string, unknown>>(EMPTY_TIPTAP_DOC)
  const [manualPassage, setManualPassage] = useState<Record<string, unknown>>(EMPTY_TIPTAP_DOC)
  const [manualPrompt, setManualPrompt] = useState<Record<string, unknown>>(EMPTY_TIPTAP_DOC)
  const [manualAnswerRequired, setManualAnswerRequired] = useState(true)
  const [manualHtmlUrl, setManualHtmlUrl] = useState('')
  const [manualTeachingAidId, setManualTeachingAidId] = useState<string | null>(null)
  const [manualTeachingAidName, setManualTeachingAidName] = useState('')
  const [manualOptions, setManualOptions] = useState(['', '', '', ''])
  const [manualAnswer, setManualAnswer] = useState('A')
  const [manualBlanks, setManualBlanks] = useState([''])
  const [manualPairs, setManualPairs] = useState([{ left: '', right: '' }])
  const [manualCountdown] = useState(30)

  // AI生成表单状态
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiCount, setAiCount] = useState(5)

  // AI导入表单状态
  const [importText, setImportText] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importedTasks, setImportedTasks] = useState<LiveTaskData[] | null>(null)
  const [importedAllTasks, setImportedAllTasks] = useState<LiveTaskData[] | null>(null)

  useEffect(() => {
    if (taskMode === 'reading' && !isReadingType(manualType)) {
      setManualType('reading')
    }
    if (taskMode === 'experiment' && manualType !== 'experiment') {
      setManualType('experiment')
    }
    if (taskMode === 'objective' && (isReadingType(manualType) || manualType === 'experiment')) {
      setManualType('single_choice')
    }
  }, [taskMode, manualType])

  useEffect(() => {
    setImportedTasks(null)
    setImportedAllTasks(null)
    setImportText('')
    setImportFile(null)
  }, [taskMode])

  function resetManualDraft() {
    setManualText(EMPTY_TIPTAP_DOC)
    setManualPassage(EMPTY_TIPTAP_DOC)
    setManualPrompt(EMPTY_TIPTAP_DOC)
    setManualAnswerRequired(true)
    setManualHtmlUrl('')
    setManualTeachingAidId(null)
    setManualTeachingAidName('')
    setManualOptions(['', '', '', ''])
    setManualAnswer('A')
    setManualBlanks([''])
    setManualPairs([{ left: '', right: '' }])
  }

  function moveManualOption(index: number, direction: 'up' | 'down') {
    setManualOptions((prev) => {
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  async function handleManualSubmit() {
    if (!hasRichTextContent(manualText)) {
      alert(t('taskGroup.inputQuestionAlert'))
      return
    }
    if (taskSupportsPassage(manualType) && !hasRichTextContent(manualPassage)) {
      alert(t('taskGroupReading.readingPassagePlaceholder'))
      return
    }
    setLoading(true)
    try {
      const payload = buildManualTaskPayload({
        taskMode,
        manualType,
        manualText,
        manualPassage,
        manualPrompt,
        manualAnswerRequired,
        manualOptions,
        manualAnswer,
        manualHtmlUrl,
        manualTeachingAidId,
        manualTeachingAidName,
        manualCountdown,
        manualBlanks,
        manualPairs,
      })
      // 为所有选中的班级创建相同的任务
      const groupsToUpdate = allGroups.length > 0 ? allGroups : [group]
      for (const g of groupsToUpdate) {
        await liveTaskService.createTask(g.id, payload)
      }

      const detail = await liveTaskService.getTaskGroup(group.id)
      resetManualDraft()
      onSuccess(detail.tasks || [])
    } catch (error) {
      alert(t('taskGroup.addFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleAIGenerate() {
    if (!aiPrompt.trim()) {
      alert(t('taskGroup.inputRequirementAlert'))
      return
    }
    setLoading(true)
    try {
      // 为所有选中的班级生成任务
      const groupsToUpdate = allGroups.length > 0 ? allGroups : [group]
      let allTasks: LiveTaskData[] = []
      for (let i = 0; i < groupsToUpdate.length; i++) {
        const g = groupsToUpdate[i]
        const result = await liveTaskService.aiGenerateTaskGroup({
          class_id: g.class_id,
          title: g.title,
          target_group_id: g.id,
          task_mode: taskMode,
          prompt: aiPrompt,
          question_count: taskMode === 'reading' || taskMode === 'experiment' ? 1 : aiCount,
          types: taskMode === 'reading' ? ['reading'] : taskMode === 'experiment' ? ['experiment'] : undefined,
        })
        if (i === 0) {
          allTasks = result.tasks || []
        }
      }
      onSuccess(allTasks)
    } catch (error) {
      alert(t('taskGroup.generateFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleAIImport() {
    if (!importText.trim() && !importFile) {
      alert(t('taskGroup.inputImportContentAlert'))
      return
    }
    setLoading(true)
    try {
      // 为所有选中的班级导入任务
      const groupsToUpdate = allGroups.length > 0 ? allGroups : [group]
      let allTasks: LiveTaskData[] = []
      for (let i = 0; i < groupsToUpdate.length; i++) {
        const g = groupsToUpdate[i]
        const result = importFile
          ? await liveTaskService.aiImportTaskGroupDocx(importFile, {
              class_id: g.class_id,
              title: g.title,
              target_group_id: g.id,
              task_mode: taskMode,
            })
          : await liveTaskService.aiImportTaskGroup({
              class_id: g.class_id,
              title: g.title,
              target_group_id: g.id,
              task_mode: taskMode,
              raw_text: importText,
            })
        if (i === 0) {
          allTasks = result.tasks || []
        }
      }
      setImportedTasks(allTasks)
      setImportedAllTasks(allTasks)
    } catch (error) {
      alert(t('taskGroup.importFailed'))
    } finally {
      setLoading(false)
    }
  }

  function handleNext() {
    if (importedAllTasks) {
      onSuccess(importedAllTasks)
      return
    }

    if (existingTasks.length > 0) {
      onSuccess(existingTasks)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <p className="text-slate-500 mb-6 text-center">
        {tWithParams('taskGroup.selectAddMethodForGroup', { title: group.title })}
      </p>

      <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        {([
          { id: 'objective', label: t('taskGroupReading.modeObjective') },
          { id: 'reading', label: t('taskGroupReading.modeReading') },
          { id: 'experiment', label: t('taskGroupReading.experiment') },
        ] as const).map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setTaskMode(mode.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              taskMode === mode.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* 鍒涘缓鏂瑰紡閫夋嫨 */}
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => setCreateMethod('manual')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            createMethod === 'manual'
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 hover:border-blue-300 bg-white'
          }`}
        >
          <div className="text-2xl mb-2">✍️</div>
          <h4 className="font-semibold text-sm mb-0.5">{t('taskGroup.manualCreate')}</h4>
          <p className="text-xs text-slate-500">{t('taskGroup.manualCreateDesc')}</p>
        </button>

        <button
          onClick={() => setCreateMethod('ai-generate')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            createMethod === 'ai-generate'
              ? 'border-purple-500 bg-purple-50'
              : 'border-slate-200 hover:border-purple-300 bg-white'
          }`}
          disabled={!canUseAi}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-2xl">🤖</div>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              {t('membership.vipOnly')}
            </span>
          </div>
          <h4 className="font-semibold text-sm mb-0.5">{t('taskGroup.aiGenerate')}</h4>
          <p className="text-xs text-slate-500">{t('taskGroup.aiGenerateDesc')}</p>
        </button>

        <button
          onClick={() => setCreateMethod('ai-import')}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            createMethod === 'ai-import'
              ? 'border-green-500 bg-green-50'
              : 'border-slate-200 hover:border-green-300 bg-white'
          }`}
          disabled={!canUseAi}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-2xl">📥</div>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              {t('membership.vipOnly')}
            </span>
          </div>
          <h4 className="font-semibold text-sm mb-0.5">{t('taskGroup.aiImport')}</h4>
          <p className="text-xs text-slate-500">{t('taskGroup.aiImportDesc')}</p>
        </button>
      </div>

      {/* 琛ㄥ崟鍖哄煙 */}
      <div className="bg-slate-50 rounded-2xl p-6">
        {createMethod === 'manual' && (
          <ManualTaskComposer
            t={t}
            taskMode={taskMode}
            manualType={manualType}
            setManualType={setManualType}
            manualText={manualText}
            setManualText={setManualText}
            manualPassage={manualPassage}
            setManualPassage={setManualPassage}
            manualPrompt={manualPrompt}
            setManualPrompt={setManualPrompt}
            manualAnswerRequired={manualAnswerRequired}
            setManualAnswerRequired={setManualAnswerRequired}
            manualOptions={manualOptions}
            setManualOptions={setManualOptions}
            manualAnswer={manualAnswer}
            setManualAnswer={setManualAnswer}
            manualBlanks={manualBlanks}
            setManualBlanks={setManualBlanks}
            manualPairs={manualPairs}
            setManualPairs={setManualPairs}
            manualHtmlUrl={manualHtmlUrl}
            setManualHtmlUrl={setManualHtmlUrl}
            manualTeachingAidId={manualTeachingAidId}
            setManualTeachingAidId={setManualTeachingAidId}
            manualTeachingAidName={manualTeachingAidName}
            setManualTeachingAidName={setManualTeachingAidName}
            loading={loading}
            onSubmit={handleManualSubmit}
            moveManualOption={moveManualOption}
          />
        )}

        {createMethod === 'ai-generate' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              {taskMode === 'reading' ? t('taskGroupReading.readingImportHint') : taskMode === 'experiment' ? t('taskGroupReading.experimentImportHint') : t('taskGroupReading.objectiveGenerateHint')}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('taskGroup.describeRequirement')}</label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={taskMode === 'reading'
                  ? t('taskGroupReading.readingGeneratePlaceholder')
                  : taskMode === 'experiment'
                  ? t('taskGroupReading.experimentGeneratePlaceholder')
                  : t('taskGroup.requirementPlaceholder')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-white"
                rows={4}
              />
            </div>
            {taskMode !== 'reading' && taskMode !== 'experiment' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('taskGroup.questionCount_label')}</label>
              <input
                type="number"
                min={1}
                max={10}
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className="w-32 px-4 py-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            )}
            <button
              onClick={handleAIGenerate}
              disabled={loading}
              className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {loading ? t('taskGroup.generating') : t('taskGroup.startGenerate')}
            </button>
          </div>
        )}

        {createMethod === 'ai-import' && (
          <div className="space-y-4">
            {!importedTasks ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  {taskMode === 'reading' ? t('taskGroupReading.readingImportHint') : taskMode === 'experiment' ? t('taskGroupReading.experimentImportHint') : t('taskGroupReading.objectiveImportHint')}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('taskGroup.pasteContent')}</label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={taskMode === 'reading' ? t('taskGroupReading.readingPassagePlaceholder') : taskMode === 'experiment' ? t('taskGroupReading.experimentUrlPlaceholder') : t('taskGroup.pasteContentPlaceholder')}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white font-mono text-sm"
                    rows={10}
                  />
                </div>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('taskGroupReading.readingDocxHint')}</label>
                  <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="input"
                    onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                  />
                  {importFile && (
                    <p className="mt-2 text-xs text-slate-500">
                      {t('taskGroupReading.readingDocxSelected').replace('{{name}}', importFile.name)}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleAIImport}
                  disabled={loading}
                  className="w-full py-3 bg-green text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 shadow-md border border-green"
                  style={{ backgroundColor: '#16a34a' }}
                >
                  {loading ? t('taskGroup.importing') : t('taskGroup.startImport')}
                </button>
              </>
            ) : (
              <>
                {/* 瀵煎叆鎴愬姛鍚庣殑棰樼洰棰勮 */}
                <div className="bg-white rounded-xl border border-green-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-green-700">✓ {t('taskGroup.importSuccess')}</h4>
                    <span className="text-sm text-slate-500">{tWithParams('taskGroup.totalImported', { count: importedTasks.length })}</span>
                  </div>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {importedTasks.map((task, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <span className="w-6 h-6 bg-white border border-slate-200 rounded flex items-center justify-center text-xs font-medium">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 mb-2">
                            {(task.question as any)?.text || `${t('task.question')} ${idx + 1}`}
                          </p>
                          <TaskDetailPreview task={task} t={t} />
                          <p className="text-xs text-slate-500 mb-1">{t('taskGroup.answerDisplayLabel')} <span className="font-medium text-slate-700">{formatTaskAnswerDisplay(task, t)}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 鎿嶄綔鎸夐挳 */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setImportedTasks(null)
                      setImportedAllTasks(null)
                      setImportText('')
                      setImportFile(null)
                    }}
                    className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    {t('taskGroup.reimport')}
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 px-4 py-2.5 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-md"
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    {t('taskGroup.nextStep')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-start mt-6">
        <button
          onClick={onBack}
          className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          {existingTasks.length > 0 ? t('taskGroup.returnPreview') : t('taskGroup.closeLeft')}
        </button>
        {existingTasks.length > 0 && !importedTasks && (
          <button
            onClick={handleNext}
            className="ml-auto px-6 py-2 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-md"
            style={{ backgroundColor: '#16a34a' }}
          >
            {t('taskGroup.nextStep')}
          </button>
        )}
      </div>
    </div>
  )
}

// 步骤3：预览编辑
function Step3Preview({
  groupId,
  tasks,
  setTasks,
  onAddMore,
  onNext,
  onBack,
}: {
  groupId: string
  tasks: LiveTaskData[]
  setTasks: (tasks: LiveTaskData[]) => void
  onAddMore: () => void
  onNext: () => void
  onBack: () => void
}) {
  const { t, tWithParams } = useTranslation()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editTask, setEditTask] = useState<LiveTaskData | null>(null)

  function startEdit(index: number) {
    setEditingIndex(index)
    setEditTask(cloneTaskForEditing(tasks[index]))
  }

  async function saveEdit() {
    if (!editTask) return
    try {
      await liveTaskService.updateTask(groupId, editTask.id, buildTaskUpdatePayload(editTask))
      const detail = await liveTaskService.getTaskGroup(groupId)
      setTasks(detail.tasks || [])
      setEditingIndex(null)
      setEditTask(null)
    } catch (error) {
      console.error('Failed to save task edit:', error)
      alert(t('taskGroup.editSaveFailed'))
    }
  }

  function cancelEdit() {
    setEditingIndex(null)
    setEditTask(null)
  }

  async function deleteTask(index: number) {
    if (!confirm(t('taskGroup.deleteTaskConfirm'))) return
    try {
      const target = tasks[index]
      if (!target?.id) return
      await liveTaskService.deleteTask(groupId, target.id)
      const detail = await liveTaskService.getTaskGroup(groupId)
      setTasks(detail.tasks || [])
      if (editingIndex === index) {
        setEditingIndex(null)
        setEditTask(null)
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert(t('taskGroup.deleteTaskFailed'))
    }
  }

  function updateOption(optIndex: number, newText: string) {
    if (!editTask) return
    const newOptions = [...((editTask.question as any).options || [])]
    if (newOptions[optIndex]) {
      newOptions[optIndex] = { ...newOptions[optIndex], text: newText }
      setEditTask({
        ...editTask,
        question: { ...editTask.question, options: newOptions }
      })
    }
  }

  function moveOption(optIndex: number, direction: 'up' | 'down') {
    if (!editTask) return
    const newOptions = [...((editTask.question as any).options || [])]
    const targetIndex = direction === 'up' ? optIndex - 1 : optIndex + 1
    if (targetIndex < 0 || targetIndex >= newOptions.length) return
    ;[newOptions[optIndex], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[optIndex]]
    setEditTask({
      ...editTask,
      question: { ...editTask.question, options: newOptions },
    })
  }

  function updatePair(pairIndex: number, field: 'left' | 'right', newText: string) {
    if (!editTask) return
    const newPairs = [...((editTask.question as any).pairs || [])]
    if (newPairs[pairIndex]) {
      newPairs[pairIndex] = { ...newPairs[pairIndex], [field]: newText }
      setEditTask({
        ...editTask,
        question: { ...editTask.question, pairs: newPairs }
      })
    }
  }

  function addPair() {
    if (!editTask) return
    const newPairs = [...((editTask.question as any).pairs || [])]
    newPairs.push({ left: '', right: '' })
    setEditTask({
      ...editTask,
      question: { ...editTask.question, pairs: newPairs }
    })
  }

  function removePair(pairIndex: number) {
    if (!editTask) return
    const newPairs = [...((editTask.question as any).pairs || [])]
    newPairs.splice(pairIndex, 1)
    setEditTask({
      ...editTask,
      question: { ...editTask.question, pairs: newPairs }
    })
  }

  function updateBlank(blankIndex: number, newAnswer: string) {
    if (!editTask) return
    const newBlanks = [...((editTask.question as any).blanks || [])]
    if (newBlanks[blankIndex]) {
      newBlanks[blankIndex] = { ...newBlanks[blankIndex], answer: newAnswer }
    } else {
      newBlanks[blankIndex] = { position: blankIndex, answer: newAnswer }
    }
    setEditTask({
      ...editTask,
      question: { ...editTask.question, blanks: newBlanks }
    })
  }

  function addBlank() {
    if (!editTask) return
    const newBlanks = [...((editTask.question as any).blanks || [])]
    newBlanks.push({ position: newBlanks.length, answer: '' })
    setEditTask({
      ...editTask,
      question: { ...editTask.question, blanks: newBlanks }
    })
  }

  function removeBlank(blankIndex: number) {
    if (!editTask) return
    const newBlanks = [...((editTask.question as any).blanks || [])]
    newBlanks.splice(blankIndex, 1)
    newBlanks.forEach((b: any, i: number) => { b.position = i })
    setEditTask({
      ...editTask,
      question: { ...editTask.question, blanks: newBlanks }
    })
  }

  function updateAnswer(newAnswer: string) {
    if (!editTask) return
    setEditTask({
      ...editTask,
      correct_answer: taskUsesBooleanAnswer(editTask.type)
        ? { value: newAnswer === 'true' }
        : newAnswer
        ? { value: newAnswer }
        : null
    })
  }

  function updateQuestionField(key: string, value: unknown) {
    if (!editTask) return
    setEditTask({
      ...editTask,
      question: { ...editTask.question, [key]: value },
    })
  }

  function renderReadingEditor() {
    if (!editTask || !isReadingTaskType(editTask)) return null

    return (
      <>
        <TipTapEditor
          content={((editTask.question as any)?.passage && typeof (editTask.question as any).passage === 'object')
            ? (editTask.question as any).passage as Record<string, unknown>
            : EMPTY_TIPTAP_DOC}
          onChange={(content) => updateQuestionField('passage', content)}
          placeholder={t('taskGroupReading.readingPassagePlaceholder')}
        />
        <TipTapEditor
          content={((editTask.question as any)?.prompt && typeof (editTask.question as any).prompt === 'object')
            ? (editTask.question as any).prompt as Record<string, unknown>
            : EMPTY_TIPTAP_DOC}
          onChange={(content) => updateQuestionField('prompt', content)}
          placeholder={t('taskGroupReading.readingPromptPlaceholder')}
        />
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={Boolean((editTask.question as any)?.answer_required)}
            onChange={(e) => updateQuestionField('answer_required', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-200"
          />
          <div>
            <p className="text-sm font-medium text-slate-700">{t('taskGroupReading.readingAnswerRequiredLabel')}</p>
            <p className="text-xs text-slate-500">{t('taskGroupReading.readingAnswerOptionalHint')}</p>
          </div>
        </label>
      </>
    )
  }

  function renderMatchingEditor() {
    if (editTask?.type !== 'matching') return null

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600">{t('taskGroup.pairContent')}</label>
          <button
            onClick={addPair}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
          >
            + {t('taskGroup.addPair')}
          </button>
        </div>
        {(editTask?.question as any)?.pairs?.map((pair: any, pairIndex: number) => (
          <div key={pairIndex} className="flex items-center gap-2">
            <input
              type="text"
              value={pair.left}
              onChange={(e) => updatePair(pairIndex, 'left', e.target.value)}
              placeholder={t('taskGroup.leftContentPlaceholder')}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
            />
            <span className="text-slate-400">→</span>
            <input
              type="text"
              value={pair.right}
              onChange={(e) => updatePair(pairIndex, 'right', e.target.value)}
              placeholder={t('taskGroup.rightContentPlaceholder')}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
            />
            <button
              onClick={() => removePair(pairIndex)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              title={t('taskGroup.deletePairTitle')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    )
  }

  function renderFillBlankEditor() {
    if (editTask?.type !== 'fill_blank') return null

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600">{t('taskGroup.blankAnswers')}</label>
          <button
            onClick={addBlank}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
          >
            + {t('taskGroup.addBlank')}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {t('taskGroup.blankHint')}
        </p>
        {(editTask?.question as any)?.blanks?.map((blank: any, blankIndex: number) => (
          <div key={blankIndex} className="flex items-center gap-2">
            <span className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-xs font-medium">
              {blankIndex + 1}
            </span>
            <input
              type="text"
              value={blank.answer || ''}
              onChange={(e) => updateBlank(blankIndex, e.target.value)}
              placeholder={t('taskGroup.blankAnswerPlaceholder').replace('{{index}}', String(blankIndex + 1))}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
            />
            <button
              onClick={() => removeBlank(blankIndex)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              title={t('taskGroup.deleteBlankTitle')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
        {(!(editTask?.question as any)?.blanks || (editTask?.question as any)?.blanks?.length === 0) && (
          <p className="text-xs text-slate-400 italic">{t('taskGroup.noBlanks')}</p>
        )}
      </div>
    )
  }

  function renderGenericAnswerEditor() {
    if (!editTask) return null
    if (!shouldShowGenericCorrectAnswer(editTask.type || '', (editTask.question || {}) as Record<string, unknown>)) {
      return null
    }

    return (
      <div>
        <label className="text-xs font-medium text-slate-600">{t('taskGroup.simpleCorrectAnswer')}</label>
        {taskUsesBooleanAnswer(editTask.type) ? (
          <select
            value={
              typeof editTask.correct_answer === 'object'
                ? String((editTask.correct_answer as any)?.value ?? true)
                : String(editTask.correct_answer ?? true)
            }
            onChange={(e) => updateAnswer(e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
          >
            <option value="true">{t('common.correct')}</option>
            <option value="false">{t('common.incorrect')}</option>
          </select>
        ) : (
          <input
            type="text"
            value={typeof editTask.correct_answer === 'object'
              ? (editTask.correct_answer as any)?.value || ''
              : String(editTask.correct_answer || '')}
            onChange={(e) => updateAnswer(e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
            placeholder={isReadingType(editTask.type) ? t('taskGroupReading.readingReferenceAnswerPlaceholder') : t('task.answer')}
          />
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="font-semibold text-slate-900">{t('taskGroup.questionPreviewTitle')}</h4>
          <p className="text-sm text-slate-500">{tWithParams('taskGroup.totalCount', { count: tasks.length })}</p>
        </div>
        <button
          onClick={onAddMore}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
        >
          + {t('taskGroup.addMore')}
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl">
          <p className="text-slate-500 mb-4">{t('taskGroup.noQuestions')}</p>
          <button
            onClick={onAddMore}
            className="px-6 py-2 bg-blue-500 text-white rounded-xl"
          >
            {t('taskGroup.goAddQuestions')}
          </button>
        </div>
      ) : (
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {tasks.map((task, index) => {
            const typeLabel = getTaskTypeLabel(task.type, t, task.type)
            const isEditing = editingIndex === index
            const currentTask = isEditing && editTask ? editTask : task
            const hasOptions = shouldShowChoiceOptions(currentTask.type) && (currentTask.question as any).options && (currentTask.question as any).options.length > 0
            const isReading = isReadingTaskType(currentTask)

            return (
              <div
                key={task.id || index}
                className="bg-slate-50 rounded-2xl p-5 border border-slate-100"
              >
                <div className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-sm font-medium text-slate-600">
                    {index + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                        {typeLabel}
                      </span>
                    </div>

                    {isEditing ? (
                      <TaskPreviewEditForm
                        t={t}
                        editTask={editTask}
                        setEditTask={setEditTask}
                        renderReadingEditor={renderReadingEditor}
                        renderMatchingEditor={renderMatchingEditor}
                        renderFillBlankEditor={renderFillBlankEditor}
                        renderGenericAnswerEditor={renderGenericAnswerEditor}
                        hasOptions={hasOptions}
                        isReading={isReading}
                        updateOption={updateOption}
                        moveOption={moveOption}
                        onSave={() => void saveEdit()}
                        onCancel={cancelEdit}
                      />
                    ) : (
                      <>
                        {(() => {
                          const questionText = (task.question as any).text
                          const isTipTapContent = typeof questionText === 'object' && questionText !== null
                          return isTipTapContent ? (
                            <div className="font-medium text-slate-900 mb-2">
                              <TaskRichTextOrPlain content={questionText} />
                            </div>
                          ) : (
                            <p className="font-medium text-slate-900 mb-2">
                              {questionText || t('taskGroup.noQuestionContent')}
                            </p>
                          )
                        })()}

                        {!(task.question as any).options && <TaskDetailPreview task={task} t={t} />}

                        {(task.question as any).options && (
                          <div className="space-y-1 mb-3">
                            {(task.question as any).options.map((opt: any) => (
                              <div key={opt.key} className="text-sm text-slate-600 flex items-center gap-2">
                                <span className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center text-xs">
                                  {opt.key}
                                </span>
                                {opt.text}
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-sm text-slate-500">
                          {t('taskGroup.answerDisplayLabel')} <span className="font-medium text-slate-700">
                            {formatTaskAnswerDisplay(task, t)}
                          </span>
                        </p>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEdit(index)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title={t('common.edit')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => void deleteTask(index)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title={t('common.delete')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex justify-between mt-6 pt-6 border-t border-slate-100">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          {t('taskGroup.previousStep')}
        </button>
        <button
          onClick={onNext}
          disabled={tasks.length === 0}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {t('taskGroup.confirmReady')}
        </button>
      </div>
    </div>
  )
}

// 步骤4：确认就绪
function Step4Confirm({
  group,
  taskCount,
  onBack,
  onReady,
  onSaveDraft,
}: {
  group: LiveTaskGroup
  taskCount: number
  onBack: () => void
  onReady: () => void
  onSaveDraft: () => void
}) {
  const { t, tWithParams } = useTranslation()
  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
        ✓
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('taskGroup.readyTitle')}</h3>
      <p className="text-slate-500 mb-8">
        {group.title} · {tWithParams('taskGroup.containsTask', { count: taskCount })}
      </p>

      <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left">
        <h4 className="font-medium text-slate-900 mb-4">{t('taskGroup.readyChecklistTitle')}</h4>
        <ul className="space-y-3">
          <li className="flex items-center gap-3 text-sm text-slate-600">
            <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">✓</span>
            {t('taskGroup.contentChecked')}
          </li>
          <li className="flex items-center gap-3 text-sm text-slate-600">
            <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">✓</span>
            {t('taskGroup.answerSet')}
          </li>
          <li className="flex items-center gap-3 text-sm text-slate-600">
            <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">✓</span>
            {t('taskGroup.canUseAfterReady')}
          </li>
        </ul>
      </div>

      <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        {t('taskGroup.clickToConfirm')}
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 pt-4 pb-2 backdrop-blur">
        <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={onBack}
          className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          {t('taskGroup.backToCheck')}
        </button>
        <button
          onClick={onSaveDraft}
          className="px-6 py-3 bg-slate-500 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors"
        >
          {t('taskGroup.saveAsDraft')}
        </button>
        <button
          onClick={onReady}
          className="px-8 py-3 rounded-xl font-medium transition-colors shadow-sm border border-green-700"
          style={{ backgroundColor: '#15803d', color: '#ffffff' }}
        >
          {t('taskGroup.confirmReady_action')}
        </button>
        </div>
      </div>
    </div>
  )
}
