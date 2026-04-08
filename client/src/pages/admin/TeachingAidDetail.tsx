import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { teachingAidService, type TeachingAid, type TeachingAidCategory } from '../../services/api'
import { useTranslation } from '../../i18n/useTranslation'
import { buildTeachingAidSessionAssetUrl } from '../../features/teaching-aids/utils'

export default function AdminTeachingAidDetail() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { aidId } = useParams<{ aidId: string }>()
  const [aid, setAid] = useState<TeachingAid | null>(null)
  const [categories, setCategories] = useState<TeachingAidCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null)
  const [previewEntryUrl, setPreviewEntryUrl] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    category_code: '',
    category_label: '',
    summary: '',
    source_filename: '',
    tags: '',
  })

  const loadDetail = async () => {
    if (!aidId) return
    setLoading(true)
    try {
      const [detail, categoriesRes] = await Promise.all([
        teachingAidService.getById(aidId),
        teachingAidService.getCategories(),
      ])
      setAid(detail)
      setCategories(categoriesRes.items)
      setForm({
        name: detail.name,
        category_code: detail.category_code,
        category_label: detail.category_label,
        summary: detail.summary || '',
        source_filename: detail.source_filename || '',
        tags: detail.tags.join(', '),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
  }, [aidId])

  useEffect(() => {
    if (!aidId) return
    void ensurePreviewSession()
  }, [aidId])

  const selectedCategoryLabel = useMemo(() => {
    return categories.find((item) => item.code === form.category_code)?.label || form.category_label
  }, [categories, form.category_code, form.category_label])

  const ensurePreviewSession = async () => {
    if (!aidId) return null
    if (previewSessionId && previewEntryUrl) return { session_id: previewSessionId, entry_url: previewEntryUrl }
    const session = await teachingAidService.launch(aidId)
    setPreviewSessionId(session.session_id)
    setPreviewEntryUrl(session.entry_url)
    return session
  }

  const handleSave = async () => {
    if (!aidId || !aid) return
    setSaving(true)
    try {
      const updated = await teachingAidService.update(aidId, {
        name: form.name.trim(),
        category_code: form.category_code,
        category_label: selectedCategoryLabel,
        summary: form.summary.trim() || null,
        source_filename: form.source_filename.trim() || null,
        tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
      })
      setAid(updated)
      alert(t('adminTeachingAids.detail.saved'))
    } catch (error) {
      console.error(error)
      alert(t('adminTeachingAids.detail.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async (status: TeachingAid['status']) => {
    if (!aidId) return
    try {
      const updated = await teachingAidService.updateStatus(aidId, status)
      setAid(updated)
      alert(t('adminTeachingAids.detail.statusSaved'))
    } catch (error) {
      console.error(error)
      alert(t('adminTeachingAids.detail.statusSaveFailed'))
    }
  }

  const handleLaunch = async () => {
    try {
      const session = await ensurePreviewSession()
      if (session?.entry_url) {
        window.open(session.entry_url, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) {
    return <div className="p-8 text-slate-400">{t('common.loading')}</div>
  }

  if (!aid) {
    return <div className="p-8 text-slate-400">{t('common.error')}</div>
  }

  const coverUrl = previewSessionId ? buildTeachingAidSessionAssetUrl(previewSessionId, aid.cover_image_url) : ''
  const diagramUrl = previewSessionId ? buildTeachingAidSessionAssetUrl(previewSessionId, aid.diagram_image_url) : ''

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <button
            onClick={() => navigate('/admin/teaching-aids')}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← {t('adminTeachingAids.detail.back')}
          </button>
          <h1 className="mt-3 text-2xl font-bold text-white">{t('adminTeachingAids.detail.title')}</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => void handleLaunch()}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
          >
            {t('adminTeachingAids.detail.launch')}
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-60"
          >
            {saving ? t('adminTeachingAids.detail.saving') : t('adminTeachingAids.detail.save')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <section className="space-y-6 rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
          <div>
            <h2 className="text-lg font-semibold text-white">{t('adminTeachingAids.detail.basic')}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">{t('adminTeachingAids.detail.name')}</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">{t('adminTeachingAids.detail.categoryCode')}</span>
              <select
                value={form.category_code}
                onChange={(event) => {
                  const nextCode = event.target.value
                  const nextLabel = categories.find((item) => item.code === nextCode)?.label || ''
                  setForm((prev) => ({ ...prev, category_code: nextCode, category_label: nextLabel }))
                }}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
              >
                {categories.map((item) => (
                  <option key={item.code} value={item.code}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">{t('adminTeachingAids.detail.summary')}</span>
            <textarea
              rows={4}
              value={form.summary}
              onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
              className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">{t('adminTeachingAids.detail.sourceFilename')}</span>
              <input
                value={form.source_filename}
                onChange={(event) => setForm((prev) => ({ ...prev, source_filename: event.target.value }))}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">{t('adminTeachingAids.detail.tags')}</span>
              <input
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
              />
            </label>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{t('adminTeachingAids.detail.status')}</h2>
            <div className="mt-3 flex gap-3">
              {(['draft', 'active', 'archived'] as TeachingAid['status'][]).map((status) => (
                <button
                  key={status}
                  onClick={() => void handleStatusUpdate(status)}
                  className={`rounded-xl border px-4 py-2 text-sm ${
                    aid.status === status
                      ? 'border-blue-400 bg-blue-500/10 text-blue-200'
                      : 'border-slate-600 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {t(`adminTeachingAids.statuses.${status}`)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-slate-700 bg-slate-800/60 p-6">
          <div>
            <h2 className="text-lg font-semibold text-white">{t('adminTeachingAids.detail.assets')}</h2>
          </div>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">{t('adminTeachingAids.detail.storagePath')}</dt>
              <dd className="mt-1 break-all text-slate-200">{aid.storage_path}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('adminTeachingAids.detail.entryFile')}</dt>
              <dd className="mt-1 break-all text-slate-200">{aid.entry_file}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('adminTeachingAids.detail.coverPath')}</dt>
              <dd className="mt-1 break-all text-slate-200">{aid.cover_image_url || '-'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('adminTeachingAids.detail.diagramPath')}</dt>
              <dd className="mt-1 break-all text-slate-200">{aid.diagram_image_url || '-'}</dd>
            </div>
          </dl>

          <div className="grid gap-4">
            {coverUrl ? (
              <img src={coverUrl} alt={aid.name} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 object-contain" />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-500">
                {t('adminTeachingAids.detail.noPreview')}
              </div>
            )}
            {diagramUrl ? (
              <img src={diagramUrl} alt={`${aid.name} diagram`} className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 object-contain" />
            ) : null}
            {previewEntryUrl ? (
              <iframe
                src={previewEntryUrl}
                title={aid.name}
                className="h-[420px] w-full rounded-2xl border border-slate-700 bg-white"
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
