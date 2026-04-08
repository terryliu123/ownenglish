import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import { useTranslation } from '../../i18n/useTranslation'
import {
  bigscreenActivityService,
  membershipService,
  type BigscreenActivityPack,
  type BigscreenContentAsset,
  type BigscreenResourceStatus,
  type MembershipSnapshot,
} from '../../services/api'
import { BigscreenAssetEditor } from '../../features/bigscreen-activities/components/BigscreenAssetEditor'
import { BigscreenPackEditor } from '../../features/bigscreen-activities/components/BigscreenPackEditor'

export default function TeacherBigscreenActivities() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [assets, setAssets] = useState<BigscreenContentAsset[]>([])
  const [packs, setPacks] = useState<BigscreenActivityPack[]>([])
  const [membership, setMembership] = useState<MembershipSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assetEditorOpen, setAssetEditorOpen] = useState(false)
  const [packEditorOpen, setPackEditorOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<BigscreenContentAsset | null>(null)
  const [editingPack, setEditingPack] = useState<BigscreenActivityPack | null>(null)

  const activeAssets = useMemo(() => assets.filter((item) => item.status !== 'archived'), [assets])
  const activePacks = useMemo(() => packs.filter((item) => item.status !== 'archived'), [packs])

  const [assetSearchQuery, setAssetSearchQuery] = useState('')
  const [packSearchQuery, setPackSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'assets' | 'packs'>('assets')

  const filteredAssets = useMemo(() => {
    if (!assetSearchQuery.trim()) return activeAssets
    const query = assetSearchQuery.toLowerCase()
    return activeAssets.filter(asset =>
      asset.title.toLowerCase().includes(query) ||
      (asset.tags || []).some(tag => tag.toLowerCase().includes(query))
    )
  }, [activeAssets, assetSearchQuery])

  const filteredPacks = useMemo(() => {
    if (!packSearchQuery.trim()) return packs.filter((item) => item.status !== 'archived')
    const query = packSearchQuery.toLowerCase()
    return packs.filter(pack =>
      pack.status !== 'archived' &&
      (pack.title.toLowerCase().includes(query) ||
       (pack.activity_type || '').toLowerCase().includes(query))
    )
  }, [packs, packSearchQuery])

  const loadData = async () => {
    setLoading(true)
    try {
      const [assetResponse, packResponse, membershipResponse] = await Promise.all([
        bigscreenActivityService.listAssets(),
        bigscreenActivityService.listPacks(),
        membershipService.getMyMembership(),
      ])
      setAssets(assetResponse.items)
      setPacks(packResponse.items)
      setMembership(membershipResponse)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const getMembershipMessage = (error: unknown, fallback: string) => {
    const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (detail && typeof detail === 'object' && 'message' in detail) {
      const message = (detail as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) return message
    }
    return fallback
  }

  const assetLimit = membership?.limits.max_bigscreen_content_assets ?? null
  const assetUsage = membership?.usage.bigscreen_content_asset_count ?? activeAssets.length
  const packLimit = membership?.limits.max_bigscreen_activity_packs ?? null
  const packUsage = membership?.usage.bigscreen_activity_pack_count ?? activePacks.length
  const canCreateAsset = assetLimit == null || assetUsage < assetLimit
  const canCreatePack = packLimit == null || packUsage < packLimit
  const assetQuotaText = membership?.is_paid ? '不限量' : `${assetUsage}/${assetLimit ?? '-'}`
  const packQuotaText = membership?.is_paid ? '不限量' : `${packUsage}/${packLimit ?? '-'}`

  const handleSaveAsset = async (payload: Omit<BigscreenContentAsset, 'id' | 'teacher_id' | 'created_at' | 'updated_at'>) => {
    setSaving(true)
    try {
      if (editingAsset) await bigscreenActivityService.updateAsset(editingAsset.id, payload)
      else await bigscreenActivityService.createAsset(payload)
      await loadData()
    } catch (error) {
      alert(getMembershipMessage(error, '淇濆瓨绱犳潗澶辫触'))
    } finally {
      setSaving(false)
    }
  }

  const handleSavePack = async (payload: Omit<BigscreenActivityPack, 'id' | 'teacher_id' | 'content_assets' | 'created_at' | 'updated_at'>) => {
    setSaving(true)
    try {
      if (editingPack) await bigscreenActivityService.updatePack(editingPack.id, payload)
      else await bigscreenActivityService.createPack(payload)
      await loadData()
    } catch (error) {
      alert(getMembershipMessage(error, '保存活动包失败'))
    } finally {
      setSaving(false)
    }
  }

  const handleAssetStatusChange = async (asset: BigscreenContentAsset, status: BigscreenResourceStatus) => {
    setSaving(true)
    try {
      await bigscreenActivityService.updateAsset(asset.id, {
        title: asset.title,
        content_type: asset.content_type,
        payload: asset.payload,
        difficulty: asset.difficulty || null,
        tags: asset.tags || [],
        status,
        supports_device_interaction: asset.supports_device_interaction,
        supports_bigscreen_interaction: asset.supports_bigscreen_interaction,
        supports_competition: asset.supports_competition,
        source_type: asset.source_type,
      })
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const handlePackStatusChange = async (pack: BigscreenActivityPack, status: BigscreenResourceStatus) => {
    setSaving(true)
    try {
      await bigscreenActivityService.updatePack(pack.id, {
        title: pack.title,
        activity_type: pack.activity_type,
        participant_mode: pack.participant_mode,
        content_asset_refs: pack.content_asset_refs,
        round_count: pack.round_count,
        time_limit_seconds: pack.time_limit_seconds,
        scoring_rule: pack.scoring_rule,
        win_rule: pack.win_rule,
        status,
      })
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout sidebar={<TeacherSidebar activePage="bigscreen-activities" />} leftSidebar={<TeacherLeftSidebar activePage="bigscreen-activities" />}>
      <section className="surface-card mt-4">
        {/* Header */}
        <div className="surface-head" style={{ paddingBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '32px' }}>
          <div>
            <h2>{t('bigscreenActivities.title')}</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{t('bigscreenActivities.subtitle')}</p>
            <p className="mt-2 text-xs text-slate-500">
              {membership?.is_paid
                ? '付费会员：大屏互动素材和活动包不限量'
                : `免费会员：素材 ${assetUsage}/${assetLimit ?? '-'}，活动包 ${packUsage}/${packLimit ?? '-'}`
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:flex">
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">素材可创建</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{assetQuotaText}</div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">活动包可创建</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{packQuotaText}</div>
              </div>
            </div>
            <button className="ghost-button" onClick={() => navigate('/teacher/whiteboard')}>
              {t('bigscreenActivities.run.back')}
            </button>
          </div>
        </div>

        <div className="mb-6 flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:hidden">
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">素材可创建</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{assetQuotaText}</div>
          </div>
          <div className="mx-4 w-px bg-slate-200" />
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">活动包可创建</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{packQuotaText}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex border-b border-slate-200">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'assets'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('assets')}
          >
            第一步 创建素材
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'packs'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('packs')}
          >
            第二步 发布活动包
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'assets' ? (
          /* Step 1: Content Assets */
          <div className="flex flex-col" style={{ height: 'calc((3 * 260px) + 120px)' }}>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                1
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-slate-900">{t('bigscreenActivities.workflow.step1Label')}</div>
                <p className="text-xs text-slate-500 truncate">{t('bigscreenActivities.workflow.step1Desc')}</p>
              </div>
              <button
                className="solid-button text-xs px-3 py-1.5 shrink-0"
                disabled={!canCreateAsset}
                onClick={() => {
                  if (!canCreateAsset) return
                  setEditingAsset(null)
                  setAssetEditorOpen(true)
                }}
                title={!canCreateAsset ? '免费会员最多创建 5 个大屏互动素材，请升级会员后继续创建。' : undefined}
              >
                {t('bigscreenActivities.workflow.step1Create')}
              </button>
            </div>
            {!canCreateAsset ? (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                免费会员最多创建 5 个大屏互动素材，请升级会员后继续创建。
              </div>
            ) : null}

            {/* Assets Search */}
            <div className="mb-3">
              <input
                type="text"
                value={assetSearchQuery}
                onChange={(e) => setAssetSearchQuery(e.target.value)}
                placeholder={t('bigscreenActivities.searchAssets')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* Assets List - Fixed height with scroll */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="py-8 text-center" style={{ color: 'var(--muted)' }}>{t('common.loading')}</div>
              ) : filteredAssets.length > 0 ? (
                <div className="grid gap-4 grid-cols-4 auto-rows-fr">
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="rounded-xl border border-slate-200 bg-white/70 p-4 flex flex-col overflow-hidden"
                      style={{ height: '240px' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-slate-900 truncate">{asset.title}</h3>
                          <p className="text-sm text-slate-500">{t(`bigscreenActivities.contentType.${asset.content_type}`)}</p>
                        </div>
                        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 shrink-0">
                          {t(`bigscreenActivities.status.${asset.status}`)}
                        </span>
                      </div>
                      <div className="mt-3 flex-1">
                        {(asset.tags || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(asset.tags || []).map((tag) => (
                              <span key={tag} className="max-w-full truncate rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{tag}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">--</span>
                        )}
                      </div>
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        {asset.status === 'draft' ? (
                          <button
                            className="solid-button min-w-0 text-xs px-3 py-1.5 whitespace-nowrap"
                            disabled={saving}
                            onClick={() => void handleAssetStatusChange(asset, 'active')}
                          >
                            {t('bigscreenActivities.actions.markReady')}
                          </button>
                        ) : asset.status === 'active' ? (
                          <button
                            className="ghost-button min-w-0 text-xs px-3 py-1.5 whitespace-nowrap"
                            disabled={saving}
                            onClick={() => void handleAssetStatusChange(asset, 'draft')}
                          >
                            {t('bigscreenActivities.actions.backToDraft')}
                          </button>
                        ) : <div />}
                        <button
                          className="ghost-button min-w-0 text-xs px-3 py-1.5 whitespace-nowrap"
                          disabled={saving}
                          onClick={() => {
                            setEditingAsset(asset)
                            setAssetEditorOpen(true)
                          }}
                        >
                          {t('bigscreenActivities.editAsset')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-base" style={{ color: 'var(--muted)' }}>{t('bigscreenActivities.emptyAssets')}</div>
              )}
            </div>
          </div>
        ) : (
          /* Step 2: Activity Packs */
          <div className="flex flex-col" style={{ height: 'calc((3 * 260px) + 120px)' }}>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                2
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-slate-900">{t('bigscreenActivities.workflow.step2Label')}</div>
                <p className="text-xs text-slate-500 truncate">{t('bigscreenActivities.workflow.step2Desc')}</p>
              </div>
              <button
                className="solid-button text-xs px-3 py-1.5 shrink-0"
                disabled={!canCreatePack}
                onClick={() => {
                  if (!canCreatePack) return
                  setEditingPack(null)
                  setPackEditorOpen(true)
                }}
                title={!canCreatePack ? '免费会员最多创建 2 个大屏互动活动包，请升级会员后继续创建。' : undefined}
              >
                {t('bigscreenActivities.workflow.step2Create')}
              </button>
            </div>
            {!canCreatePack ? (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                免费会员最多创建 2 个大屏互动活动包，请升级会员后继续创建。
              </div>
            ) : null}

            {/* Packs Search */}
            <div className="mb-3">
              <input
                type="text"
                value={packSearchQuery}
                onChange={(e) => setPackSearchQuery(e.target.value)}
                placeholder={t('bigscreenActivities.searchPacks')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* Packs List - Fixed height with scroll */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="py-8 text-center" style={{ color: 'var(--muted)' }}>{t('common.loading')}</div>
              ) : filteredPacks.length > 0 ? (
                <div className="grid gap-4 grid-cols-4 auto-rows-fr">
                  {filteredPacks.map((pack) => (
                    <div
                      key={pack.id}
                      className="rounded-xl border border-slate-200 bg-white/70 p-4 flex flex-col overflow-hidden"
                      style={{ height: '240px' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-slate-900 truncate">{pack.title}</h3>
                          <p className="text-sm text-slate-500">
                            {t(`bigscreenActivities.participantMode.${pack.participant_mode}`)}
                          </p>
                        </div>
                        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 shrink-0">
                          {t(`bigscreenActivities.status.${pack.status}`)}
                        </span>
                      </div>
                      <div className="mt-3 flex-1">
                        <div className="text-sm text-slate-600">
                          {t('bigscreenActivities.packCard.rounds')}: {pack.round_count} 路 {pack.content_asset_refs.length} 个素材
                        </div>
                      </div>
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        {pack.status === 'draft' ? (
                          <button
                            className="solid-button min-w-0 text-xs px-3 py-1.5 whitespace-nowrap"
                            disabled={saving}
                            onClick={() => void handlePackStatusChange(pack, 'active')}
                          >
                            {t('bigscreenActivities.actions.markReady')}
                          </button>
                        ) : pack.status === 'active' ? (
                          <button
                            className="ghost-button min-w-0 text-xs px-3 py-1.5 whitespace-nowrap"
                            disabled={saving}
                            onClick={() => void handlePackStatusChange(pack, 'draft')}
                          >
                            {t('bigscreenActivities.actions.backToDraft')}
                          </button>
                        ) : <div />}
                        <button
                          className="ghost-button min-w-0 text-xs px-3 py-1.5 whitespace-nowrap"
                          disabled={saving}
                          onClick={() => {
                            setEditingPack(pack)
                            setPackEditorOpen(true)
                          }}
                        >
                          {t('bigscreenActivities.editPack')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-base" style={{ color: 'var(--muted)' }}>{t('bigscreenActivities.emptyPacks')}</div>
              )}
            </div>
          </div>
        )}
      </section>

      <BigscreenAssetEditor
        open={assetEditorOpen}
        asset={editingAsset}
        onClose={() => {
          if (saving) return
          setAssetEditorOpen(false)
          setEditingAsset(null)
        }}
        onSave={handleSaveAsset}
      />

      <BigscreenPackEditor
        open={packEditorOpen}
        pack={editingPack}
        assets={assets.filter((asset) => asset.status === 'active')}
        onClose={() => {
          if (saving) return
          setPackEditorOpen(false)
          setEditingPack(null)
        }}
        onSave={handleSavePack}
      />
    </Layout>
  )
}

