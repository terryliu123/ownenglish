import { useEffect, useMemo, useState, useRef } from 'react'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import { useTranslation } from '../../i18n/useTranslation'
import { teachingAidService, type TeachingAid, type TeachingAidCategory } from '../../services/api'

type TabType = 'library' | 'mine'

export default function TeacherTeachingAids() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabType>('library')
  const [categories, setCategories] = useState<TeachingAidCategory[]>([])
  const [items, setItems] = useState<TeachingAid[]>([])
  const [myItems, setMyItems] = useState<TeachingAid[]>([])
  const [recentItems, setRecentItems] = useState<TeachingAid[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [selectedAidId, setSelectedAidId] = useState<string | null>(null)
  const [launchingAidId, setLaunchingAidId] = useState<string | null>(null)
  const [openedTeachingAid, setOpenedTeachingAid] = useState<{ name: string; entryUrl: string } | null>(null)

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createCategory, setCreateCategory] = useState('')
  const [createSummary, setCreateSummary] = useState('')
  const [createZipFile, setCreateZipFile] = useState<File | null>(null)
  const [createHtmlFile, setCreateHtmlFile] = useState<File | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareCode, setShareCode] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [shareLoading, setShareLoading] = useState(false)

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editAid, setEditAid] = useState<TeachingAid | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadLibrary = async () => {
    setLoading(true)
    try {
      const [categoryRes, libraryRes, recentRes] = await Promise.all([
        teachingAidService.getCategories(),
        teachingAidService.getLibrary(),
        teachingAidService.getRecentLibrary(),
      ])
      setCategories(categoryRes.items)
      setItems(libraryRes.items)
      setRecentItems(recentRes.items)
      setLoadFailed(false)
      setSelectedAidId((prev) => prev && libraryRes.items.some((item) => item.id === prev) ? prev : libraryRes.items[0]?.id || null)
    } catch (error) {
      console.error(error)
      setCategories([])
      setItems([])
      setRecentItems([])
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  const loadMyAids = async () => {
    try {
      const res = await teachingAidService.listTeacherAids()
      setMyItems(res)
    } catch (error) {
      console.error(error)
      setMyItems([])
    }
  }

  useEffect(() => {
    void loadLibrary()
    void loadMyAids()
  }, [])

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    return items.filter((item) => {
      const keywordMatch = !normalizedKeyword
        || item.name.toLowerCase().includes(normalizedKeyword)
        || (item.summary || '').toLowerCase().includes(normalizedKeyword)
      const categoryMatch = !category || item.category_code === category
      return keywordMatch && categoryMatch
    })
  }, [items, keyword, category])

  const selectedAid = tab === 'library'
    ? filteredItems.find((item) => item.id === selectedAidId) || filteredItems[0] || null
    : myItems.find((item) => item.id === selectedAidId) || myItems[0] || null

  const handleLaunch = async (aid: TeachingAid) => {
    setLaunchingAidId(aid.id)
    try {
      const session = await teachingAidService.launch(aid.id)
      setOpenedTeachingAid({ name: aid.name, entryUrl: session.entry_url })
    } catch (error) {
      console.error(error)
      alert(t('teacherTeachingAids.launchFailed'))
    } finally {
      setLaunchingAidId(null)
    }
  }

  const handleCreate = async () => {
    if (!createName.trim()) {
      setCreateError('请输入教具名称')
      return
    }
    if (!createCategory) {
      setCreateError('请选择分类')
      return
    }
    if (!createZipFile && !createHtmlFile) {
      setCreateError('请选择文件（ZIP或HTML）')
      return
    }

    setCreateLoading(true)
    setCreateError('')
    try {
      const categoryObj = categories.find(c => c.code === createCategory)
      if (createHtmlFile) {
        await teachingAidService.uploadTeacherHtml({
          name: createName.trim(),
          category_code: createCategory,
          category_label: categoryObj?.label || createCategory,
          summary: createSummary.trim() || undefined,
          htmlFile: createHtmlFile,
        })
      } else {
        await teachingAidService.uploadTeacherZip({
          name: createName.trim(),
          category_code: createCategory,
          category_label: categoryObj?.label || createCategory,
          summary: createSummary.trim() || undefined,
          zipFile: createZipFile!,
        })
      }
      setShowCreateModal(false)
      setCreateName('')
      setCreateCategory('')
      setCreateSummary('')
      setCreateZipFile(null)
      setCreateHtmlFile(null)
      void loadMyAids()
      setTab('mine')
    } catch (error: unknown) {
      console.error(error)
      const err = error as { response?: { data?: { detail?: string | unknown[] } } }
      let msg = '上传失败'
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string') {
        msg = detail
      } else if (Array.isArray(detail)) {
        msg = (detail as Array<{ msg?: string }>).map(d => d.msg || String(d)).join(', ')
      }
      setCreateError(msg)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDelete = async (aid: TeachingAid) => {
    if (!confirm(`确定删除 "${aid.name}" 吗？此操作不可恢复。`)) return
    try {
      await teachingAidService.deleteTeacherAid(aid.id)
      setMyItems(prev => prev.filter(item => item.id !== aid.id))
      if (selectedAidId === aid.id) {
        setSelectedAidId(null)
      }
    } catch (error: unknown) {
      console.error(error)
      const err = error as { response?: { data?: { detail?: string } } }
      alert(err?.response?.data?.detail || '删除失败')
    }
  }

  const handleOpenEdit = (aid: TeachingAid) => {
    setEditAid(aid)
    setEditName(aid.name)
    setEditCategory(aid.category_code)
    setEditSummary(aid.summary || '')
    setEditError('')
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editAid) return
    if (!editName.trim()) {
      setEditError('请输入教具名称')
      return
    }
    setEditLoading(true)
    setEditError('')
    try {
      const categoryObj = categories.find(c => c.code === editCategory)
      await teachingAidService.updateTeacherAid(editAid.id, {
        name: editName.trim(),
        category_code: editCategory,
        category_label: categoryObj?.label || editCategory,
        summary: editSummary.trim() || undefined,
      })
      setShowEditModal(false)
      void loadMyAids()
    } catch (error: unknown) {
      console.error(error)
      const err = error as { response?: { data?: { detail?: string } } }
      setEditError(err?.response?.data?.detail || '保存失败')
    } finally {
      setEditLoading(false)
    }
  }

  const handleGenerateShareLink = async (aid: TeachingAid) => {
    setShareLoading(true)
    try {
      const res = await teachingAidService.generateShareLink(aid.id)
      setShareCode(res.share_code)
      setShareUrl(res.share_url)
      setShowShareModal(true)
      void loadMyAids()
    } catch (error: unknown) {
      console.error(error)
      const err = error as { response?: { data?: { detail?: string } } }
      alert(err?.response?.data?.detail || '生成失败')
    } finally {
      setShareLoading(false)
    }
  }

  const displayItems = tab === 'library' ? filteredItems : myItems

  return (
    <Layout sidebar={<TeacherSidebar activePage="teaching-aids" />} leftSidebar={<TeacherLeftSidebar activePage="teaching-aids" />}>
      <section className="surface-card mt-4">
        <div className="surface-head relative" style={{ paddingBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '24px' }}>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h2>{t('teacherTeachingAids.title')}</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{t('teacherTeachingAids.pageSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400"
          >
            + 创建教具
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-slate-200">
          <button
            onClick={() => setTab('library')}
            className={`pb-3 px-1 text-sm font-medium transition ${
              tab === 'library'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            公开教具库
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`pb-3 px-1 text-sm font-medium transition ${
              tab === 'mine'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            我的教具 ({myItems.length})
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[300px,1fr]">
          <aside className="rounded-3xl border border-slate-200 bg-white/80 px-5 py-5">
            {tab === 'library' && (
              <div className="space-y-3">
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder={t('teacherTeachingAids.keyword')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                />
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                >
                  <option value="">{t('teacherTeachingAids.allCategories')}</option>
                  {categories.map((item) => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </select>
              </div>
            )}

            {tab === 'library' && recentItems.length > 0 ? (
              <div className="mt-5">
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">{t('teacherTeachingAids.recent')}</div>
                <div className="flex max-h-[120px] flex-wrap gap-2 overflow-auto pr-1">
                  {recentItems.map((aid) => (
                    <button
                      key={`recent-${aid.id}`}
                      onClick={() => setSelectedAidId(aid.id)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        selectedAid?.id === aid.id
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {aid.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 space-y-2 overflow-y-auto max-h-[520px] pr-1">
              {tab === 'library' && loading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">{t('common.loading')}</div>
              ) : tab === 'library' && loadFailed ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-600">
                  <div>{t('teacherTeachingAids.loadFailed')}</div>
                  <button
                    onClick={() => void loadLibrary()}
                    className="mt-3 rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-100"
                  >
                    {t('teacherTeachingAids.retry')}
                  </button>
                </div>
              ) : tab === 'library' && filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  {keyword || category ? t('teacherTeachingAids.emptyFiltered') : t('teacherTeachingAids.empty')}
                </div>
              ) : displayItems.length === 0 && tab === 'mine' ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  <div>还没有创建任何教具</div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 rounded-lg border border-blue-200 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50"
                  >
                    立即创建
                  </button>
                </div>
              ) : displayItems.map((aid) => (
                <button
                  key={aid.id}
                  onClick={() => setSelectedAidId(aid.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedAid?.id === aid.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-900">{aid.name}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-xs text-slate-500">{aid.category_label}</div>
                    {tab === 'mine' && aid.share_code && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">已分享</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-6">
            {selectedAid ? (
              <>
                <div className="rounded-3xl border border-slate-200 bg-white/80 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{selectedAid.category_label}</p>
                      <h3 className="mt-1 text-2xl font-semibold text-slate-900">{selectedAid.name}</h3>
                      {tab === 'mine' && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">我的教具</span>
                          {selectedAid.share_code && (
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">分享码: {selectedAid.share_code}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {openedTeachingAid ? (
                        <button
                          onClick={() => setOpenedTeachingAid(null)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {t('teacherTeachingAids.closePreview')}
                        </button>
                      ) : null}
                      {tab === 'mine' && (
                        <>
                          <button
                            onClick={() => void handleOpenEdit(selectedAid)}
                            className="rounded-xl border border-blue-200 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => void handleDelete(selectedAid)}
                            className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            删除
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => void handleLaunch(selectedAid)}
                        disabled={launchingAidId === selectedAid.id}
                        className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-60"
                      >
                        {launchingAidId === selectedAid.id ? t('teacherTeachingAids.launching') : t('teacherTeachingAids.launch')}
                      </button>
                      {tab === 'mine' && (
                        <button
                          onClick={() => void handleGenerateShareLink(selectedAid)}
                          disabled={shareLoading}
                          className="rounded-xl border border-green-200 px-4 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-60"
                        >
                          {shareLoading ? '生成中...' : '生成分享链接'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr,0.85fr]">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="text-sm font-medium text-slate-700">{t('teacherTeachingAids.preview')}</div>
                      <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {selectedAid.cover_image_url ? (
                          <img
                            src={teachingAidService.getCoverUrl(selectedAid.id)}
                            alt={selectedAid.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="text-sm font-medium text-slate-700">{t('teacherTeachingAids.info')}</div>
                      <dl className="mt-4 space-y-4 text-sm">
                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500">{t('teacherTeachingAids.name')}</dt>
                          <dd className="mt-1 text-base font-medium text-slate-900">{selectedAid.name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500">{t('teacherTeachingAids.category')}</dt>
                          <dd className="mt-1 text-slate-700">{selectedAid.category_label}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500">{t('teacherTeachingAids.description')}</dt>
                          <dd className="mt-1 text-sm leading-6 text-slate-700">
                            {selectedAid.summary || t('teacherTeachingAids.assetUnavailable')}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/80 px-6 py-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">{t('teacherTeachingAids.livePreview')}</h4>
                      <p className="mt-1 text-sm text-slate-500">{t('teacherTeachingAids.livePreviewDesc')}</p>
                    </div>
                  </div>
                  {openedTeachingAid ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <iframe
                        key={openedTeachingAid.entryUrl}
                        src={openedTeachingAid.entryUrl}
                        title={openedTeachingAid.name}
                        className="h-[720px] w-full bg-white"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                      {t('teacherTeachingAids.livePreviewEmpty')}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 text-sm text-slate-500">
                {tab === 'mine' ? '点击上方"立即创建"按钮创建您的第一个教具' : t('teacherTeachingAids.empty')}
              </div>
            )}
          </section>
        </div>
      </section>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="text-xl">🧰</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">创建教具</h3>
                  <p className="text-emerald-100 text-xs">上传您的互动教学工具</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <span>📝</span> 教具名称
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="例如：随机点名器"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <span>📂</span> 分类
                </label>
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                >
                  <option value="">选择分类</option>
                  {categories.map((item) => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </select>
              </div>

              {/* Summary */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <span>💬</span> 简介 <span className="text-slate-400 font-normal">(可选)</span>
                </label>
                <textarea
                  value={createSummary}
                  onChange={(e) => setCreateSummary(e.target.value)}
                  placeholder="简要描述这个教具的功能和使用方法..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:bg-white transition-colors resize-none"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <span>📁</span> 上传文件
                </label>
                <div className={`relative rounded-xl border-2 border-dashed transition-colors ${
                  createHtmlFile || createZipFile
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,.html"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      if (!file) return
                      if (file.size > 3 * 1024 * 1024) {
                        setCreateError('文件大小不能超过 3MB')
                        setCreateZipFile(null)
                        setCreateHtmlFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                        return
                      }
                      if (file.name.toLowerCase().endsWith('.html')) {
                        setCreateHtmlFile(file)
                        setCreateZipFile(null)
                      } else {
                        setCreateZipFile(file)
                        setCreateHtmlFile(null)
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="py-5 text-center">
                    {(createHtmlFile || createZipFile) ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">{createHtmlFile ? '📄' : '📦'}</span>
                        <div className="text-left">
                          <p className="text-sm font-medium text-emerald-700">{createHtmlFile?.name || createZipFile?.name}</p>
                          <p className="text-xs text-emerald-600">
                            {((createHtmlFile?.size || createZipFile?.size) || 0) > 1024 * 1024
                              ? `${(((createHtmlFile?.size || createZipFile?.size) || 0) / (1024 * 1024)).toFixed(1)} MB`
                              : `${(((createHtmlFile?.size || createZipFile?.size) || 0) / 1024).toFixed(0)} KB`}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCreateZipFile(null)
                            setCreateHtmlFile(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="ml-2 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-500 text-sm mb-1">点击或拖拽文件到此处上传</p>
                        <p className="text-slate-400 text-xs">支持 ZIP（需包含 index.html）或 HTML 文件，最大 3MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Error */}
              {createError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
                  <span>⚠️</span> {createError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateError('')
                  setCreateZipFile(null)
                  setCreateHtmlFile(null)
                }}
                className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => void handleCreate()}
                disabled={createLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow disabled:opacity-60"
              >
                {createLoading ? '上传中...' : '创建教具'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">编辑教具</h3>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">教具名称</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">分类</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                >
                  {categories.map((item) => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">简介（可选）</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>

              {editError && (
                <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                  {editError}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={() => void handleSaveEdit()}
                disabled={editLoading}
                className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-60"
              >
                {editLoading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">分享教具</h3>
            <p className="mt-1 text-sm text-slate-500">其他教师可以使用以下链接或分享码导入教具</p>

            <div className="mt-6 space-y-4">
              {shareUrl && (
                <div>
                  <div className="mb-1 text-sm text-slate-500">分享链接</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}${shareUrl}`}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 truncate"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`)
                        alert('链接已复制')
                      }}
                      className="shrink-0 rounded-lg bg-blue-500 px-3 py-2 text-sm text-white hover:bg-blue-400"
                    >
                      复制
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1 text-sm text-slate-500">分享码</div>
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <div className="text-3xl font-bold tracking-widest text-blue-600">{shareCode}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
