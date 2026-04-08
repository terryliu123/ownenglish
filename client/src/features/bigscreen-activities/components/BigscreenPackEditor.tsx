import { useEffect, useMemo, useState } from 'react'
import type {
  BigscreenActivityPack,
  BigscreenContentAsset,
  BigscreenParticipantMode,
  BigscreenResourceStatus,
} from '../../../services/api'
import { useTranslation } from '../../../i18n/useTranslation'

// Helper to extract plain text from rich text content (TipTap JSON format)
function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!content || typeof content !== 'object') return ''
  const node = content as Record<string, unknown>
  if (node.type === 'text' && typeof node.text === 'string') return node.text
  if (Array.isArray(node.content)) {
    return node.content.map(extractTextFromContent).join('')
  }
  return ''
}

function getPromptText(payload: unknown): string {
  const prompt = (payload as { prompt?: unknown })?.prompt
  if (typeof prompt === 'string') return prompt
  return extractTextFromContent(prompt)
}

type PackDraft = {
  title: string
  participant_mode: BigscreenParticipantMode
  content_asset_refs: string[]
  round_count: number
  time_limit_seconds: string
  scoring_rule: string
  win_rule: string
  status: BigscreenResourceStatus
}

function packToDraft(pack: BigscreenActivityPack | null): PackDraft {
  if (!pack) {
    return {
      title: '',
      participant_mode: 'student_vs_student',
      content_asset_refs: [],
      round_count: 1,
      time_limit_seconds: '60',
      scoring_rule: 'round_wins_then_time',
      win_rule: 'highest_score_then_time',
      status: 'draft',
    }
  }
  return {
    title: pack.title,
    participant_mode: pack.participant_mode,
    content_asset_refs: [...pack.content_asset_refs],
    round_count: pack.round_count,
    time_limit_seconds: pack.time_limit_seconds ? String(pack.time_limit_seconds) : '',
    scoring_rule: pack.scoring_rule,
    win_rule: pack.win_rule,
    status: pack.status,
  }
}

export function BigscreenPackEditor({
  open,
  pack,
  assets,
  onClose,
  onSave,
}: {
  open: boolean
  pack: BigscreenActivityPack | null
  assets: BigscreenContentAsset[]
  onClose: () => void
  onSave: (payload: Omit<BigscreenActivityPack, 'id' | 'teacher_id' | 'content_assets' | 'created_at' | 'updated_at'>) => Promise<void>
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<PackDraft>(packToDraft(null))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(packToDraft(pack))
  }, [pack, open])

  const selectedAssets = useMemo(
    () => draft.content_asset_refs.map((assetId) => assets.find((item) => item.id === assetId)).filter(Boolean) as BigscreenContentAsset[],
    [assets, draft.content_asset_refs],
  )

  if (!open) return null

  const toggleAsset = (assetId: string) => {
    setDraft((prev) => ({
      ...prev,
      content_asset_refs: prev.content_asset_refs.includes(assetId)
        ? prev.content_asset_refs.filter((item) => item !== assetId)
        : [...prev.content_asset_refs, assetId],
    }))
  }

  const moveAsset = (assetId: string, direction: -1 | 1) => {
    setDraft((prev) => {
      const index = prev.content_asset_refs.indexOf(assetId)
      const targetIndex = index + direction
      if (index < 0 || targetIndex < 0 || targetIndex >= prev.content_asset_refs.length) return prev
      const next = [...prev.content_asset_refs]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return { ...prev, content_asset_refs: next }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        title: draft.title.trim(),
        activity_type: 'duel',
        participant_mode: draft.participant_mode,
        content_asset_refs: draft.content_asset_refs,
        round_count: draft.round_count,
        time_limit_seconds: draft.time_limit_seconds.trim() ? Number(draft.time_limit_seconds) : null,
        scoring_rule: draft.scoring_rule.trim() || 'round_wins_then_time',
        win_rule: draft.win_rule.trim() || 'highest_score_then_time',
        status: draft.status,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/40 p-4">
      <div className="surface-card max-h-[90vh] w-full max-w-6xl overflow-auto !bg-white/95">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{pack ? t('bigscreenActivities.editPack') : t('bigscreenActivities.newPack')}</h2>
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
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="输入活动包标题"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('bigscreenActivities.form.participantMode')}</span>
            <select
              value={draft.participant_mode}
              onChange={(e) => setDraft((prev) => ({ ...prev, participant_mode: e.target.value as BigscreenParticipantMode }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="student_vs_student">{t('bigscreenActivities.participantMode.student_vs_student')}</option>
              <option value="team_vs_team">{t('bigscreenActivities.participantMode.team_vs_team')}</option>
              <option value="anonymous_side">{t('bigscreenActivities.participantMode.anonymous_side')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('bigscreenActivities.form.status')}</span>
            <select
              value={draft.status}
              onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as BigscreenResourceStatus }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="draft">{t('bigscreenActivities.status.draft')}</option>
              <option value="active">{t('bigscreenActivities.status.active')}</option>
              <option value="archived">{t('bigscreenActivities.status.archived')}</option>
            </select>
          </label>
        </div>

        {/* Settings Row */}
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('bigscreenActivities.form.roundCount')}</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, draft.content_asset_refs.length)}
              value={draft.round_count}
              onChange={(e) => setDraft((prev) => ({ ...prev, round_count: Number(e.target.value || 1) }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('bigscreenActivities.form.timeLimit')}</span>
            <input
              type="number"
              min={0}
              value={draft.time_limit_seconds}
              onChange={(e) => setDraft((prev) => ({ ...prev, time_limit_seconds: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="秒"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('bigscreenActivities.form.scoringRule')}</span>
            <select
              value={draft.scoring_rule}
              onChange={(e) => setDraft((prev) => ({ ...prev, scoring_rule: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="round_wins">{t('bigscreenActivities.form.scoringRuleOptions.round_wins')}</option>
              <option value="round_wins_then_time">{t('bigscreenActivities.form.scoringRuleOptions.round_wins_then_time')}</option>
              <option value="total_score">{t('bigscreenActivities.form.scoringRuleOptions.total_score')}</option>
              <option value="total_score_then_time">{t('bigscreenActivities.form.scoringRuleOptions.total_score_then_time')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{t('bigscreenActivities.form.winRule')}</span>
            <select
              value={draft.win_rule}
              onChange={(e) => setDraft((prev) => ({ ...prev, win_rule: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            >
              <option value="highest_score">{t('bigscreenActivities.form.winRuleOptions.highest_score')}</option>
              <option value="highest_score_then_time">{t('bigscreenActivities.form.winRuleOptions.highest_score_then_time')}</option>
              <option value="first_to_complete">{t('bigscreenActivities.form.winRuleOptions.first_to_complete')}</option>
              <option value="majority_wins">{t('bigscreenActivities.form.winRuleOptions.majority_wins')}</option>
            </select>
          </label>
        </div>

        {/* Asset Selection - Two Column Layout */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,1fr]">
          {/* Available Assets */}
          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <h3 className="text-sm font-semibold text-slate-900">{t('bigscreenActivities.form.assetSelection')}</h3>
              <span className="text-xs text-slate-500">{assets.length} 个可用</span>
            </div>
            <div className="mt-3 max-h-[300px] space-y-2 overflow-auto">
              {assets.length === 0 ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-4 text-sm text-slate-500">{t('bigscreenActivities.emptyAssets')}</div>
              ) : assets.map((asset) => (
                <label key={asset.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 cursor-pointer hover:border-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={draft.content_asset_refs.includes(asset.id)}
                    onChange={() => toggleAsset(asset.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-900 truncate">{asset.title}</span>
                      <span className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">{t(`bigscreenActivities.contentType.${asset.content_type}`)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{getPromptText(asset.payload)}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Selected Assets */}
          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <h3 className="text-sm font-semibold text-slate-900">{t('bigscreenActivities.form.selectedAssets')}</h3>
              <span className="text-xs text-slate-500">{selectedAssets.length} 个</span>
            </div>
            <div className="mt-3 max-h-[300px] space-y-2 overflow-auto">
              {selectedAssets.length === 0 ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-4 text-sm text-slate-500">{t('bigscreenActivities.messages.missingAssetSelection')}</div>
              ) : selectedAssets.map((asset, index) => (
                <div key={asset.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-medium text-slate-700">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{asset.title}</div>
                    <div className="text-xs text-slate-500">{t(`bigscreenActivities.contentType.${asset.content_type}`)}</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveAsset(asset.id, -1)}
                      disabled={index === 0}
                      className="ghost-button px-2 py-1 text-xs disabled:opacity-30"
                    >
                      {t('bigscreenActivities.form.moveUp')}
                    </button>
                    <button
                      onClick={() => moveAsset(asset.id, 1)}
                      disabled={index === selectedAssets.length - 1}
                      className="ghost-button px-2 py-1 text-xs disabled:opacity-30"
                    >
                      {t('bigscreenActivities.form.moveDown')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

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
