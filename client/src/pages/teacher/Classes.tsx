import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { classService, membershipService, type CreateClassData, type MembershipSnapshot } from '../../services/api'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import { useTranslation } from '../../i18n/useTranslation'

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
  const { t } = useTranslation()
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

  useEffect(() => {
    loadClasses()
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
        })
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
      alert(t('membership.classLimitReached'))
      return
    }
    setShowCreateModal(true)
  }

  function getMembershipMessage(error: any, fallback: string) {
    const detail = error?.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (detail?.message) return detail.message
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
      alert(getMembershipMessage(error, t('class.createError')))
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
      setClasses(classes.map(c => c.id === updated.id ? updated : c))
      setShowEditModal(false)
      setSelectedClass(null)
    } catch (error) {
      console.error('Failed to update class:', error)
      alert(t('class.updateError'))
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
      setClasses(classes.filter(c => c.id !== selectedClass.id))
      setShowDeleteModal(false)
      setSelectedClass(null)
    } catch (error) {
      console.error('Failed to delete class:', error)
      alert(t('class.deleteError'))
    }
  }

  const handleToggleStatus = async (cls: ClassItem) => {
    const newStatus = cls.status === 'active' ? 'archived' : 'active'
    try {
      const updated = await classService.update(cls.id, { status: newStatus })
      setClasses(classes.map(c => c.id === updated.id ? updated : c))
    } catch (error) {
      console.error('Failed to update class status:', error)
      alert(t('class.statusError'))
    }
  }

  const getStatusIcon = (status: string) => {
    return status === 'active' ? '🟢' : '⚫'
  }

  const getStatusText = (status: string) => {
    return status === 'active' ? t('class.statusActive') : t('class.statusArchived')
  }

  const maxStudentsPerClass = membership?.limits.max_students_per_class ?? 60
  const maxClasses = membership?.limits.max_classes
  const classCount = membership?.usage.class_count ?? classes.length
  const canCreateMoreClasses = maxClasses == null || classCount < maxClasses

  return (
    <Layout sidebar={<TeacherSidebar activePage="classes" />}>
      {/* 深蓝顶栏 */}
      <section className="surface-card mb-4 mt-4" style={{ background: 'linear-gradient(135deg, #18324a 0%, #2a4a6a 100%)' }}>
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <span className="text-lg">👥</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>Classes</p>
                <h2 className="text-base font-semibold" style={{ color: '#fff' }}>{t('class.manage')}</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {membership && (
                <div
                  className="px-3 py-1.5 rounded-lg cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                  onClick={() => window.location.href = '/teacher/membership'}
                  title={membership.plan_name}
                >
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {t('membership.usageClasses').replace('{{used}}', String(classCount)).replace('{{limit}}', maxClasses == null ? '∞' : String(maxClasses))}
                  </span>
                </div>
              )}
              <button
                onClick={openCreateModal}
                disabled={!canCreateMoreClasses}
                className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  opacity: canCreateMoreClasses ? 1 : 0.5,
                  cursor: canCreateMoreClasses ? 'pointer' : 'not-allowed',
                }}
              >
                + {t('class.create')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="surface-card p-12 text-center">
          <p style={{ color: 'var(--muted)' }}>{t('class.loading')}</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <p className="text-lg mb-4" style={{ color: 'var(--muted)' }}>{t('class.noClass')}</p>
          <p style={{ color: 'var(--muted)' }}>{t('class.emptyDescription')}</p>
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
                    <span>👥</span>
                    <span>{cls.student_count ?? 0}/{maxStudentsPerClass}</span>
                  </div>
                  <span className={`status-badge ${cls.status}`}>
                    {getStatusText(cls.status)}
                  </span>
                </div>
              </div>

              {(cls.student_count ?? 0) > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
                    <span>班级容量</span>
                    <span>{cls.student_count ?? 0}/{maxStudentsPerClass}</span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(24,36,58,0.08)' }}>
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
              )}

              <div className="grid gap-4 md:grid-cols-[1fr,160px]">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{t('class.inviteCode')}</p>
                    <div className="fake-input">{cls.invite_code}</div>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {t('class.inviteHelp')}
                  </p>
                  <div>
                    <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{t('class.joinLinkLabel')}</p>
                    <div className="fake-input" style={{ fontSize: '0.8125rem', wordBreak: 'break-all' }}>
                      {buildJoinUrl(cls)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="ghost-button text-sm"
                      onClick={() => void copyText(cls.invite_code, `${cls.id}-code`)}
                    >
                      {copiedKey === `${cls.id}-code` ? t('class.copySuccess') : t('class.copyInviteCode')}
                    </button>
                    <button
                      className="ghost-button text-sm"
                      onClick={() => void copyText(buildJoinUrl(cls), `${cls.id}-link`)}
                    >
                      {copiedKey === `${cls.id}-link` ? t('class.copySuccess') : t('class.copyJoinLink')}
                    </button>
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-3 flex flex-col items-center justify-center text-center"
                  style={{ background: 'rgba(255,255,255,0.78)', borderColor: 'rgba(24,36,58,0.08)' }}
                >
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>{t('class.qrTitle')}</p>
                  {qrCodeMap[cls.id] ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openQrPreview(cls)}
                        className="w-full flex items-center justify-center rounded-2xl"
                        style={{
                          padding: 0,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'zoom-in',
                        }}
                        title={t('class.qrPreview')}
                      >
                        <img
                          src={qrCodeMap[cls.id]}
                          alt={`${cls.name} QR`}
                          style={{ width: '132px', height: '132px', borderRadius: '16px' }}
                        />
                      </button>
                      <div className="flex flex-wrap justify-center gap-2 mt-3">
                        <button
                          type="button"
                          className="ghost-button text-sm"
                          onClick={() => openQrPreview(cls)}
                        >
                          {t('class.qrPreview')}
                        </button>
                        <button
                          type="button"
                          className="ghost-button text-sm"
                          onClick={() => downloadQrCode(cls)}
                        >
                          {t('class.qrDownload')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="w-[132px] h-[132px] rounded-2xl bg-slate-100 flex items-center justify-center text-sm text-slate-500">
                      {t('class.qrLoading')}
                    </div>
                  )}
                  <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>{t('class.qrDesc')}</p>
                </div>
              </div>

              <div className="action-row">
                <button
                  className="icon-button"
                  title={t('form.edit')}
                  onClick={() => handleEdit(cls)}
                >
                  ✏️
                </button>
                <button
                  className="icon-button"
                  title={cls.status === 'active' ? t('common.deactivate') : t('common.activate')}
                  onClick={() => handleToggleStatus(cls)}
                >
                  {cls.status === 'active' ? '⏸️' : '▶️'}
                </button>
                <button
                  className="icon-button danger"
                  title={t('form.delete')}
                  onClick={() => handleDelete(cls)}
                >
                  🗑️
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content surface-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{t('class.create')}</h2>
            {!canCreateMoreClasses && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {t('membership.usageClasses').replace('{{used}}', String(classCount)).replace('{{limit}}', maxClasses == null ? '∞' : String(maxClasses))}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>
                  {t('class.name')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ background: 'rgba(255,255,255,0.76)', borderColor: 'rgba(24,36,58,0.08)' }}
                  placeholder={t('class.namePlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>
                  {t('class.inviteCodeOptional')}
                </label>
                <input
                  type="text"
                  value={formData.invite_code}
                  onChange={(e) => setFormData({ ...formData, invite_code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ background: 'rgba(255,255,255,0.76)', borderColor: 'rgba(24,36,58,0.08)' }}
                  placeholder={t('class.autoGenerate')}
                  maxLength={8}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 ghost-button py-3"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="flex-1 solid-button py-3" disabled={!canCreateMoreClasses}>
                  {t('form.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedClass && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content surface-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{t('class.editClass')}</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>
                  {t('class.name')}
                </label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ background: 'rgba(255,255,255,0.76)', borderColor: 'rgba(24,36,58,0.08)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>
                  {t('class.status')}
                </label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ background: 'rgba(255,255,255,0.76)', borderColor: 'rgba(24,36,58,0.08)' }}
                >
                  <option value="active">{t('class.statusActive')}</option>
                  <option value="archived">{t('class.statusArchived')}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 ghost-button py-3"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="flex-1 solid-button py-3">
                  {t('form.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedClass && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content surface-card p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-2">{t('class.confirmDelete')}</h2>
            <p className="mb-4" style={{ color: 'var(--muted)' }}>
              {t('class.deleteConfirm').replace('{{name}}', selectedClass.name)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 ghost-button py-3"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 rounded-xl text-white"
                style={{ background: 'var(--danger)' }}
              >
                {t('form.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrPreview && (
        <div className="modal-overlay" onClick={() => setQrPreview(null)}>
          <div
            className="modal-content surface-card p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
                  {t('class.qrPreviewTitle')}
                </h2>
                <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                  {t('class.qrPreviewDesc').replace('{{name}}', qrPreview.name)}
                </p>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setQrPreview(null)}
              >
                {t('common.close')}
              </button>
            </div>

            <div
              className="rounded-[28px] border p-5 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.82)', borderColor: 'rgba(24,36,58,0.08)' }}
            >
              <img
                src={qrPreview.qrCode}
                alt={`${qrPreview.name} QR preview`}
                style={{ width: 'min(100%, 360px)', height: 'auto', borderRadius: '24px' }}
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setQrPreview(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="solid-button"
                onClick={() => {
                  const cls = classes.find((item) => item.id === qrPreview.id)
                  if (cls) downloadQrCode(cls)
                }}
              >
                {t('class.qrDownload')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
