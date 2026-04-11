import { useEffect, useMemo, useState } from 'react'
import { teachingAidService, type TeachingAid, type TeachingAidCategory, type TeachingAidConsoleSlot } from '../../services/api'
import { useTranslation } from '../../i18n/useTranslation'

type TabType = 'public' | 'mine'

interface TeachingAidLibraryModalProps {
  open: boolean
  onClose: () => void
  onOpenTeachingAid: (payload: { name: string; entryUrl: string }) => void
  classId?: string | null
  targetSlotIndex?: number | null
  teachingAidConsoleSlots?: TeachingAidConsoleSlot[]
  onAddToConsole?: (aid: TeachingAid, slotIndex: number | null) => Promise<void> | void
}

export function TeachingAidLibraryModal({
  open,
  onClose,
  onOpenTeachingAid,
  classId,
  targetSlotIndex = null,
  teachingAidConsoleSlots = [],
  onAddToConsole,
}: TeachingAidLibraryModalProps) {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<TeachingAidCategory[]>([])
  const [publicItems, setPublicItems] = useState<TeachingAid[]>([])
  const [myItems, setMyItems] = useState<TeachingAid[]>([])
  const [recentItems, setRecentItems] = useState<TeachingAid[]>([])
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [tab, setTab] = useState<TabType>('public')
  const [selectedAidId, setSelectedAidId] = useState<string | null>(null)
  const [launchingAidId, setLaunchingAidId] = useState<string | null>(null)
  const currentConsoleSlotIds = teachingAidConsoleSlots.map((slot) => slot.teaching_aid_id).filter(Boolean) as string[]

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [categoryRes, libraryRes, recentRes, myAidsRes] = await Promise.all([
          teachingAidService.getCategories(),
          teachingAidService.getLibrary(),
          teachingAidService.getRecentLibrary(),
          teachingAidService.listTeacherAids(),
        ])
        if (cancelled) return
        setCategories(categoryRes.items)
        setPublicItems(libraryRes.items)
        setMyItems(myAidsRes)
        setRecentItems(recentRes.items)
        setLoadFailed(false)
        if (libraryRes.items.length > 0) {
          setSelectedAidId((prev) => prev && libraryRes.items.some((item) => item.id === prev) ? prev : libraryRes.items[0].id)
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setCategories([])
          setPublicItems([])
          setMyItems([])
          setRecentItems([])
          setLoadFailed(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, reloadKey])

  const currentItems = tab === 'public' ? publicItems : myItems

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    return currentItems.filter((item) => {
      const keywordMatch = !normalizedKeyword
        || item.name.toLowerCase().includes(normalizedKeyword)
        || (item.summary || '').toLowerCase().includes(normalizedKeyword)
      const categoryMatch = !category || item.category_code === category
      return keywordMatch && categoryMatch
    })
  }, [currentItems, keyword, category])

  const selectedAid = filteredItems.find((item) => item.id === selectedAidId) || filteredItems[0] || null
  const selectedAidSlotIndex = selectedAid
    ? teachingAidConsoleSlots.find((slot) => slot.teaching_aid_id === selectedAid.id)?.slot_index || null
    : null

  const handleLaunch = async (aid: TeachingAid) => {
    setLaunchingAidId(aid.id)
    try {
      const session = await teachingAidService.launch(aid.id, classId)
      onOpenTeachingAid({ name: aid.name, entryUrl: session.entry_url })
      onClose()
    } catch (error) {
      console.error(error)
      alert(t('teacherTeachingAids.launchFailed'))
    } finally {
      setLaunchingAidId(null)
    }
  }

  const handleAddToConsole = async (aid: TeachingAid) => {
    if (!onAddToConsole) return
    await onAddToConsole(aid, targetSlotIndex)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1400] bg-black/55 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-6xl max-h-[88vh] overflow-hidden rounded-3xl border border-slate-700 bg-[#12151d] text-white shadow-2xl">
        <div className="flex items-start justify-between gap-6 border-b border-slate-700 px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold">{t('teacherTeachingAids.title')}</h2>
            <p className="mt-1 text-sm text-slate-400">{t('teacherTeachingAids.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            {t('teacherTeachingAids.close')}
          </button>
        </div>

        <div className="grid min-h-[560px] grid-cols-[280px,1fr]">
          <aside className="border-r border-slate-700 px-5 py-5">
            <div className="space-y-3">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={t('teacherTeachingAids.keyword')}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
              />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
              >
                <option value="">{t('teacherTeachingAids.allCategories')}</option>
                {categories.map((item) => (
                  <option key={item.code} value={item.code}>{item.label}</option>
                ))}
              </select>
            </div>

            {/* Tabs */}
            <div className="mt-5 flex gap-2 border-b border-slate-700 pb-2">
              <button
                onClick={() => {
                  setTab('public')
                  setKeyword('')
                  setCategory('')
                  if (publicItems.length > 0) {
                    setSelectedAidId(publicItems[0].id)
                  }
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                  tab === 'public'
                    ? 'bg-blue-500/20 text-blue-200'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                公共教具库 ({publicItems.length})
              </button>
              <button
                onClick={() => {
                  setTab('mine')
                  setKeyword('')
                  setCategory('')
                  if (myItems.length > 0) {
                    setSelectedAidId(myItems[0].id)
                  }
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                  tab === 'mine'
                    ? 'bg-blue-500/20 text-blue-200'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                我的教具 ({myItems.length})
              </button>
            </div>

            <div className="mt-5 space-y-2 overflow-y-auto max-h-[380px] pr-1">
              {loading ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
                  {t('common.loading')}
                </div>
              ) : loadFailed ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-6 text-sm text-rose-100">
                  <div>{t('teacherTeachingAids.loadFailed')}</div>
                  <button
                    onClick={() => {
                      setReloadKey((prev) => prev + 1)
                    }}
                    className="mt-3 rounded-lg border border-rose-300/30 px-3 py-1.5 text-xs text-rose-100 hover:bg-rose-500/10"
                  >
                    {t('teacherTeachingAids.retry')}
                  </button>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
                  {keyword || category ? t('teacherTeachingAids.emptyFiltered') : (tab === 'mine' ? '暂无个人教具' : t('teacherTeachingAids.empty'))}
                </div>
              ) : filteredItems.map((aid) => (
                <button
                  key={aid.id}
                  onClick={() => setSelectedAidId(aid.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedAid?.id === aid.id
                      ? 'border-blue-400 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-900/40 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-sm font-medium text-white">{aid.name}</div>
                  <div className="mt-1 text-xs text-slate-400">{aid.category_label}</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="px-6 py-5">
            {selectedAid ? (
              <div className="flex h-full flex-col">
                  {recentItems.length > 0 && tab === 'public' && (
                    <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">{t('teacherTeachingAids.recent')}</div>
                      <div className="flex flex-wrap gap-2">
                        {recentItems.map((aid) => (
                          <button
                            key={`recent-${aid.id}`}
                            onClick={() => setSelectedAidId(aid.id)}
                            className={`rounded-full border px-3 py-1 text-xs ${
                              selectedAid?.id === aid.id
                                ? 'border-blue-400 bg-blue-500/10 text-blue-100'
                                : 'border-slate-700 bg-slate-900/40 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {aid.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{selectedAid.category_label}</p>
                    <h3 className="mt-1 text-2xl font-semibold text-white">{selectedAid.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void handleLaunch(selectedAid)}
                      disabled={launchingAidId === selectedAid.id}
                      className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-60"
                    >
                      {launchingAidId === selectedAid.id ? t('teacherTeachingAids.launching') : t('teacherTeachingAids.launch')}
                    </button>
                    {onAddToConsole && (
                      <button
                        onClick={() => void handleAddToConsole(selectedAid)}
                        className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/20"
                      >
                        {targetSlotIndex ? `加入第 ${targetSlotIndex} 位` : '加入控制台'}
                      </button>
                    )}
                  </div>
                </div>

                  <div className="mt-4 grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
                  {/* 左侧：封面图片预览 */}
                  <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-5">
                    <div className="text-sm font-medium text-slate-300">{t('teacherTeachingAids.preview')}</div>
                    {/* 封面图片 */}
                    <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
                      {selectedAid.cover_image_url ? (
                        <img
                          src={teachingAidService.getCoverUrl(selectedAid.id)}
                          alt={selectedAid.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-500">
                          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 右侧：教具信息 */}
                  <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-5">
                    <div className="text-sm font-medium text-slate-300">{t('teacherTeachingAids.info') || '教具信息'}</div>
                    <dl className="mt-4 space-y-4 text-sm">
                      <div>
                        <dt className="text-xs uppercase tracking-wider text-slate-500">{t('teacherTeachingAids.name') || '名称'}</dt>
                        <dd className="mt-1 text-base font-medium text-white">{selectedAid.name}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wider text-slate-500">{t('teacherTeachingAids.category') || '分类'}</dt>
                        <dd className="mt-1 text-slate-300">{selectedAid.category_label}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wider text-slate-500">{t('teacherTeachingAids.description') || '简介'}</dt>
                        <dd className="mt-1 text-sm leading-6 text-slate-300">
                          {selectedAid.summary || t('teacherTeachingAids.assetUnavailable')}
                        </dd>
                      </div>
                      {selectedAidSlotIndex && (
                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500">控制台位置</dt>
                          <dd className="mt-1 text-sm font-medium text-cyan-300">第 {selectedAidSlotIndex} 位</dd>
                        </div>
                      )}
                      {currentConsoleSlotIds.length > 0 && (
                        <div>
                          <dt className="text-xs uppercase tracking-wider text-slate-500">当前已配置</dt>
                          <dd className="mt-1 text-sm text-slate-300">
                            已占用 {currentConsoleSlotIds.length} / 4 位
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-700 bg-slate-900/40 px-6 py-10 text-sm text-slate-400">
                {t('teacherTeachingAids.empty')}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
