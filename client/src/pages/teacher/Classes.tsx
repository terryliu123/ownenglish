import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { classService, membershipService, type CreateClassData, type MembershipSnapshot } from '../../services/api'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import TeacherPageHeader from '../../components/layout/TeacherPageHeader'

interface ClassItem {
  id: string
  name: string
  invite_code: string
  status: string
  student_count?: number
  join_url?: string
}

interface QrPreviewState {
  id: string
  name: string
  qrCode: string
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, string>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [qrPreview, setQrPreview] = useState<QrPreviewState | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)
  const [membership, setMembership] = useState<MembershipSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    invite_code: '',
  })
  const [editData, setEditData] = useState({
    name: '',
    status: '',
  })

  const text = {
    title: '班级管理',
    subtitle: '创建班级、生成邀请入口，并管理班级状态和加入方式。',
    usageClasses: (used: number, limit: number | null | undefined) => `班级数量 ${used} / ${limit == null ? '∞' : limit}`,
    planLimitReached: '当前会员等级已达到可创建班级上限。',
    create: '创建班级',
    createError: '创建班级失败',
    updateError: '更新班级失败',
    deleteError: '删除班级失败',
    statusError: '更新班级状态失败',
    loading: '加载中...',
    empty: '暂无班级',
    emptyDescription: '点击右上角“创建班级”按钮，创建您的第一个班级。',
    active: '进行中',
    archived: '已停用',
    capacity: '班级容量',
    inviteCode: '邀请码',
    inviteHelp: '将邀请码或加入链接分享给学生，学生即可加入当前班级。',
    joinLink: '加入链接',
    copied: '已复制',
    copyInviteCode: '复制邀请码',
    copyJoinLink: '复制加入链接',
    qrTitle: '加入二维码',
    qrPreview: '查看大图',
    qrDownload: '下载二维码',
    qrLoading: '生成中...',
    qrDesc: '学生扫码后可直接进入加入页面。',
    editAction: '编辑',
    deactivateAction: '停用',
    activateAction: '启用',
    deleteAction: '删除',
    createModalTitle: '创建班级',
    name: '班级名称',
    namePlaceholder: '请输入班级名称',
    inviteCodeOptional: '邀请码（可选）',
    inviteCodePlaceholder: '留空则自动生成',
    cancel: '取消',
    save: '保存',
    editClassTitle: '编辑班级',
    status: '状态',
    confirmDelete: '确认删除',
    confirmDeleteMessage: (name: string) => `确定要删除班级“${name}”吗？此操作不可撤销。`,
    qrPreviewTitle: '二维码预览',
    qrPreviewDesc: (name: string) => `用于加入班级“${name}”的二维码。`,
  }

  useEffect(() => {
    void loadClasses()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function buildQrCodes() {
      const entries = await Promise.all(
        classes.map(async (cls) => {
          const joinUrl = buildJoinUrl(cls)
          const qrCode = await (QRCode as unknown as { toDataURL: (text: string, options?: Record<string, unknown>) => Promise<string> }).toDataURL(joinUrl, {
            width: 180,
            margin: 1,
            color: {
              dark: '#1E3A5F',
              light: '#FFFFFF',
            },
          })
          return [cls.id, qrCode] as const
        }),
      )

      if (!cancelled) {
        setQrCodeMap(Object.fromEntries(entries))
      }
    }

    if (classes.length) {
      void buildQrCodes()
    } else {
      setQrCodeMap({})
    }

    return () => {
      cancelled = true
    }
  }, [classes])

  async function loadClasses() {
    try {
      const [data, membershipData] = await Promise.all([
        classService.getAll(),
        membershipService.getMyMembership(),
      ])
      setClasses(data)
      setMembership(membershipData)
    } catch (error) {
      console.error('Failed to load classes:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    if (!canCreateMoreClasses) {
      alert(text.planLimitReached)
      return
    }
    setShowCreateModal(true)
  }

  function getMembershipMessage(error: unknown, fallback: string) {
    const detail = (error as { response?: { data?: { detail?: string | { message?: string } } } })?.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (typeof detail === 'object' && detail?.message) return detail.message
    return fallback
  }

  function buildJoinUrl(cls: ClassItem) {
    if (cls.join_url) return cls.join_url
    const url = new URL('/join', window.location.origin)
    url.searchParams.set('invite_code', cls.invite_code)
    return url.toString()
  }

  async function copyText(value: string, key: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = value
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1600)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  function openQrPreview(cls: ClassItem) {
    const qrCode = qrCodeMap[cls.id]
    if (!qrCode) return
    setQrPreview({
      id: cls.id,
      name: cls.name,
      qrCode,
    })
  }

  function downloadQrCode(cls: ClassItem) {
    const qrCode = qrCodeMap[cls.id]
    if (!qrCode) return

    const link = document.createElement('a')
    link.href = qrCode
    link.download = `${cls.name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'class'}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newClass = await classService.create({
        name: formData.name,
        invite_code: formData.invite_code || undefined,
      } as CreateClassData)
      setClasses([...classes, newClass])
      const membershipData = await membershipService.getMyMembership()
      setMembership(membershipData)
      setShowCreateModal(false)
      setFormData({ name: '', invite_code: '' })
    } catch (error) {
      console.error('Failed to create class:', error)
      alert(getMembershipMessage(error, text.createError))
    }
  }

  const handleEdit = (cls: ClassItem) => {
    setSelectedClass(cls)
    setEditData({ name: cls.name, status: cls.status })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClass) return
    try {
      const updated = await classService.update(selectedClass.id, {
        name: editData.name,
        status: editData.status,
      })
      setClasses(classes.map((c) => (c.id === updated.id ? updated : c)))
      setShowEditModal(false)
      setSelectedClass(null)
    } catch (error) {
      console.error('Failed to update class:', error)
      alert(text.updateError)
    }
  }

  const handleDelete = (cls: ClassItem) => {
    setSelectedClass(cls)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedClass) return
    try {
      await classService.delete(selectedClass.id)
      setClasses(classes.filter((c) => c.id !== selectedClass.id))
      const membershipData = await membershipService.getMyMembership()
      setMembership(membershipData)
      setShowDeleteModal(false)
      setSelectedClass(null)
    } catch (error) {
      console.error('Failed to delete class:', error)
      alert(text.deleteError)
    }
  }

  const handleToggleStatus = async (cls: ClassItem) => {
    const newStatus = cls.status === 'active' ? 'archived' : 'active'
    try {
      const updated = await classService.update(cls.id, { status: newStatus })
      setClasses(classes.map((c) => (c.id === updated.id ? updated : c)))
    } catch (error) {
      console.error('Failed to update class status:', error)
      alert(text.statusError)
    }
  }

  const getStatusIcon = (status: string) => (status === 'active' ? '进' : '停')

  const getStatusText = (status: string) => (status === 'active' ? text.active : text.archived)

  const maxStudentsPerClass = membership?.limits.max_students_per_class ?? 60
  const maxClasses = membership?.limits.max_classes
  const classCount = membership?.usage.class_count ?? classes.length
  const canCreateMoreClasses = maxClasses == null || classCount < maxClasses

  return (
    <Layout sidebar={<TeacherSidebar activePage="classes" />} leftSidebar={<TeacherLeftSidebar activePage="classes" />}>
      <div className="teacher-page">
        <TeacherPageHeader
          eyebrow="班级管理"
          title={text.title}
          description={text.subtitle}
          icon="班"
          actions={(
            <>
              {membership ? (
                <button
                  className="teacher-page-pill"
                  onClick={() => { window.location.href = '/teacher/membership' }}
                  title={membership.plan_name}
                >
                  {text.usageClasses(classCount, maxClasses)}
                </button>
              ) : null}
              <button
                onClick={openCreateModal}
                disabled={!canCreateMoreClasses}
                className="solid-button disabled:opacity-50"
              >
                {text.create}
              </button>
            </>
          )}
        />

        {loading ? (
          <div className="surface-card p-12 text-center">
            <p style={{ color: 'var(--muted)' }}>{text.loading}</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="surface-card p-12 text-center">
            <p className="mb-4 text-lg" style={{ color: 'var(--muted)' }}>{text.empty}</p>
            <p style={{ color: 'var(--muted)' }}>{text.emptyDescription}</p>
          </div>
        ) : (
          <div className="teacher-grid">
            {classes.map((cls) => (
              <article key={cls.id} className="surface-card">
                <div className="surface-head">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getStatusIcon(cls.status)}</span>
                    <h3>{cls.name}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--muted)' }}>
                      <span>人</span>
                      <span>{cls.student_count ?? 0}/{maxStudentsPerClass}</span>
                    </div>
                    <span className={`status-badge ${cls.status}`}>
                      {getStatusText(cls.status)}
                    </span>
                  </div>
                </div>

                {(cls.student_count ?? 0) > 0 ? (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
                      <span>{text.capacity}</span>
                      <span>{cls.student_count ?? 0}/{maxStudentsPerClass}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full" style={{ background: 'rgba(24,36,58,0.08)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(((cls.student_count ?? 0) / maxStudentsPerClass) * 100, 100)}%`,
                          background: (cls.student_count ?? 0) >= maxStudentsPerClass
                            ? 'var(--danger)'
                            : (cls.student_count ?? 0) >= Math.floor(maxStudentsPerClass * 0.8)
                              ? '#f59e0b'
                              : '#22c55e',
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-[1fr,160px]">
                  <div className="space-y-3">
                    <div>
                      <p className="mb-2 text-xs" style={{ color: 'var(--muted)' }}>{text.inviteCode}</p>
                      <div className="fake-input">{cls.invite_code}</div>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                      {text.inviteHelp}
                    </p>
                    <div>
                      <p className="mb-2 text-xs" style={{ color: 'var(--muted)' }}>{text.joinLink}</p>
                      <div className="fake-input" style={{ fontSize: '0.8125rem', wordBreak: 'break-all' }}>
                        {buildJoinUrl(cls)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="ghost-button text-sm"
                        onClick={() => void copyText(cls.invite_code, `${cls.id}-code`)}
                      >
                        {copiedKey === `${cls.id}-code` ? text.copied : text.copyInviteCode}
                      </button>
                      <button
                        className="ghost-button text-sm"
                        onClick={() => void copyText(buildJoinUrl(cls), `${cls.id}-link`)}
                      >
                        {copiedKey === `${cls.id}-link` ? text.copied : text.copyJoinLink}
                      </button>
                    </div>
                  </div>

                  <div
                    className="flex flex-col items-center justify-center rounded-2xl border p-3 text-center"
                    style={{ background: 'rgba(255,255,255,0.78)', borderColor: 'rgba(24,36,58,0.08)' }}
                  >
                    <p className="mb-2 text-sm font-medium" style={{ color: 'var(--ink)' }}>{text.qrTitle}</p>
                    {qrCodeMap[cls.id] ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openQrPreview(cls)}
                          className="flex w-full items-center justify-center rounded-2xl"
                          style={{
                            padding: 0,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'zoom-in',
                          }}
                          title={text.qrPreview}
                        >
                          <img
                            src={qrCodeMap[cls.id]}
                            alt={`${cls.name} QR`}
                            style={{ width: '132px', height: '132px', borderRadius: '16px' }}
                          />
                        </button>
                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            className="ghost-button text-sm"
                            onClick={() => openQrPreview(cls)}
                          >
                            {text.qrPreview}
                          </button>
                          <button
                            type="button"
                            className="ghost-button text-sm"
                            onClick={() => downloadQrCode(cls)}
                          >
                            {text.qrDownload}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-[132px] w-[132px] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
                        {text.qrLoading}
                      </div>
                    )}
                    <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>{text.qrDesc}</p>
                  </div>
                </div>

                <div className="action-row">
                  <button
                    className="icon-button"
                    title={text.editAction}
                    onClick={() => handleEdit(cls)}
                  >
                    编
                  </button>
                  <button
                    className="icon-button"
                    title={cls.status === 'active' ? text.deactivateAction : text.activateAction}
                    onClick={() => handleToggleStatus(cls)}
                  >
                    {cls.status === 'active' ? '停' : '启'}
                  </button>
                  <button
                    className="icon-button danger"
                    title={text.deleteAction}
                    onClick={() => handleDelete(cls)}
                  >
                    删
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showCreateModal ? (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content surface-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-xl font-semibold">{text.createModalTitle}</h2>
            {!canCreateMoreClasses ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {text.usageClasses(classCount, maxClasses)}
              </div>
            ) : null}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--muted)' }}>
                  {text.name}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.76)', borderColor: 'rgba(24,36,58,0.08)' }}
                  placeholder={text.namePlaceholder}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--muted)' }}>
                  {text.inviteCodeOptional}
                </label>
                <input
                  type="text"
                  value={formData.invite_code}
                  onChange={(e) => setFormData({ ...formData, invite_code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.76)', borderColor: 'rgba(24,36,58,0.08)' }}
                  placeholder={text.inviteCodePlaceholder}
                  maxLength={8}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="ghost-button flex-1 py-3"
                >
                  {text.cancel}
                </button>
                <button type="submit" className="solid-button flex-1 py-3" disabled={!canCreateMoreClasses}>
                  {text.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showEditModal && selectedClass ? (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content surface-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-xl font-semibold">{text.editClassTitle}</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--muted)' }}>
                  {text.name}
                </label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full rounded-xl border px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.76)', borderColor: 'rgba(24,36,58,0.08)' }}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--muted)' }}>
                  {text.status}
                </label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full rounded-xl border px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.76)', borderColor: 'rgba(24,36,58,0.08)' }}
                >
                  <option value="active">{text.active}</option>
                  <option value="archived">{text.archived}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="ghost-button flex-1 py-3"
                >
                  {text.cancel}
                </button>
                <button type="submit" className="solid-button flex-1 py-3">
                  {text.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showDeleteModal && selectedClass ? (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content surface-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-xl font-semibold">{text.confirmDelete}</h2>
            <p className="mb-4" style={{ color: 'var(--muted)' }}>
              {text.confirmDeleteMessage(selectedClass.name)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="ghost-button flex-1 py-3"
              >
                {text.cancel}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-xl py-3 text-white"
                style={{ background: 'var(--danger)' }}
              >
                {text.deleteAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {qrPreview ? (
        <div className="modal-overlay" onClick={() => setQrPreview(null)}>
          <div
            className="modal-content surface-card w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
                  {text.qrPreviewTitle}
                </h2>
                <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                  {text.qrPreviewDesc(qrPreview.name)}
                </p>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setQrPreview(null)}
              >
                {text.cancel}
              </button>
            </div>

            <div
              className="flex items-center justify-center rounded-[28px] border p-5"
              style={{ background: 'rgba(255,255,255,0.82)', borderColor: 'rgba(24,36,58,0.08)' }}
            >
              <img
                src={qrPreview.qrCode}
                alt={`${qrPreview.name} QR preview`}
                style={{ width: 'min(100%, 360px)', height: 'auto', borderRadius: '24px' }}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setQrPreview(null)}
              >
                {text.cancel}
              </button>
              <button
                type="button"
                className="solid-button"
                onClick={() => {
                  const cls = classes.find((item) => item.id === qrPreview.id)
                  if (cls) downloadQrCode(cls)
                }}
              >
                {text.qrDownload}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  )
}
