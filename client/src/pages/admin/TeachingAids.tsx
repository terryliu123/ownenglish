import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { teachingAidService, type TeachingAid, type TeachingAidCategory, type TeachingAidManifestSyncResponse } from '../../services/api'
import { useTranslation } from '../../i18n/useTranslation'

export default function AdminTeachingAids() {
  const { t } = useTranslation()
  const [items, setItems] = useState<TeachingAid[]>([])
  const [categories, setCategories] = useState<TeachingAidCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [batchUpdating, setBatchUpdating] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [syncReport, setSyncReport] = useState<TeachingAidManifestSyncResponse | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creatingAid, setCreatingAid] = useState<TeachingAid | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    category_code: '',
    category_label: '',
    summary: '',
    tags: '',
  })
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{ valid: boolean; entry_file_exists: boolean; errors: string[]; files: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        teachingAidService.listAdmin({ keyword: keyword || undefined, category: category || undefined, status: status || undefined }),
        teachingAidService.getCategories(),
      ])
      // Client-side filter for source (teacher vs admin)
      let filteredItems = itemsRes.items
      if (source === 'teacher') {
        filteredItems = filteredItems.filter((item: TeachingAid) => !!item.teacher_id)
      } else if (source === 'admin') {
        filteredItems = filteredItems.filter((item: TeachingAid) => !item.teacher_id)
      }
      setItems(filteredItems)
      setCategories(categoriesRes.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [keyword, category, status, source])

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => items.some((item) => item.id === id)))
  }, [items])

  const statusLabel = useMemo<Record<TeachingAid['status'], string>>(
    () => ({
      draft: t('adminTeachingAids.statuses.draft'),
      active: t('adminTeachingAids.statuses.active'),
      archived: t('adminTeachingAids.statuses.archived'),
    }),
    [t]
  )

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await teachingAidService.syncManifest()
      setSyncReport(result)
      await loadData()
      alert(t('adminTeachingAids.syncSuccess'))
    } catch (error) {
      console.error(error)
      alert(t('adminTeachingAids.syncFailed'))
    } finally {
      setSyncing(false)
    }
  }

  const allVisibleSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id))

  const toggleVisibleSelection = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !items.some((item) => item.id === id))
      }
      const next = new Set(prev)
      items.forEach((item) => next.add(item.id))
      return Array.from(next)
    })
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ))
  }

  const handleBatchStatus = async (nextStatus: TeachingAid['status']) => {
    if (selectedIds.length === 0) return
    setBatchUpdating(true)
    try {
      const result = await teachingAidService.updateStatusBatch(selectedIds, nextStatus)
      setItems((prev) => prev.map((item) => result.items.find((updated) => updated.id === item.id) || item))
      setSelectedIds([])
      alert(t('adminTeachingAids.batch.updated').replace('{{count}}', String(result.updated)))
    } catch (error) {
      console.error(error)
      alert(t('adminTeachingAids.batch.failed'))
    } finally {
      setBatchUpdating(false)
    }
  }

  const handleCopySyncReport = async () => {
    if (!syncReport) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(syncReport, null, 2))
      alert(t('adminTeachingAids.syncReport.copied'))
    } catch (error) {
      console.error(error)
      alert(t('adminTeachingAids.syncReport.copyFailed'))
    }
  }

  const handleDownloadSyncReport = () => {
    if (!syncReport) return
    const blob = new Blob([JSON.stringify(syncReport, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `teaching-aids-sync-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleCreate = async () => {
    if (!createForm.name || !createForm.slug || !createForm.category_code) {
      alert('请填写必填项')
      return
    }
    try {
      const aid = await teachingAidService.create({
        name: createForm.name,
        slug: createForm.slug,
        category_code: createForm.category_code,
        category_label: categories.find(c => c.code === createForm.category_code)?.label || createForm.category_code,
        summary: createForm.summary,
        tags: createForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      setCreatingAid(aid)
      setValidationResult(null)
    } catch (error: any) {
      alert(error.response?.data?.detail || '创建失败')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFiles(Array.from(e.target.files))
    }
  }

  const handleUpload = async () => {
    if (!creatingAid || uploadFiles.length === 0) return
    try {
      await teachingAidService.uploadFiles(creatingAid.id, uploadFiles)
      alert('上传成功')
      setUploadFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      // Validate after upload
      const result = await teachingAidService.validate(creatingAid.id)
      setValidationResult(result)
    } catch (error: any) {
      alert(error.response?.data?.detail || '上传失败')
    }
  }

  const handleValidate = async () => {
    if (!creatingAid) return
    setValidating(true)
    try {
      const result = await teachingAidService.validate(creatingAid.id)
      setValidationResult(result)
    } finally {
      setValidating(false)
    }
  }

  const handlePublish = async () => {
    if (!creatingAid) return
    if (!validationResult?.valid) {
      alert('请确保文件验证通过后再发布')
      return
    }
    try {
      await teachingAidService.updateStatus(creatingAid.id, 'active')
      setShowCreateModal(false)
      setCreatingAid(null)
      setCreateForm({ name: '', slug: '', category_code: '', category_label: '', summary: '', tags: '' })
      setUploadFiles([])
      setValidationResult(null)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.detail || '发布失败')
    }
  }

  const handleCancelCreate = async () => {
    if (creatingAid) {
      await teachingAidService.delete(creatingAid.id)
    }
    setShowCreateModal(false)
    setCreatingAid(null)
    setCreateForm({ name: '', slug: '', category_code: '', category_label: '', summary: '', tags: '' })
    setUploadFiles([])
    setValidationResult(null)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-8">
      <div className="flex items-start justify-between gap-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('adminTeachingAids.title')}</h1>
          <p className="mt-2 text-sm text-slate-400">{t('adminTeachingAids.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl border border-emerald-600 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-900/30"
          >
            + 新建教具
          </button>
          <button
            onClick={() => void handleSync()}
            disabled={syncing}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-60"
          >
            {syncing ? t('adminTeachingAids.syncing') : t('adminTeachingAids.syncManifest')}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 rounded-3xl border border-slate-700 bg-slate-800/60 p-5 lg:grid-cols-5 shrink-0">
        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">{t('adminTeachingAids.keyword')}</span>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">{t('adminTeachingAids.category')}</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
          >
            <option value="">{t('adminTeachingAids.allCategories')}</option>
            {categories.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">{t('adminTeachingAids.status')}</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
          >
            <option value="">{t('adminTeachingAids.allStatuses')}</option>
            <option value="draft">{t('adminTeachingAids.statuses.draft')}</option>
            <option value="active">{t('adminTeachingAids.statuses.active')}</option>
            <option value="archived">{t('adminTeachingAids.statuses.archived')}</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">来源</span>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
          >
            <option value="">全部</option>
            <option value="teacher">教师上传</option>
            <option value="admin">后台创建</option>
          </select>
        </label>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t('adminTeachingAids.manifestPath')}</div>
          <div className="mt-2 break-all text-xs text-slate-300">
            {syncReport?.manifest_path || 'server/storage/teaching-aids/manifests/teaching-aids.json'}
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-800/60 p-5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-white">{t('adminTeachingAids.batch.title')}</div>
            <div className="mt-1 text-sm text-slate-400">
              {selectedIds.length > 0
                ? t('adminTeachingAids.batch.selected').replace('{{count}}', String(selectedIds.length))
                : t('adminTeachingAids.batch.empty')}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={toggleVisibleSelection}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
            >
              {allVisibleSelected ? t('adminTeachingAids.batch.unselectVisible') : t('adminTeachingAids.batch.selectVisible')}
            </button>
            {(['draft', 'active', 'archived'] as TeachingAid['status'][]).map((itemStatus) => (
              <button
                key={itemStatus}
                onClick={() => void handleBatchStatus(itemStatus)}
                disabled={selectedIds.length === 0 || batchUpdating}
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50"
              >
                {t('adminTeachingAids.batch.setStatus').replace('{{status}}', statusLabel[itemStatus])}
              </button>
            ))}
          </div>
        </div>
      </section>

      {syncReport ? (
        <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-800/60 p-5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-lg font-semibold text-white">{t('adminTeachingAids.syncReport.title')}</div>
            <div className="flex gap-3">
              <button
                onClick={() => void handleCopySyncReport()}
                className="rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
              >
                {t('adminTeachingAids.syncReport.copy')}
              </button>
              <button
                onClick={handleDownloadSyncReport}
                className="rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
              >
                {t('adminTeachingAids.syncReport.download')}
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {[
              ['total', syncReport.total],
              ['created', syncReport.created],
              ['updated', syncReport.updated],
              ['failed', syncReport.failed],
              ['missing', syncReport.missing_existing.length],
            ].map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t(`adminTeachingAids.syncReport.${key}`)}</div>
                <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
          {syncReport.errors.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <div className="text-sm font-medium text-rose-200">{t('adminTeachingAids.syncReport.errorList')}</div>
              <div className="mt-3 max-h-52 space-y-2 overflow-auto text-xs text-rose-100">
                {syncReport.errors.map((item) => (
                  <div key={`${item.slug}-${item.reason}`} className="rounded-xl bg-slate-950/40 px-3 py-2">
                    <span className="font-medium">{item.slug}</span>: {item.reason}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {syncReport.missing_existing.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="text-sm font-medium text-amber-200">{t('adminTeachingAids.syncReport.missingExistingList')}</div>
              <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-auto">
                {syncReport.missing_existing.map((slug) => (
                  <span key={slug} className="rounded-full bg-slate-950/40 px-2.5 py-1 text-xs text-amber-100">
                    {slug}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="flex-1 min-h-0 mt-6 overflow-auto">
        {loading ? (
          <div className="rounded-3xl border border-slate-700 bg-slate-800/60 px-6 py-10 text-center text-slate-400">
            {t('common.loading')}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-slate-700 bg-slate-800/60 px-6 py-10 text-center text-slate-400">
            {t('adminTeachingAids.empty')}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-800/60">
            <div className="divide-y divide-slate-700">
              {items.map((item) => (
                <article key={item.id} className="flex items-center justify-between gap-6 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                    />
                    <h2 className="truncate text-base font-semibold text-white">{item.name}</h2>
                    <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs text-slate-300">{item.category_label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${
                      item.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-200'
                        : item.status === 'archived'
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-amber-500/15 text-amber-200'
                    }`}>
                      {statusLabel[item.status]}
                    </span>
                    {item.teacher_id && (
                      <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs text-blue-200">
                        教师上传
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">{item.summary || '-'}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>{t('adminTeachingAids.source')}: {item.source_filename || '-'}</span>
                    <span>{t('adminTeachingAids.updatedAt')}: {item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN') : '-'}</span>
                  </div>
                </div>
                <Link
                  to={`/admin/teaching-aids/${item.id}`}
                  className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
                >
                  {t('adminTeachingAids.viewDetail')}
                </Link>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="text-xl font-bold text-white">{creatingAid ? '上传文件' : '新建教具'}</h2>
            {!creatingAid ? (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-sm text-slate-300">名称 *</span>
                  <input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="教具名称" />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">Slug * (小写字母、数字、连字符)</span>
                  <input value={createForm.slug} onChange={e => setCreateForm({...createForm, slug: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="example-aid" />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">分类 *</span>
                  <select value={createForm.category_code} onChange={e => setCreateForm({...createForm, category_code: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white">
                    <option value="">选择分类</option>
                    {categories.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">描述</span>
                  <textarea value={createForm.summary} onChange={e => setCreateForm({...createForm, summary: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" rows={3} placeholder="教具描述..." />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">标签 (逗号分隔)</span>
                  <input value={createForm.tags} onChange={e => setCreateForm({...createForm, tags: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="标签1, 标签2" />
                </label>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-300">教具: <span className="text-white">{creatingAid.name}</span></p>
                  <p className="text-xs text-slate-500 mt-1">路径: {creatingAid.storage_path}/</p>
                </div>
                <div>
                  <span className="text-sm text-slate-300">上传文件 (HTML、CSS、JS、图片等)</span>
                  <p className="text-xs text-slate-500 mt-1">必须包含 index.html 作为入口文件</p>
                  <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="mt-2 text-sm text-slate-300" />
                  {uploadFiles.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-400">已选择 {uploadFiles.length} 个文件</p>
                      <button onClick={handleUpload} className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500">上传文件</button>
                    </div>
                  )}
                </div>
                {validationResult && (
                  <div className={`rounded-lg border p-4 ${validationResult.valid ? 'border-emerald-600 bg-emerald-900/20' : 'border-amber-600 bg-amber-900/20'}`}>
                    <p className="text-sm font-medium text-white">验证结果: {validationResult.valid ? '通过' : '未通过'}</p>
                    {validationResult.files.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-400">文件列表:</p>
                        <div className="mt-1 max-h-32 overflow-auto text-xs text-slate-300">
                          {validationResult.files.map(f => <div key={f}>{f}</div>)}
                        </div>
                      </div>
                    )}
                    {validationResult.errors.length > 0 && (
                      <div className="mt-2 text-xs text-rose-300">
                        {validationResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={handleCancelCreate} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">取消</button>
              {!creatingAid ? (
                <button onClick={handleCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">创建</button>
              ) : (
                <>
                  <button onClick={handleValidate} disabled={validating} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50">{validating ? '验证中...' : '验证文件'}</button>
                  <button onClick={handlePublish} disabled={!validationResult?.valid} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed">发布</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
