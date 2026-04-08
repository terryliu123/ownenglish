import { useEffect, useMemo, useState } from 'react'
import type { BigscreenContentAsset, BigscreenContentType, BigscreenResourceStatus } from '../../../services/api'
import { useTranslation } from '../../../i18n/useTranslation'
import { TipTapEditor } from '../../../components/editor/TipTapEditor'

type AssetDraft = {
  title: string
  content_type: BigscreenContentType
  difficulty: string
  tags: string
  status: BigscreenResourceStatus
  supports_device_interaction: boolean
  supports_bigscreen_interaction: boolean
  supports_competition: boolean
  prompt: Record<string, unknown>
  matchingPairs: { left: string; right: string }[]
  sortingItems: { id: string; text: string }[]
  classificationCategories: { key: string; label: string }[]
  classificationItems: { id: string; text: string; category_key: string }[]
}

const DEFAULT_PROMPT = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] }

const DEFAULT_DRAFT: AssetDraft = {
  title: '',
  content_type: 'matching',
  difficulty: 'medium',
  tags: '',
  status: 'draft',
  supports_device_interaction: false,
  supports_bigscreen_interaction: true,
  supports_competition: true,
  prompt: DEFAULT_PROMPT,
  matchingPairs: [
    { left: '', right: '' },
    { left: '', right: '' },
  ],
  sortingItems: [
    { id: 'item-1', text: '' },
    { id: 'item-2', text: '' },
  ],
  classificationCategories: [
    { key: 'category-1', label: '' },
    { key: 'category-2', label: '' },
  ],
  classificationItems: [
    { id: 'item-1', text: '', category_key: 'category-1' },
    { id: 'item-2', text: '', category_key: 'category-2' },
  ],
}

function isRichTextContent(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && 'type' in value
}

function assetToDraft(asset: BigscreenContentAsset | null): AssetDraft {
  if (!asset) return DEFAULT_DRAFT
  const payload = asset.payload as any
  const rawPrompt = payload?.prompt
  return {
    title: asset.title,
    content_type: asset.content_type,
    difficulty: asset.difficulty || 'medium',
    tags: (asset.tags || []).join(', '),
    status: asset.status,
    supports_device_interaction: asset.supports_device_interaction,
    supports_bigscreen_interaction: asset.supports_bigscreen_interaction,
    supports_competition: asset.supports_competition,
    prompt: isRichTextContent(rawPrompt) ? rawPrompt : DEFAULT_PROMPT,
    matchingPairs: Array.isArray(payload?.pairs) && payload.pairs.length > 0 ? payload.pairs.map((pair: any) => ({
      left: String(pair?.left || ''),
      right: String(pair?.right || ''),
    })) : DEFAULT_DRAFT.matchingPairs,
    sortingItems: Array.isArray(payload?.items) && payload.items.length > 0 ? payload.items.map((item: any, index: number) => ({
      id: String(item?.id || `item-${index + 1}`),
      text: String(item?.text || ''),
    })) : DEFAULT_DRAFT.sortingItems,
    classificationCategories: Array.isArray(payload?.categories) && payload.categories.length > 0
      ? payload.categories.map((category: any, index: number) => ({
          key: String(category?.key || `category-${index + 1}`),
          label: String(category?.label || ''),
        }))
      : DEFAULT_DRAFT.classificationCategories,
    classificationItems: Array.isArray(payload?.items) && payload.items.length > 0
      ? payload.items.map((item: any, index: number) => ({
          id: String(item?.id || `item-${index + 1}`),
          text: String(item?.text || ''),
          category_key: String(item?.category_key || ''),
        }))
      : DEFAULT_DRAFT.classificationItems,
  }
}

export function BigscreenAssetEditor({
  open,
  asset,
  onClose,
  onSave,
}: {
  open: boolean
  asset: BigscreenContentAsset | null
  onClose: () => void
  onSave: (payload: Omit<BigscreenContentAsset, 'id' | 'teacher_id' | 'created_at' | 'updated_at'>) => Promise<void>
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<AssetDraft>(DEFAULT_DRAFT)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(assetToDraft(asset))
  }, [asset, open])

  const classificationCategoryOptions = useMemo(
    () => draft.classificationCategories.filter((category) => category.key.trim() && category.label.trim()),
    [draft.classificationCategories],
  )

  if (!open) return null

  const updateDraft = <K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const buildPayload = () => {
    if (draft.content_type === 'matching') {
      return {
        prompt: draft.prompt,
        pairs: draft.matchingPairs.map((pair) => ({ left: pair.left.trim(), right: pair.right.trim() })),
      }
    }
    if (draft.content_type === 'sorting') {
      return {
        prompt: draft.prompt,
        items: draft.sortingItems.map((item, index) => ({
          id: item.id.trim() || `item-${index + 1}`,
          text: item.text.trim(),
        })),
      }
    }
    return {
      prompt: draft.prompt,
      categories: draft.classificationCategories.map((category, index) => ({
        key: category.key.trim() || `category-${index + 1}`,
        label: category.label.trim(),
      })),
      items: draft.classificationItems.map((item, index) => ({
        id: item.id.trim() || `item-${index + 1}`,
        text: item.text.trim(),
        category_key: item.category_key.trim(),
      })),
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        title: draft.title.trim(),
        content_type: draft.content_type,
        payload: buildPayload(),
        difficulty: draft.difficulty || null,
        tags: draft.tags.split(',').map((item) => item.trim()).filter(Boolean),
        status: draft.status,
        supports_device_interaction: draft.supports_device_interaction,
        supports_bigscreen_interaction: draft.supports_bigscreen_interaction,
        supports_competition: draft.supports_competition,
        source_type: asset?.source_type || 'manual',
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/40 p-4">
      <div className="surface-card max-h-[90vh] w-full max-w-5xl overflow-auto !bg-white/95">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{asset ? t('bigscreenActivities.editAsset') : t('bigscreenActivities.newAsset')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('bigscreenActivities.subtitle')}</p>
          </div>
          <button onClick={onClose} className="ghost-button text-sm">
            {t('bigscreenActivities.cancel')}
          </button>
        </div>

        {/* Basic Info - Compact Grid */}
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('bigscreenActivities.form.title')}</span>
            <input
              value={draft.title}
              onChange={(e) => updateDraft('title', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="输入素材标题"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('bigscreenActivities.form.contentType')}</span>
            <select
              value={draft.content_type}
              onChange={(e) => updateDraft('content_type', e.target.value as BigscreenContentType)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="matching">{t('bigscreenActivities.contentType.matching')}</option>
              <option value="sorting">{t('bigscreenActivities.contentType.sorting')}</option>
              <option value="classification">{t('bigscreenActivities.contentType.classification')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('bigscreenActivities.form.difficulty')}</span>
            <select
              value={draft.difficulty}
              onChange={(e) => updateDraft('difficulty', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="easy">{t('bigscreenActivities.difficulty.easy')}</option>
              <option value="medium">{t('bigscreenActivities.difficulty.medium')}</option>
              <option value="hard">{t('bigscreenActivities.difficulty.hard')}</option>
            </select>
          </label>
        </div>

        {/* Tags */}
        <div className="mt-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('bigscreenActivities.form.tags')}</span>
            <input
              value={draft.tags}
              onChange={(e) => updateDraft('tags', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="输入标签，用逗号分隔"
            />
          </label>
        </div>

        {/* Prompt with Rich Text Editor */}
        <div className="mt-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">题目</span>
            <TipTapEditor
              content={draft.prompt}
              onChange={(content) => updateDraft('prompt', content)}
              placeholder="输入题目说明，支持富文本和图片..."
              className="rounded-lg"
            />
          </label>
        </div>

        {/* Options - Compact */}
        <div className="mt-3 flex flex-wrap gap-4 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
          {[
            ['supports_device_interaction', 'bigscreenActivities.form.supportsDevice'],
            ['supports_bigscreen_interaction', 'bigscreenActivities.form.supportsBigscreen'],
            ['supports_competition', 'bigscreenActivities.form.supportsCompetition'],
          ].map(([key, labelKey]) => (
            <label key={key} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(draft[key as keyof AssetDraft])}
                onChange={(e) => updateDraft(key as keyof AssetDraft, e.target.checked as never)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span className="text-slate-700">{t(labelKey)}</span>
            </label>
          ))}
        </div>

        {/* Matching Content */}
        {draft.content_type === 'matching' && (
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <h3 className="text-sm font-semibold text-slate-900">{t('bigscreenActivities.form.pairs')}</h3>
              <button
                onClick={() => updateDraft('matchingPairs', [...draft.matchingPairs, { left: '', right: '' }])}
                className="solid-button text-xs px-3 py-1.5"
              >
                {t('bigscreenActivities.form.addPair')}
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {draft.matchingPairs.map((pair, index) => (
                <div key={`pair-${index}`} className="grid gap-2 md:grid-cols-[1fr,1fr,auto]">
                  <input
                    value={pair.left}
                    onChange={(e) => updateDraft('matchingPairs', draft.matchingPairs.map((item, itemIndex) => itemIndex === index ? { ...item, left: e.target.value } : item))}
                    placeholder={t('bigscreenActivities.form.left')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                  <input
                    value={pair.right}
                    onChange={(e) => updateDraft('matchingPairs', draft.matchingPairs.map((item, itemIndex) => itemIndex === index ? { ...item, right: e.target.value } : item))}
                    placeholder={t('bigscreenActivities.form.right')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                  <button
                    onClick={() => updateDraft('matchingPairs', draft.matchingPairs.filter((_, itemIndex) => itemIndex !== index))}
                    className="ghost-button text-xs px-3 py-2 text-red-600 hover:text-red-700"
                  >
                    {t('bigscreenActivities.form.remove')}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sorting Content */}
        {draft.content_type === 'sorting' && (
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <h3 className="text-sm font-semibold text-slate-900">{t('bigscreenActivities.form.sortingItems')}</h3>
              <button
                onClick={() => updateDraft('sortingItems', [...draft.sortingItems, { id: `item-${draft.sortingItems.length + 1}`, text: '' }])}
                className="solid-button text-xs px-3 py-1.5"
              >
                {t('bigscreenActivities.form.addSortingItem')}
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {draft.sortingItems.map((item, index) => (
                <div key={item.id || `sorting-${index}`} className="grid gap-2 md:grid-cols-[100px,1fr,auto,auto,auto]">
                  <input
                    value={item.id}
                    onChange={(e) => updateDraft('sortingItems', draft.sortingItems.map((current, itemIndex) => itemIndex === index ? { ...current, id: e.target.value } : current))}
                    placeholder={t('bigscreenActivities.form.itemId')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                  <input
                    value={item.text}
                    onChange={(e) => updateDraft('sortingItems', draft.sortingItems.map((current, itemIndex) => itemIndex === index ? { ...current, text: e.target.value } : current))}
                    placeholder={t('bigscreenActivities.form.sortingItemText')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                  <button
                    onClick={() => index > 0 && updateDraft('sortingItems', draft.sortingItems.map((current, itemIndex, array) => itemIndex === index - 1 ? array[index] : itemIndex === index ? array[index - 1] : current))}
                    className="ghost-button text-xs px-2 py-2"
                    disabled={index === 0}
                  >
                    {t('bigscreenActivities.form.moveUp')}
                  </button>
                  <button
                    onClick={() => index < draft.sortingItems.length - 1 && updateDraft('sortingItems', draft.sortingItems.map((current, itemIndex, array) => itemIndex === index + 1 ? array[index] : itemIndex === index ? array[index + 1] : current))}
                    className="ghost-button text-xs px-2 py-2"
                    disabled={index === draft.sortingItems.length - 1}
                  >
                    {t('bigscreenActivities.form.moveDown')}
                  </button>
                  <button
                    onClick={() => updateDraft('sortingItems', draft.sortingItems.filter((_, itemIndex) => itemIndex !== index))}
                    className="ghost-button text-xs px-3 py-2 text-red-600 hover:text-red-700"
                  >
                    {t('bigscreenActivities.form.remove')}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Classification Content */}
        {draft.content_type === 'classification' && (
          <section className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <h3 className="text-sm font-semibold text-slate-900">{t('bigscreenActivities.form.classificationCategories')}</h3>
                <button
                  onClick={() => updateDraft('classificationCategories', [...draft.classificationCategories, { key: `category-${draft.classificationCategories.length + 1}`, label: '' }])}
                  className="solid-button text-xs px-3 py-1.5"
                >
                  {t('bigscreenActivities.form.addCategory')}
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {draft.classificationCategories.map((category, index) => (
                  <div key={category.key || `classification-category-${index}`} className="grid gap-2 md:grid-cols-[120px,1fr,auto]">
                    <input
                      value={category.key}
                      onChange={(e) => updateDraft('classificationCategories', draft.classificationCategories.map((current, itemIndex) => itemIndex === index ? { ...current, key: e.target.value } : current))}
                      placeholder={t('bigscreenActivities.form.categoryKey')}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                    <input
                      value={category.label}
                      onChange={(e) => updateDraft('classificationCategories', draft.classificationCategories.map((current, itemIndex) => itemIndex === index ? { ...current, label: e.target.value } : current))}
                      placeholder={t('bigscreenActivities.form.categoryName')}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                    <button
                      onClick={() => updateDraft('classificationCategories', draft.classificationCategories.filter((_, itemIndex) => itemIndex !== index))}
                      className="ghost-button text-xs px-3 py-2 text-red-600 hover:text-red-700"
                    >
                      {t('bigscreenActivities.form.remove')}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <h3 className="text-sm font-semibold text-slate-900">{t('bigscreenActivities.form.classificationItems')}</h3>
                <button
                  onClick={() => updateDraft('classificationItems', [...draft.classificationItems, { id: `item-${draft.classificationItems.length + 1}`, text: '', category_key: classificationCategoryOptions[0]?.key || '' }])}
                  className="solid-button text-xs px-3 py-1.5"
                >
                  {t('bigscreenActivities.form.addClassificationItem')}
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {draft.classificationItems.map((item, index) => (
                  <div key={item.id || `classification-item-${index}`} className="grid gap-2 md:grid-cols-[100px,1fr,140px,auto]">
                    <input
                      value={item.id}
                      onChange={(e) => updateDraft('classificationItems', draft.classificationItems.map((current, itemIndex) => itemIndex === index ? { ...current, id: e.target.value } : current))}
                      placeholder={t('bigscreenActivities.form.itemId')}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                    <input
                      value={item.text}
                      onChange={(e) => updateDraft('classificationItems', draft.classificationItems.map((current, itemIndex) => itemIndex === index ? { ...current, text: e.target.value } : current))}
                      placeholder={t('bigscreenActivities.form.itemText')}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                    <select
                      value={item.category_key}
                      onChange={(e) => updateDraft('classificationItems', draft.classificationItems.map((current, itemIndex) => itemIndex === index ? { ...current, category_key: e.target.value } : current))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    >
                      <option value="">{t('bigscreenActivities.form.category')}</option>
                      {classificationCategoryOptions.map((category) => (
                        <option key={category.key} value={category.key}>{category.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => updateDraft('classificationItems', draft.classificationItems.filter((_, itemIndex) => itemIndex !== index))}
                      className="ghost-button text-xs px-3 py-2 text-red-600 hover:text-red-700"
                    >
                      {t('bigscreenActivities.form.remove')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <button onClick={onClose} className="ghost-button text-sm">
            {t('bigscreenActivities.cancel')}
          </button>
          <button onClick={() => void handleSave()} disabled={saving} className="solid-button text-sm">
            {saving ? t('common.loading') : t('bigscreenActivities.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
