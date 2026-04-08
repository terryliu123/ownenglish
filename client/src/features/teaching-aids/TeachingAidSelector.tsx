import { useEffect, useMemo, useState } from 'react'
import { teachingAidService, type TeachingAid, type TeachingAidCategory } from '../../services/api'
import { useTranslation } from '../../i18n/useTranslation'

type TabType = 'public' | 'mine'

interface TeachingAidSelectorProps {
  selectedAidId: string | null
  onSelectAid: (aid: { id: string; name: string; entryUrl: string } | null) => void
}

export function TeachingAidSelector({ selectedAidId, onSelectAid }: TeachingAidSelectorProps) {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<TeachingAidCategory[]>([])
  const [publicItems, setPublicItems] = useState<TeachingAid[]>([])
  const [myItems, setMyItems] = useState<TeachingAid[]>([])
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [tab, setTab] = useState<TabType>('public')
  const [showSelector, setShowSelector] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [categoryRes, libraryRes, myAidsRes] = await Promise.all([
          teachingAidService.getCategories(),
          teachingAidService.getLibrary(),
          teachingAidService.listTeacherAids(),
        ])
        if (cancelled) return
        setCategories(categoryRes.items)
        setPublicItems(libraryRes.items)
        setMyItems(myAidsRes)
        setLoadFailed(false)
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setCategories([])
          setPublicItems([])
          setMyItems([])
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
  }, [])

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

  const selectedAid = [...publicItems, ...myItems].find((item) => item.id === selectedAidId) || null

  const handleSelect = async (aid: TeachingAid) => {
    try {
      const session = await teachingAidService.launch(aid.id)
      onSelectAid({
        id: aid.id,
        name: aid.name,
        entryUrl: session.entry_url,
      })
      setShowSelector(false)
    } catch (error) {
      console.error(error)
      alert(t('teacherTeachingAids.launchFailed'))
    }
  }

  const handleClear = () => {
    onSelectAid(null)
  }

  if (selectedAid) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-4">
          <div className="aspect-video w-32 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {selectedAid.cover_image_url ? (
              <img
                src={teachingAidService.getCoverUrl(selectedAid.id)}
                alt={selectedAid.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">{selectedAid.category_label}</p>
            <h4 className="mt-0.5 text-base font-medium text-slate-900 truncate">{selectedAid.name}</h4>
            <p className="mt-1 text-sm text-slate-600 line-clamp-2">{selectedAid.summary || t('teacherTeachingAids.assetUnavailable')}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setShowSelector(true)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              {t('common.change')}
            </button>
            <button
              onClick={handleClear}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              {t('common.clear')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showSelector) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-3">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t('teacherTeachingAids.keyword')}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
          >
            <option value="">{t('teacherTeachingAids.allCategories')}</option>
            {categories.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowSelector(false)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            {t('common.cancel')}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-3 flex gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setTab('public')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
              tab === 'public'
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            公共教具库 ({publicItems.length})
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
              tab === 'mine'
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            我的教具 ({myItems.length})
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">{t('common.loading')}</div>
        ) : loadFailed ? (
          <div className="py-8 text-center text-sm text-red-500">{t('teacherTeachingAids.loadFailed')}</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            {keyword || category ? t('teacherTeachingAids.emptyFiltered') : (tab === 'mine' ? '暂无个人教具' : t('teacherTeachingAids.empty'))}
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <div className="grid grid-cols-1 gap-2">
              {filteredItems.map((aid) => (
                <button
                  key={aid.id}
                  onClick={() => handleSelect(aid)}
                  className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-left hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="aspect-video w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                    {aid.cover_image_url ? (
                      <img
                        src={teachingAidService.getCoverUrl(aid.id)}
                        alt={aid.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">{aid.category_label}</p>
                    <h5 className="mt-0.5 text-sm font-medium text-slate-900 truncate">{aid.name}</h5>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{aid.summary || t('teacherTeachingAids.assetUnavailable')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowSelector(true)}
      className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
    >
      <div className="flex flex-col items-center gap-2">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>{t('teacherTeachingAids.title')}</span>
      </div>
    </button>
  )
}
