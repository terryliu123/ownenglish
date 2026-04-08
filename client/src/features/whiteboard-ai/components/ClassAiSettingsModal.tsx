import { useEffect, useState } from 'react'
import { classService } from '../../../services/api'
import { useAppStore } from '../../../stores/app-store'

interface Props {
  open: boolean
  classId: string
  onClose: () => void
}

export default function ClassAiSettingsModal({ open, classId, onClose }: Props) {
  const { user } = useAppStore()
  const isPaid = user?.membership?.status === 'active'
  const [enabled, setEnabled] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [maxLength, setMaxLength] = useState(500)
  const [photoEnabled, setPhotoEnabled] = useState(true)
  const [freeEnabled, setFreeEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && classId) {
      void loadSettings()
      setError(null)
    }
  }, [open, classId])

  const loadSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const settings = await classService.getClassAiSettings(classId)
      setEnabled(settings.enabled)
      setSystemPrompt(settings.system_prompt)
      setMaxLength(settings.max_output_length)
      setPhotoEnabled(settings.photo_qa_enabled)
      setFreeEnabled(settings.free_question_enabled)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e.message || '加载 AI 设置失败'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await classService.updateClassAiSettings(classId, {
        enabled,
        system_prompt: systemPrompt,
        max_output_length: maxLength,
        photo_qa_enabled: photoEnabled,
        free_question_enabled: freeEnabled,
      })
      onClose()
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e.message || '保存 AI 设置失败'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/70">Class AI</p>
            <h3 className="text-lg font-bold">学生端 AI 助手设置</h3>
          </div>
          <div className="flex items-center gap-3">
            {!isPaid && (
              <span className="rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-1 text-xs font-medium text-amber-100">
                付费功能
              </span>
            )}
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/20">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!isPaid && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="font-medium text-amber-800">学生端 AI 为付费会员功能</p>
              <p className="mt-1 text-amber-700">
                开通付费会员后，才可以开启学生端 AI 辅助、拍照问答和自由提问。
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-medium text-slate-900">启用学生端 AI</p>
                  <p className="mt-1 text-sm text-slate-500">关闭后，学生端不会显示 AI 助手入口。</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="peer sr-only"
                    disabled={!isPaid}
                  />
                  <div
                    className={`h-6 w-11 rounded-full transition after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition ${
                      enabled ? 'bg-indigo-500 after:translate-x-full' : 'bg-slate-300'
                    } ${!isPaid ? 'cursor-not-allowed opacity-60' : ''}`}
                  />
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">系统提示词</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={5}
                  disabled={!isPaid}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  placeholder="用于约束学生端 AI 的角色、边界和回答风格。"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-slate-700">最大输出长度</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 300, label: '短', desc: '约 300 字' },
                    { value: 500, label: '中', desc: '约 500 字' },
                    { value: 1000, label: '长', desc: '约 1000 字' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => isPaid && setMaxLength(option.value)}
                      disabled={!isPaid}
                      className={`rounded-xl border-2 px-4 py-3 text-sm transition ${
                        maxLength === option.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-700'
                      } ${!isPaid ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <span className="block font-medium">{option.label}</span>
                      <span className="mt-1 block text-xs opacity-75">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-slate-700">允许的 AI 能力</label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                      photoEnabled ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'
                    } ${!isPaid ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={photoEnabled}
                      onChange={(e) => isPaid && setPhotoEnabled(e.target.checked)}
                      className="mt-1"
                      disabled={!isPaid}
                    />
                    <div>
                      <p className="font-medium text-slate-900">拍照问答</p>
                      <p className="mt-1 text-sm text-slate-500">允许学生上传图片并围绕图片内容提问。</p>
                    </div>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                      freeEnabled ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'
                    } ${!isPaid ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={freeEnabled}
                      onChange={(e) => isPaid && setFreeEnabled(e.target.checked)}
                      className="mt-1"
                      disabled={!isPaid}
                    />
                    <div>
                      <p className="font-medium text-slate-900">自由提问</p>
                      <p className="mt-1 text-sm text-slate-500">允许学生直接输入问题并获得受限回答。</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || !isPaid}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                保存中...
              </>
            ) : (
              '保存设置'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
