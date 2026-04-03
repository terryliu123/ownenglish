import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { liveTaskService, classService } from '../services/api'
import { useTranslation } from '../i18n/useTranslation'

interface SharedTaskGroup {
  share_token: string
  share_name: string
  share_description?: string
  task_group: {
    id: string
    title: string
    tasks: Array<{
      id: string
      type: string
      question: Record<string, unknown>
      countdown_seconds: number
      order: number
    }>
    task_count: number
  }
  shared_by: {
    name: string
  }
  expires_at?: string
}

export default function ShareView() {
  const { t, tWithParams } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sharedData, setSharedData] = useState<SharedTaskGroup | null>(null)
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [importTitle, setImportTitle] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (token) {
      void loadSharedTaskGroup()
      void loadClasses()
    }
  }, [token])

  async function loadSharedTaskGroup() {
    setLoading(true)
    try {
      const data = await liveTaskService.getSharedTaskGroup(token!)
      setSharedData(data)
      setImportTitle(data.task_group.title)
    } catch {
      setError(t('shareView.invalidLink'))
    } finally {
      setLoading(false)
    }
  }

  async function loadClasses() {
    try {
      const data = await classService.getAll()
      setClasses(data)
      if (data.length > 0) {
        setSelectedClassId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to load classes:', err)
    }
  }

  async function handleImport() {
    if (!token || !selectedClassId) {
      alert(t('shareView.selectClassAlert'))
      return
    }
    setImporting(true)
    try {
      await liveTaskService.importSharedTaskGroup({
        share_token: token,
        class_id: selectedClassId,
        title: importTitle.trim() || sharedData?.task_group.title,
      })
      alert(t('shareView.importSuccess'))
      navigate('/teacher/task-groups')
    } catch {
      alert(t('shareView.importFailed'))
    } finally {
      setImporting(false)
    }
  }

  function formatTaskType(type: string): string {
    const typeMap: Record<string, string> = {
      single_choice: t('shareView.singleChoice'),
      multiple_choice: t('shareView.multipleChoice'),
      fill_blank: t('shareView.fillBlank'),
      true_false: t('shareView.trueFalse'),
      matching: t('shareView.matching'),
      reading: t('shareView.reading'),
    }
    return typeMap[type] || type
  }

  function renderTaskPreview(task: { type: string; question: Record<string, unknown> }) {
    const question = task.question as {
      text?: string | Record<string, unknown>
      options?: { key: string; text: string }[]
      passage?: string | Record<string, unknown>
      prompt?: string | Record<string, unknown>
    }

    return (
      <div className="space-y-2">
        {question.text && (
          <p className="font-medium text-slate-800">
            {typeof question.text === 'object' ? t('shareView.richTextQuestion') : question.text}
          </p>
        )}
        {question.options && question.options.length > 0 && (
          <div className="space-y-1 pl-4">
            {question.options.map((opt) => (
              <div key={opt.key} className="text-sm text-slate-600">
                {opt.key}. {opt.text}
              </div>
            ))}
          </div>
        )}
        {task.type === 'reading' && (
          <div className="text-sm text-slate-500">
            {question.passage && <p>{t('shareView.readingMaterial')}</p>}
            {question.prompt && <p>{t('shareView.readingTask')}</p>}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-slate-500">{t('shareView.loading')}</span>
        </div>
      </div>
    )
  }

  if (error || !sharedData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl mx-auto mb-4">
            !
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">{t('shareView.invalidTitle')}</h1>
          <p className="text-slate-500 mb-6">{error || t('shareView.invalidDesc')}</p>
          <button
            onClick={() => navigate('/teacher/task-groups')}
            className="px-6 py-2 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
          >
            {t('shareView.backToTaskGroups')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mb-3">
                {tWithParams('shareView.fromTeacher', { name: sharedData.shared_by.name })}
              </span>
              <h1 className="text-2xl font-bold text-slate-900">{sharedData.share_name}</h1>
              {sharedData.share_description && (
                <p className="text-slate-500 mt-2">{sharedData.share_description}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">{sharedData.task_group.task_count}</div>
              <div className="text-sm text-slate-500">{t('shareView.questionCountSuffix')}</div>
            </div>
          </div>

          {sharedData.expires_at && (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 rounded-xl p-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{tWithParams('shareView.expiresAt', { date: new Date(sharedData.expires_at).toLocaleDateString() })}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">{t('shareView.importToClass')}</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('shareView.selectClass')} <span className="text-red-500">*</span>
              </label>
              {classes.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl">
                  <p className="text-slate-500 mb-3">{t('shareView.noClassYet')}</p>
                  <button
                    onClick={() => navigate('/teacher/classes')}
                    className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 transition-colors"
                  >
                    {t('shareView.goCreateClass')}
                  </button>
                </div>
              ) : (
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('shareView.importTitle')}
              </label>
              <input
                type="text"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                placeholder={t('shareView.importTitlePlaceholder')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
              <p className="text-xs text-slate-500 mt-2">{t('shareView.importTitleHint')}</p>
            </div>

            <button
              onClick={handleImport}
              disabled={importing || !selectedClassId || classes.length === 0}
              className="w-full py-3.5 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? t('shareView.importing') : t('shareView.importToMyClass')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">{t('shareView.previewTitle')}</h2>

          <div className="space-y-4">
            {sharedData.task_group.tasks.map((task, index) => (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-sm font-medium text-slate-600">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 mb-2">
                      {formatTaskType(task.type)}
                    </span>
                    {renderTaskPreview(task)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
