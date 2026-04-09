import { useEffect, useMemo, useRef, useState } from 'react'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import TeacherPageHeader from '../../components/layout/TeacherPageHeader'
import { teachingAidService, type TeachingAid, type TeachingAidCategory } from '../../services/api'

type TabType = 'library' | 'mine'

export default function TeacherTeachingAids() {
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
  const [openedAid, setOpenedAid] = useState<{ name: string; entryUrl: string } | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [name, setName] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [summary, setSummary] = useState('')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [htmlFile, setHtmlFile] = useState<File | null>(null)
  const [shareCode, setShareCode] = useState('')
  const [shareUrl, setShareUrl] = useState('')

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
      setSelectedAidId((prev) => (prev && libraryRes.items.some((item) => item.id === prev) ? prev : libraryRes.items[0]?.id || null))
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

  const loadMine = async () => {
    try {
      setMyItems(await teachingAidService.listTeacherAids())
    } catch (error) {
      console.error(error)
      setMyItems([])
    }
  }

  useEffect(() => {
    void loadLibrary()
    void loadMine()
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

  const displayItems = tab === 'library' ? filteredItems : myItems
  const selectedAid = displayItems.find((item) => item.id === selectedAidId) || displayItems[0] || null

  const resetForm = () => {
    setName('')
    setFormCategory('')
    setSummary('')
    setZipFile(null)
    setHtmlFile(null)
    setFormError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openCreate = () => {
    resetForm()
    setShowCreate(true)
  }

  const openEdit = (aid: TeachingAid) => {
    setSelectedAidId(aid.id)
    setName(aid.name)
    setFormCategory(aid.category_code)
    setSummary(aid.summary || '')
    setFormError('')
    setShowEdit(true)
  }

  const handleLaunch = async (aid: TeachingAid) => {
    setLaunchingAidId(aid.id)
    try {
      const session = await teachingAidService.launch(aid.id)
      setOpenedAid({ name: aid.name, entryUrl: session.entry_url })
    } catch (error) {
      console.error(error)
      alert('打开教具失败')
    } finally {
      setLaunchingAidId(null)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) return setFormError('请输入教具名称')
    if (!formCategory) return setFormError('请选择分类')
    if (!zipFile && !htmlFile) return setFormError('请选择 ZIP 或 HTML 文件')
    setCreateLoading(true)
    setFormError('')
    try {
      const categoryObj = categories.find((item) => item.code === formCategory)
      if (htmlFile) {
        await teachingAidService.uploadTeacherHtml({
          name: name.trim(),
          category_code: formCategory,
          category_label: categoryObj?.label || formCategory,
          summary: summary.trim() || undefined,
          htmlFile,
        })
      } else {
        await teachingAidService.uploadTeacherZip({
          name: name.trim(),
          category_code: formCategory,
          category_label: categoryObj?.label || formCategory,
          summary: summary.trim() || undefined,
          zipFile: zipFile!,
        })
      }
      setShowCreate(false)
      resetForm()
      setTab('mine')
      void loadMine()
    } catch (error: unknown) {
      console.error(error)
      setFormError((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '上传失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedAid || !name.trim()) return setFormError('请输入教具名称')
    setEditLoading(true)
    setFormError('')
    try {
      const categoryObj = categories.find((item) => item.code === formCategory)
      await teachingAidService.updateTeacherAid(selectedAid.id, {
        name: name.trim(),
        category_code: formCategory,
        category_label: categoryObj?.label || formCategory,
        summary: summary.trim() || undefined,
      })
      setShowEdit(false)
      resetForm()
      void loadMine()
    } catch (error: unknown) {
      console.error(error)
      setFormError((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '保存失败')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (aid: TeachingAid) => {
    if (!confirm(`确定删除“${aid.name}”吗？此操作不可恢复。`)) return
    try {
      await teachingAidService.deleteTeacherAid(aid.id)
      setMyItems((prev) => prev.filter((item) => item.id !== aid.id))
      if (selectedAidId === aid.id) setSelectedAidId(null)
    } catch (error: unknown) {
      console.error(error)
      alert((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '删除失败')
    }
  }

  const handleGenerateShareLink = async (aid: TeachingAid) => {
    setShareLoading(true)
    try {
      const res = await teachingAidService.generateShareLink(aid.id)
      setShareCode(res.share_code)
      setShareUrl(res.share_url)
      setShowShare(true)
      void loadMine()
    } catch (error: unknown) {
      console.error(error)
      alert((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '生成失败')
    } finally {
      setShareLoading(false)
    }
  }

  return (
    <Layout sidebar={<TeacherSidebar activePage="teaching-aids" />} leftSidebar={<TeacherLeftSidebar activePage="teaching-aids" />}>
      <div className="teacher-page">
        <TeacherPageHeader
          eyebrow="数字化教具"
          title="数字化教具库"
          description="用于查找、预览和使用数字化教具，与白板模式下的教具库保持同一套打开方式。"
          icon="教"
          actions={<button onClick={openCreate} className="solid-button">创建教具</button>}
        />

        <section className="surface-card">
          <div className="mb-6 flex gap-4 border-b border-slate-200">
            <button onClick={() => setTab('library')} className={`pb-3 px-1 text-sm font-medium ${tab === 'library' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500'}`}>公开教具库</button>
            <button onClick={() => setTab('mine')} className={`pb-3 px-1 text-sm font-medium ${tab === 'mine' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500'}`}>我的教具 ({myItems.length})</button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[300px,1fr]">
            <aside className="rounded-3xl border border-slate-200 bg-white/80 px-5 py-5">
              {tab === 'library' ? (
                <div className="space-y-3">
                  <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索教具名称" className="teacher-control w-full" />
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="teacher-control w-full">
                    <option value="">全部分类</option>
                    {categories.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                  </select>
                </div>
              ) : null}

              {tab === 'library' && recentItems.length > 0 ? (
                <div className="mt-5">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">最近使用</div>
                  <div className="flex max-h-[120px] flex-wrap gap-2 overflow-auto pr-1">
                    {recentItems.map((aid) => (
                      <button key={`recent-${aid.id}`} onClick={() => setSelectedAidId(aid.id)} className={`rounded-full border px-3 py-1 text-xs ${selectedAid?.id === aid.id ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                        {aid.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {tab === 'library' && loading ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">加载中...</div> : null}
                {tab === 'library' && loadFailed ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-600">
                    <div>加载教具库失败</div>
                    <button onClick={() => void loadLibrary()} className="mt-3 rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700">重新加载</button>
                  </div>
                ) : null}
                {!loading && !loadFailed && displayItems.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    {tab === 'mine' ? '还没有创建任何教具。' : keyword || category ? '当前筛选条件下没有匹配教具。' : '暂无可用教具。'}
                  </div>
                ) : null}
                {displayItems.map((aid) => (
                  <button key={aid.id} onClick={() => setSelectedAidId(aid.id)} className={`w-full rounded-2xl border px-4 py-3 text-left ${selectedAid?.id === aid.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                    <div className="text-sm font-medium text-slate-900">{aid.name}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-xs text-slate-500">{aid.category_label}</div>
                      {tab === 'mine' && aid.share_code ? <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">已分享</span> : null}
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
                        {tab === 'mine' ? <div className="mt-2 flex items-center gap-2">{selectedAid.share_code ? <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">分享码 {selectedAid.share_code}</span> : <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">我的教具</span>}</div> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        {openedAid ? <button onClick={() => setOpenedAid(null)} className="ghost-button">关闭预览</button> : null}
                        {tab === 'mine' ? (
                          <>
                            <button onClick={() => openEdit(selectedAid)} className="ghost-button">编辑</button>
                            <button onClick={() => void handleDelete(selectedAid)} className="danger-button">删除</button>
                          </>
                        ) : null}
                        <button onClick={() => void handleLaunch(selectedAid)} disabled={launchingAidId === selectedAid.id} className="solid-button disabled:opacity-60">
                          {launchingAidId === selectedAid.id ? '打开中...' : '打开教具'}
                        </button>
                        {tab === 'mine' ? <button onClick={() => void handleGenerateShareLink(selectedAid)} disabled={shareLoading} className="ghost-button disabled:opacity-60">{shareLoading ? '生成中...' : '生成分享链接'}</button> : null}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr,0.85fr]">
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="text-sm font-medium text-slate-700">封面预览</div>
                        <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          {selectedAid.cover_image_url ? <img src={teachingAidService.getCoverUrl(selectedAid.id)} alt={selectedAid.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400">暂无封面</div>}
                        </div>
                      </div>
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="text-sm font-medium text-slate-700">教具信息</div>
                        <dl className="mt-4 space-y-4 text-sm">
                          <div><dt className="text-xs uppercase tracking-wider text-slate-500">名称</dt><dd className="mt-1 text-base font-medium text-slate-900">{selectedAid.name}</dd></div>
                          <div><dt className="text-xs uppercase tracking-wider text-slate-500">分类</dt><dd className="mt-1 text-slate-700">{selectedAid.category_label}</dd></div>
                          <div><dt className="text-xs uppercase tracking-wider text-slate-500">简介</dt><dd className="mt-1 text-sm leading-6 text-slate-700">{selectedAid.summary || '暂无简介'}</dd></div>
                        </dl>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white/80 px-6 py-5">
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-slate-900">使用预览</h4>
                      <p className="mt-1 text-sm text-slate-500">点击“打开教具”后，将在下方直接预览可用的数字化教具页面。</p>
                    </div>
                    {openedAid ? (
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <iframe key={openedAid.entryUrl} src={openedAid.entryUrl} title={openedAid.name} className="h-[720px] w-full bg-white" />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">选择并打开一个数字化教具后，这里会显示实际可用的预览页面。</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 text-sm text-slate-500">
                  {tab === 'mine' ? '点击上方“创建教具”按钮，创建您的第一个教具。' : '暂无可用教具。'}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>

      {(showCreate || showEdit) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">{showCreate ? '创建教具' : '编辑教具'}</h3>
            </div>
            <div className="space-y-5 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">教具名称</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：随机点名器" className="teacher-control w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">分类</label>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="teacher-control w-full">
                  <option value="">选择分类</option>
                  {categories.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">简介（可选）</label>
                <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:bg-white" />
              </div>
              {showCreate ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">上传文件</label>
                  <div className={`relative rounded-xl border-2 border-dashed transition-colors ${htmlFile || zipFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,.html"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (!file) return
                        if (file.size > 3 * 1024 * 1024) {
                          setFormError('文件大小不能超过 3MB')
                          setZipFile(null)
                          setHtmlFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                          return
                        }
                        if (file.name.toLowerCase().endsWith('.html')) {
                          setHtmlFile(file)
                          setZipFile(null)
                        } else {
                          setZipFile(file)
                          setHtmlFile(null)
                        }
                      }}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <div className="py-5 text-center">
                      {htmlFile || zipFile ? <div className="text-sm font-medium text-emerald-700">{htmlFile?.name || zipFile?.name}</div> : <>
                        <p className="mb-1 text-sm text-slate-500">点击或拖拽文件到此处上传</p>
                        <p className="text-xs text-slate-400">支持 ZIP（需包含 index.html）或 HTML 文件，最大 3MB。</p>
                      </>}
                    </div>
                  </div>
                </div>
              ) : null}
              {formError ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">{formError}</div> : null}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button onClick={() => { setShowCreate(false); setShowEdit(false); resetForm() }} className="ghost-button">取消</button>
              <button onClick={() => void (showCreate ? handleCreate() : handleSaveEdit())} disabled={createLoading || editLoading} className="solid-button disabled:opacity-60">
                {showCreate ? (createLoading ? '上传中...' : '创建教具') : (editLoading ? '保存中...' : '保存')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showShare ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">分享教具</h3>
            <p className="mt-1 text-sm text-slate-500">其他教师可以使用以下链接或分享码导入教具。</p>
            <div className="mt-6 space-y-4">
              {shareUrl ? (
                <div>
                  <div className="mb-1 text-sm text-slate-500">分享链接</div>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={`${window.location.origin}${shareUrl}`} className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
                    <button onClick={() => void navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`)} className="rounded-lg bg-blue-500 px-3 py-2 text-sm text-white hover:bg-blue-400">复制</button>
                  </div>
                </div>
              ) : null}
              <div>
                <div className="mb-1 text-sm text-slate-500">分享码</div>
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <div className="text-3xl font-bold tracking-widest text-blue-600">{shareCode}</div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowShare(false)} className="ghost-button">关闭</button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  )
}
